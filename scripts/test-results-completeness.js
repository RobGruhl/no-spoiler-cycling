#!/usr/bin/env node

/**
 * Results Subsystem Completeness Test
 *
 * Audits the results subsystem (post-race analysis pages at /results/)
 * against the race calendar and tracked-rider roster.
 *
 * Verifies, for every dimension that should have coverage by now:
 *   - Every past 4-5★ men's road race has a race result JSON + HTML
 *   - Every past racing stage of a past stage race has a stage result JSON + HTML
 *   - Every tracked rider with at least one race performance has a season page + seasonArc
 *   - Every principal WorldTour team featured in spring storylines appears in team narratives
 *   - The manifest at results/_assets/manifest.json matches what's on disk
 *   - No race page is a stub (very thin narrative / placeholder podium)
 *
 * In-progress races (e.g. Giro d'Italia during May) are handled specially:
 *   the overview is allowed to be a "race-in-progress" hub with relaxed
 *   podium/narrative requirements, and only stages with date <= today are
 *   expected to have published results.
 *
 * Cyclocross World Championships and CX World Cup rounds are excluded —
 * they're national-team races with a different field from the tracked
 * road riders.
 *
 * Usage:
 *   node scripts/test-results-completeness.js              # summary, exits 1 on errors
 *   node scripts/test-results-completeness.js --strict     # warnings also fail
 *   node scripts/test-results-completeness.js --verbose    # show each entry's status
 *   node scripts/test-results-completeness.js --json       # machine-readable
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const VERBOSE = args.includes('--verbose');
const JSON_OUT = args.includes('--json');

// ---- ANSI colour helpers (no external deps) ----
const c = {
  reset: '\x1b[0m', dim: '\x1b[2m', bold: '\x1b[1m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m',
  blue: '\x1b[34m', magenta: '\x1b[35m', cyan: '\x1b[36m',
};
const useColour = !JSON_OUT && process.stdout.isTTY;
const paint = (s, code) => useColour ? code + s + c.reset : s;

// ---- Data ----
const RACE_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/race-data.json'), 'utf8'));
const RIDERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/riders.json'), 'utf8')).riders;
const OUTSIDERS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/outsiders.json'), 'utf8')).riders; } catch { return []; } })();
const ALL_TRACKED = [...RIDERS, ...OUTSIDERS];

const TODAY = new Date().toISOString().slice(0, 10);

// ---- Exclusion rules ----
// Cyclocross races are national-team; don't expect every road rider to feature.
const isCyclocrossRace = id =>
  id.startsWith('cx-world-cup-') || id === 'cx-world-championships-2026-men';

// Principal WorldTour teams whose spring storylines we expect to see at least once
const PRINCIPAL_TEAMS = [
  'UAE Team Emirates',          // matches "UAE Team Emirates - XRG" etc.
  'Visma',                       // matches "Visma | Lease a Bike" / "Team Visma..."
  'Alpecin',                     // Alpecin-Premier Tech / Alpecin-Deceuninck
  'Lidl-Trek',                   // Lidl-Trek / Lidl - Trek
  'Soudal Quick-Step',           // Soudal Quick-Step / Soudal-Quick-Step
  'INEOS Grenadiers',
  'Red Bull',                    // Red Bull-Bora-Hansgrohe
  'Decathlon CMA CGM',
];

// ---- Helpers ----
function isPastRace(r) {
  return r.raceDate <= TODAY && r.gender === 'men' && (r.rating === 4 || r.rating === 5);
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

function findRider(id) { return ALL_TRACKED.find(r => r.id === id || r.slug === id) || null; }

// Detect stub / placeholder content in a race-result JSON
function isRaceStub(result) {
  if (!result) return true;
  // In-progress races are allowed thin podiums + narrative
  if (result.inProgress) {
    // Still require some prose
    return !(result.tldr && result.tldr.length > 80);
  }
  const tldrShort = !result.tldr || result.tldr.length < 80;
  const noPodium = !Array.isArray(result.podium) || result.podium.length < 1;
  const podiumOnlyPlaceholder = (result.podium || []).length === 1 && /pending|in progress|—/i.test(result.podium[0].team || '');
  const noNarrative = !result.narrative || !(result.narrative.headline || result.narrative.openingMoves || result.narrative.body);
  // Explicit stub marker
  const explicitStub = result.tldr && /\bstub\b|sourcing thin|pending full analysis|pending source coverage/i.test(result.tldr);
  return tldrShort || noPodium || podiumOnlyPlaceholder || noNarrative || explicitStub;
}

function isStageStub(result) {
  if (!result) return true;
  const tldrShort = !result.tldr || result.tldr.length < 40;
  const noNarrative = !result.narrative || !(result.narrative.body || result.narrative.headline);
  return tldrShort && noNarrative;
}

// ---- Section: Race overviews ----
function checkRaces() {
  const expected = RACE_DATA.races.filter(r => isPastRace(r) && !isCyclocrossRace(r.id));
  const expectedCx = RACE_DATA.races.filter(r => isPastRace(r) && r.id === 'cx-world-championships-2026-men');
  const errors = [];
  const warnings = [];
  const details = [];

  for (const race of [...expected, ...expectedCx]) {
    const jsonPath = path.join(ROOT, 'data/results/races', `${race.id}.json`);
    const htmlPath = path.join(ROOT, 'results/race', `${race.id}.html`);
    const hasJson = fs.existsSync(jsonPath);
    const hasHtml = fs.existsSync(htmlPath);
    const result = hasJson ? readJson(jsonPath) : null;
    const stub = result ? isRaceStub(result) : false;

    const entry = { id: race.id, name: race.name, date: race.raceDate, hasJson, hasHtml, stub };
    details.push(entry);

    // Hard errors: missing JSON or HTML
    if (!hasJson) errors.push(`race missing JSON: ${race.id} (${race.name}, ${race.raceDate})`);
    if (hasJson && !hasHtml) errors.push(`race JSON exists but HTML missing: ${race.id}`);
    // Warnings: stubs (could be hard error too, depending on strict mode)
    if (hasJson && stub) warnings.push(`race is a stub: ${race.id} (thin tldr/podium/narrative or marked as stub)`);
  }

  return { expected: expected.length + expectedCx.length, errors, warnings, details };
}

// ---- Section: Stages ----
function checkStages() {
  const expected = [];
  for (const race of RACE_DATA.races) {
    if (!isPastRace(race)) continue;
    if (isCyclocrossRace(race.id)) continue;
    const stages = race.stages || [];
    for (const s of stages) {
      if (s.stageType === 'rest-day') continue;
      // Strict less-than: a stage whose date equals TODAY (UTC) might still be in progress
      // (e.g. UTC date rolled over but the European race day hasn't started). Such stages
      // are surfaced on the next day's test run.
      if (!s.date || s.date >= TODAY) continue;
      expected.push({ raceId: race.id, raceName: race.name, stageNumber: s.stageNumber, date: s.date });
    }
  }
  const errors = [];
  const warnings = [];
  const details = [];
  for (const x of expected) {
    const stageId = `${x.raceId}-stage-${x.stageNumber}`;
    const jsonPath = path.join(ROOT, 'data/results/stages', `${stageId}.json`);
    const htmlPath = path.join(ROOT, 'results/race', `${stageId}.html`);
    const hasJson = fs.existsSync(jsonPath);
    const hasHtml = fs.existsSync(htmlPath);
    const result = hasJson ? readJson(jsonPath) : null;
    const stub = result ? isStageStub(result) : false;
    details.push({ ...x, hasJson, hasHtml, stub });
    if (!hasJson) errors.push(`stage missing JSON: ${stageId} (${x.raceName}, ${x.date})`);
    if (hasJson && !hasHtml) errors.push(`stage JSON exists but HTML missing: ${stageId}`);
    if (hasJson && stub) warnings.push(`stage is a stub: ${stageId}`);
  }
  return { expected: expected.length, errors, warnings, details };
}

// ---- Section: Riders ----
function checkRiders() {
  // Build the set of tracked riderIds that appear in any race or stage performance entry
  const performingRiders = new Set();
  for (const dir of ['data/results/races', 'data/results/stages']) {
    const d = path.join(ROOT, dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(f => f.endsWith('.json'))) {
      const r = readJson(path.join(d, f));
      for (const p of (r?.riderPerformances || [])) {
        if (p.riderId && findRider(p.riderId)) performingRiders.add(p.riderId);
      }
    }
  }

  const ridersDir = path.join(ROOT, 'data/results/riders');
  const errors = [];
  const warnings = [];
  const details = [];
  for (const rid of [...performingRiders].sort()) {
    const rider = findRider(rid);
    const slug = rider?.slug || rid;
    const jsonPath = path.join(ridersDir, `${rid}.json`);
    const htmlPath = path.join(ROOT, 'results/rider', `${slug}.html`);
    const hasJson = fs.existsSync(jsonPath);
    const hasHtml = fs.existsSync(htmlPath);
    const data = hasJson ? readJson(jsonPath) : null;
    const arc = data?.seasonArc || '';
    const arcOk = arc.length >= 100;
    details.push({ riderId: rid, name: rider?.name || rid, hasJson, hasHtml, hasArc: !!arc, arcLength: arc.length, arcOk });
    // Hard error: HTML missing (means rider page doesn't render)
    if (!hasHtml) errors.push(`rider HTML missing: ${rid}`);
    // Warning: no seasonArc paragraph
    if (!hasJson) warnings.push(`rider has no seasonArc JSON: ${rid}`);
    else if (!arcOk) warnings.push(`rider seasonArc too short (<100 chars): ${rid} (${arc.length}ch)`);
  }
  return { expected: performingRiders.size, errors, warnings, details };
}

// ---- Section: Teams ----
function checkTeamCoverage() {
  // Collect every team name mentioned in teamStories[] across all race result JSONs
  const seen = new Map(); // matchKey → [ {raceId, team} ]
  for (const f of fs.readdirSync(path.join(ROOT, 'data/results/races')).filter(f => f.endsWith('.json'))) {
    const result = readJson(path.join(ROOT, 'data/results/races', f));
    if (!result?.teamStories) continue;
    const raceId = f.replace('.json', '');
    for (const story of result.teamStories) {
      const team = story.team || '';
      for (const key of PRINCIPAL_TEAMS) {
        if (team.toLowerCase().includes(key.toLowerCase().split('-')[0]) ||
            team.toLowerCase().includes(key.toLowerCase().split(' ')[0])) {
          if (!seen.has(key)) seen.set(key, []);
          seen.get(key).push({ raceId, team });
          break;
        }
      }
    }
  }
  const errors = [];
  const warnings = [];
  const details = [];
  for (const team of PRINCIPAL_TEAMS) {
    const appearances = seen.get(team) || [];
    details.push({ team, appearances: appearances.length, racesFeatured: appearances.map(a => a.raceId).slice(0, 6) });
    if (appearances.length === 0) {
      warnings.push(`team has no narrative coverage in any race result: ${team}`);
    } else if (appearances.length < 3) {
      warnings.push(`team has thin coverage (only ${appearances.length} race(s)): ${team}`);
    }
  }
  return { expected: PRINCIPAL_TEAMS.length, errors, warnings, details };
}

// ---- Section: Manifest ----
function checkManifest() {
  const errors = [];
  const warnings = [];
  const manifestPath = path.join(ROOT, 'results/_assets/manifest.json');
  if (!fs.existsSync(manifestPath)) {
    errors.push(`manifest missing: results/_assets/manifest.json`);
    return { errors, warnings, details: null };
  }
  const m = readJson(manifestPath);
  const racesDisk = new Set(fs.readdirSync(path.join(ROOT, 'data/results/races')).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')));
  const stagesDisk = new Set(fs.readdirSync(path.join(ROOT, 'data/results/stages')).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')));
  const ridersDisk = new Set(fs.readdirSync(path.join(ROOT, 'data/results/riders')).filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')));
  const manifestRaces = new Set(m.races || []);
  const manifestStages = new Set(m.stages || []);
  const manifestRiders = new Set(m.riders || []);

  const missingFromManifest = (disk, mani, kind) => {
    for (const x of disk) if (!mani.has(x)) warnings.push(`${kind} on disk but missing from manifest: ${x}`);
  };
  const orphanedInManifest = (disk, mani, kind) => {
    for (const x of mani) if (!disk.has(x)) errors.push(`${kind} in manifest but JSON missing: ${x}`);
  };

  missingFromManifest(racesDisk, manifestRaces, 'race');
  missingFromManifest(stagesDisk, manifestStages, 'stage');
  // Rider check is fuzzier — a rider in the manifest might come from race performances rather than a JSON file
  orphanedInManifest(racesDisk, manifestRaces, 'race');
  orphanedInManifest(stagesDisk, manifestStages, 'stage');

  return {
    errors, warnings,
    details: {
      manifestRaces: manifestRaces.size, racesDisk: racesDisk.size,
      manifestStages: manifestStages.size, stagesDisk: stagesDisk.size,
      manifestRiders: manifestRiders.size, ridersDisk: ridersDisk.size,
    },
  };
}

// ---- Run all checks ----
function run() {
  const sections = {
    races: checkRaces(),
    stages: checkStages(),
    riders: checkRiders(),
    teams: checkTeamCoverage(),
    manifest: checkManifest(),
  };

  // Output
  if (JSON_OUT) {
    console.log(JSON.stringify({ today: TODAY, sections }, null, 2));
  } else {
    print(sections);
  }

  // Exit code
  const totalErrors = Object.values(sections).reduce((a, s) => a + (s.errors?.length || 0), 0);
  const totalWarnings = Object.values(sections).reduce((a, s) => a + (s.warnings?.length || 0), 0);
  if (totalErrors > 0) process.exit(1);
  if (STRICT && totalWarnings > 0) process.exit(1);
  process.exit(0);
}

function print(sections) {
  const totalErrors = Object.values(sections).reduce((a, s) => a + (s.errors?.length || 0), 0);
  const totalWarnings = Object.values(sections).reduce((a, s) => a + (s.warnings?.length || 0), 0);

  console.log(paint('═══ Results Subsystem Completeness ═══', c.bold));
  console.log(`As of ${TODAY} · ${ALL_TRACKED.length} tracked riders · ${RACE_DATA.races.length} total races on calendar\n`);

  printSection('Race overviews',      sections.races,    'race');
  printSection('Stages',              sections.stages,   'stage');
  printSection('Rider season pages',  sections.riders,   'rider');
  printSection('Team narrative coverage', sections.teams, 'team');
  printSection('Manifest consistency',sections.manifest, null);

  console.log(paint('═══ Summary ═══', c.bold));
  const stat = (k, n, code) => paint(`${k}: ${n}`, code);
  console.log(`  ${stat('errors', totalErrors, totalErrors ? c.red : c.green)}    ${stat('warnings', totalWarnings, totalWarnings ? c.yellow : c.green)}`);
  if (totalErrors === 0 && totalWarnings === 0) {
    console.log(paint('\n  ✓ All checks pass.', c.green + c.bold));
  } else if (totalErrors === 0) {
    console.log(paint(`\n  ✓ No errors. ${totalWarnings} soft warning(s).`, c.yellow));
    if (STRICT) console.log(paint('    Running in --strict mode — warnings will fail the run.', c.dim));
  } else {
    console.log(paint(`\n  ✗ ${totalErrors} error(s) — completeness gaps to address.`, c.red + c.bold));
  }
}

function printSection(title, section, _kind) {
  const errCount = section.errors?.length || 0;
  const warnCount = section.warnings?.length || 0;
  const exp = section.expected != null ? `expected ${section.expected}` : '';
  let head;
  if (errCount === 0 && warnCount === 0) head = paint(`✓ ${title}${exp ? ' (' + exp + ')' : ''}`, c.green);
  else if (errCount === 0) head = paint(`! ${title}${exp ? ' (' + exp + ')' : ''} — ${warnCount} warning(s)`, c.yellow);
  else head = paint(`✗ ${title}${exp ? ' (' + exp + ')' : ''} — ${errCount} error(s), ${warnCount} warning(s)`, c.red);
  console.log(head);

  for (const e of (section.errors || [])) console.log(paint(`    error  · ${e}`, c.red));
  for (const w of (section.warnings || [])) console.log(paint(`    warn   · ${w}`, c.yellow));

  if (VERBOSE && Array.isArray(section.details)) {
    for (const d of section.details) {
      const ok = (d.hasJson === undefined || d.hasJson) && (d.hasHtml === undefined || d.hasHtml) && !d.stub;
      const mark = ok ? paint('✓', c.green) : paint('•', c.dim);
      const summary = [
        d.id || d.raceId || d.riderId || d.team,
        d.name && d.name !== d.id ? `(${d.name})` : '',
        d.stageNumber != null ? `S${d.stageNumber}` : '',
        d.date || '',
        d.appearances != null ? `${d.appearances} appearance(s)` : '',
        d.arcLength != null ? `arc ${d.arcLength}ch` : '',
      ].filter(Boolean).join(' ');
      console.log(`    ${mark} ${summary}`);
    }
  }
  console.log('');
}

run();
