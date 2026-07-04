#!/usr/bin/env node

// Results subsystem generator — produces /results/race/<id>.html from
// data/results/races/<id>.json plus race metadata from data/race-data.json.
//
// This subsystem is the inverse of the spoiler-free site. Every output page
// is gated by a localStorage-backed interstitial; without consent, the page
// renders only a warning. Consent is stored per-race (or globally as
// "all-clear") in the browser. No spoiler content ever leaks into <title>
// or meta tags — those name the race generically.
//
// Usage:
//   node generate-results.js --race paris-roubaix-2026
//   node generate-results.js --all

import fs from 'fs';
import path from 'path';
import { siteLegalFooter } from './lib/site-chrome.js';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const RACE_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/race-data.json'), 'utf8'));
const RIDERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/riders.json'), 'utf8')).riders;
const OUTSIDERS = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/outsiders.json'), 'utf8')).riders; } catch { return []; }
})();

const ALL_TRACKED = [...RIDERS, ...OUTSIDERS];

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const MONTH_LONG = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function fmtLongDate(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const wd = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getUTCDay()];
  return `${wd}, ${MONTH_LONG[m - 1]} ${d}, ${y}`;
}

function findRider(id) {
  return ALL_TRACKED.find(r => r.id === id) || null;
}

function nationalityFlag(code) {
  const flags = { SL: '🇸🇮', SI: '🇸🇮', DE: '🇩🇪', DK: '🇩🇰', BE: '🇧🇪', NL: '🇳🇱', NE: '🇳🇱',
    FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', GB: '🇬🇧', UK: '🇬🇧', US: '🇺🇸', AU: '🇦🇺', CO: '🇨🇴',
    PT: '🇵🇹', PO: '🇵🇹', MX: '🇲🇽', ME: '🇲🇽', AT: '🇦🇹', NO: '🇳🇴', PL: '🇵🇱', CH: '🇨🇭',
    SW: '🇨🇭', IE: '🇮🇪', CA: '🇨🇦', NZ: '🇳🇿', CZ: '🇨🇿', ER: '🇪🇷' };
  return flags[code] || '🏳️';
}

function langFlag(lang) {
  return { en: '🇬🇧', fr: '🇫🇷', nl: '🇳🇱', it: '🇮🇹', es: '🇪🇸', de: '🇩🇪' }[lang] || '🌐';
}

function roleLabel(role) {
  return {
    'leader': 'LEADER',
    'co-leader': 'CO-LEADER',
    'protected': 'PROTECTED',
    'lieutenant': 'LIEUTENANT',
    'domestique': 'DOMESTIQUE',
    'free role': 'FREE ROLE',
    'free-role': 'FREE ROLE',
    'breakaway': 'BREAKAWAY',
    'sprinter': 'SPRINTER',
    'climber': 'CLIMBER',
    'gc-leader': 'GC LEADER',
    'stage-hunter': 'STAGE HUNTER',
  }[role] || (role || '').toUpperCase();
}

function statusBadge(perf) {
  if (perf.incident) return { cls: 'incident', label: perf.incidentLabel || 'INCIDENT' };
  if (perf.position === 'DNF' || perf.position === 'OTL' || perf.position === 'DNS' || perf.position === 'ABD') {
    return { cls: 'dnf', label: String(perf.position) };
  }
  if (typeof perf.position === 'number' && perf.position <= 3) return { cls: 'podium', label: `P${perf.position}` };
  if (typeof perf.position === 'number' && perf.position <= 10) return { cls: 'top', label: `P${perf.position}` };
  return { cls: 'plain', label: typeof perf.position === 'number' ? `P${perf.position}` : (perf.position || '—') };
}

// ============================================================================
// Race results page
// ============================================================================

