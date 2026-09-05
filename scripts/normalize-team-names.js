#!/usr/bin/env node
/**
 * Normalize team-name spelling across the data to lib/team-names.js house names.
 *
 * Usage:
 *   node scripts/normalize-team-names.js            # dry run: report what would change
 *   node scripts/normalize-team-names.js --write    # apply
 *   node scripts/normalize-team-names.js --list     # print the registry
 *
 * Scope (every `team` string field, wherever it sits in the JSON):
 *   data/results/races/*.json, data/results/stages/*.json, data/results/riders/*.json
 *   data/riders.json, data/riders-women.json, data/outsiders.json
 *   data/race-data.json topRiders[].team — written through scripts/update-race.js
 *   (the only sanctioned write path for race-data.json), one race at a time.
 *
 * Rules:
 *   - spelling variants (registry `aliases`) are always rewritten
 *   - a `former` name (e.g. "INEOS Grenadiers") is rewritten only where the record
 *     is dated after the rename, or where the record describes the CURRENT roster
 *     (rider files, calendar topRiders); a March result keeps its March name
 *   - the women's peloton overrides apply when the file's race is a women's race
 *   - narrative prose is never touched; only `team` fields
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { canonicalTeam, printRegistry } from '../lib/team-names.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
if (process.argv.includes('--list')) { printRegistry(); process.exit(0); }

const RACE_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/race-data.json'), 'utf8'));
const raceMeta = id => RACE_DATA.races.find(r => r.id === id) || null;

const changes = []; // { file, from, to, n }
const note = (file, from, to) => {
  const c = changes.find(x => x.file === file && x.from === from && x.to === to);
  if (c) c.n++; else changes.push({ file, from, to, n: 1 });
};

// Rewrite every `team` field in an object tree. `ctx` = { gender, date, current }.
function rewriteTree(obj, ctx, file) {
  let touched = false;
  const walk = (o, localDate) => {
    if (Array.isArray(o)) { o.forEach(x => walk(x, localDate)); return; }
    if (!o || typeof o !== 'object') return;
    const d = o.stageDate || o.raceDate || o.date || localDate;
    if (typeof o.team === 'string' && o.team.trim()) {
      const c = canonicalTeam(o.team, { gender: ctx.gender, date: ctx.current ? undefined : d });
      const shouldRewrite = c.name !== o.team && (!c.former || ctx.current);
      if (shouldRewrite) { note(file, o.team, c.name); o.team = c.name; touched = true; }
    }
    for (const k of Object.keys(o)) if (k !== 'team') walk(o[k], d);
  };
  walk(obj, ctx.date);
  return touched;
}

function processJsonFile(rel, ctx) {
  const abs = path.join(ROOT, rel);
  const raw = fs.readFileSync(abs, 'utf8');
  const data = JSON.parse(raw);
  const before = changes.length;
  const counts = changes.map(c => c.n);
  if (!rewriteTree(data, ctx, rel)) return;
  if (!WRITE) return;
  // Apply as textual substitutions of the exact `"team": "..."` tokens so the
  // file keeps its existing formatting (many hand-written files use compact
  // one-line objects; a JSON.stringify round-trip would rewrite every line).
  let out = raw;
  const pairs = changes.filter((c, i) => c.file === rel && (i >= before || c.n !== counts[i]));
  for (const p of pairs) {
    const from = JSON.stringify(p.from), to = JSON.stringify(p.to);
    out = out.split(`"team": ${from}`).join(`"team": ${to}`).split(`"team":${from}`).join(`"team":${to}`);
  }
  if (out === raw) { console.warn(`  ! no textual match in ${rel}; skipped`); return; }
  JSON.parse(out); // must still be valid
  fs.writeFileSync(abs, out);
}

// ---- results subsystem ----
for (const dir of ['races', 'stages', 'riders']) {
  const d = path.join(ROOT, 'data/results', dir);
  if (!fs.existsSync(d)) continue;
  for (const f of fs.readdirSync(d).filter(f => f.endsWith('.json'))) {
    const rel = `data/results/${dir}/${f}`;
    const data = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));
    const raceId = data.raceId || f.replace(/(-stage-\d+)?\.json$/, '');
    const meta = raceMeta(raceId);
    // Rider season files describe the current roster → `current`.
    const ctx = dir === 'riders'
      ? { gender: undefined, current: true }
      : { gender: meta?.gender, date: data.stageDate || data.raceDate || meta?.raceDate, current: false };
    processJsonFile(rel, ctx);
  }
}

// ---- tracked-rider rosters (current) ----
processJsonFile('data/riders.json', { gender: 'men', current: true });
processJsonFile('data/riders-women.json', { gender: 'women', current: true });
processJsonFile('data/outsiders.json', { gender: 'men', current: true });

// ---- calendar topRiders (current) — via update-race.js ----
for (const race of RACE_DATA.races) {
  if (!Array.isArray(race.topRiders)) continue;
  const updates = [];
  for (const t of race.topRiders) {
    if (typeof t.team !== 'string' || !t.team.trim()) continue;
    const c = canonicalTeam(t.team, { gender: race.gender });
    if (c.name !== t.team) { note('data/race-data.json', t.team, c.name); updates.push({ id: t.id, team: c.name }); }
  }
  if (updates.length && WRITE) {
    execFileSync('node', [path.join(ROOT, 'scripts/update-race.js'), '--id', race.id, '--stdin'],
      { input: JSON.stringify({ topRiders: updates }), stdio: ['pipe', 'ignore', 'inherit'] });
  }
}

// ---- report ----
const byFile = new Map();
for (const c of changes) { if (!byFile.has(c.file)) byFile.set(c.file, []); byFile.get(c.file).push(c); }
const total = changes.reduce((s, c) => s + c.n, 0);
const summary = new Map();
for (const c of changes) { const k = `${c.from} → ${c.to}`; summary.set(k, (summary.get(k) || 0) + c.n); }
console.log(`${WRITE ? 'Rewrote' : 'Would rewrite'} ${total} team field(s) in ${byFile.size} file(s):`);
for (const [k, n] of [...summary.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${k}`);
if (!WRITE && total) console.log('\nRun with --write to apply.');
