#!/usr/bin/env node

/**
 * One-time (idempotent) migration for the spoiler-video quarantine gate.
 *
 * The render gate (lib/footage-review.js) renders a footage link ONLY when its
 * entry carries `review.status === "approved"`. Every footage entry that existed
 * BEFORE the gate was added must therefore be grandfathered to `approved`, or the
 * gate would silently hide the site's existing videos.
 *
 * A "footage entry" is any race or stage that carries a real (non-TBD) watch `url`.
 * This covers both the race-level footage the routine writes (race.url/platform)
 * and per-stage footage (stage.url/platform), across all platforms (YouTube,
 * FloBikes, …). Entries that already have a `review` record are left untouched, so
 * re-running is safe and pending/rejected decisions are never clobbered.
 *
 * Usage:
 *   node scripts/migrate-footage-review.js            # apply
 *   node scripts/migrate-footage-review.js --dry-run  # report only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { hasFootageUrl } from '../lib/footage-review.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = path.join(ROOT, 'data/race-data.json');
const DRY = process.argv.includes('--dry-run');
const TODAY = new Date().toISOString().slice(0, 10);

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const races = Array.isArray(data) ? data : data.races;

const grandfather = { addedBy: 'grandfather', added: TODAY };

let raceFilled = 0, stageFilled = 0, raceAlready = 0, stageAlready = 0;
let raceFootage = 0, stageFootage = 0;

for (const race of races) {
  if (hasFootageUrl(race)) {
    raceFootage++;
    if (race.review) raceAlready++;
    else { race.review = { status: 'approved', ...grandfather }; raceFilled++; }
  }
  for (const stage of race.stages || []) {
    if (hasFootageUrl(stage)) {
      stageFootage++;
      if (stage.review) stageAlready++;
      else { stage.review = { status: 'approved', ...grandfather }; stageFilled++; }
    }
  }
}

console.log(`Footage entries found: ${raceFootage} race-level, ${stageFootage} stage-level`);
console.log(`Grandfathered to approved: ${raceFilled} race-level, ${stageFilled} stage-level`);
console.log(`Already had a review record (left as-is): ${raceAlready} race-level, ${stageAlready} stage-level`);

if (DRY) {
  console.log('[dry-run] no file written');
} else if (raceFilled + stageFilled > 0) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log(`✓ written to data/race-data.json`);
} else {
  console.log('nothing to migrate — all footage already has a review record');
}
