#!/usr/bin/env node

// Rider season results page generator.
//
// Walks data/results/races/*.json, pulls out every riderPerformance entry
// for a given rider, sorts chronologically (newest first), renders
// results/rider/<slug>.html with a per-race card for each.
//
// Same spoiler-interstitial gating as the race results page — a rider's
// page is just as spoiler-laden as a single race's, and shared content
// like the season arc and final positions must be gated.
//
// Usage:
//   node generate-rider-season.js --rider wout-van-aert
//   node generate-rider-season.js --all      (every rider with at least one performance)

import fs from 'fs';
import path from 'path';
import { siteLegalFooter } from './lib/site-chrome.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const RACE_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/race-data.json'), 'utf8'));
const RIDERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/riders.json'), 'utf8')).riders;
const OUTSIDERS = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/outsiders.json'), 'utf8')).riders; } catch { return []; }
})();
const WOMEN_RIDERS = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/riders-women.json'), 'utf8')).riders; } catch { return []; }
})();
const ALL_TRACKED = [...RIDERS, ...OUTSIDERS, ...WOMEN_RIDERS];

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const MONTH_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtMediumDate(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}, ${y}`;
}

function fmtLongDate(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTH_LONG[m - 1]} ${d}, ${y}`;
}

function findRider(id) {
  return ALL_TRACKED.find(r => r.id === id || r.slug === id) || null;
}

function findRace(id) {
  return RACE_DATA.races.find(r => r.id === id) || null;
}

function nationalityFlag(code) {
  const flags = { SL: '🇸🇮', SI: '🇸🇮', DE: '🇩🇪', DK: '🇩🇰', BE: '🇧🇪', NL: '🇳🇱', NE: '🇳🇱',
    FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', GB: '🇬🇧', UK: '🇬🇧', US: '🇺🇸', AU: '🇦🇺', CO: '🇨🇴',
    PT: '🇵🇹', PO: '🇵🇹', MX: '🇲🇽', ME: '🇲🇽', AT: '🇦🇹', NO: '🇳🇴', PL: '🇵🇱', CH: '🇨🇭',
    SW: '🇨🇭', IE: '🇮🇪', CA: '🇨🇦', NZ: '🇳🇿', CZ: '🇨🇿', ER: '🇪🇷' };
  return flags[code] || '🏳️';
}

function roleLabel(role) {
  return ({
    'leader': 'LEADER',
    'co-leader': 'CO-LEADER',
    'protected': 'PROTECTED',
    'lieutenant': 'LIEUTENANT',
    'domestique': 'DOMESTIQUE',
    'free role': 'FREE ROLE',
    'free-role': 'FREE ROLE',
    'breakaway': 'BREAKAWAY',
    'sprinter': 'SPRINTER',
    'gc-leader': 'GC LEADER',
    'stage-hunter': 'STAGE HUNTER',
    'not selected': 'DID NOT START',
  }[role]) || (role || '').toUpperCase();
}

function aggregateForRider(riderId) {
  const entries = [];

  // Race-overview performances (one-day races + stage-race final/overall entries).
  const racesDir = path.join(ROOT, 'data/results/races');
  if (fs.existsSync(racesDir)) {
    for (const f of fs.readdirSync(racesDir).filter(f => f.endsWith('.json'))) {
      const result = JSON.parse(fs.readFileSync(path.join(racesDir, f), 'utf8'));
      const perf = (result.riderPerformances || []).find(p => p.riderId === riderId);
      if (perf) {
        entries.push({
          ...perf,
          raceId: result.raceId,
          raceName: result.raceName,
          raceDate: result.raceDate,
          racePrestige: findRace(result.raceId)?.prestige || []
        });
      }
    }
  }

  // Per-stage performances — stage races (in-progress or finished) store rider
  // detail per stage. Surfacing them here matches the documented "auto-pulls
  // riderPerformances from race/stage JSONs" contract. The stage's results page
  // lives at results/race/<raceId>-stage-N.html, so we point the entry there.
  const stagesDir = path.join(ROOT, 'data/results/stages');
  if (fs.existsSync(stagesDir)) {
    for (const f of fs.readdirSync(stagesDir).filter(f => f.endsWith('.json'))) {
      const result = JSON.parse(fs.readFileSync(path.join(stagesDir, f), 'utf8'));
      for (const perf of (result.riderPerformances || [])) {
        if (perf.riderId !== riderId) continue;
        const baseName = findRace(result.raceId)?.name || result.raceName || result.raceId;
        entries.push({
          ...perf,
          raceId: `${result.raceId}-stage-${result.stageNumber}`,
          raceName: `${baseName} — Stage ${result.stageNumber}${result.stageName ? `: ${result.stageName}` : ''}`,
          raceDate: result.stageDate,
          racePrestige: findRace(result.raceId)?.prestige || []
        });
      }
    }
  }

  // Newest first
  return entries.sort((a, b) => (b.raceDate || '').localeCompare(a.raceDate || ''));
}

