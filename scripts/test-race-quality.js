#!/usr/bin/env node

/**
 * Race Quality Test Suite
 *
 * Validates race data quality including:
 * - Data completeness (required fields, terrain, rating)
 * - Race details (courseSummary, climbs, favorites)
 * - Broadcast quality (URLs are deep links, not root URLs)
 * - Link accessibility (optional, uses Playwright)
 * - Spoiler safety (optional, checks landing pages)
 *
 * Usage:
 *   node scripts/test-race-quality.js --race tour-down-under-2026
 *   node scripts/test-race-quality.js --from 2026-01-01 --to 2026-02-28
 *   node scripts/test-race-quality.js --race paris-roubaix-2026 --only broadcast
 *   node scripts/test-race-quality.js --race tdf-2026 --check-links
 *   node scripts/test-race-quality.js --all --compact
 *   node scripts/test-race-quality.js --race race-id --json
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  isValidUrl,
  isRootUrl,
  isDeepLink,
  validateBroadcastUrl,
  validateRaceBroadcast
} from '../lib/url-validator.js';
import {
  generateReport,
  generateCompactSummary,
  generateJsonReport,
  printReport,
  printCompactSummary,
  colors,
  symbols
} from '../lib/test-reporter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/race-data.json');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    raceId: null,
    fromDate: null,
    toDate: null,
    only: null,
    checkLinks: false,
    compact: false,
    json: false,
    all: false,
    verbose: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--race':
        options.raceId = args[++i];
        break;
      case '--from':
        options.fromDate = args[++i];
        break;
      case '--to':
        options.toDate = args[++i];
        break;
      case '--only':
        options.only = args[++i];
        break;
      case '--check-links':
        options.checkLinks = true;
        break;
      case '--compact':
        options.compact = true;
        break;
      case '--json':
        options.json = true;
        break;
      case '--all':
        options.all = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Race Quality Test Suite

Usage:
  node scripts/test-race-quality.js [options]

Options:
  --race <id>       Test a specific race by ID
  --from <date>     Test races from this date (YYYY-MM-DD)
  --to <date>       Test races until this date (YYYY-MM-DD)
  --all             Test all races
  --only <section>  Only run specific section: data, details, broadcast, links
  --check-links     Actually test URL accessibility with Playwright
  --compact         Output compact one-line summaries
  --json            Output results as JSON
  --verbose, -v     Show detailed output
  --help, -h        Show this help

Examples:
  # Test a single race
  node scripts/test-race-quality.js --race tour-down-under-2026

  # Test January-February races
  node scripts/test-race-quality.js --from 2026-01-01 --to 2026-02-28

  # Test broadcast links only
  node scripts/test-race-quality.js --race paris-roubaix-2026 --only broadcast

  # Full test with link verification
  node scripts/test-race-quality.js --race tdf-2026 --check-links

  # Batch test all races with compact output
  node scripts/test-race-quality.js --all --compact
`);
}

/**
 * Load race data
 */
function loadRaceData() {
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  return data;
}

/**
 * Find races matching criteria
 */
function findRaces(data, options) {
  let races = data.races;

  if (options.raceId) {
    const race = races.find(r => r.id === options.raceId);
    if (!race) {
      console.error(`Race not found: ${options.raceId}`);
      process.exit(1);
    }
    return [race];
  }

  if (options.fromDate || options.toDate) {
    races = races.filter(r => {
      if (!r.raceDate) return false;
      const date = r.raceDate;
      if (options.fromDate && date < options.fromDate) return false;
      if (options.toDate && date > options.toDate) return false;
      return true;
    });
  }

  return races;
}

/**
 * Check data completeness
 */