function renderRacePage(raceId) {
  const race = RACE_DATA.races.find(r => r.id === raceId);
  if (!race) throw new Error(`Race not found: ${raceId}`);
  const resultPath = path.join(ROOT, 'data/results/races', `${raceId}.json`);
  if (!fs.existsSync(resultPath)) throw new Error(`Result data not found: ${resultPath}`);
  const result = JSON.parse(fs.readFileSync(resultPath, 'utf8'));

  // Identify which stage results pages we've published for this race
  const stagesDir = path.join(ROOT, 'data/results/stages');
  const publishedStageNums = new Set();
  if (fs.existsSync(stagesDir)) {
    for (const f of fs.readdirSync(stagesDir)) {
      const m = f.match(/^(.+)-stage-(\d+)\.json$/);
      if (m && m[1] === raceId) publishedStageNums.add(parseInt(m[2], 10));
    }
  }
  const raceStages = (race.stages || []).slice()
    .filter(s => s.stageType !== 'rest-day')
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const hasStagePages = publishedStageNums.size > 0;

  // Cross-link the race hub to every tracked rider who features anywhere in
  // this race (overview perfs, team rosters, OR any stage) and has a published
  // season page. Grand-Tour hubs carry their per-rider detail at stage level,
  // so without this the overview links to no riders at all.
  const trackedRiderIds = new Set();
  for (const p of (result.riderPerformances || [])) if (p.riderId) trackedRiderIds.add(p.riderId);
  for (const t of (result.teamStories || [])) for (const id of (t.riderIds || [])) trackedRiderIds.add(id);
  if (fs.existsSync(stagesDir)) {
    for (const f of fs.readdirSync(stagesDir)) {
      const m = f.match(/^(.+)-stage-(\d+)\.json$/);
      if (!m || m[1] !== raceId) continue;
      const sd = JSON.parse(fs.readFileSync(path.join(stagesDir, f), 'utf8'));
      for (const p of (sd.riderPerformances || [])) if (p.riderId) trackedRiderIds.add(p.riderId);
    }
  }
  const trackedRiders = [...trackedRiderIds]
    .map(id => findRider(id))
    .filter(Boolean)
    .filter((r, i, a) => a.findIndex(x => (x.slug || x.id) === (r.slug || r.id)) === i)
    .filter(r => fs.existsSync(path.join(ROOT, 'results/rider', `${r.slug || r.id}.html`)))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const isMonument = (race.prestige || []).includes('monument');
  const isGrandTour = (race.prestige || []).includes('grand-tour');
  const prestigeLabel = isGrandTour ? 'GRAND TOUR' : isMonument ? 'MONUMENT' : (race.category || 'RACE');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Results — ${htmlEscape(race.name)} ${race.raceDate.slice(0, 4)} — No Spoiler Cycling</title>
<meta name="robots" content="noindex"/>
<meta name="description" content="Spoiler-gated post-race analysis. Read only if you have already watched ${htmlEscape(race.name)}."/>
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
      <div class="gate-mark mono">NSC / RESULTS — SPOILERS BEYOND THIS PAGE</div>
      <h1 class="gate-h1">You're about to read<br/><span class="em">what happened.</span></h1>
      <div class="gate-meta">
        <div><span class="mono lbl">Race</span><div class="val">${htmlEscape(race.name)}</div></div>
        <div><span class="mono lbl">Date</span><div class="val">${fmtLongDate(race.raceDate)}</div></div>
        <div><span class="mono lbl">Format</span><div class="val">${htmlEscape(prestigeLabel)} · ${race.distance || '—'} km</div></div>
      </div>
      <p class="gate-prose">
        This page contains the podium, decisive moments, tactical analysis, team verdicts,
        and per-rider performance reports. Read no further if you intend to watch this race
        unspoiled.
      </p>
      <div class="gate-actions">
        <button class="gate-btn primary" id="gate-continue">Continue — I've watched this race</button>
        <a class="gate-btn ghost" href="../../race-details/${raceId}.html">Take me back to the spoiler-free page</a>
      </div>
      <div class="gate-checks">
        <label><input type="checkbox" id="gate-allclear"/>
          <span>Stop asking me for the rest of the 2026 season — I'm caught up.</span></label>
      </div>
    </div>
  </div>
</div>

<!-- =========== CONTENT (revealed after consent) =========== -->
<div id="content" hidden>
  <div class="rainbow thick"></div>
  <header class="masthead results-masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div>
          <div class="wordmark">No<span class="slash">/</span>Spoiler<br/>Cycling
            <span class="sub">Results · Post-Race Analysis · Édition 2026</span>
          </div>
        </div>
        <div class="mast-meta">
          <span class="results-badge mono">RESULTS</span><br/>
          Document <b>NSC/RES/${raceId.toUpperCase().slice(0, 14)}</b><br/>
          Updated <b>${new Date(result.researchedAt || Date.now()).toUTCString().slice(5, 16).toUpperCase()}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="../../index.html">01 — Calendar</a>
        <a href="../../riders.html">02 — Men's Riders</a>
        <a href="../../riders-women.html">03 — Women's Riders</a>
        <a href="../teams.html">04 — Teams <sup style="color:var(--signal);font-size:.58em;letter-spacing:.1em;text-transform:uppercase;font-weight:600">spoilers</sup></a>
        <a href="../../about.html">05 — About</a>
        <span class="spacer"></span>
        <a href="../../race-details/${raceId}.html" class="back-spoilerfree mono">← spoiler-free page</a>
      </nav>
    </div>
  </header>

  <main class="frame">

    <!-- BREADCRUMBS -->
    <div class="crumbs mono">
      <a href="../../index.html">Calendar</a><span class="sep">›</span>
      <a href="../../race-details/${raceId}.html">${htmlEscape(race.name)}</a><span class="sep">›</span>
      <span>Results</span>
    </div>

    <!-- HERO -->
    <section class="r-hero">
      <div>
        <div class="r-eyebrow mono">§ R · ${htmlEscape(prestigeLabel)} · ${htmlEscape(race.location || '')}</div>
        <h1 class="r-h1">${htmlEscape(race.name)}<br/><span class="em">${race.raceDate.slice(0,4)}</span></h1>
        <p class="r-lede">${htmlEscape(result.tldr || '')}</p>
      </div>
      <aside class="r-podium">
        <div class="r-podium-lbl mono">Podium</div>
        ${(result.podium || []).map(p => {
          const r = findRider(p.riderId) || {};
          return `<div class="r-podium-row pos-${p.position}">
            <div class="r-pos mono">${p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : p.position === 3 ? '🥉' : 'P' + p.position}</div>
            <div class="r-rider">
              <div class="r-name">${htmlEscape(p.name || (r.name || '').split(' ').slice(1).join(' ') + ' ' + (r.name || '').split(' ')[0])}</div>
              <div class="r-team mono">${htmlEscape(p.team || r.team || '')}</div>
            </div>
            <div class="r-time mono">${htmlEscape(p.time || p.gap || '')}</div>
          </div>`;
        }).join('')}
      </aside>
    </section>

    <!-- ALL PUBLISHED STAGES (stage races only) -->
    ${hasStagePages ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ · Stages</span>
        <h2 class="r-h2">${result.inProgress ? 'Stages published so far' : 'Every stage we covered'}</h2>
      </div>
      <ol class="r-stage-list">
        ${raceStages.map(s => {
          const has = publishedStageNums.has(s.stageNumber);
          const href = has ? `${raceId}-stage-${s.stageNumber}.html` : null;
          const inner = `
            <div class="r-stage-list-num mono">S${s.stageNumber}</div>
            <div class="r-stage-list-body">
              <div class="r-stage-list-name">${htmlEscape(s.name || '')}</div>
              <div class="r-stage-list-meta mono">${s.date || ''}${s.stageType ? ' · ' + s.stageType : ''}${s.distance ? ' · ' + s.distance + ' km' : ''}${has ? '' : ' · not yet published'}</div>
            </div>`;
          if (href) return `<li class="r-stage-list-item"><a class="r-stage-list-link" href="${href}">${inner}</a></li>`;
          return `<li class="r-stage-list-item r-stage-list-pending">${inner}</li>`;
        }).join('')}
      </ol>
    </section>` : ''}

    <!-- TRACKED RIDERS (cross-link to season pages) -->
    ${trackedRiders.length ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ · Riders we're tracking</span>
        <h2 class="r-h2">Tracked riders in this race</h2>
      </div>
      <div class="r-team-riders mono" style="display:flex;flex-wrap:wrap;gap:8px 18px">
        ${trackedRiders.map(r => `<a href="../rider/${r.slug || r.id}.html" class="r-team-rider">${htmlEscape(r.name)} <span style="color:var(--signal)">season →</span></a>`).join('')}
      </div>
    </section>` : ''}

    <!-- THE RACE IN 90 SECONDS -->
    ${result.narrative ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 01 · The race in 90 seconds</span>
        <h2 class="r-h2">${htmlEscape(result.narrative.headline || 'How it played out')}</h2>
      </div>
      <div class="r-narrative">
        ${result.narrative.openingMoves ? `<p><b class="r-narlbl mono">OPENING</b>${htmlEscape(result.narrative.openingMoves)}</p>` : ''}
        ${result.narrative.raceUnfolds ? `<p><b class="r-narlbl mono">UNFOLDS</b>${htmlEscape(result.narrative.raceUnfolds)}</p>` : ''}
        ${result.narrative.decision ? `<p><b class="r-narlbl mono">DECIDED</b>${htmlEscape(result.narrative.decision)}</p>` : ''}
        ${result.narrative.finale ? `<p><b class="r-narlbl mono">FINALE</b>${htmlEscape(result.narrative.finale)}</p>` : ''}
      </div>
    </section>` : ''}

    <!-- DECISIVE MOMENTS -->
    ${(result.decisiveMoments && result.decisiveMoments.length) ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 02 · Decisive moments</span>
        <h2 class="r-h2">Where the race tilted</h2>
      </div>
      <ol class="r-moments">
        ${result.decisiveMoments.map((m, i) => `<li class="r-moment">
          <div class="r-moment-meta">
            <span class="r-moment-num mono">${String(i + 1).padStart(2, '0')}</span>
            ${m.kmFromFinish ? `<span class="r-moment-km mono">${m.kmFromFinish} km to go</span>` : ''}
            ${m.location ? `<span class="r-moment-loc mono">${htmlEscape(m.location)}</span>` : ''}
          </div>
          <div class="r-moment-body">
            ${m.headline ? `<div class="r-moment-h">${htmlEscape(m.headline)}</div>` : ''}
            <div class="r-moment-p">${htmlEscape(m.description || m.what || '')}</div>
          </div>
        </li>`).join('')}
      </ol>
    </section>` : ''}

    <!-- TEAM STORIES -->
    ${(result.teamStories && result.teamStories.length) ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 03 · Team-by-team</span>
        <h2 class="r-h2">Who pressed, who missed</h2>
      </div>
      <div class="r-teams">
        ${result.teamStories.map(t => `<article class="r-team-card">
          <header class="r-team-head">
            <div class="r-team-name">${htmlEscape(t.team)}</div>
            ${t.verdict ? `<div class="r-team-verdict mono ${t.verdictClass || ''}">${htmlEscape(t.verdict)}</div>` : ''}
          </header>
          <p class="r-team-narrative">${htmlEscape(t.narrative)}</p>
          ${(t.riderIds && t.riderIds.length) ? `<div class="r-team-riders mono">
            <span class="lbl">Riders:</span> ${t.riderIds.map(id => {
              const r = findRider(id);
              return r ? `<a href="../rider/${r.slug || r.id}.html" class="r-team-rider">${htmlEscape(r.name)}</a>` : htmlEscape(id);
            }).join(', ')}
          </div>` : ''}
        </article>`).join('')}
      </div>
    </section>` : ''}

    <!-- PER-RIDER PERFORMANCES -->
    ${(result.riderPerformances && result.riderPerformances.length) ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 04 · Rider-by-rider · tracked riders only</span>
        <h2 class="r-h2">How each story played out</h2>
      </div>
      <div class="r-perfs">
        ${result.riderPerformances.map(p => {
          const r = findRider(p.riderId);
          const flag = r ? nationalityFlag(r.nationalityCode) : '🏳️';
          const status = statusBadge(p);
          const riderLink = r ? `../rider/${r.slug || r.id}.html` : '#';
          return `<article class="r-perf">
            <header class="r-perf-head">
              <div class="r-perf-rider">
                <span class="r-perf-flag">${flag}</span>
                <a href="${riderLink}" class="r-perf-name">${htmlEscape(p.name || (r ? r.name : p.riderId))}</a>
                <span class="r-perf-team mono">${htmlEscape(p.team || (r ? r.team : ''))}</span>
              </div>
              <div class="r-perf-status">
                <span class="r-perf-role mono">${roleLabel(p.role)}</span>
                <span class="r-perf-pos r-pos-${status.cls}">${status.label}</span>
                ${p.gap ? `<span class="r-perf-gap mono">${htmlEscape(p.gap)}</span>` : ''}
              </div>
            </header>
            <p class="r-perf-narrative">${htmlEscape(p.narrative || '')}</p>
            ${(p.keyMoments && p.keyMoments.length) ? `<ul class="r-perf-moments">
              ${p.keyMoments.map(km => `<li class="mono"><span class="r-km-km">${km.km ? km.km + ' km' : (km.where || '')}</span><span class="r-km-what">${htmlEscape(km.what || km.description || '')}</span></li>`).join('')}
            </ul>` : ''}
            ${p.incident ? `<div class="r-perf-incident mono">⚠ ${htmlEscape(p.incident)}</div>` : ''}
          </article>`;
        }).join('')}
      </div>
    </section>` : ''}

    <!-- INCIDENTS -->
    ${result.incidents && (result.incidents.crashes?.length || result.incidents.abandons?.length || result.incidents.controversies?.length) ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 05 · Race incidents</span>
        <h2 class="r-h2">Crashes, abandons, controversy</h2>
      </div>
      <div class="r-incidents">
        ${(result.incidents.crashes || []).map(c => `<div class="r-incident r-incident-crash">
          <div class="r-incident-tag mono">CRASH${c.km ? ' · ' + c.km + ' km' : ''}${c.location ? ' · ' + htmlEscape(c.location) : ''}</div>
          <p>${htmlEscape(c.description)}</p>
        </div>`).join('')}
        ${(result.incidents.abandons || []).map(a => {
          const r = findRider(a.riderId);
          return `<div class="r-incident r-incident-abandon">
          <div class="r-incident-tag mono">ABANDON${a.km ? ' · ' + a.km + ' km' : ''}</div>
          <p><b>${htmlEscape(r ? r.name : a.riderId)}</b> — ${htmlEscape(a.reason)}</p>
        </div>`}).join('')}
        ${(result.incidents.controversies || []).map(c => `<div class="r-incident r-incident-ctrl">
          <div class="r-incident-tag mono">CONTROVERSY</div>
          <p>${htmlEscape(c.description)}</p>
        </div>`).join('')}
      </div>
    </section>` : ''}

    <!-- AFTERMATH -->
    ${result.aftermath ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 06 · Aftermath</span>
        <h2 class="r-h2">${htmlEscape(result.aftermath.headline || 'After the line')}</h2>
      </div>
      <div class="r-aftermath">
        ${(result.aftermath.quotes || []).map(q => `<blockquote class="r-quote">
          <p>"${htmlEscape(q.text)}"</p>
          <footer class="mono">— ${htmlEscape(q.speaker)}${q.context ? ' · ' + htmlEscape(q.context) : ''}${q.source ? ' · ' + htmlEscape(q.source) : ''}</footer>
        </blockquote>`).join('')}
        ${result.aftermath.body ? `<div class="r-aftermath-body">${result.aftermath.body.split('\n\n').map(p => `<p>${htmlEscape(p)}</p>`).join('')}</div>` : ''}
      </div>
    </section>` : ''}

    <!-- SOURCES -->
    ${(result.sources && result.sources.length) ? `<section class="r-section r-sources">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ X · Sources</span>
        <h2 class="r-h2">Where this analysis comes from</h2>
      </div>
      <ul class="r-source-list mono">
        ${result.sources.map(s => `<li>
          <span class="r-src-lang">${langFlag(s.lang || 'en')}</span>
          <a href="${htmlEscape(s.url)}" rel="noopener noreferrer">${htmlEscape(s.publication || s.url)}</a>
          ${s.title ? `<span class="r-src-title">— ${htmlEscape(s.title)}</span>` : ''}
        </li>`).join('')}
      </ul>
    </section>` : ''}

    <footer class="r-footer">
      <p class="mono">Compiled ${new Date(result.researchedAt || Date.now()).toUTCString()}. Research via Perplexity (English + native-language press). Synthesis and prose by Claude in a sober, tactical house style — analysis over hype.</p>
      ${siteLegalFooter('../../')}
    </footer>

  </main>
</div>

<!-- =========== GATE SCRIPT =========== -->
<script>
(function() {
  const raceId = ${JSON.stringify(raceId)};
  const SEEN = 'nsc:results:seen:' + raceId;
  const ALLCLEAR = 'nsc:results:all-clear';
  const gate = document.getElementById('spoiler-gate');
  const content = document.getElementById('content');
  const body = document.body;

  function reveal() {
    gate.hidden = true;
    content.hidden = false;
    body.classList.remove('needs-consent');
  }

  try {
    if (localStorage.getItem(SEEN) || localStorage.getItem(ALLCLEAR)) {
      reveal();
      return;
    }
  } catch (e) {}

  document.getElementById('gate-continue').addEventListener('click', () => {
    try {
      localStorage.setItem(SEEN, '1');
      if (document.getElementById('gate-allclear').checked) {
        localStorage.setItem(ALLCLEAR, '1');
      }
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

function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const raceArg = args[args.indexOf('--race') + 1];

  const races = all
    ? fs.readdirSync(path.join(ROOT, 'data/results/races')).filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''))
    : raceArg ? [raceArg] : [];

  if (!races.length) {
    console.error('Usage: node generate-results.js --race <race-id> | --all');
    process.exit(1);
  }

  for (const id of races) {
    try {
      const html = renderRacePage(id);
      const out = path.join(ROOT, 'results/race', `${id}.html`);
      fs.writeFileSync(out, html);
      console.log(`✓ ${out}`);
    } catch (e) {
      console.error(`✗ ${id}: ${e.message}`);
      process.exitCode = 1;
    }
  }
}

main();
