#!/usr/bin/env node
/**
 * Update an existing race in race-data.json
 *
 * Usage:
 *   node scripts/update-race.js --id <race-id> --file /tmp/updates.json
 *   node scripts/update-race.js --id <race-id> --file /tmp/updates.json --dry-run
 *   node scripts/update-race.js --id <race-id> --set 'platform=FloBikes' --set 'verified=true'
 *   cat /tmp/updates.json | node scripts/update-race.js --id <race-id> --stdin
 *
 * The updates JSON should contain fields to update/add to the race.
 * Existing fields are preserved unless explicitly overwritten.
 *
 * Special handling:
 *   - topRiders: merged by id (existing riders preserved, new riders added)
 *   - broadcast.geos: deep merged (existing geos preserved, new geos added)
 *   - stages: replaced entirely (use with caution)
 *   - raceDetails: deep merged
 *
 * Examples:
 *   # Update platform and URL
 *   echo '{"platform":"FloBikes","url":"https://..."}' | node scripts/update-race.js --id paris-roubaix-2026 --stdin
 *
 *   # Add broadcast info
 *   node scripts/update-race.js --id tdf-2026 --file /tmp/broadcast.json
 *
 *   # Quick field updates
 *   node scripts/update-race.js --id race-id --set 'verified=true' --set 'rating=4'
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/race-data.json');

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const useStdin = args.includes('--stdin');
const idIndex = args.indexOf('--id');
const raceId = idIndex !== -1 ? args[idIndex + 1] : null;
const fileIndex = args.indexOf('--file');
const inputFile = fileIndex !== -1 ? args[fileIndex + 1] : null;

// Parse --set arguments
const setArgs = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--set' && args[i + 1]) {
    setArgs.push(args[i + 1]);
  }
}

if (!raceId) {
  console.error('Usage: node scripts/update-race.js --id <race-id> --file <path> [--dry-run]');
  console.error('       node scripts/update-race.js --id <race-id> --stdin [--dry-run]');
  console.error('       node scripts/update-race.js --id <race-id> --set "field=value" [--dry-run]');
  process.exit(1);
}

if (!useStdin && !inputFile && setArgs.length === 0) {
  console.error('Error: Must provide --file, --stdin, or --set arguments');
  process.exit(1);
}

/**
 * Read updates JSON from file or stdin
 */
async function readUpdatesInput() {
  if (setArgs.length > 0) {
    // Parse --set arguments into object
    const updates = {};
    for (const arg of setArgs) {
      const [key, ...valueParts] = arg.split('=');
      const value = valueParts.join('='); // Handle values with = in them

      // Try to parse as JSON for booleans/numbers/objects
      try {
        updates[key] = JSON.parse(value);
      } catch {
        updates[key] = value; // Keep as string
      }
    }
    return updates;
  }

  if (useStdin) {
    const chunks = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
  } else {
    return JSON.parse(readFileSync(inputFile, 'utf-8'));
  }
}

/**
 * Deep merge objects, with special handling for arrays
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];

    if (sourceVal === null || sourceVal === undefined) {
      continue; // Skip null/undefined values
    }

    if (Array.isArray(sourceVal)) {
      // Arrays are replaced entirely (except topRiders which is merged by id)
      result[key] = sourceVal;
    } else if (typeof sourceVal === 'object' && typeof targetVal === 'object' && !Array.isArray(targetVal)) {
      // Recursively merge objects
      result[key] = deepMerge(targetVal, sourceVal);
    } else {
      // Primitive values are replaced
      result[key] = sourceVal;
    }
  }

  return result;
}

/**
 * Merge topRiders arrays by id (preserves existing, adds new)
 */
function mergeTopRiders(existing, incoming) {
  if (!incoming || incoming.length === 0) return existing;
  if (!existing || existing.length === 0) return incoming;

  const result = [...existing];
  const existingIds = new Set(existing.map(r => r.id));

  for (const rider of incoming) {
    if (!existingIds.has(rider.id)) {
      result.push(rider);
    } else {
      // Update existing rider
      const idx = result.findIndex(r => r.id === rider.id);
      result[idx] = { ...result[idx], ...rider };
    }
  }

  return result;
}

/**
 * Apply updates to race with special field handling
 */
function applyUpdates(race, updates) {
  // Handle special fields
  let result = { ...race };

  // topRiders: merge by id
  if (updates.topRiders) {
    result.topRiders = mergeTopRiders(race.topRiders, updates.topRiders);
    delete updates.topRiders;
  }

  // broadcast: deep merge
  if (updates.broadcast) {
    result.broadcast = deepMerge(race.broadcast || {}, updates.broadcast);
    delete updates.broadcast;
  }

  // raceDetails: deep merge
  if (updates.raceDetails) {
    result.raceDetails = deepMerge(race.raceDetails || {}, updates.raceDetails);
    delete updates.raceDetails;
  }

  // stages: replace entirely (with warning)
  if (updates.stages) {
    if (race.stages && race.stages.length > 0) {
      console.log('⚠ Warning: Replacing existing stages array');
    }
    result.stages = updates.stages;
    delete updates.stages;
  }

  // Apply remaining updates
  result = { ...result, ...updates };

  return result;
}

// Main execution
async function main() {
  try {
    // Load existing data
    console.log('Loading race-data.json...');
    const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

    // Find race
    const raceIndex = data.races.findIndex(r => r.id === raceId);
    if (raceIndex === -1) {
      console.error(`✗ Race not found: ${raceId}`);
      console.error('\nAvailable races (first 10):');
      data.races.slice(0, 10).forEach(r => console.error(`  ${r.id}`));
      process.exit(1);
    }

    const race = data.races[raceIndex];
    console.log(`✓ Found race: ${race.name}`);

    // Read updates
    console.log(setArgs.length > 0 ? 'Parsing --set arguments...' :
      useStdin ? 'Reading updates from stdin...' : `Reading updates from ${inputFile}...`);
    const updates = await readUpdatesInput();
    console.log(`  Fields to update: ${Object.keys(updates).join(', ')}`);

    // Prevent changing race id
    if (updates.id && updates.id !== raceId) {
      console.error('✗ Cannot change race id. Create a new race instead.');
      process.exit(1);
    }

    // Apply updates
    const updatedRace = applyUpdates(race, updates);

    if (dryRun) {
      console.log('\n[DRY RUN] Would update race to:');
      console.log(JSON.stringify(updatedRace, null, 2));
      console.log('\nRun without --dry-run to apply changes.');
      return;
    }

    // Save
    data.races[raceIndex] = updatedRace;
    data.lastUpdated = new Date().toISOString();
    writeFileSync(dataPath, JSON.stringify(data, null, 2));

    console.log(`\n✓ Updated race: ${updatedRace.name}`);
    console.log(`  ID: ${raceId}`);
    console.log(`  Updated fields: ${Object.keys(updates).join(', ')}`);
    console.log('\nDone! Run "npm run build" to regenerate HTML.');

  } catch (error) {
    console.error(`\n✗ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