function checkDataCompleteness(race) {
  const checks = [];
  let sectionStatus = 'pass';

  // Required fields
  const requiredFields = ['id', 'name', 'raceDate', 'gender'];
  const missingRequired = requiredFields.filter(f => !race[f]);

  checks.push({
    label: 'Required fields',
    status: missingRequired.length === 0 ? 'pass' : 'fail',
    value: missingRequired.length === 0 ? 'all present' : `missing: ${missingRequired.join(', ')}`
  });

  if (missingRequired.length > 0) sectionStatus = 'fail';

  // Platform/URL status
  const hasPlatform = race.platform && race.platform !== 'TBD';
  const hasUrl = race.url && race.url !== 'TBD';
  const urlStatus = hasPlatform && hasUrl ? 'pass' :
                    hasPlatform || hasUrl ? 'warn' : 'info';

  checks.push({
    label: 'Platform/URL',
    status: urlStatus,
    value: hasPlatform ? (hasUrl ? 'populated' : 'platform only') : 'TBD'
  });

  // Terrain tags
  const hasTerrain = race.terrain && race.terrain.length > 0;
  checks.push({
    label: 'Terrain tags',
    status: hasTerrain ? 'pass' : 'warn',
    value: hasTerrain ? race.terrain.join(', ') : 'missing'
  });

  if (!hasTerrain && sectionStatus === 'pass') sectionStatus = 'warn';

  // Rating
  const hasRating = typeof race.rating === 'number';
  checks.push({
    label: 'Rating',
    status: hasRating ? 'pass' : 'warn',
    value: hasRating ? `${race.rating}★` : 'missing'
  });

  if (!hasRating && sectionStatus === 'pass') sectionStatus = 'warn';

  // Stages (for stage races)
  const isStageRace = race.stages && race.stages.length > 0;
  if (isStageRace || (race.name && race.name.toLowerCase().includes('tour'))) {
    checks.push({
      label: 'Stages',
      status: isStageRace ? 'pass' : 'warn',
      value: isStageRace ? `${race.stages.length} stages` : 'missing (stage race?)'
    });

    if (!isStageRace && sectionStatus === 'pass') sectionStatus = 'warn';
  }

  return {
    name: 'DATA COMPLETENESS',
    status: sectionStatus,
    checks
  };
}

/**
 * Check race details quality
 */
function checkRaceDetails(race) {
  const checks = [];
  let sectionStatus = 'pass';

  const details = race.raceDetails;

  // raceDetails present
  checks.push({
    label: 'raceDetails present',
    status: details ? 'pass' : 'warn',
    value: details ? 'yes' : 'no'
  });

  if (!details) {
    return {
      name: 'RACE DETAILS',
      status: 'warn',
      checks
    };
  }

  // courseSummary
  checks.push({
    label: 'courseSummary',
    status: details.courseSummary ? 'pass' : 'warn',
    value: details.courseSummary ? `${details.courseSummary.length} chars` : 'missing'
  });

  if (!details.courseSummary && sectionStatus === 'pass') sectionStatus = 'warn';

  // Key terrain features
  const hasClimbs = details.keyClimbs && details.keyClimbs.length > 0;
  const hasSectors = details.keySectors && details.keySectors.length > 0;
  const terrainStatus = hasClimbs || hasSectors ? 'pass' : 'warn';

  checks.push({
    label: 'keyClimbs/keySectors',
    status: terrainStatus,
    value: hasClimbs ? `${details.keyClimbs.length} climbs` :
           hasSectors ? `${details.keySectors.length} sectors` : 'none'
  });

  // Favorites
  const hasFavorites = details.favorites &&
    Object.values(details.favorites).some(arr => arr && arr.length > 0);

  checks.push({
    label: 'favorites',
    status: hasFavorites ? 'pass' : 'warn',
    value: hasFavorites ? Object.keys(details.favorites).filter(k =>
      details.favorites[k]?.length > 0).join(', ') : 'missing'
  });

  if (!hasFavorites && sectionStatus === 'pass') sectionStatus = 'warn';

  // Narratives/watchNotes
  const hasNarratives = details.narratives && details.narratives.length > 0;
  const hasWatchNotes = !!details.watchNotes;

  checks.push({
    label: 'narratives/watchNotes',
    status: hasNarratives || hasWatchNotes ? 'pass' : 'warn',
    value: hasNarratives ? `${details.narratives.length} narratives` :
           hasWatchNotes ? 'watchNotes only' : 'missing'
  });

  // For stage races, check stageDetails
  if (race.stages && race.stages.length > 0) {
    const stagesWithDetails = race.stages.filter(s => s.stageDetails).length;
    const stageStatus = stagesWithDetails === race.stages.length ? 'pass' :
                        stagesWithDetails > 0 ? 'warn' : 'info';

    checks.push({
      label: 'stageDetails',
      status: stageStatus,
      value: `${stagesWithDetails}/${race.stages.length} stages`
    });

    if (stagesWithDetails < race.stages.length && sectionStatus === 'pass') {
      sectionStatus = stagesWithDetails > 0 ? 'warn' : sectionStatus;
    }
  }

  return {
    name: 'RACE DETAILS',
    status: sectionStatus,
    checks
  };
}

/**
 * Check broadcast quality
 */
