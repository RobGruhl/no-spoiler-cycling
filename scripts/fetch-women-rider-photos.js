#!/usr/bin/env node

/**
 * Fetch Women's Rider Data
 *
 * Scrapes ProCyclingStats profiles for each woman rider to get:
 * - Photo URLs (downloads to riders/photos/)
 * - Race programs (2026 calendar)
 */

import { readFileSync, writeFileSync } from 'fs';
import { scrapeRiderProfile, downloadRiderPhoto, scrapeRiderProgram } from '../lib/rider-utils.js';

const DELAY_MS = 2000; // 2 second delay between requests

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWomenRiderData() {
  const ridersPath = './data/riders-women.json';
  const ridersData = JSON.parse(readFileSync(ridersPath, 'utf8'));

  let photosUpdated = 0;
  let photosSkipped = 0;
  let programsUpdated = 0;
  let programsSkipped = 0;
  let failed = 0;

  console.log(`\n📷 Fetching data for ${ridersData.riders.length} women riders...\n`);

  for (let i = 0; i < ridersData.riders.length; i++) {
    const rider = ridersData.riders[i];
    const hasPhoto = rider.photoUrl && rider.photoUrl.startsWith('riders/');
    const hasProgram = rider.raceProgram?.status === 'announced' && rider.raceProgram?.races?.length > 0;

    // Skip if already has both photo and program
    if (hasPhoto && hasProgram) {
      console.log(`[${i + 1}/${ridersData.riders.length}] ${rider.name} - already complete`);
      photosSkipped++;
      programsSkipped++;
      continue;
    }

    console.log(`[${i + 1}/${ridersData.riders.length}] ${rider.name}`);

    try {
      // Fetch photo if missing
      if (!hasPhoto) {
        const profile = await scrapeRiderProfile(rider.slug);

        if (profile?.photoUrl) {
          try {
            const localPath = await downloadRiderPhoto(profile.photoUrl, rider.slug);
            rider.photoUrl = localPath;
            photosUpdated++;
            console.log(`   ✅ Photo: ${localPath}`);

            // Also update other profile fields if available
            if (profile.dateOfBirth && !rider.dateOfBirth) {
              rider.dateOfBirth = profile.dateOfBirth;
            }
            if (profile.weight && !rider.weight) {
              rider.weight = profile.weight;
            }
            if (profile.height && !rider.height) {
              rider.height = profile.height;
            }
          } catch (e) {
            console.error(`   ❌ Photo failed: ${e.message}`);
          }
        } else {
          console.log(`   ⚠️ No photo on PCS`);
        }
      } else {
        photosSkipped++;
      }

      // Fetch race program if missing
      if (!hasProgram) {
        const program = await scrapeRiderProgram(rider.slug);

        if (program && program.races && program.races.length > 0) {
          rider.raceProgram = program;
          programsUpdated++;
          console.log(`   ✅ Program: ${program.races.length} races`);
        } else {
          console.log(`   ⚠️ No announced program`);
        }
      } else {
        programsSkipped++;
      }
    } catch (e) {
      console.error(`   ❌ Failed: ${e.message}`);
      failed++;
    }

    // Rate limiting (except for last rider)
    if (i < ridersData.riders.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  // Save updated riders data
  ridersData.lastUpdated = new Date().toISOString();
  writeFileSync(ridersPath, JSON.stringify(ridersData, null, 2));

  console.log(`\n✅ Complete!`);
  console.log(`   Photos: ${photosUpdated} updated, ${photosSkipped} skipped`);
  console.log(`   Programs: ${programsUpdated} updated, ${programsSkipped} skipped`);
  console.log(`   Failed: ${failed}`);
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Women's Rider Data Fetcher

Scrapes ProCyclingStats for rider photos and race programs.

Usage:
  node scripts/fetch-women-rider-photos.js         Fetch missing photos and programs
  node scripts/fetch-women-rider-photos.js --help  Show this help

Output:
  - Photos saved to: ./riders/photos/<slug>.jpg
  - Race programs updated in: ./data/riders-women.json
`);
} else {
  fetchWomenRiderData().catch(console.error);
}
