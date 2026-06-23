#!/usr/bin/env node

/**
 * Daily results work-list for the stage-backfill routine.
 *
 * Emits everything the routine should touch in a rolling window
 * [today - N days .. today] (UTC, inclusive, default N=2):
 *
 *   gaps      — expected race overviews + stages that have NO results JSON yet
 *   refreshes — existing in-window results JSONs that are thin/stub OR were
 *               written same-day (provisional) and have since had a day to settle
 *
 * Scope (matches the completeness gate's tracked set, plus one-day races):
 *   - men's road races rated 4–5★ (cyclocross excluded)
 *   - a stage race is "in window" if ANY of its non-rest stages falls in the
 *     window; its overview hub is also a gap if missing (in-progress hub OK)
 *   - one-day races are "in window" if raceDate falls in the window
 *
 * Refreshes additionally include ANY existing in-window results JSON that is a
 * stub (so women's / already-covered races we've started keep improving), since
 * "refresh thin" should never leave a known-thin page un-revisited.
 *
 * Usage:
 *   node scripts/results-worklist.js [--window N] [--today YYYY-MM-DD] [--json]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const JSON_OUT = args.includes('--json');

const WINDOW_DAYS = Number(flag('window', '2'));
// --today lets tests pin the date; default is real UTC today.
const TODAY = flag('today', new Date().toISOString().slice(0, 10));
const FROM = (() => {
  const t = new Date(`${TODAY}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - WINDOW_DAYS);
  return t.toISOString().slice(0, 10);
})();
const inWindow = d => !!d && d >= FROM && d <= TODAY;

const RACE_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/race-data.json'), 'utf8'));

const isCyclocross = id => id.startsWith('cx-world-cup-') || id === 'cx-world-championships-2026-men';
const isTracked = r => r.gender === 'men' && (r.rating === 4 || r.rating === 5) && !isCyclocross(r.id);

const readJson = f => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const exists = f => fs.existsSync(path.join(ROOT, f));

// Stub detection (mirrors scripts/test-results-completeness.js).
function isRaceStub(r) {
  if (!r) return true;
  if (r.inProgress) return !(r.tldr && r.tldr.length > 80);
  const tldrShort = !r.tldr || r.tldr.length < 80;
  const noPodium = !Array.isArray(r.podium) || r.podium.length < 1;
  const noNarrative = !r.narrative || !(r.narrative.headline || r.narrative.openingMoves || r.narrative.body);
  return tldrShort || noPodium || noNarrative;
}
function isStageStub(r) {
  if (!r) return true;
  const tldrShort = !r.tldr || r.tldr.length < 40;
  const noNarrative = !r.narrative || !(r.narrative.body || r.narrative.headline);
  return tldrShort && noNarrative;
}
// A same-day write (researchedAt date == the race/stage date) is provisional —
// same-day results are the ones that are often thin or wrong (the methodology's
// jersey-attribution error was a same-day write). Re-verify it EXACTLY ONCE, the
// day after, when PCS/sources have settled. Not every day in the window — that
// would re-research already-correct pages and waste money. (Genuinely thin pages
// are still caught by the stub check across the whole window, every run.)
const provisional = (data, date) => {
  if (!data?.researchedAt || data.researchedAt.slice(0, 10) !== date) return false;
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return TODAY === next.toISOString().slice(0, 10);
};

const gaps = [];
const refreshes = [];
const pushRefresh = (kind, id, date, data) => {
  const stub = kind === 'stage' ? isStageStub(data) : isRaceStub(data);
  const prov = provisional(data, date);
  if (stub || prov) refreshes.push({ kind, id, date, reason: stub ? 'thin/stub' : 'same-day provisional' });
};

for (const race of RACE_DATA.races) {
  const stages = (race.stages || []).filter(s => s.stageType !== 'rest-day');
  const stageInWindow = stages.some(s => inWindow(s.date));
  const oneDayInWindow = (!race.stages || race.stages.length === 0) && inWindow(race.raceDate);
  if (!stageInWindow && !oneDayInWindow) {
    // Still allow refresh of an existing one-day/hub results JSON that's in window
    // even if untracked (e.g. women's race we've started covering).
    const rf = `data/results/races/${race.id}.json`;
    if (exists(rf)) {
      const data = readJson(path.join(ROOT, rf));
      if (inWindow(data?.raceDate)) pushRefresh('race', race.id, data.raceDate, data);
    }
    continue;
  }

  // --- Overview / one-day race result (data/results/races/<id>.json) ---
  const raceJsonRel = `data/results/races/${race.id}.json`;
  const hasRaceJson = exists(raceJsonRel);
  if (isTracked(race)) {
    if (!hasRaceJson) {
      gaps.push({ kind: 'race', id: race.id, name: race.name, date: race.raceDate, stageRace: stages.length > 0 });
    }
  }
  if (hasRaceJson) {
    const data = readJson(path.join(ROOT, raceJsonRel));
    pushRefresh('race', race.id, data?.raceDate || race.raceDate, data);
  }

  // --- Per-stage results (data/results/stages/<id>-stage-N.json) ---
  for (const s of stages) {
    if (!inWindow(s.date)) continue;
    const stageId = `${race.id}-stage-${s.stageNumber}`;
    const stageJsonRel = `data/results/stages/${stageId}.json`;
    if (!exists(stageJsonRel)) {
      if (isTracked(race)) gaps.push({ kind: 'stage', id: stageId, raceId: race.id, name: race.name, stage: s.stageNumber, date: s.date });
    } else {
      pushRefresh('stage', stageId, s.date, readJson(path.join(ROOT, stageJsonRel)));
    }
  }
}

const sortByDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
gaps.sort(sortByDate);
refreshes.sort(sortByDate);
const out = { window: { from: FROM, to: TODAY }, counts: { gaps: gaps.length, refreshes: refreshes.length }, gaps, refreshes };

if (JSON_OUT) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`Window ${FROM} .. ${TODAY}  ·  ${gaps.length} gap(s), ${refreshes.length} refresh(es)`);
  for (const g of gaps) console.log(`  GAP      ${g.kind.padEnd(5)} ${g.id} (${g.date})`);
  for (const r of refreshes) console.log(`  REFRESH  ${r.kind.padEnd(5)} ${r.id} (${r.date}) — ${r.reason}`);
}
