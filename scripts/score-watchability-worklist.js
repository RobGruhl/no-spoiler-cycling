#!/usr/bin/env node
// Build the watchability work-list: every WATCHABLE UNIT (one-day race + each stage),
// batched into /tmp/watch/batch-N.json for the parallel Opus scoring subagents.
// (Stage-race OVERVIEWS are excluded — they're not a single watchable unit.)
// Usage: node scripts/score-watchability-worklist.js [numBatches]
import fs from 'fs';
const N = Number(process.argv[2]) || 12;
fs.mkdirSync('/tmp/watch', { recursive: true });
const RD = JSON.parse(fs.readFileSync('data/race-data.json', 'utf8'));
const nameOf = {}, ratingOf = {};
for (const r of RD.races) { nameOf[r.id] = r.name || r.id; ratingOf[r.id] = r.rating || 0; }
const races = fs.readdirSync('data/results/races').filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
const stages = fs.readdirSync('data/results/stages').filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
const units = [];
for (const id of races) {
  if (stages.some(s => s.startsWith(id + '-stage-'))) continue; // stage-race overview, skip
  units.push({ key: 'race:' + id, kind: 'race', path: 'data/results/races/' + id + '.json', name: nameOf[id] || id, rating: ratingOf[id] || 0 });
}
for (const s of stages) {
  const raceId = s.replace(/-stage-\d+$/, '');
  units.push({ key: 'stage:' + s, kind: 'stage', path: 'data/results/stages/' + s + '.json', name: nameOf[raceId] || raceId, rating: ratingOf[raceId] || 0 });
}
const batches = Array.from({ length: N }, () => []);
units.forEach((u, i) => batches[i % N].push(u));
batches.forEach((b, i) => fs.writeFileSync(`/tmp/watch/batch-${i}.json`, JSON.stringify(b, null, 2)));
console.log(`watchable units: ${units.length} → ${N} batches in /tmp/watch/`);
