#!/usr/bin/env node
// Build the TOUR-aggregate work-list: every 3★+ stage race with results, with its
// per-stage fires (from data/results/watchability.json), batched into
// /tmp/watch/tour-batch-N.json for the parallel Opus aggregate-scoring subagents.
// Idempotent: skips tours already present in watchability.json `tours`.
// Usage: node scripts/score-tours-worklist.js [numBatches]
import fs from 'fs';
const N = Number(process.argv[2]) || 4;
fs.mkdirSync('/tmp/watch', { recursive: true });
const RD = JSON.parse(fs.readFileSync('data/race-data.json', 'utf8'));
const nameOf = {}, ratingOf = {};
for (const r of RD.races) { nameOf[r.id] = r.name || r.id; ratingOf[r.id] = r.rating || 0; }
let w = { stages: {}, tours: {} };
try { w = JSON.parse(fs.readFileSync('data/results/watchability.json', 'utf8')); } catch {}
const races = fs.readdirSync('data/results/races').filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
const stages = fs.readdirSync('data/results/stages').filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
const tours = [];
for (const id of races) {
  const myStages = stages.filter(s => s.startsWith(id + '-stage-')).sort((a, b) => (+a.match(/stage-(\d+)/)[1]) - (+b.match(/stage-(\d+)/)[1]));
  if (!myStages.length || (ratingOf[id] || 0) < 3) continue;
  if (w.tours && w.tours[id] != null) continue; // already aggregated
  tours.push({ raceId: id, name: nameOf[id], rating: ratingOf[id], overviewPath: 'data/results/races/' + id + '.json',
    stages: myStages.map(s => ({ n: +s.match(/stage-(\d+)/)[1], fire: w.stages?.[s] ?? null, path: 'data/results/stages/' + s + '.json' })) });
}
const batches = Array.from({ length: N }, () => []);
tours.forEach((t, i) => batches[i % N].push(t));
batches.forEach((b, i) => fs.writeFileSync(`/tmp/watch/tour-batch-${i}.json`, JSON.stringify(b, null, 2)));
console.log(`tours to aggregate: ${tours.length} → ${N} batches in /tmp/watch/`);
