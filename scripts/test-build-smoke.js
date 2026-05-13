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

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
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
// Returns array of unrendered-field labels (empty when all probes passed).
function probeRenderedContent(relPath, probes) {
  const abs = join(root, relPath);
  if (!existsSync(abs)) return [];
  const html = readFileSync(abs, 'utf-8');
  const missing = [];
  for (const { label, probe, mustNotMatch } of probes) {
    if (mustNotMatch) {
      if (html.includes(mustNotMatch)) missing.push(label);
      continue;
    }
    if (!probe || typeof probe !== 'string') continue;
    // First 60 chars of the probe — enough to be unique, short enough to dodge HTML entity escaping
    const needle = probe.slice(0, 60).trim();
    if (needle.length < 20) continue;
    if (!html.includes(needle) && !html.includes(needle.replace(/'/g, '&#39;'))) {
      missing.push(label);
    }
  }
  return missing;
}

// Pull the broadcaster name a race should display in its Coverage stat.
// Mirrors generate-race-details.js#primaryBroadcaster — kept in sync so the
// test catches regressions in either side.
function expectedBroadcaster(race) {
  const order = ['US', 'UK', 'CA', 'AU', 'BE', 'NL'];
  const geos = race.broadcast?.geos || {};
  const isReal = v => v && v !== 'TBD';
  for (const g of order) {
    const b = geos[g]?.primary?.broadcaster;
    if (isReal(b)) return b;
  }
  for (const g of Object.keys(geos)) {
    if (order.includes(g)) continue;
    const b = geos[g]?.primary?.broadcaster;
    if (isReal(b)) return b;
  }
  if (isReal(race.platform)) return race.platform;
  return null;
}

// First URL from a race-level youtubeHighlights field (string or array).
function ytHighlightsUrl(race) {
  const yh = race.youtubeHighlights;
  if (!yh || yh === 'TBD') return null;
  if (typeof yh === 'string') return yh;
  if (Array.isArray(yh)) {
    for (const item of yh) {
      if (item?.url && item.url !== 'TBD') return item.url;
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
  const expectedStageFiles = new Set();

  for (const race of data.races) {
    totalChecked++;
    const f = `race-details/${race.id}.html`;
    const r = checkFile(f, MIN_RACE_BYTES);
    if (!r.ok) {
      (r.reason === 'missing' ? missing : tooSmall).push(`${f} (${r.reason})`);
    } else {
      // Race-page content probes (catches today's missed regressions).
      const probes = [];

      // (A) Race-level youtubeHighlights URL must appear in HTML.
      const ytUrl = ytHighlightsUrl(race);
      if (ytUrl) {
        // The URL is rendered inside an href attribute — match the bare URL.
        probes.push({ label: 'race.youtubeHighlights URL', probe: ytUrl });
      }
      // (B) Race-level videoNote text must appear in HTML.
      if (race.videoNote && race.videoNote.length > 30) {
        probes.push({ label: 'race.videoNote', probe: race.videoNote });
      }
      // (C) When data has a real broadcaster, page must NOT show "Coverage: TBD".
      const expectedBc = expectedBroadcaster(race);
      if (expectedBc) {
        probes.push({
          label: `Coverage stat should not be TBD (expected "${expectedBc}")`,
          mustNotMatch: 'Coverage</span><span class="v sm">TBD</span>'
        });
      }
      // (D) When jerseys are curated, the first jersey's native name must render.
      if (Array.isArray(race.jerseys) && race.jerseys[0]?.name) {
        probes.push({ label: 'jerseys[0].name', probe: race.jerseys[0].name });
      }

      const miss = probeRenderedContent(f, probes);
      miss.forEach(m => tooSmall.push(`${f} — ${m}`));
    }

    // ── Stage detail pages — generator only emits when stageDetails
    //    is populated, so the smoke test only requires the page when
    //    the data is rich enough to render one. ───────────────────
    if (race.raceFormat === 'stage-race' && Array.isArray(race.stages)) {
      for (const s of race.stages) {
        if (s.stageType === 'rest-day') continue;
        if (s.stageNumber == null) continue;
        if (!s.stageDetails || Object.keys(s.stageDetails).length === 0) continue;
        const sfRel = `race-details/${race.id}-stage-${s.stageNumber}.html`;
        expectedStageFiles.add(`${race.id}-stage-${s.stageNumber}.html`);
        totalChecked++;
        const sr = checkFile(sfRel, MIN_RACE_BYTES);
        if (!sr.ok) {
          (sr.reason === 'missing' ? missing : tooSmall).push(`${sfRel} (${sr.reason})`);
        } else {
          // Content probe: catch the "data present but generator drops it" bug.
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
          // Stage-level youtubeHighlights URL must appear.
          if (s.youtubeHighlights && s.youtubeHighlights !== 'TBD') {
            probes.push({ label: 'stage.youtubeHighlights URL', probe: s.youtubeHighlights });
          }
          // Coverage stat on stage page must not be TBD when expected broadcaster exists.
          const expectedBc = (s.platform && s.platform !== 'TBD') ? s.platform : expectedBroadcaster(race);
          if (expectedBc) {
            probes.push({
              label: `Coverage stat should not be TBD (expected "${expectedBc}")`,
              mustNotMatch: 'Coverage</span><span class="v sm">TBD</span>'
            });
          }
          const miss = probeRenderedContent(sfRel, probes);
          miss.forEach(m => tooSmall.push(`${sfRel} — ${m}`));
        }
      }
    }
  }

  // ── Stale stage HTML files — generator silently leaves orphans
  //    when stageDetails is later emptied. Catch them here. ──────
  const stageHtmlFiles = readdirSync(join(root, 'race-details'))
    .filter(f => /-stage-\d+\.html$/.test(f));
  for (const f of stageHtmlFiles) {
    if (!expectedStageFiles.has(f)) {
      tooSmall.push(`race-details/${f} — stale stage page (no longer in race-data.json)`);
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
