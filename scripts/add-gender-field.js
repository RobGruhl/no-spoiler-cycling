#!/usr/bin/env node
/**
 * Add gender field to existing races in race-data.json
 * Sets gender: "men" for all existing races that don't have a gender field
 * Also detects and corrects any existing women's/mixed races based on name patterns
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/race-data.json');

// Women's race detection patterns
const WOMEN_NAME_PATTERNS = [
  /women/i,
  /femmes/i,
  /ladies/i,
  /dames/i,
  /femenina/i,
  /feminin/i,
  /feminina/i,
  /donne/i,
  /\(women\)/i,
  /women's/i
];

// Women's category patterns
const WOMEN_CATEGORY_PATTERNS = [
  /\.WWT$/,
  /^1\.WWT$/,
  /^2\.WWT$/
];

// Mixed event patterns (World Championships Mixed Relay)
const MIXED_PATTERNS = [
  /mixed relay/i,
  /mixed team/i
];

/**
 * Detect gender from race name and category
 */
function detectGender(race) {
  const name = race.name || '';
  const category = race.category || '';

  // Check for mixed events first
  if (MIXED_PATTERNS.some(p => p.test(name))) {
    return 'mixed';
  }

  // Check for women's events by name
  if (WOMEN_NAME_PATTERNS.some(p => p.test(name))) {
    return 'women';
  }

  // Check for women's events by category
  if (WOMEN_CATEGORY_PATTERNS.some(p => p.test(category))) {
    return 'women';
  }

  // Default to men
  return 'men';
}

// Load race data
console.log('Loading race data...');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

// Track changes
let menCount = 0;
let womenCount = 0;
let mixedCount = 0;
let alreadyTagged = 0;

// Process each race
data.races = data.races.map(race => {
  // If already has gender field and it's valid, keep it
  if (race.gender && ['men', 'women', 'mixed'].includes(race.gender)) {
    alreadyTagged++;
    if (race.gender === 'men') menCount++;
    else if (race.gender === 'women') womenCount++;
    else mixedCount++;
    return race;
  }

  // Detect gender
  const gender = detectGender(race);

  if (gender === 'men') menCount++;
  else if (gender === 'women') womenCount++;
  else mixedCount++;

  return {
    ...race,
    gender
  };
});

// Update lastUpdated
data.lastUpdated = new Date().toISOString();

// Save
writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log('\nGender field added to races:');
console.log(`  Men's races: ${menCount}`);
console.log(`  Women's races: ${womenCount}`);
console.log(`  Mixed events: ${mixedCount}`);
console.log(`  Already tagged: ${alreadyTagged}`);
console.log(`  Total races: ${data.races.length}`);
console.log('\nDone!');