function checkBroadcast(race) {
  const checks = [];
  let sectionStatus = 'pass';
  const warnings = [];
  const errors = [];

  const broadcast = race.broadcast;

  // broadcast.geos present
  checks.push({
    label: 'broadcast.geos',
    status: broadcast?.geos ? 'pass' : 'info',
    value: broadcast?.geos ? `${Object.keys(broadcast.geos).length} regions` : 'not set'
  });

  if (!broadcast?.geos) {
    return {
      name: 'BROADCAST LINKS',
      status: 'info',
      checks
    };
  }

  // Validate URLs using url-validator
  const validation = validateRaceBroadcast(broadcast);

  // At least one primary broadcaster
  const hasPrimary = Object.values(broadcast.geos).some(g => g.primary?.url);
  checks.push({
    label: 'Primary broadcasters',
    status: hasPrimary ? 'pass' : 'warn',
    value: hasPrimary ? 'present' : 'missing'
  });

  if (!hasPrimary && sectionStatus === 'pass') sectionStatus = 'warn';

  // Check for root URLs
  if (validation.rootUrls > 0) {
    checks.push({
      label: 'Root URL check',
      status: 'fail',
      value: `${validation.rootUrls} root URLs found!`
    });
    sectionStatus = 'fail';
    validation.problems.filter(p => p.includes('root URL')).forEach(p => errors.push(p));
  } else if (validation.totalUrls > 0) {
    checks.push({
      label: 'Root URL check',
      status: 'pass',
      value: 'all deep links'
    });
  }

  // URL validity summary
  if (validation.totalUrls > 0) {
    const validStatus = validation.invalidUrls === 0 ? 'pass' :
                        validation.invalidUrls < validation.totalUrls ? 'warn' : 'fail';
    checks.push({
      label: 'URL validity',
      status: validStatus,
      value: `${validation.validUrls}/${validation.totalUrls} valid`
    });

    if (validation.invalidUrls > 0) {
      validation.problems.filter(p => !p.includes('root URL')).forEach(p => warnings.push(p));
    }
  }

  // YouTube channels
  const youtubeChannels = broadcast.youtubeChannels;
  if (youtubeChannels && youtubeChannels.length > 0) {
    checks.push({
      label: 'YouTube channels',
      status: 'pass',
      value: youtubeChannels.map(c => c.handle || c.channel).join(', ')
    });
  }

  // Per-geo breakdown if verbose
  const geoSubChecks = [];
  for (const [geo, geoData] of Object.entries(broadcast.geos)) {
    const primary = geoData.primary;
    if (primary?.url) {
      const urlValidation = validateBroadcastUrl(primary.url);
      geoSubChecks.push({
        label: `${geo} primary`,
        status: urlValidation.isRootUrl ? 'fail' :
                urlValidation.valid ? 'pass' : 'warn',
        value: `${primary.broadcaster}${urlValidation.isRootUrl ? ' (ROOT!)' : ''}`
      });
    }
  }

  if (geoSubChecks.length > 0) {
    checks[checks.length - 1].subChecks = geoSubChecks;
  }

  return {
    name: 'BROADCAST LINKS',
    status: sectionStatus,
    checks,
    warnings,
    errors
  };
}

/**
 * Check link accessibility (requires Playwright)
 */
async function checkLinkAccessibility(race, options = {}) {
  const checks = [];
  let sectionStatus = 'pass';

  // Collect all URLs to test
  const urls = [];

  if (race.url && race.url !== 'TBD' && isValidUrl(race.url)) {
    urls.push({ url: race.url, label: 'Main URL' });
  }

  if (race.broadcast?.geos) {
    for (const [geo, geoData] of Object.entries(race.broadcast.geos)) {
      if (geoData.primary?.url && isValidUrl(geoData.primary.url)) {
        urls.push({
          url: geoData.primary.url,
          label: `${geo} ${geoData.primary.broadcaster}`
        });
      }
    }
  }

  if (urls.length === 0) {
    return {
      name: 'LINK ACCESSIBILITY',
      status: 'skip',
      checks: [{
        label: 'No URLs to test',
        status: 'skip',
        value: 'skipped'
      }]
    };
  }

  // Dynamic import of link-tester
  const { testBroadcastLink, testYouTubeLink, quickAccessCheck } = await import('../lib/link-tester.js');

  for (const { url, label } of urls) {
    try {
      let result;

      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        result = await testYouTubeLink(url);
        checks.push({
          label,
          status: result.available ? 'pass' : 'fail',
          value: result.available ?
            `${result.spoilerSafe ? 'available' : 'SPOILER in title!'}` :
            result.errors.join(', ')
        });
      } else {
        // Use quick check by default, full check if verbose
        if (options.verbose) {
          result = await testBroadcastLink(url, { checkSpoilers: false });
        } else {
          result = await quickAccessCheck(url);
        }

        const statusText = result.accessible ?
          (result.regionLocked ? 'region-locked' : 'accessible') :
          `error: ${result.error || 'inaccessible'}`;

        checks.push({
          label,
          status: result.accessible ? 'pass' : 'warn',
          value: statusText
        });
      }

      if (!result.available && !result.accessible && sectionStatus === 'pass') {
        sectionStatus = 'warn';
      }

    } catch (error) {
      checks.push({
        label,
        status: 'fail',
        value: `test error: ${error.message}`
      });
      if (sectionStatus === 'pass') sectionStatus = 'warn';
    }
  }

  return {
    name: 'LINK ACCESSIBILITY',
    status: sectionStatus,
    checks
  };
}

