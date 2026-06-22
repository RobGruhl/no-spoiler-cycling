#!/usr/bin/env node
// Merge the per-batch Opus watchability judgements (/tmp/watch/out-*.json) into
// data/results/watchability.json — the precomputed scores the site build reads.
// Each out-file entry: { key: "race:<id>" | "stage:<id>-stage-N", flames: 0-5, why }.
import fs from 'fs';
import path from 'path';

const TMP = '/tmp/watch';
const OUT = 'data/results/watchability.json';

const races = {}, stages = {}, notes = {};
let merged = 0, missing = [];

for (let i = 0; i < 64; i++) {
  const f = path.join(TMP, `out-${i}.json`);
  if (!fs.existsSync(f)) { if (fs.existsSync(path.join(TMP, `batch-${i}.json`))) missing.push(i); continue; }
  let arr;
  try { arr = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`! out-${i}.json parse error: ${e.message}`); continue; }
  for (const e of arr) {
    if (!e || !e.key) continue;
    const flames = Math.max(0, Math.min(5, Math.round(Number(e.flames))));
    if (Number.isNaN(flames)) continue;
    if (e.key.startsWith('race:')) { const id = e.key.slice(5); races[id] = flames; if (e.why) notes['race:' + id] = e.why; }
    else if (e.key.startsWith('stage:')) { const id = e.key.slice(6); stages[id] = flames; if (e.why) notes['stage:' + id] = e.why; }
    merged++;
  }
}

if (missing.length) console.error(`! missing out files for batches: ${missing.join(', ')}`);

// Public, build-read file: INTEGERS ONLY — a flame count leaks nothing about who won.
const payload = {
  generatedBy: 'opus-subagents',
  generatedAt: new Date().toISOString().slice(0, 10),
  rubric: 'docs/WATCHABILITY.md',
  races, stages,
};
fs.writeFileSync(OUT, JSON.stringify(payload, null, 2) + '\n');
// Separate audit file with the spoiler-y rationales — NOT read by any generator.
fs.writeFileSync('data/results/watchability-notes.json', JSON.stringify({ generatedBy: 'opus-subagents', notes }, null, 2) + '\n');

const dist = {};
[...Object.values(races), ...Object.values(stages)].forEach(v => dist[v] = (dist[v] || 0) + 1);
console.log(`merged ${merged} units → ${OUT}`);
console.log(`  one-day races: ${Object.keys(races).length} · stages: ${Object.keys(stages).length}`);
console.log('  flame distribution:', JSON.stringify(dist));
if (missing.length) process.exitCode = 1;