function resultClass(position) {
  if (position === 1) return 'win';
  if (typeof position === 'number' && position <= 3) return 'podium';
  if (typeof position === 'number' && position <= 10) return 'top';
  if (position === 'DNF' || position === 'OTL' || position === 'ABD') return 'dnf';
  if (position === 'DNS') return 'dns';
  return 'plain';
}

function resultLabel(position) {
  if (typeof position === 'number') return `P${position}`;
  if (position) return String(position);
  return '—';
}

function computeStats(entries) {
  const stats = { races: 0, wins: 0, podiums: 0, top10: 0, abandons: 0, leaderRides: 0 };
  for (const e of entries) {
    if (e.position === 'DNS') continue;
    stats.races++;
    if (e.position === 1) stats.wins++;
    if (typeof e.position === 'number' && e.position <= 3) stats.podiums++;
    if (typeof e.position === 'number' && e.position <= 10) stats.top10++;
    if (e.position === 'DNF' || e.position === 'ABD' || e.position === 'OTL') stats.abandons++;
    if ((e.role || '').toLowerCase().includes('leader')) stats.leaderRides++;
  }
  return stats;
}

function buildSeasonArc(rider, entries) {
  // If a custom seasonArc JSON exists at data/results/riders/<slug>.json, prefer it.
  const customPath = path.join(ROOT, 'data/results/riders', `${rider.slug || rider.id}.json`);
  if (fs.existsSync(customPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(customPath, 'utf8'));
      if (data.seasonArc) return data.seasonArc;
    } catch {}
  }
  return null;
}

function loadHealthStatus(rider) {
  const customPath = path.join(ROOT, 'data/results/riders', `${rider.slug || rider.id}.json`);
  if (fs.existsSync(customPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(customPath, 'utf8'));
      if (data.healthStatus) return data.healthStatus;
    } catch {}
  }
  return null;
}

// ============================================================================
// Render
// ============================================================================

