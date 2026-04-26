#!/usr/bin/env node
/**
 * Audit broadcast URLs in race-data.json for prior-edition leakage.
 *
 * Usage:
 *   node scripts/audit-broadcast-editions.js                                 # report only
 *   node scripts/audit-broadcast-editions.js --propose                       # report + suggest fixes
 *   node scripts/audit-broadcast-editions.js --apply tmp/broadcast-edition-fixes.json
 *
 * Optional flags:
 *   --limit N            audit only the first N races (smoke test)
 *   --race RACE_ID       audit a single race only
 *   --report PATH        override report output path
 *   --fixes PATH         override fixes JSON path (read or write)
 *
 * Behavior:
 *   - Filters to races with raceDate >= today (today is the system date).
 *   - Default: writes a markdown report to tmp/broadcast-edition-audit.md.
 *   - --propose: for each stale URL, scans sibling URLs harvested from the
 *     scraped page; verifies each candidate; writes confirmed swaps to
 *     tmp/broadcast-edition-fixes.json keyed by {raceId, geo, slot}.
 *   - --apply: invokes scripts/update-race.js once per race with a deep-merged
 *     broadcast patch. Idempotent — re-applying a fix is a no-op.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import {
  checkBroadcastEdition,
  checkBroadcastEditionsBatch
} from '../lib/broadcast-edition-checker.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const dataPath = join(repoRoot, 'data/race-data.json');
const tmpDir = join(repoRoot, 'tmp');
if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true });

function parseArgs(argv) {
  const args = { propose: false, apply: null, limit: null, race: null, report: null, fixes: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--propose') args.propose = true;
    else if (a === '--apply') args.apply = argv[++i];
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10);
    else if (a === '--race') args.race = argv[++i];
    else if (a === '--report') args.report = argv[++i];
    else if (a === '--fixes') args.fixes = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log(readFileSync(__filename, 'utf-8').split('\n').slice(1, 25).join('\n'));
      process.exit(0);
    }
  }
  args.report = args.report || join(tmpDir, 'broadcast-edition-audit.md');
  args.fixes = args.fixes || join(tmpDir, 'broadcast-edition-fixes.json');
  return args;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function collectJobs(races, today, raceFilter) {
  const jobs = [];
  for (const race of races) {
    if (!race.id) continue;
    if (raceFilter && race.id !== raceFilter) continue;
    if (!raceFilter && race.raceDate && race.raceDate < today) continue;
    const geos = race.broadcast?.geos || {};
    for (const [geo, geoData] of Object.entries(geos)) {
      if (geoData?.primary?.url && geoData.primary.url.startsWith('http')) {
        jobs.push({ raceId: race.id, race, geo, slot: 'primary', altIndex: null, url: geoData.primary.url });
      }
      const alts = geoData?.alternatives || [];
      alts.forEach((alt, idx) => {
        if (alt?.url && alt.url.startsWith('http')) {
          jobs.push({ raceId: race.id, race, geo, slot: 'alternative', altIndex: idx, url: alt.url });
        }
      });
    }
  }
  return jobs;
}

function writeReport(reportPath, jobs) {
  const summary = { match: 0, stale: 0, unknown: 0, error: 0 };
  for (const j of jobs) summary[j.check.status] = (summary[j.check.status] || 0) + 1;

  const byRace = new Map();
  for (const j of jobs) {
    if (!byRace.has(j.raceId)) byRace.set(j.raceId, []);
    byRace.get(j.raceId).push(j);
  }

  const lines = [];
  lines.push('# Broadcast edition audit');
  lines.push('');
  lines.push(`Run: ${new Date().toISOString()}`);
  lines.push(`Today (filter): ${todayIso()}`);
  lines.push(`URLs checked: ${jobs.length}`);
  lines.push(`Status summary: match=${summary.match || 0}, stale=${summary.stale || 0}, unknown=${summary.unknown || 0}, error=${summary.error || 0}`);
  lines.push('');

  // Stale section first — actionable
  const staleJobs = jobs.filter(j => j.check.status === 'stale');
  if (staleJobs.length > 0) {
    lines.push('## Stale URLs (need replacement)');
    lines.push('');
    for (const j of staleJobs) {
      const slotLabel = j.slot === 'alternative' ? `alt[${j.altIndex}]` : 'primary';
      lines.push(`- **${j.raceId}** · ${j.geo} · ${slotLabel}`);
      lines.push(`  - URL: ${j.url}`);
      lines.push(`  - Detected years: ${JSON.stringify(j.check.detectedYears)}`);
      for (const e of j.check.evidence) lines.push(`  - ${e}`);
    }
    lines.push('');
  }

  // Errors next
  const errJobs = jobs.filter(j => j.check.status === 'error');
  if (errJobs.length > 0) {
    lines.push('## Fetch errors');
    lines.push('');
    for (const j of errJobs) {
      lines.push(`- ${j.raceId} · ${j.geo}: ${j.url}`);
      for (const e of j.check.evidence) lines.push(`  - ${e}`);
    }
    lines.push('');
  }

  // Per-race rollup
  lines.push('## All results by race');
  lines.push('');
  for (const [raceId, items] of byRace) {
    lines.push(`### ${raceId}`);
    for (const j of items) {
      const slotLabel = j.slot === 'alternative' ? `alt[${j.altIndex}]` : 'primary';
      lines.push(`- ${j.geo} ${slotLabel} · **${j.check.status}** · ${j.url}`);
    }
    lines.push('');
  }

  writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`📝 Report: ${reportPath}`);
  console.log(`   match=${summary.match || 0} stale=${summary.stale || 0} unknown=${summary.unknown || 0} error=${summary.error || 0}`);
}

/**
 * From the harvested same-host links on the stale page, surface candidates that
 * share the URL "directory" prefix but differ at the last segment — i.e. likely
 * sibling editions of the same event.
 */
