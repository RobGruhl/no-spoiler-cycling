#!/usr/bin/env node

/**
 * Populate women's races with their participating top riders
 * Reads riders-women.json and adds topRiders to women's races in race-data.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Slug mapping for women's race names that differ between PCS and our race-data.json
 */
const RACE_SLUG_MAPPING = {
  // Add mappings as needed when populating race programs
};

function loadRidersWomen() {
  const ridersPath = join(__dirname, '../data/riders-women.json');
  if (!existsSync(ridersPath)) {
    return { lastUpdated: null, riders: [] };
  }
  return JSON.parse(readFileSync(ridersPath, 'utf-8'));
}

function loadRaceData() {
  const raceDataPath = join(__dirname, '../data/race-data.json');
  if (!existsSync(raceDataPath)) {
    return { lastUpdated: null, races: [] };
  }
  return JSON.parse(readFileSync(raceDataPath, 'utf-8'));
}

function saveRaceData(raceData) {
  const raceDataPath = join(__dirname, '../data/race-data.json');
  raceData.lastUpdated = new Date().toISOString();
  writeFileSync(raceDataPath, JSON.stringify(raceData, null, 2));
  console.log(`Saved race data with ${raceData.races.length} races`);
}

/**
 * Find race ID from rider's race slug
 */
function findRaceId(raceSlug, raceIds) {
  // Direct match: slug-2026
  const directId = `${raceSlug}-2026`;
  if (raceIds.has(directId)) {
    return directId;
  }

  // Try mapped slug
  const mappedSlug = RACE_SLUG_MAPPING[raceSlug];
  if (mappedSlug) {
    const mappedId = `${mappedSlug}-2026`;
    if (raceIds.has(mappedId)) {
      return mappedId;
    }
  }

  // Try partial match (race ID contains the slug)
  for (const raceId of raceIds) {
    if (raceId.includes(raceSlug)) {
      return raceId;
    }
  }

  return null;
}

/**
 * Populate women's races with their participating top riders
 */
function populateWomenRaceRiders() {
  console.log('\nPopulating women\'s races with top riders...');

  const ridersData = loadRidersWomen();
  const raceData = loadRaceData();

  if (ridersData.riders.length === 0) {
    console.log('No riders found in riders-women.json');
    return;
  }

  // Filter to only women's races
  const womenRaces = raceData.races.filter(r => r.gender === 'women');

  console.log(`   Found ${ridersData.riders.length} women riders`);
  console.log(`   Found ${womenRaces.length} women's races`);

  // Build set of women's race IDs for quick lookup
  const womenRaceIds = new Set(womenRaces.map(r => r.id));

  // Build map: raceId -> array of riders
  const raceRidersMap = new Map();
  const unmatchedSlugs = new Set();

  for (const rider of ridersData.riders) {
    if (!rider.raceProgram || !rider.raceProgram.races) continue;

    for (const programRace of rider.raceProgram.races) {
      const raceId = findRaceId(programRace.raceSlug, womenRaceIds);

      if (raceId) {
        if (!raceRidersMap.has(raceId)) {
          raceRidersMap.set(raceId, []);
        }

        // Add rider info (minimal data for display)
        raceRidersMap.get(raceId).push({
          id: rider.id,
          name: rider.name,
          team: rider.team,
          ranking: rider.ranking,
          nationality: rider.nationality,
          nationalityCode: rider.nationalityCode,
          specialties: rider.specialties
        });
      } else if (programRace.raceSlug) {
        unmatchedSlugs.add(programRace.raceSlug);
      }
    }
  }

  // Log unmatched slugs for debugging
  if (unmatchedSlugs.size > 0) {
    console.log('\n   Unmatched race slugs (need mapping):');
    for (const slug of unmatchedSlugs) {
      console.log(`      - ${slug}`);
    }
  }

  // Update women's races with topRiders
  let racesWithRiders = 0;
  let totalRiderSlots = 0;

  for (const race of raceData.races) {
    // Only update women's races
    if (race.gender !== 'women') continue;

    const riders = raceRidersMap.get(race.id);
    if (riders && riders.length > 0) {
      // Sort by ranking
      riders.sort((a, b) => (a.ranking || 999) - (b.ranking || 999));
      race.topRiders = riders;
      racesWithRiders++;
      totalRiderSlots += riders.length;
    } else {
      // Remove stale topRiders if no riders found
      delete race.topRiders;
    }
  }

  console.log(`\n   Races with riders: ${racesWithRiders}`);
  console.log(`   Total rider entries: ${totalRiderSlots}`);

  // Save updated race data
  saveRaceData(raceData);
  console.log('\nDone!');
}

// Run
populateWomenRaceRiders();
