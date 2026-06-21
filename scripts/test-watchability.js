#!/usr/bin/env node
// Test harness for the spoiler-safe Watchability rubric.
// Usage: node scripts/test-watchability.js [--all] [file ...]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scoreResult } from '../lib/watchability.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIRE = n => '🔥'.repeat(n) + '·'.repeat(5 - n);

// curated diverse sample (manner-of-victory spread)
const SAMPLE = [
  ['stages/tour-de-suisse-2026-stage-1.json', 'Pogačar 71km solo (star, huge gap)'],
  ['stages/tour-de-suisse-2026-stage-4.json', 'ITT'],
  ['races/koksijde-classic-2026.json', 'routine flat bunch sprint'],
  ['races/scheldeprijs-2026.json', 'crash-strewn reduced sprint, expected winner'],
  ['races/paris-roubaix-women-2026.json', 'career-best upset, 2-up Monument'],
  ['races/gp-de-denain-2026.json', 'audacious late solo from break, held off bunch'],
  ['races/tro-bro-leon-2026.json', 'solo on gravel'],
  ['races/strade-bianche-women-2026.json', 'gravel Monument'],
  ['stages/tour-auvergne-rhone-alpes-2026-stage-6.json', 'echelon split, GC blown'],
  ['races/milano-sanremo-donne-2026.json', 'Monument finale'],
  ['races/brabantse-pijl-2026.json', 'career-best, uphill sprint'],
  ['races/nokere-koerse-2026.json', 'uphill cobbled sprint'],
  ['races/ronde-van-vlaanderen-women-2026.json', 'Monument, crash-marred'],
  ['stages/giro-ditalia-women-2026-stage-1.json', 'GT opener'],
  ['races/surf-coast-classic-men-2026.json', 'cancelled'],
];

const DIR = path.join(__dirname, '..', 'data', 'results');

function load(rel) {
  const p = path.join(DIR, rel);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

let list;
if (process.argv.includes('--all')) {
  const files = [];
  for (const sub of ['races', 'stages']) {
    for (const f of fs.readdirSync(path.join(DIR, sub))) if (f.endsWith('.json')) files.push([sub + '/' + f, '']);
  }
  list = files;
} else if (process.argv.length > 2 && !process.argv[2].startsWith('--')) {
  list = process.argv.slice(2).map(f => [f.replace(/^.*data\/results\//, ''), '']);
} else {
  list = SAMPLE;
}

const rows = [];
for (const [rel, note] of list) {
  const data = load(rel);
  if (!data) { rows.push({ rel, missing: true }); continue; }
  const r = scoreResult(data);
  rows.push({ rel, note, ...r });
}

rows.sort((a, b) => (b.score || 0) - (a.score || 0));

console.log('\n  WATCHABILITY — manner-of-victory drama index (spoiler-safe outputs)\n');
console.log('  ' + 'FLAMES'.padEnd(8) + 'SCORE'.padEnd(7) + 'ARCHETYPE'.padEnd(22) + 'RACE');
console.log('  ' + '─'.repeat(96));
for (const r of rows) {
  if (r.missing) { console.log('  (missing) ' + r.rel); continue; }
  const name = r.rel.replace(/^(races|stages)\//, '').replace(/\.json$/, '');
  console.log('  ' + FIRE(r.flames).padEnd(8) + String(r.score).padEnd(7) + String(r.archetype).padEnd(22) + name);
  if (r.note) console.log('  ' + ' '.repeat(37) + '↳ ' + r.note);
}

console.log('\n  ── Spoiler-safe card preview (what a viewer would actually see) ──\n');
for (const r of rows.slice(0, 6)) {
  if (r.missing) continue;
  const name = r.rel.replace(/^(races|stages)\//, '').replace(/\.json$/, '');
  console.log('  ' + name);
  console.log('    ' + FIRE(r.flames) + '  ' + r.blurb);
  console.log('    tags: ' + (r.tags.length ? r.tags.join(' · ') : '(none)'));
  console.log('    [debug, not shown to user] modifiers: ' + JSON.stringify(r.modifiers));
  console.log('');
}