function siblingCandidates(staleUrl, siblingUrls) {
  let u;
  try { u = new URL(staleUrl); } catch { return []; }
  const parts = u.pathname.split('/').filter(Boolean);
  if (parts.length < 2) return [];
  const prefix = '/' + parts.slice(0, -1).join('/') + '/';
  const last = parts[parts.length - 1];
  const seen = new Set();
  const out = [];
  for (const s of siblingUrls) {
    try {
      const su = new URL(s);
      if (su.host !== u.host) continue;
      if (!su.pathname.startsWith(prefix)) continue;
      const sLast = su.pathname.slice(prefix.length).split('/')[0];
      if (!sLast || sLast === last) continue;
      const key = su.origin + su.pathname;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(key);
    } catch { /* ignore */ }
  }
  return out;
}

async function proposeFix(staleJob) {
  const candidates = siblingCandidates(staleJob.url, staleJob.check.siblingUrls || []);
  if (candidates.length === 0) {
    return { tried: 0, fix: null, reason: 'no sibling candidates on page' };
  }
  for (const cand of candidates) {
    const verify = await checkBroadcastEdition(cand, staleJob.race);
    if (verify.status === 'match') {
      return { tried: candidates.length, fix: { newUrl: cand, evidence: verify.evidence }, reason: 'sibling match' };
    }
  }
  return { tried: candidates.length, fix: null, reason: 'no sibling verified as expected year' };
}

function writeFixesFile(fixesPath, fixes) {
  writeFileSync(fixesPath, JSON.stringify(fixes, null, 2), 'utf-8');
  console.log(`💾 Fixes: ${fixesPath} (${fixes.length} entries)`);
}

function applyFixes(fixesPath) {
  if (!existsSync(fixesPath)) {
    console.error(`Fixes file not found: ${fixesPath}`);
    process.exit(1);
  }
  const fixes = JSON.parse(readFileSync(fixesPath, 'utf-8'));
  const byRace = new Map();
  for (const f of fixes) {
    if (!byRace.has(f.raceId)) byRace.set(f.raceId, []);
    byRace.get(f.raceId).push(f);
  }

  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

  let applied = 0;
  for (const [raceId, raceFixes] of byRace) {
    const race = data.races.find(r => r.id === raceId);
    if (!race) {
      console.warn(`⚠️ ${raceId}: race not found, skipping`);
      continue;
    }
    // Build a deep-merge patch against broadcast.geos.
    const patch = { broadcast: { lastUpdated: new Date().toISOString(), geos: {} } };
    for (const f of raceFixes) {
      if (!patch.broadcast.geos[f.geo]) patch.broadcast.geos[f.geo] = {};
      if (f.slot === 'primary') {
        patch.broadcast.geos[f.geo].primary = { url: f.newUrl };
      } else if (f.slot === 'alternative') {
        // update-race.js does NOT deep-merge arrays by index. Read the existing
        // alternatives, swap the URL in-place, and write back the full array.
        const existing = race.broadcast?.geos?.[f.geo]?.alternatives || [];
        const next = existing.map((a, i) => i === f.altIndex ? { ...a, url: f.newUrl } : a);
        patch.broadcast.geos[f.geo].alternatives = next;
      }
    }

    const patchPath = join(tmpDir, `broadcast-edition-patch-${raceId}.json`);
    writeFileSync(patchPath, JSON.stringify(patch, null, 2), 'utf-8');
    const result = spawnSync('node', [join(repoRoot, 'scripts/update-race.js'), '--id', raceId, '--file', patchPath], {
      cwd: repoRoot,
      stdio: 'inherit'
    });
    if (result.status === 0) {
      applied++;
    } else {
      console.warn(`⚠️ ${raceId}: update-race.js exit ${result.status}`);
    }
  }
  console.log(`\n✅ Applied fixes for ${applied}/${byRace.size} races`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.apply) {
    applyFixes(args.apply);
    return;
  }

  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));
  const today = todayIso();
  let jobs = collectJobs(data.races, today, args.race);
  if (args.limit) jobs = jobs.slice(0, args.limit);

  console.log(`🔎 Auditing ${jobs.length} URLs across ${new Set(jobs.map(j => j.raceId)).size} races (today=${today})`);

  const checked = await checkBroadcastEditionsBatch(jobs, {
    concurrency: 3,
    delay: 800,
    onProgress: (done, total) => process.stdout.write(`\r   ${done}/${total} checked   `)
  });
  process.stdout.write('\n');

  writeReport(args.report, checked);

  if (!args.propose) return;

  const stales = checked.filter(j => j.check.status === 'stale');
  console.log(`\n🛠  Proposing fixes for ${stales.length} stale URLs…`);
  const fixes = [];
  for (let i = 0; i < stales.length; i++) {
    const j = stales[i];
    process.stdout.write(`\r   ${i + 1}/${stales.length}: ${j.raceId} ${j.geo}             `);
    const r = await proposeFix(j);
    if (r.fix) {
      fixes.push({
        raceId: j.raceId,
        geo: j.geo,
        slot: j.slot,
        altIndex: j.altIndex,
        oldUrl: j.url,
        newUrl: r.fix.newUrl,
        evidence: r.fix.evidence
      });
    } else {
      console.log(`\n   ⚠️  ${j.raceId} ${j.geo}: ${r.reason} (tried ${r.tried})`);
    }
  }
  process.stdout.write('\n');
  writeFixesFile(args.fixes, fixes);
  console.log('Review the fixes file, then run:');
  console.log(`  node scripts/audit-broadcast-editions.js --apply ${args.fixes}`);
}

main().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
