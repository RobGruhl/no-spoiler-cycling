#!/usr/bin/env node
/**
 * Add a new race to race-data.json
 *
 * Usage:
 *   node scripts/add-race.js --file /tmp/new-race.json
 *   node scripts/add-race.js --file /tmp/new-race.json --dry-run
 *   cat /tmp/new-race.json | node scripts/add-race.js --stdin
 *
 * The race JSON should contain at minimum:
 *   - id: unique race identifier (e.g., "paris-roubaix-2026")
 *   - name: race display name
 *   - raceDate: ISO date string (YYYY-MM-DD)
 *
 * The script will:
 *   - Validate the race has required fields
 *   - Check for duplicate IDs
 *   - Insert the race in chronological order by raceDate
 *   - Update lastUpdated timestamp
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/race-data.json');

// Required fields for a valid race
const REQUIRED_FIELDS = ['id', 'name', 'raceDate'];

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const useStdin = args.includes('--stdin');
const fileIndex = args.indexOf('--file');
const inputFile = fileIndex !== -1 ? args[fileIndex + 1] : null;

if (!useStdin && !inputFile) {
  console.error('Usage: node scripts/add-race.js --file <path> [--dry-run]');
  console.error('       node scripts/add-race.js --stdin [--dry-run]');
  process.exit(1);
}

/**
 * Read race JSON from file or stdin
 */
async function readRaceInput() {
  if (useStdin) {
    // Read from stdin
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } else {
    // Read from file
    return JSON.parse(readFileSync(inputFile, 'utf-8'));
  }
}

/**
 * Validate race has required fields
 */
function validateRace(race) {
  const missing = REQUIRED_FIELDS.filter(field => !race[field]);
  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }

  // Validate raceDate format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(race.raceDate)) {
    throw new Error(`Invalid raceDate format: ${race.raceDate} (expected YYYY-MM-DD)`);
  }

  return true;
}

/**
 * Find insertion index to maintain chronological order
 */
function findInsertIndex(races, newRace) {
  const newDate = newRace.raceDate;

  // Find first race with date > newDate
  const index = races.findIndex(r => r.raceDate && r.raceDate > newDate);

  // If not found, append at end
  return index === -1 ? races.length : index;
}

/**
 * Add default fields if not provided
 */
function addDefaults(race) {
  return {
    platform: 'TBD',
    url: 'TBD',
    type: 'full-race',
    discoveredAt: new Date().toISOString(),
    ...race,
    // Ensure raceDay is set
    raceDay: race.raceDay || new Date(race.raceDate + 'T12:00:00Z')
      .toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' })
  };
}

// Main execution
async function main() {
  try {
    // Read input race
    console.log(useStdin ? 'Reading race from stdin...' : `Reading race from ${inputFile}...`);
    const newRace = await readRaceInput();

    // Validate
    validateRace(newRace);
    console.log(`✓ Valid race: ${newRace.id}`);

    // Load existing data
    console.log('Loading race-data.json...');
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

    // Check for duplicate
    const existing = data.races.find(r => r.id === newRace.id);
    if (existing) {
      console.error(`✗ Race with id "${newRace.id}" already exists`);
      console.error('  Use scripts/update-race.js to modify existing races');
      process.exit(1);
    }

    // Add defaults
    const raceWithDefaults = addDefaults(newRace);

    // Find insertion point
    const insertIndex = findInsertIndex(data.races, raceWithDefaults);
    console.log(`→ Will insert at position ${insertIndex} (chronological order)`);

    if (dryRun) {
      console.log('\n[DRY RUN] Would add race:');
      console.log(JSON.stringify(raceWithDefaults, null, 2));
      console.log('\nRun without --dry-run to apply changes.');
      return;
    }

    // Insert race
    data.races.splice(insertIndex, 0, raceWithDefaults);
    data.lastUpdated = new Date().toISOString();

    // Save
    writeFileSync(dataPath, JSON.stringify(data, null, 2));

    console.log(`\n✓ Added race: ${newRace.name}`);
    console.log(`  ID: ${newRace.id}`);
    console.log(`  Date: ${newRace.raceDate}`);
    console.log(`  Position: ${insertIndex} of ${data.races.length}`);
    console.log('\nDone! Run "npm run build" to regenerate HTML.');

  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
