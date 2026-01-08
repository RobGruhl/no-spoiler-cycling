#!/usr/bin/env node

/**
 * Fetch Women's Rider Photos
 *
 * Scrapes ProCyclingStats profiles for each woman rider to get their photo URLs,
 * then downloads the photos to the riders/photos/ directory.
 */

import { readFileSync, writeFileSync } from 'fs';
import { scrapeRiderProfile, downloadRiderPhoto } from '../lib/rider-utils.js';

const DELAY_MS = 2000; // 2 second delay between requests

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWomenRiderPhotos() {
  const ridersPath = './data/riders-women.json';
  const ridersData = JSON.parse(readFileSync(ridersPath, 'utf8'));

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  console.log(`\n📷 Fetching photos for ${ridersData.riders.length} women riders...\n`);

  for (let i = 0; i < ridersData.riders.length; i++) {
    const rider = ridersData.riders[i];

    // Skip if already has photo
    if (rider.photoUrl && rider.photoUrl.startsWith('riders/')) {
      console.log(`[${i + 1}/${ridersData.riders.length}] ${rider.name} - already has photo`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${ridersData.riders.length}] ${rider.name}`);

    try {
      // Scrape profile to get photo URL
      const profile = await scrapeRiderProfile(rider.slug);

      if (profile?.photoUrl) {
        // Download photo
        try {
          const localPath = await downloadRiderPhoto(profile.photoUrl, rider.slug);
          rider.photoUrl = localPath;
          updated++;
          console.log(`   ✅ Downloaded: ${localPath}`);

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
          console.error(`   ❌ Failed to download: ${e.message}`);
          failed++;
        }
      } else {
        console.log(`   ⚠️ No photo found on PCS`);
        failed++;
      }
    } catch (e) {
      console.error(`   ❌ Failed to scrape profile: ${e.message}`);
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
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (already had photos): ${skipped}`);
  console.log(`   Failed: ${failed}`);
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Women's Rider Photo Fetcher

Scrapes ProCyclingStats for rider photos and downloads them locally.

Usage:
  node scripts/fetch-women-rider-photos.js         Fetch all missing photos
  node scripts/fetch-women-rider-photos.js --help  Show this help

Output:
  - Photos saved to: ./riders/photos/<slug>.jpg
  - Data updated in: ./data/riders-women.json
`);
} else {
  fetchWomenRiderPhotos().catch(console.error);
}
