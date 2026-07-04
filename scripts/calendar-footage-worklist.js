#!/usr/bin/env node

/**
 * Daily CALENDAR-FOOTAGE work-list for the spoiler-safe footage routine.
 *
 * Sibling of scripts/results-worklist.js, but for the OTHER side of the site:
 * the spoiler-FREE calendar. It lists finished races/stages in a rolling window
 * [today - N days .. today] (UTC, inclusive, default N=4) that still lack
 * watchable footage — i.e. platform "TBD" (one-day / whole race) or a stage
 * whose `url` is "TBD"/missing. The routine then discovers + STRICTLY spoiler-vets
 * an official highlight video for each and writes it into data/race-data.json.
 *
 * ⚠️ Spoiler model is the OPPOSITE of the results routine. The results routine's
 * safety is architectural (calendar generators only `fs.existsSync` results, never
 * inline result text). Here the routine writes a video URL directly onto the
 * spoiler-free calendar, and `npm test` canNOT tell a spoiler video from a safe
 * one (a URL is opaque). VETTING IS THE ONLY GATE — see the runbook. This script
 * only finds the WORK; it makes no safety claims about any video.
 *
 * Scope (tunable):
 *   - discipline road (cyclocross excluded), rating >= --min-rating (default 3)
 *   - both genders (footage is valuable for men's and women's racing)
 *   - a stage is "workable" only once it has run: stage.date <= today AND in window
 *   - a whole race / one-day race is a gap if platform === "TBD" and it's in window
 *
 * A window keeps the routine on RECENT racing (e.g. yesterday's Tour stage), not
 * the long TBD backlog — that backlog is a separate, one-off backfill concern.
 *
 * Usage:
 *   node scripts/calendar-footage-worklist.js [--window N] [--today YYYY-MM-DD]
 *                                             [--min-rating R] [--json]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const JSON_OUT = args.includes('--json');

const WINDOW_DAYS = Number(flag('window', '4'));
const MIN_RATING = Number(flag('min-rating', '3'));
const TODAY = flag('today', new Date().toISOString().slice(0, 10));
const FROM = (() => {
  const t = new Date(`${TODAY}T00:00:00Z`);
  t.setUTCDate(t.getUTCDate() - WINDOW_DAYS);
  return t.toISOString().slice(0, 10);
})();
const inWindow = d => !!d && d >= FROM && d <= TODAY;
const hasRun = d => !!d && d <= TODAY;

const RACE_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/race-data.json'), 'utf8'));
const races = Array.isArray(RACE_DATA) ? RACE_DATA : RACE_DATA.races;

const isCyclocross = r =>
  r.discipline === 'cyclocross' || r.id.startsWith('cx-') || /cyclo-?cross/i.test(r.name || '');
// Footage worth auto-discovering: road (or gravel), rated >= MIN_RATING, not CX.
const isTracked = r =>
  !isCyclocross(r) &&
  (r.discipline === 'road' || r.discipline === 'gravel' || !r.discipline) &&
  (Number(r.rating) || 0) >= MIN_RATING;

const missingUrl = u => !u || u === 'TBD';
const raceLacksFootage = r => r.platform === 'TBD' || missingUrl(r.url);

const gaps = [];

for (const race of races) {
  if (!isTracked(race)) continue;
  const stages = (race.stages || []).filter(s => s.stageType !== 'rest-day');

  if (stages.length === 0) {
    // One-day race: a gap if it ran in-window and has no footage yet.
    if (inWindow(race.raceDate) && raceLacksFootage(race)) {
      gaps.push({ kind: 'race', id: race.id, name: race.name, gender: race.gender || 'men', rating: race.rating, date: race.raceDate });
    }
    continue;
  }

  // Stage race: per-stage gaps for stages that have run and are in window + lack url.
  const stageGaps = [];
  for (const s of stages) {
    if (!inWindow(s.date) || !hasRun(s.date)) continue;
    if (missingUrl(s.url) || s.platform === 'TBD') {
      stageGaps.push({ kind: 'stage', id: `${race.id}-stage-${s.stageNumber}`, raceId: race.id, name: race.name, stage: s.stageNumber, gender: race.gender || 'men', rating: race.rating, date: s.date });
    }
  }
  // Whole-race footage gap (sets race.platform/url) if the race lacks footage and
  // at least one of its stages has run in-window (so a highlight exists to point to).
  if (raceLacksFootage(race) && stages.some(s => inWindow(s.date) && hasRun(s.date))) {
    gaps.push({ kind: 'race', id: race.id, name: race.name, gender: race.gender || 'men', rating: race.rating, date: race.raceDate, stageRace: true });
  }
  gaps.push(...stageGaps);
}

const sortByDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
gaps.sort(sortByDate);
const out = { window: { from: FROM, to: TODAY }, minRating: MIN_RATING, counts: { gaps: gaps.length }, gaps };

if (JSON_OUT) {
  console.log(JSON.stringify(out, null, 2));
} else {
  console.log(`Window ${FROM} .. ${TODAY}  ·  min-rating ${MIN_RATING}  ·  ${gaps.length} footage gap(s)`);
  for (const g of gaps) console.log(`  GAP  ${g.kind.padEnd(5)} ${g.id.padEnd(42)} ${(g.gender || '').padEnd(6)} ${g.rating || '?'}★ (${g.date})`);
}
