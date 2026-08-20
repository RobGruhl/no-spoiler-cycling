#!/usr/bin/env node
/**
 * Broadcast rights validation
 *
 * Two offline checks over data/race-data.json (fast, no network):
 *
 * 1. Rights registry: data/broadcast-rights.json holds verified
 *    (raceFamily, year, geo) -> broadcaster facts. If a race's geo primary
 *    contradicts a registry entry, FAIL. This turns one-off rights research
 *    into a durable regression gate — a bulk broadcast pass can no longer
 *    silently revert a verified carrier (e.g. Renewi Tour 2026 US showed
 *    FloBikes while the race streamed on HBO Max; FloSports publishes event
 *    pages even for races where it holds Canada-only rights, so an existing
 *    FloBikes event page is NOT evidence of US rights).
 *
 * 2. Broadcaster<->URL domain consistency: a broadcast entry whose URL host
 *    matches none of the domains implied by its broadcaster name (e.g.
 *    "HBO Max" pointing at flobikes.com) is cross-wired, FAIL. Unknown
 *    broadcaster names are skipped — the map below is deliberately
 *    conservative to avoid false positives.
 *
 * Usage:
 *   node scripts/test-broadcast-rights.js            # exit 1 on any failure
 *   node scripts/test-broadcast-rights.js --verbose  # list passing checks too
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const verbose = process.argv.includes('--verbose');

const raceData = JSON.parse(readFileSync(join(__dirname, '../data/race-data.json'), 'utf-8'));
const registry = JSON.parse(readFileSync(join(__dirname, '../data/broadcast-rights.json'), 'utf-8'));

const races = Array.isArray(raceData.races) ? raceData.races : Object.values(raceData.races || raceData);
const raceById = new Map(races.map(r => [r.id, r]));

const failures = [];
const warnings = [];
let passCount = 0;

// ---------------------------------------------------------------------------
// Check 1: rights registry vs race data
// ---------------------------------------------------------------------------

const normalize = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** "TNT Sports / HBO Max" satisfies a registry fact of "HBO Max". */
function broadcasterMatches(registryName, dataName) {
  const a = normalize(registryName);
  const b = normalize(dataName);
  if (!a || !b) return false;
  return a === b || b.includes(a) || a.includes(b);
}

for (const entry of registry.entries) {
  const raceId = `${entry.raceFamily}-${entry.year}`;
  const race = raceById.get(raceId);
  const label = `${raceId} ${entry.geo} = ${entry.broadcaster}`;

  if (!race) {
    warnings.push(`registry entry has no matching race: ${label} (race removed/renamed?)`);
    continue;
  }
  const primary = race.broadcast?.geos?.[entry.geo]?.primary;
  if (!primary || !primary.broadcaster) {
    warnings.push(`registry entry but race has no ${entry.geo} primary broadcast: ${label}`);
    continue;
  }
  if (!broadcasterMatches(entry.broadcaster, primary.broadcaster)) {
    failures.push(
      `${raceId}: ${entry.geo} primary is "${primary.broadcaster}" but verified rights say ` +
      `"${entry.broadcaster}" (${entry.source}, verified ${entry.verifiedOn})`
    );
  } else {
    passCount++;
    if (verbose) console.log(`  ✓ ${label}`);
  }
}

// ---------------------------------------------------------------------------
// Check 2: broadcaster name <-> URL domain consistency
// ---------------------------------------------------------------------------

// Word-boundary token (regex) -> domains that token may legitimately link to.
// A broadcaster name may hit several tokens ("TNT Sports / HBO Max"); the URL
// must match the UNION of their domains. Names hitting no token are skipped.
const TOKEN_DOMAINS = [
  [/\bflobikes?\b/i, ['flobikes.com']],
  [/\bhbo\s*max\b/i, ['max.com', 'hbomax.com']],
  [/\bdiscovery/i, ['discoveryplus.com']],
  [/\btnt\b/i, ['tntsports.co.uk', 'discoveryplus.com', 'max.com', 'hbomax.com']],
  [/\beurosport\b/i, ['eurosport.com', 'discoveryplus.com', 'max.com', 'hbomax.com']],
  [/\bpeacock\b/i, ['peacocktv.com']],
  [/\byoutube\b/i, ['youtube.com', 'youtu.be']],
  [/\bnbc\b/i, ['nbc.com', 'nbcsports.com', 'peacocktv.com', 'youtube.com']],
  [/\bgcn\b/i, ['gcn.com', 'globalcyclingnetwork.com', 'youtube.com']],
  [/\bsbs\b/i, ['sbs.com.au']],
  [/\bsporza\b/i, ['sporza.be', 'vrt.be']],
  [/\bnos\b/i, ['nos.nl']],
  [/\bitv\b/i, ['itv.com']],
];

function hostOf(url) {
  try {
    return new URL(url).host.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function domainCheck(raceId, geo, role, entry) {
  if (!entry?.broadcaster || !entry.url || entry.url === 'TBD') return;
  const allowed = TOKEN_DOMAINS.filter(([re]) => re.test(entry.broadcaster)).flatMap(([, d]) => d);
  if (allowed.length === 0) return; // unknown broadcaster — skip
  const host = hostOf(entry.url);
  if (!host) return; // url-validator owns malformed-URL detection
  const ok = allowed.some(d => host === d || host.endsWith('.' + d));
  if (!ok) {
    failures.push(
      `${raceId}: ${geo} ${role} broadcaster "${entry.broadcaster}" links to ${host} ` +
      `(expected one of: ${[...new Set(allowed)].join(', ')})`
    );
  } else {
    passCount++;
    if (verbose) console.log(`  ✓ ${raceId} ${geo} ${role}: ${entry.broadcaster} @ ${host}`);
  }
}

for (const race of races) {
  const geos = race.broadcast?.geos || {};
  for (const [geo, g] of Object.entries(geos)) {
    domainCheck(race.id, geo, 'primary', g.primary);
    for (const alt of g.alternatives || []) domainCheck(race.id, geo, 'alternative', alt);
  }
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(`Broadcast rights: ${passCount} checks passed, ${warnings.length} warnings, ${failures.length} failures`);
for (const w of warnings) console.log(`  ⚠ ${w}`);
for (const f of failures) console.log(`  ✗ ${f}`);

if (failures.length > 0) {
  console.log('\nFix the data via scripts/update-race.js, or — if rights genuinely changed —');
  console.log('update data/broadcast-rights.json with the new verified fact and its source.');
  process.exit(1);
}
