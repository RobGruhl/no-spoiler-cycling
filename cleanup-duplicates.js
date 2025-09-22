#!/usr/bin/env node

/**
 * Clean up duplicate race entries and optimize the race data
 */

import fs from 'fs';

function cleanupDuplicates() {
  const raceDataPath = './data/race-data.json';
  const data = JSON.parse(fs.readFileSync(raceDataPath, 'utf8'));

  // Remove duplicates by URL
  const uniqueRaces = [];
  const seenUrls = new Set();

  for (const race of data.races) {
    if (!seenUrls.has(race.url)) {
      seenUrls.add(race.url);
      uniqueRaces.push(race);
    }
  }

  // Sort by content type priority: highlights, time-trial, recording
  const typePriority = {
    'highlights': 1,
    'time-trial': 2,
    'recording': 3
  };

  uniqueRaces.sort((a, b) => {
    const aPriority = typePriority[a.type] || 4;
    const bPriority = typePriority[b.type] || 4;
    return aPriority - bPriority;
  });

  // Update data with cleaned races
  data.races = uniqueRaces;
  data.lastUpdated = new Date().toISOString();

  // Save cleaned data
  fs.writeFileSync(raceDataPath, JSON.stringify(data, null, 2));

  console.log(`✅ Cleaned up race data:`);
  console.log(`   Original: ${data.races.length + (seenUrls.size - uniqueRaces.length)} races`);
  console.log(`   Cleaned: ${uniqueRaces.length} unique races`);
  console.log(`   Removed: ${seenUrls.size - uniqueRaces.length} duplicates`);

  return uniqueRaces.length;
}

// Run cleanup
const cleanCount = cleanupDuplicates();
console.log(`\n🎯 Ready to regenerate HTML with ${cleanCount} clean race entries`);