/**
 * Run all checks for a race
 */
async function runRaceTests(race, options) {
  const sections = [];
  const allWarnings = [];
  const allErrors = [];

  // Determine which sections to run
  const runSection = (name) => !options.only || options.only === name;

  // Data completeness
  if (runSection('data')) {
    sections.push(checkDataCompleteness(race));
  }

  // Race details
  if (runSection('details')) {
    sections.push(checkRaceDetails(race));
  }

  // Broadcast quality
  if (runSection('broadcast')) {
    const broadcastResult = checkBroadcast(race);
    sections.push(broadcastResult);
    if (broadcastResult.warnings) allWarnings.push(...broadcastResult.warnings);
    if (broadcastResult.errors) allErrors.push(...broadcastResult.errors);
  }

  // Link accessibility (optional)
  if (options.checkLinks && runSection('links')) {
    const linkResult = await checkLinkAccessibility(race, options);
    sections.push(linkResult);
  }

  // Calculate summary
  let passCount = 0, warnCount = 0, failCount = 0;

  for (const section of sections) {
    if (section.status === 'pass') passCount++;
    else if (section.status === 'warn') warnCount++;
    else if (section.status === 'fail') failCount++;

    for (const check of section.checks) {
      if (check.status === 'pass') passCount++;
      else if (check.status === 'warn') warnCount++;
      else if (check.status === 'fail') failCount++;
    }
  }

  const overallStatus = failCount > 0 ? 'fail' :
                        warnCount > 0 ? 'warn' : 'pass';

  return {
    race: {
      id: race.id,
      name: race.name,
      raceDate: race.raceDate
    },
    sections,
    summary: {
      status: overallStatus,
      passCount,
      warnCount,
      failCount,
      details: `${failCount} errors, ${warnCount} warnings`,
      warnings: allWarnings,
      errors: allErrors
    }
  };
}

/**
 * Main entry point
 */
async function main() {
  const options = parseArgs();

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  if (!options.raceId && !options.fromDate && !options.toDate && !options.all) {
    console.error('Error: Must specify --race, --from/--to, or --all');
    console.error('Run with --help for usage information');
    process.exit(1);
  }

  // Load data
  const data = loadRaceData();
  const races = findRaces(data, options);

  if (races.length === 0) {
    console.error('No races found matching criteria');
    process.exit(1);
  }

  console.log(`Testing ${races.length} race${races.length > 1 ? 's' : ''}...`);
  if (options.checkLinks) {
    console.log(`${colors.yellow}Note: Link accessibility tests require Playwright${colors.reset}`);
  }
  console.log('');

  // Run tests
  const allResults = [];
  let totalPass = 0, totalWarn = 0, totalFail = 0;

  for (const race of races) {
    const results = await runRaceTests(race, options);
    allResults.push(results);

    if (results.summary.status === 'pass') totalPass++;
    else if (results.summary.status === 'warn') totalWarn++;
    else totalFail++;

    // Output results
    if (options.json) {
      // JSON mode - output at end
    } else if (options.compact) {
      printCompactSummary(results);
    } else {
      printReport(results);
      console.log('');
    }
  }

  // Final summary for batch tests
  if (races.length > 1) {
    console.log('');
    console.log(`${colors.bold}Summary:${colors.reset} ${totalPass} pass, ${totalWarn} warn, ${totalFail} fail`);
  }

  // JSON output
  if (options.json) {
    const jsonOutput = races.length === 1 ?
      generateJsonReport(allResults[0]) :
      allResults.map(r => generateJsonReport(r));
    console.log(JSON.stringify(jsonOutput, null, 2));
  }

  // Exit with error code if any failures
  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(error => {
  console.error(`Error: ${error.message}`);
  process.exit(1);
});
