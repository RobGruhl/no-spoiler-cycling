#!/usr/bin/env node

/**
 * Populate races with their participating top riders
 * Reads riders.json and adds topRiders to races in race-data.json
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Slug mapping for race names that differ between PCS and our race-data.json
 */
const RACE_SLUG_MAPPING = {
  'dauphine': 'tour-auvergne-rhone-alpes',
  'e3-harelbeke': 'e3-saxo-classic',
  'omloop-het-nieuwsblad': 'omloop-van-het-hageland',
  'vuelta-a-la-comunidad-valenciana': 'volta-comunitat-valenciana',
  'tour-cycliste-international-la-provence': 'tour-de-la-provence',
  'trofeo-ses-salines-felanitx': 'trofeo-ses-salines',
  // These races are NOT in race-data.json - can't link:
  // - volta-a-catalunya (Volta Ciclista a Catalunya)
  // - alula-tour (AlUla Tour)
};

function loadRiders() {
  const ridersPath = join(__dirname, 'data', 'riders.json');
  if (!existsSync(ridersPath)) {
    return { lastUpdated: null, riders: [] };
  }
  return JSON.parse(readFileSync(ridersPath, 'utf-8'));
}

function loadOutsiders() {
  const outsidersPath = join(__dirname, 'data', 'outsiders.json');
  if (!existsSync(outsidersPath)) {
    return { lastUpdated: null, riders: [] };
  }
  return JSON.parse(readFileSync(outsidersPath, 'utf-8'));
}

function loadRaceData() {
  const raceDataPath = join(__dirname, 'data', 'race-data.json');
  if (!existsSync(raceDataPath)) {
    return { lastUpdated: null, races: [] };
  }
  return JSON.parse(readFileSync(raceDataPath, 'utf-8'));
}

function saveRaceData(raceData) {
  const raceDataPath = join(__dirname, 'data', 'race-data.json');
  raceData.lastUpdated = new Date().toISOString();
  writeFileSync(raceDataPath, JSON.stringify(raceData, null, 2));
  console.log(`✅ Saved race data with ${raceData.races.length} races`);
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
 * Populate races with their participating top riders
 */
function populateRaceRiders() {
  console.log('\n🚴 Populating races with top riders...');

  const ridersData = loadRiders();
  const outsidersData = loadOutsiders();
  const raceData = loadRaceData();

  if (ridersData.riders.length === 0) {
    console.log('❌ No riders found in riders.json');
    return;
  }

  console.log(`   📊 Found ${ridersData.riders.length} ranked riders`);
  console.log(`   ✦ Found ${outsidersData.riders.length} outsiders`);
  console.log(`   📊 Found ${raceData.races.length} races`);

  // Build set of all race IDs for quick lookup
  const raceIds = new Set(raceData.races.map(r => r.id));

  // Build map: raceId -> array of riders
  const raceRidersMap = new Map();
  const unmatchedSlugs = new Set();

  // Combined source: ranked riders first (carry ranking), then outsiders (no ranking, isOutsider flag)
  const allSources = [
    ...ridersData.riders.map(r => ({ ...r, _isOutsider: false })),
    ...outsidersData.riders.map(r => ({ ...r, _isOutsider: true }))
  ];

  for (const rider of allSources) {
    if (!rider.raceProgram || !rider.raceProgram.races) continue;

    for (const programRace of rider.raceProgram.races) {
      const raceId = findRaceId(programRace.raceSlug, raceIds);

      if (raceId) {
        if (!raceRidersMap.has(raceId)) {
          raceRidersMap.set(raceId, []);
        }

        // Add rider info (minimal data for display)
        const entry = {
          id: rider.id,
          name: rider.name,
          team: rider.team,
          ranking: rider.ranking,
          nationality: rider.nationality,
          nationalityCode: rider.nationalityCode,
          specialties: rider.specialties
        };
        if (rider._isOutsider) {
          entry.isOutsider = true;
          if (rider.outsiderNote) entry.outsiderNote = rider.outsiderNote;
        }
        raceRidersMap.get(raceId).push(entry);
      } else {
        unmatchedSlugs.add(programRace.raceSlug);
      }
    }
  }

  // Log unmatched slugs for debugging
  if (unmatchedSlugs.size > 0) {
    console.log('\n   ⚠️  Unmatched race slugs (need mapping):');
    for (const slug of unmatchedSlugs) {
      console.log(`      - ${slug}`);
    }
  }

  // Update races with topRiders
  let racesWithRiders = 0;
  let totalRiderSlots = 0;

  for (const race of raceData.races) {
    const riders = raceRidersMap.get(race.id);
    if (riders && riders.length > 0) {
      // Sort by ranking
      riders.sort((a, b) => (a.ranking || 999) - (b.ranking || 999));
      race.topRiders = riders;
      racesWithRiders++;
      totalRiderSlots += riders.length;
    } else {
      // Remove old topRiders if no riders found
      delete race.topRiders;
    }
  }

  console.log(`\n   ✅ ${racesWithRiders} races have top riders`);
  console.log(`   ✅ ${totalRiderSlots} total rider participations linked`);

  // Log races with most riders
  const topRaces = raceData.races
    .filter(r => r.topRiders)
    .sort((a, b) => b.topRiders.length - a.topRiders.length)
    .slice(0, 10);

  if (topRaces.length > 0) {
    console.log('\n   📊 Races with most top riders:');
    topRaces.forEach(r => {
      console.log(`      ${r.name}: ${r.topRiders.length} riders`);
    });
  }

  saveRaceData(raceData);
  console.log('\n✅ Done!');
}

// Run it
populateRaceRiders();
