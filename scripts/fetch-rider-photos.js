#!/usr/bin/env node

/**
 * NOTE (2026-07): Rider photos were removed from the site pending licensing.
 * Generated pages now render initials-in-a-circle placeholders instead
 * (see lib/site-chrome.js). Do NOT re-run the photo-download path against
 * ProCyclingStats until image licensing is resolved. The race-program
 * fetch below is unaffected by that concern.
 *
 * Fetch rider data from ProCyclingStats.
 *
 * Downloads high-res rider photos (the /images/riders/<2>/<2>/<slug>-<year>.jpg
 * form — no thumbnails) and the rider's 2026 race program, then writes back
 * to data/riders.json, data/riders-women.json, or data/outsiders.json.
 *
 * Usage:
 *   node scripts/fetch-rider-photos.js                 men + women + outsiders
 *   node scripts/fetch-rider-photos.js --gender men    men only
 *   node scripts/fetch-rider-photos.js --gender women  women only
 *   node scripts/fetch-rider-photos.js --outsiders     outsiders only
 *   node scripts/fetch-rider-photos.js --rider <slug>  single rider (any roster)
 *   node scripts/fetch-rider-photos.js --force         re-download even if already on disk
 *   node scripts/fetch-rider-photos.js --no-program    skip race-program scrape (photo only)
 *   node scripts/fetch-rider-photos.js --help          show this help
 *
 * Photos land in ./riders/photos/<slug>.jpg. The local path is written
 * back to the roster's `photoUrl` field.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { scrapeRiderProfile, downloadRiderPhoto, scrapeRiderProgram } from '../lib/rider-utils.js';

const DELAY_MS = 2000;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const ROSTERS = {
  men:       { path: './data/riders.json',         label: 'men',       supportsPrograms: true  },
  women:     { path: './data/riders-women.json',   label: 'women',     supportsPrograms: true  },
  outsiders: { path: './data/outsiders.json',      label: 'outsiders', supportsPrograms: true  },
};

function loadRoster(key) {
  const cfg = ROSTERS[key];
  const data = JSON.parse(readFileSync(cfg.path, 'utf8'));
  return { cfg, data, riders: data.riders };
}

function saveRoster({ cfg, data }) {
  data.lastUpdated = new Date().toISOString();
  writeFileSync(cfg.path, JSON.stringify(data, null, 2));
}

function hasLocalPhoto(rider) {
  if (!rider.photoUrl) return false;
  // Local photo paths look like "riders/photos/<slug>.jpg".
  // External procyclingstats URLs aren't usable as a stable local source.
  return rider.photoUrl.startsWith('riders/');
}

async function processRider(rider, { force, skipProgram, supportsPrograms }) {
  const slug = rider.slug || rider.id;
  if (!slug) return { result: 'no-slug' };

  let photoResult = 'skipped';
  let programResult = 'skipped';

  const needPhoto = force || !hasLocalPhoto(rider) || !existsSync(`./${rider.photoUrl}`);
  const hasAnnouncedProgram = rider.raceProgram?.status === 'announced' && rider.raceProgram?.races?.length > 0;
  const needProgram = supportsPrograms && !skipProgram && !hasAnnouncedProgram;

  if (!needPhoto && !needProgram) return { result: 'already-complete', photoResult, programResult };

  const profile = await scrapeRiderProfile(slug);

  if (needPhoto) {
    if (profile?.photoUrl) {
      try {
        const localPath = await downloadRiderPhoto(profile.photoUrl, slug);
        if (localPath) {
          rider.photoUrl = localPath;
          photoResult = 'updated';
        } else {
          photoResult = 'download-empty';
        }
      } catch (e) {
        photoResult = `error:${e.message}`;
      }
    } else {
      photoResult = 'no-pcs-photo';
    }

    // Backfill biographical fields on the way through — same as the original
    if (profile?.dateOfBirth && !rider.dateOfBirth) rider.dateOfBirth = profile.dateOfBirth;
    if (profile?.weight && !rider.weight) rider.weight = profile.weight;
    if (profile?.height && !rider.height) rider.height = profile.height;
    if (profile?.nationality && !rider.nationality) rider.nationality = profile.nationality;
  }

  if (needProgram) {
    try {
      const program = await scrapeRiderProgram(slug);
      if (program?.races?.length) {
        rider.raceProgram = program;
        programResult = 'updated';
      } else {
        programResult = 'no-program';
      }
    } catch (e) {
      programResult = `error:${e.message}`;
    }
  }

  return { result: 'processed', photoResult, programResult };
}

async function processRoster(rosterKey, opts) {
  const { cfg, data, riders } = loadRoster(rosterKey);
  console.log(`\n📷 Roster: ${cfg.label} — ${riders.length} riders\n`);

  const counts = { processed: 0, photoUpdated: 0, programUpdated: 0, photoFail: 0, programFail: 0, skipped: 0 };

  for (let i = 0; i < riders.length; i++) {
    const r = riders[i];
    const slug = r.slug || r.id;

    // Skip single-rider mode mismatches
    if (opts.singleRider && slug !== opts.singleRider) continue;

    process.stdout.write(`[${i + 1}/${riders.length}] ${r.name || slug}`);

    let out;
    try {
      out = await processRider(r, { force: opts.force, skipProgram: opts.skipProgram, supportsPrograms: cfg.supportsPrograms });
    } catch (e) {
      console.log(`  ❌ ${e.message}`);
      continue;
    }

    if (out.result === 'already-complete') {
      console.log('  — complete');
      counts.skipped++;
    } else if (out.result === 'no-slug') {
      console.log('  ⚠️  no slug, skipping');
      counts.skipped++;
    } else {
      const ph = out.photoResult === 'updated' ? '📷✅' : out.photoResult === 'skipped' ? '·' : (out.photoResult.startsWith('error') || out.photoResult === 'no-pcs-photo' || out.photoResult === 'download-empty' ? '📷❌' : '?');
      const pr = out.programResult === 'updated' ? '📅✅' : out.programResult === 'skipped' ? '·' : '📅❌';
      console.log(`  ${ph} ${pr}`);
      counts.processed++;
      if (out.photoResult === 'updated') counts.photoUpdated++;
      if (out.programResult === 'updated') counts.programUpdated++;
      if (out.photoResult.startsWith('error') || out.photoResult === 'no-pcs-photo') counts.photoFail++;
      if (out.programResult.startsWith('error')) counts.programFail++;
      saveRoster({ cfg, data }); // save after each rider so partial progress survives a crash
    }

    if (i < riders.length - 1 && !opts.singleRider) await sleep(DELAY_MS);
  }

  console.log(`\n   processed=${counts.processed}  photos+${counts.photoUpdated}  programs+${counts.programUpdated}  photoFail=${counts.photoFail}  programFail=${counts.programFail}  skipped=${counts.skipped}`);
  return counts;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(`
Rider Data Fetcher (ProCyclingStats)

Usage:
  node scripts/fetch-rider-photos.js                 all rosters (men + women + outsiders)
  node scripts/fetch-rider-photos.js --gender men
  node scripts/fetch-rider-photos.js --gender women
  node scripts/fetch-rider-photos.js --outsiders
  node scripts/fetch-rider-photos.js --rider <slug>  single rider, any roster
  node scripts/fetch-rider-photos.js --force         re-download even if photoUrl is local
  node scripts/fetch-rider-photos.js --no-program    skip race-program scrape

Photos land in ./riders/photos/<slug>.jpg and the path is written back to the
roster's photoUrl field. Bio fields (DOB, height, weight, nationality) are
backfilled if missing.
`);
    return;
  }

  const force = args.includes('--force');
  const skipProgram = args.includes('--no-program');
  const singleRiderIdx = args.indexOf('--rider');
  const singleRider = singleRiderIdx !== -1 ? args[singleRiderIdx + 1] : null;
  const opts = { force, skipProgram, singleRider };

  let rosters;
  if (singleRider) {
    rosters = ['men', 'women', 'outsiders'];
  } else if (args.includes('--gender') && args[args.indexOf('--gender') + 1] === 'men') {
    rosters = ['men'];
  } else if (args.includes('--gender') && args[args.indexOf('--gender') + 1] === 'women') {
    rosters = ['women'];
  } else if (args.includes('--outsiders')) {
    rosters = ['outsiders'];
  } else {
    rosters = ['men', 'women', 'outsiders'];
  }

  for (const r of rosters) {
    await processRoster(r, opts);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
