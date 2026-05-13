#!/usr/bin/env node
/**
 * Post-build smoke test.
 *
 * Asserts the generators produced the files we expect — would have caught
 * last session's wiped-startlist regression and any future case where a
 * race silently fails to render.
 *
 * Checks:
 *   - index.html, riders.html, riders-women.html exist + ≥ 5KB
 *   - For every race in race-data.json: race-details/<id>.html ≥ 2KB
 *   - For every non-rest-day stage of a stage-race: race-details/<id>-stage-<n>.html ≥ 2KB
 *
 * Exit 1 if anything missing or undersized. No CLI args — run after
 * `npm run build:all && node generate-race-details.js --all`.
 */

import { readFileSync, statSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { colors, symbols } from '../lib/test-reporter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const dataPath = join(root, 'data', 'race-data.json');

const MIN_RACE_BYTES = 2048;
const MIN_INDEX_BYTES = 5120;

function checkFile(relPath, minBytes) {
  const abs = join(root, relPath);
  if (!existsSync(abs)) return { ok: false, reason: 'missing' };
  const size = statSync(abs).size;
  if (size < minBytes) return { ok: false, reason: `${size}B < ${minBytes}B` };
  return { ok: true, size };
}

// Probe that data in race-data.json actually surfaces in the rendered HTML.
// Returns null on success, or a string describing the unrendered field.
function checkDataRenderedOnPage(relPath, dataFields) {
  const abs = join(root, relPath);
  if (!existsSync(abs)) return null; // file-presence check elsewhere
  const html = readFileSync(abs, 'utf-8');
  for (const { label, probe } of dataFields) {
    if (!probe) continue;
    // First 60 chars of the probe — enough to be unique, short enough to dodge HTML entity escaping
    const needle = probe.slice(0, 60).trim();
    if (needle.length < 20) continue;
    if (!html.includes(needle) && !html.includes(needle.replace(/'/g, '&#39;'))) {
      return `${label} (data present but not rendered)`;
    }
  }
  return null;
}

function main() {
  const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

  const missing = [];
  const tooSmall = [];
  let totalChecked = 0;

  // ── Top-level pages ───────────────────────────────────────────────
  const topPages = ['index.html', 'riders.html', 'riders-women.html'];
  for (const f of topPages) {
    totalChecked++;
    const r = checkFile(f, MIN_INDEX_BYTES);
    if (!r.ok) (r.reason === 'missing' ? missing : tooSmall).push(`${f} (${r.reason})`);
  }

  // ── Race detail pages ─────────────────────────────────────────────
  for (const race of data.races) {
    totalChecked++;
    const f = `race-details/${race.id}.html`;
    const r = checkFile(f, MIN_RACE_BYTES);
    if (!r.ok) (r.reason === 'missing' ? missing : tooSmall).push(`${f} (${r.reason})`);

    // ── Stage detail pages — generator only emits when stageDetails
    //    is populated, so the smoke test only requires the page when
    //    the data is rich enough to render one. ───────────────────
    if (race.raceFormat === 'stage-race' && Array.isArray(race.stages)) {
      for (const s of race.stages) {
        if (s.stageType === 'rest-day') continue;
        if (s.stageNumber == null) continue;
        if (!s.stageDetails || Object.keys(s.stageDetails).length === 0) continue;
        totalChecked++;
        const sf = `race-details/${race.id}-stage-${s.stageNumber}.html`;
        const sr = checkFile(sf, MIN_RACE_BYTES);
        if (!sr.ok) {
          (sr.reason === 'missing' ? missing : tooSmall).push(`${sf} (${sr.reason})`);
        } else {
          // Content probe: catch the "data present but generator drops it" bug.
          // Tests at least one short, distinctive substring per stageDetails field.
          const probes = [];
          if (s.stageDetails.courseSummary && s.stageDetails.courseSummary.length > 80) {
            probes.push({ label: 'stageDetails.courseSummary', probe: s.stageDetails.courseSummary });
          }
          if (Array.isArray(s.stageDetails.narratives) && s.stageDetails.narratives[0]) {
            probes.push({ label: 'stageDetails.narratives[0]', probe: s.stageDetails.narratives[0] });
          }
          if (s.stageDetails.watchNotes) {
            probes.push({ label: 'stageDetails.watchNotes', probe: s.stageDetails.watchNotes });
          }
          const miss = checkDataRenderedOnPage(sf, probes);
          if (miss) tooSmall.push(`${sf} — ${miss}`);
        }
      }
    }
  }

  // ── Report ────────────────────────────────────────────────────────
  const okCount = totalChecked - missing.length - tooSmall.length;
  const headline = `${colors.bold}Build smoke check:${colors.reset} ${okCount}/${totalChecked} pages OK`;

  if (missing.length === 0 && tooSmall.length === 0) {
    console.log(`${colors.green}${symbols.pass}${colors.reset} ${headline}`);
    process.exit(0);
  }

  console.log(`${colors.red}${symbols.fail}${colors.reset} ${headline}`);
  if (missing.length) {
    console.log(`\n${colors.red}Missing (${missing.length}):${colors.reset}`);
    missing.slice(0, 30).forEach(m => console.log(`  ${symbols.fail} ${m}`));
    if (missing.length > 30) console.log(`  … +${missing.length - 30} more`);
  }
  if (tooSmall.length) {
    console.log(`\n${colors.yellow}Undersized (${tooSmall.length}):${colors.reset}`);
    tooSmall.slice(0, 30).forEach(t => console.log(`  ${symbols.warn} ${t}`));
    if (tooSmall.length > 30) console.log(`  … +${tooSmall.length - 30} more`);
  }

  process.exit(1);
}

main();