function renderRiderPage(riderId) {
  const rider = findRider(riderId);
  if (!rider) throw new Error(`Rider not found: ${riderId}`);
  const entries = aggregateForRider(rider.id);
  const stats = computeStats(entries);
  const seasonArc = buildSeasonArc(rider, entries);
  const healthStatus = loadHealthStatus(rider);

  const surname = (rider.name || '').split(' ').filter(p => p === p.toUpperCase()).join(' ');
  const given = (rider.name || '').split(' ').filter(p => p !== p.toUpperCase()).join(' ');
  const titleCase = w => w ? w.charAt(0) + w.slice(1).toLowerCase() : '';
  const displaySurname = surname.split(' ').map(titleCase).join(' ');
  const displayName = `${given} ${displaySurname}`.trim();
  const cleanTeam = (rider.team || '').replace(/\\\|/g, '|');

  const flag = nationalityFlag(rider.nationalityCode);
  const isWomen = WOMEN_RIDERS.some(r => r.id === rider.id);
  const ridersIndexPath = isWomen ? '../../riders-women.html' : '../../riders.html';
  const riderSpoilerFreePath = isWomen ? `../../riders-women/${rider.slug || rider.id}.html` : `../../riders/${rider.slug || rider.id}.html`;
  const slug = rider.slug || rider.id;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Results — ${htmlEscape(given)} ${htmlEscape(displaySurname)} · Season 2026 — No Spoiler Cycling</title>
<meta name="robots" content="noindex"/>
<meta name="description" content="Spoiler-gated 2026 season log for ${htmlEscape(displayName)}. Read only if you have already watched the races referenced."/>
<!-- Fonts: system stack (see shared.css); no external font requests. -->
<link rel="stylesheet" href="../../shared.css"/>
<link rel="stylesheet" href="../_assets/results.css"/>
</head>
<body class="needs-consent">

<!-- =========== SPOILER INTERSTITIAL =========== -->
<div id="spoiler-gate" class="spoiler-gate">
  <div class="spoiler-rainbow"><span></span><span></span><span></span><span></span><span></span></div>
  <div class="frame">
    <div class="gate-inner">
      <div class="gate-mark mono">NSC / RESULTS — SPOILERS FOR EVERY RACE BELOW</div>
      <h1 class="gate-h1">${htmlEscape(given)} <span class="em">${htmlEscape(displaySurname)}</span><br/>2026 season log.</h1>
      <div class="gate-meta">
        <div><span class="mono lbl">Team</span><div class="val">${htmlEscape(cleanTeam)}</div></div>
        <div><span class="mono lbl">Races covered</span><div class="val">${entries.length} of 2026 so far</div></div>
        <div><span class="mono lbl">Scope</span><div class="val">Every race we've researched</div></div>
      </div>
      <p class="gate-prose">
        This page covers ${htmlEscape(displayName)}'s 2026 season race-by-race, including results,
        roles, key moments, and incidents for each race. Each entry is a spoiler for
        the corresponding race. Read no further if you intend to watch any of them
        unspoiled.
      </p>
      <div class="gate-actions">
        <button class="gate-btn primary" id="gate-continue">Continue — I've watched these races</button>
        <a class="gate-btn ghost" href="${riderSpoilerFreePath}">Take me back to the spoiler-free rider sheet</a>
      </div>
      <div class="gate-checks">
        <label><input type="checkbox" id="gate-allclear"/>
          <span>Stop asking me for the rest of the 2026 season — I'm caught up.</span></label>
      </div>
    </div>
  </div>
</div>

<!-- =========== CONTENT =========== -->
<div id="content" hidden>
  <div class="rainbow thick"></div>
  <header class="masthead results-masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div>
          <div class="wordmark">No<span class="slash">/</span>Spoiler<br/>Cycling
            <span class="sub">Results · Rider Season Log · Édition 2026</span>
          </div>
        </div>
        <div class="mast-meta">
          <span class="results-badge mono">RESULTS</span><br/>
          Document <b>NSC/RES/RIDER</b><br/>
          Updated <b>${new Date().toUTCString().slice(5, 16).toUpperCase()}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="../../index.html">01 — Calendar</a>
        <a href="${ridersIndexPath}">${isWomen ? '03 — Women\'s Riders' : '02 — Men\'s Riders'}</a>
        <a href="../teams.html">04 — Teams <sup style="color:var(--signal);font-size:.58em;letter-spacing:.1em;text-transform:uppercase;font-weight:600">spoilers</sup></a>
        <a href="../../about.html">05 — About</a>
        <span class="spacer"></span>
        <a href="${riderSpoilerFreePath}" class="back-spoilerfree mono">← spoiler-free rider sheet</a>
      </nav>
    </div>
  </header>

  <main class="frame">

    <div class="crumbs mono">
      <a href="../../index.html">Calendar</a><span class="sep">›</span>
      <a href="${ridersIndexPath}">${isWomen ? "Women's Riders" : "Men's Riders"}</a><span class="sep">›</span>
      <a href="${riderSpoilerFreePath}">${htmlEscape(displayName)}</a><span class="sep">›</span>
      <span>Season Log</span>
    </div>

    <!-- HERO -->
    <section class="rs-hero">
      <div>
        <div class="r-eyebrow mono">§ R · Rider · 2026 Season Log</div>
        <h1 class="rs-h1">${flag} ${htmlEscape(given)} <span class="last">${htmlEscape(displaySurname)}</span></h1>
        <div class="rs-meta">
          <div><span class="lbl mono">Team</span><div class="val">${htmlEscape(cleanTeam)}</div></div>
          <div><span class="lbl mono">Nationality</span><div class="val">${htmlEscape(rider.nationality)}</div></div>
          <div><span class="lbl mono">UCI Rank</span><div class="val">${rider.ranking ? '#' + rider.ranking : '—'}</div></div>
        </div>
      </div>
      <aside class="rs-stats">
        <div class="rs-stats-lbl mono">2026 season — what we have so far</div>
        ${healthStatus ? `<div class="rs-stat-row rs-health-row"><span>Current status</span><b class="rs-health-${healthStatus.current}">${(healthStatus.current || '').toUpperCase()}</b></div>` : ''}
        <div class="rs-stat-row"><span>Races covered</span><b>${stats.races}</b></div>
        <div class="rs-stat-row"><span>Wins</span><b>${stats.wins}</b></div>
        <div class="rs-stat-row"><span>Podiums (top 3)</span><b>${stats.podiums}</b></div>
        <div class="rs-stat-row"><span>Top 10s</span><b>${stats.top10}</b></div>
        <div class="rs-stat-row"><span>Abandons / DNF</span><b>${stats.abandons}</b></div>
        <div class="rs-stat-row"><span>Rides as team leader</span><b>${stats.leaderRides}</b></div>
      </aside>
    </section>

    <!-- HEALTH STATUS — prominent banner when injured/recovering/ill -->
    ${healthStatus && healthStatus.current && healthStatus.current !== 'active' ? `<section class="rs-health">
      <div class="rs-health-head">
        <span class="r-eyebrow mono">⚠ § · Health status · ${htmlEscape((healthStatus.current || '').toUpperCase())}</span>
        <h2 class="r-h2">${htmlEscape(healthStatus.current === 'injured' ? 'Out injured' : healthStatus.current === 'recovering' ? 'In recovery' : 'Health update')}</h2>
      </div>
      ${healthStatus.currentSummary ? `<p class="rs-health-summary">${htmlEscape(healthStatus.currentSummary)}</p>` : ''}
      ${(healthStatus.timeline && healthStatus.timeline.length) ? `<ol class="rs-health-timeline">
        ${healthStatus.timeline.map(t => `<li class="rs-health-event">
          <div class="rs-health-date mono">${htmlEscape(t.date || '')}</div>
          <div class="rs-health-body">
            <div class="rs-health-label">${htmlEscape(t.label || '')}</div>
            <div class="rs-health-desc">${htmlEscape(t.description || '')}</div>
          </div>
        </li>`).join('')}
      </ol>` : ''}
      <div class="rs-health-meta mono">
        ${healthStatus.lastRaced ? `<span><b>Last race:</b> ${htmlEscape(healthStatus.lastRaced)}</span>` : ''}
        ${healthStatus.expectedReturn ? `<span><b>Expected return:</b> ${htmlEscape(healthStatus.expectedReturn)}</span>` : ''}
      </div>
    </section>` : ''}

    <!-- SEASON ARC -->
    ${seasonArc ? `<section class="rs-arc">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 01 · The season so far</span>
        <h2 class="r-h2">Arc</h2>
      </div>
      <div class="rs-arc-body">
        ${seasonArc.split('\n\n').map(p => `<p>${htmlEscape(p)}</p>`).join('')}
      </div>
    </section>` : ''}

    <!-- PER-RACE LOG -->
    <section class="rs-races">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 02 · Race-by-race</span>
        <h2 class="r-h2">${entries.length === 1 ? 'The 2026 race log (most recent first — more to come)' : 'The 2026 race log — most recent first'}</h2>
      </div>
      ${entries.length === 0 ? `<div class="rs-empty">No race results yet logged for this rider in 2026. Check back as the season progresses.</div>` : ''}
      ${entries.map(e => {
        const prestige = e.racePrestige || [];
        const tag = prestige.includes('grand-tour') ? 'GRAND TOUR' : prestige.includes('monument') ? 'MONUMENT' : prestige.includes('world-championship') ? 'WORLD CHAMPIONSHIP' : '';
        return `<article class="rs-race">
          <div class="rs-race-meta">
            <div class="rs-race-date mono">${fmtMediumDate(e.raceDate)}</div>
            <a class="rs-race-name" href="../race/${e.raceId}.html">${htmlEscape(e.raceName)}</a>
            ${tag ? `<div class="rs-race-tag mono">${tag}</div>` : ''}
          </div>
          <div class="rs-race-body">
            <div class="rs-race-head-row">
              <span class="rs-role mono">${roleLabel(e.role)}</span>
              <span class="rs-result mono ${resultClass(e.position)}">${resultLabel(e.position)}</span>
              ${e.gap && e.gap !== '—' ? `<span class="rs-gap mono">${htmlEscape(e.gap)}</span>` : ''}
              ${e.team ? `<span class="rs-gap mono">· ${htmlEscape(e.team)}</span>` : ''}
            </div>
            ${e.narrative ? `<p class="rs-narrative">${htmlEscape(e.narrative)}</p>` : ''}
            ${(e.keyMoments && e.keyMoments.length) ? `<ul class="rs-key-moments">
              ${e.keyMoments.map(km => `<li><span class="rs-km-km">${km.km ? km.km + ' km' : (km.where || '')}</span><span class="rs-km-what">${htmlEscape(km.what || km.description || '')}</span></li>`).join('')}
            </ul>` : ''}
            ${e.incident ? `<div class="rs-incident mono">⚠ ${htmlEscape(e.incident)}</div>` : ''}
          </div>
        </article>`;
      }).join('')}
    </section>

    <footer class="r-footer">
      <p class="mono">Compiled ${new Date().toUTCString()}. Per-race entries are synthesised from our race results data, written in a sober, tactical house style. Season log expands as more 2026 races are researched.</p>
      ${siteLegalFooter('../../')}
    </footer>
  </main>
</div>

<script>
(function() {
  const slug = ${JSON.stringify(slug)};
  const SEEN = 'nsc:results:seen-rider:' + slug;
  const ALLCLEAR = 'nsc:results:all-clear';
  const gate = document.getElementById('spoiler-gate');
  const content = document.getElementById('content');
  function reveal() { gate.hidden = true; content.hidden = false; document.body.classList.remove('needs-consent'); }
  try {
    if (localStorage.getItem(SEEN) || localStorage.getItem(ALLCLEAR)) { reveal(); return; }
  } catch (e) {}
  document.getElementById('gate-continue').addEventListener('click', () => {
    try {
      localStorage.setItem(SEEN, '1');
      if (document.getElementById('gate-allclear').checked) localStorage.setItem(ALLCLEAR, '1');
    } catch (e) {}
    reveal();
  });
})();
</script>

</body>
</html>`;

  return html;
}

// ============================================================================
// Entry
// ============================================================================

function ridersWithPerformances() {
  const ids = new Set();
  const collect = (dir) => {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) return;
    for (const f of fs.readdirSync(full).filter(f => f.endsWith('.json'))) {
      const result = JSON.parse(fs.readFileSync(path.join(full, f), 'utf8'));
      for (const perf of (result.riderPerformances || [])) {
        if (perf.riderId) ids.add(perf.riderId);
      }
    }
  };
  collect('data/results/races');
  collect('data/results/stages');
  return [...ids];
}

function main() {
  const args = process.argv.slice(2);
  const riderIdx = args.indexOf('--rider');
  const all = args.includes('--all');
  let riderIds = [];
  if (all) riderIds = ridersWithPerformances();
  else if (riderIdx !== -1) riderIds = [args[riderIdx + 1]];

  if (!riderIds.length) {
    console.error('Usage: node generate-rider-season.js --rider <rider-id> | --all');
    process.exit(1);
  }

  for (const id of riderIds) {
    try {
      const rider = findRider(id);
      if (!rider) { console.error(`✗ unknown rider: ${id}`); continue; }
      const html = renderRiderPage(id);
      const out = path.join(ROOT, 'results/rider', `${rider.slug || rider.id}.html`);
      fs.writeFileSync(out, html);
      console.log(`✓ ${out}`);
    } catch (e) {
      console.error(`✗ ${id}: ${e.message}`);
      process.exitCode = 1;
    }
  }
}

main();
