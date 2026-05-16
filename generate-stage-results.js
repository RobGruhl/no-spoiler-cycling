#!/usr/bin/env node

// Per-stage results page generator.
// Renders results/race/<race-id>-stage-N.html from
// data/results/stages/<race-id>-stage-N.json (paired with race-data.json
// for stage metadata).
//
// Lighter than the race-overview page — single stage's story plus GC impact
// plus per-rider mini-cards. Same spoiler-interstitial UX.

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const RACE_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/race-data.json'), 'utf8'));
const RIDERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/riders.json'), 'utf8')).riders;
const OUTSIDERS = (() => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/outsiders.json'), 'utf8')).riders; } catch { return []; } })();
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

function findRider(id) { return ALL_TRACKED.find(r => r.id === id) || null; }
function findRace(id) { return RACE_DATA.races.find(r => r.id === id) || null; }

function nationalityFlag(code) {
  const flags = { SL:'🇸🇮', SI:'🇸🇮', DE:'🇩🇪', DK:'🇩🇰', BE:'🇧🇪', NL:'🇳🇱', NE:'🇳🇱', FR:'🇫🇷', IT:'🇮🇹', ES:'🇪🇸', GB:'🇬🇧', UK:'🇬🇧', US:'🇺🇸', AU:'🇦🇺', CO:'🇨🇴', PT:'🇵🇹', PO:'🇵🇹', MX:'🇲🇽', ME:'🇲🇽', AT:'🇦🇹', NO:'🇳🇴', PL:'🇵🇱', CH:'🇨🇭', SW:'🇨🇭', IE:'🇮🇪', CA:'🇨🇦', NZ:'🇳🇿', CZ:'🇨🇿', ER:'🇪🇷' };
  return flags[code] || '🏳️';
}

function langFlag(lang) { return ({ en:'🇬🇧', fr:'🇫🇷', nl:'🇳🇱', it:'🇮🇹', es:'🇪🇸', de:'🇩🇪' })[lang] || '🌐'; }

function roleLabel(role) {
  return ({ 'leader':'LEADER','co-leader':'CO-LEADER','protected':'PROTECTED','lieutenant':'LIEUTENANT','domestique':'DOMESTIQUE','free role':'FREE ROLE','free-role':'FREE ROLE','breakaway':'BREAKAWAY','sprinter':'SPRINTER','climber':'CLIMBER','gc-leader':'GC LEADER','stage-hunter':'STAGE HUNTER' })[role] || (role || '').toUpperCase();
}

function statusBadge(perf) {
  if (perf.incident) return { cls: 'incident', label: perf.incidentLabel || 'INCIDENT' };
  if (perf.position === 'DNF' || perf.position === 'OTL' || perf.position === 'ABD' || perf.position === 'DNS') {
    return { cls: 'dnf', label: String(perf.position) };
  }
  if (typeof perf.position === 'number' && perf.position <= 3) return { cls: 'podium', label: `P${perf.position}` };
  if (typeof perf.position === 'number' && perf.position <= 10) return { cls: 'top', label: `P${perf.position}` };
  return { cls: 'plain', label: typeof perf.position === 'number' ? `P${perf.position}` : (perf.position || '—') };
}

// ----------------------------------------------------------------------------

function renderStagePage(raceId, stageNumber) {
  const race = findRace(raceId);
  if (!race) throw new Error(`Race not found: ${raceId}`);
  const stageMeta = (race.stages || []).find(s => s.stageNumber === stageNumber);
  if (!stageMeta) throw new Error(`Stage not found: ${raceId} stage ${stageNumber}`);

  const dataPath = path.join(ROOT, 'data/results/stages', `${raceId}-stage-${stageNumber}.json`);
  if (!fs.existsSync(dataPath)) throw new Error(`No stage result data: ${dataPath}`);
  const result = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

  // Adjacent stages
  const allStages = (race.stages || []).slice().sort((a, b) => a.stageNumber - b.stageNumber);
  const idx = allStages.findIndex(s => s.stageNumber === stageNumber);
  const prevStage = idx > 0 ? allStages[idx - 1] : null;
  const nextStage = idx < allStages.length - 1 ? allStages[idx + 1] : null;

  const stageId = `${raceId}-stage-${stageNumber}`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Results — ${htmlEscape(race.name)} ${race.raceDate.slice(0, 4)} Stage ${stageNumber} — No Spoiler Cycling</title>
<meta name="robots" content="noindex"/>
<meta name="description" content="Spoiler-gated stage analysis. Read only if you have already watched ${htmlEscape(race.name)} Stage ${stageNumber}."/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../../shared.css"/>
<link rel="stylesheet" href="../_assets/results.css"/>
</head>
<body class="needs-consent">

<div id="spoiler-gate" class="spoiler-gate">
  <div class="spoiler-rainbow"><span></span><span></span><span></span><span></span><span></span></div>
  <div class="frame">
    <div class="gate-inner">
      <div class="gate-mark mono">NSC / RESULTS — SPOILERS FOR THIS STAGE</div>
      <h1 class="gate-h1">${htmlEscape(race.name)}<br/><span class="em">Stage ${stageNumber}.</span></h1>
      <div class="gate-meta">
        <div><span class="mono lbl">Stage</span><div class="val">${htmlEscape(stageMeta.name || `Stage ${stageNumber}`)}</div></div>
        <div><span class="mono lbl">Date</span><div class="val">${fmtLongDate(stageMeta.date)}</div></div>
        <div><span class="mono lbl">Type</span><div class="val">${htmlEscape((stageMeta.stageType || '').toUpperCase())}${stageMeta.distance ? ' · ' + stageMeta.distance + ' km' : ''}</div></div>
      </div>
      <p class="gate-prose">
        This page contains the stage podium, the race story, GC implications after the stage,
        and per-rider performance. Read no further if you intend to watch this stage unspoiled.
      </p>
      <div class="gate-actions">
        <button class="gate-btn primary" id="gate-continue">Continue — I've watched this stage</button>
        <a class="gate-btn ghost" href="../../race-details/${raceId}.html">Take me back to the spoiler-free page</a>
      </div>
      <div class="gate-checks">
        <label><input type="checkbox" id="gate-allclear"/>
          <span>Stop asking me for the rest of the 2026 season — I'm caught up.</span></label>
      </div>
    </div>
  </div>
</div>

<div id="content" hidden>
  <div class="rainbow thick"></div>
  <header class="masthead results-masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div>
          <div class="wordmark">No<span class="slash">/</span>Spoiler<br/>Cycling
            <span class="sub">Results · Stage Analysis · Édition 2026</span>
          </div>
        </div>
        <div class="mast-meta">
          <span class="results-badge mono">RESULTS</span><br/>
          Document <b>NSC/RES/STAGE</b><br/>
          Updated <b>${new Date(result.researchedAt || Date.now()).toUTCString().slice(5, 16).toUpperCase()}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="../../index.html">01 — Calendar</a>
        <a href="../../riders.html">02 — Men's Riders</a>
        <a href="${raceId}.html">↺ ${htmlEscape(race.name)} overview</a>
        <a href="../../about.html">04 — About</a>
        <span class="spacer"></span>
        <a href="../../race-details/${raceId}.html" class="back-spoilerfree mono">← spoiler-free page</a>
      </nav>
    </div>
  </header>

  <main class="frame">

    <div class="crumbs mono">
      <a href="../../index.html">Calendar</a><span class="sep">›</span>
      <a href="../../race-details/${raceId}.html">${htmlEscape(race.name)}</a><span class="sep">›</span>
      <a href="${raceId}.html">Race results</a><span class="sep">›</span>
      <span>Stage ${stageNumber}</span>
    </div>

    <!-- HERO -->
    <section class="r-hero">
      <div>
        <div class="r-eyebrow mono">§ S${stageNumber} · ${htmlEscape((stageMeta.stageType || '').toUpperCase())} · ${htmlEscape(stageMeta.distance ? stageMeta.distance + ' km' : '')}</div>
        <h1 class="r-h1">${htmlEscape(stageMeta.name || `Stage ${stageNumber}`)}<br/><span class="em">${htmlEscape(race.name)} ${race.raceDate.slice(0,4)}</span></h1>
        <p class="r-lede">${htmlEscape(result.tldr || '')}</p>
      </div>
      <aside class="r-podium">
        <div class="r-podium-lbl mono">Stage podium</div>
        ${(result.podium || []).map(p => `<div class="r-podium-row pos-${p.position}">
          <div class="r-pos mono">${p.position === 1 ? '🥇' : p.position === 2 ? '🥈' : p.position === 3 ? '🥉' : 'P' + p.position}</div>
          <div class="r-rider">
            <div class="r-name">${htmlEscape(p.name || '')}</div>
            <div class="r-team mono">${htmlEscape(p.team || '')}</div>
          </div>
          <div class="r-time mono">${htmlEscape(p.time || p.gap || '')}</div>
        </div>`).join('')}
      </aside>
    </section>

    <!-- STAGE NARRATIVE -->
    ${result.narrative ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 01 · The stage</span>
        <h2 class="r-h2">${htmlEscape(result.narrative.headline || 'How it played out')}</h2>
      </div>
      <div class="r-narrative">
        ${(result.narrative.body || '').split('\n\n').filter(p => p.trim()).map(p => `<p>${htmlEscape(p)}</p>`).join('')}
      </div>
    </section>` : ''}

    <!-- GC IMPACT -->
    ${result.gcImpact ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 02 · GC impact</span>
        <h2 class="r-h2">${htmlEscape(result.gcImpact.headline || 'After the stage')}</h2>
      </div>
      <div class="r-narrative">
        ${result.gcImpact.body ? `<p>${htmlEscape(result.gcImpact.body)}</p>` : ''}
      </div>
      ${(result.gcImpact.standings && result.gcImpact.standings.length) ? `<div class="r-perfs" style="margin-top:14px">
        ${result.gcImpact.standings.slice(0, 6).map((s, i) => {
          const r = findRider(s.riderId);
          const flag = r ? nationalityFlag(r.nationalityCode) : '';
          return `<article class="r-perf">
            <header class="r-perf-head">
              <div class="r-perf-rider">
                <span class="r-perf-flag">${flag}</span>
                <span class="r-perf-name">${htmlEscape(s.name)}</span>
                <span class="r-perf-team mono">${htmlEscape(s.team || '')}</span>
              </div>
              <div class="r-perf-status">
                <span class="r-perf-role mono">GC ${i + 1}</span>
                ${s.gap ? `<span class="r-perf-gap mono">${htmlEscape(s.gap)}</span>` : ''}
              </div>
            </header>
          </article>`;
        }).join('')}
      </div>` : ''}
    </section>` : ''}

    <!-- DECISIVE MOMENTS (optional, fewer than race-level) -->
    ${(result.decisiveMoments && result.decisiveMoments.length) ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 03 · Decisive moments</span>
        <h2 class="r-h2">Where the stage tilted</h2>
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

    <!-- PER-RIDER PERFORMANCES -->
    ${(result.riderPerformances && result.riderPerformances.length) ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 04 · Rider-by-rider · tracked riders</span>
        <h2 class="r-h2">Storylines from the stage</h2>
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
                <span class="r-perf-team mono">${htmlEscape(p.team || (r ? r.team.replace(/\\\|/g, '|') : ''))}</span>
              </div>
              <div class="r-perf-status">
                <span class="r-perf-role mono">${roleLabel(p.role)}</span>
                <span class="r-perf-pos r-pos-${status.cls}">${status.label}</span>
                ${p.gap ? `<span class="r-perf-gap mono">${htmlEscape(p.gap)}</span>` : ''}
              </div>
            </header>
            <p class="r-perf-narrative">${htmlEscape(p.narrative || '')}</p>
            ${p.incident ? `<div class="r-perf-incident mono">⚠ ${htmlEscape(p.incident)}</div>` : ''}
          </article>`;
        }).join('')}
      </div>
    </section>` : ''}

    <!-- INCIDENTS -->
    ${result.incidents && (result.incidents.crashes?.length || result.incidents.abandons?.length) ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 05 · Stage incidents</span>
        <h2 class="r-h2">Crashes, abandons</h2>
      </div>
      <div class="r-incidents">
        ${(result.incidents.crashes || []).map(c => `<div class="r-incident r-incident-crash">
          <div class="r-incident-tag mono">CRASH${c.km ? ' · ' + c.km + ' km' : ''}</div>
          <p>${htmlEscape(c.description)}</p>
        </div>`).join('')}
        ${(result.incidents.abandons || []).map(a => {
          const r = findRider(a.riderId);
          return `<div class="r-incident r-incident-abandon">
          <div class="r-incident-tag mono">ABANDON${a.km ? ' · ' + a.km + ' km' : ''}</div>
          <p><b>${htmlEscape(r ? r.name : a.riderId)}</b> — ${htmlEscape(a.reason)}</p>
        </div>`}).join('')}
      </div>
    </section>` : ''}

    <!-- QUOTES -->
    ${(result.quotes && result.quotes.length) ? `<section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ 06 · After the line</span>
        <h2 class="r-h2">Quotes</h2>
      </div>
      <div class="r-aftermath">
        ${result.quotes.map(q => `<blockquote class="r-quote">
          <p>"${htmlEscape(q.text)}"</p>
          <footer class="mono">— ${htmlEscape(q.speaker)}${q.context ? ' · ' + htmlEscape(q.context) : ''}${q.source ? ' · ' + htmlEscape(q.source) : ''}</footer>
        </blockquote>`).join('')}
      </div>
    </section>` : ''}

    <!-- ADJACENT STAGES -->
    <section class="r-section">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ X · Navigate</span>
      </div>
      <div class="rs-key-moments" style="display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap">
        <div>${prevStage ? `<a href="${raceId}-stage-${prevStage.stageNumber}.html" class="r-perf-name">← Stage ${prevStage.stageNumber}: ${htmlEscape(prevStage.name || '')}</a>` : ''}</div>
        <div><a href="${raceId}.html" class="r-perf-name">${htmlEscape(race.name)} overall</a></div>
        <div>${nextStage ? `<a href="${raceId}-stage-${nextStage.stageNumber}.html" class="r-perf-name">Stage ${nextStage.stageNumber}: ${htmlEscape(nextStage.name || '')} →</a>` : ''}</div>
      </div>
    </section>

    <!-- SOURCES -->
    ${(result.sources && result.sources.length) ? `<section class="r-section r-sources">
      <div class="r-section-head">
        <span class="r-eyebrow mono">§ Y · Sources</span>
        <h2 class="r-h2">Where this stage analysis comes from</h2>
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
      <p class="mono">Compiled ${new Date(result.researchedAt || Date.now()).toUTCString()}. Stage research via Perplexity. Synthesis by Claude in Lanterne Rouge tonal register.</p>
    </footer>

  </main>
</div>

<script>
(function() {
  const stageId = ${JSON.stringify(stageId)};
  const raceId = ${JSON.stringify(raceId)};
  const SEEN = 'nsc:results:seen-stage:' + stageId;
  const RACE_SEEN = 'nsc:results:seen:' + raceId;
  const ALLCLEAR = 'nsc:results:all-clear';
  const gate = document.getElementById('spoiler-gate');
  const content = document.getElementById('content');
  function reveal() { gate.hidden = true; content.hidden = false; document.body.classList.remove('needs-consent'); }
  try {
    if (localStorage.getItem(SEEN) || localStorage.getItem(RACE_SEEN) || localStorage.getItem(ALLCLEAR)) {
      reveal(); return;
    }
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

// ----------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const all = args.includes('--all');
  const raceIdx = args.indexOf('--race');

  let work = [];
  if (all) {
    const stagesDir = path.join(ROOT, 'data/results/stages');
    if (fs.existsSync(stagesDir)) {
      for (const f of fs.readdirSync(stagesDir).filter(f => f.endsWith('.json'))) {
        const m = f.match(/^(.+?)-stage-(\d+)\.json$/);
        if (m) work.push({ raceId: m[1], stageNumber: parseInt(m[2], 10) });
      }
    }
  } else if (raceIdx !== -1) {
    const raceId = args[raceIdx + 1];
    const stagesDir = path.join(ROOT, 'data/results/stages');
    for (const f of fs.readdirSync(stagesDir).filter(f => f.startsWith(`${raceId}-stage-`) && f.endsWith('.json'))) {
      const m = f.match(/-stage-(\d+)\.json$/);
      if (m) work.push({ raceId, stageNumber: parseInt(m[1], 10) });
    }
  }

  if (!work.length) {
    console.error('Usage: node generate-stage-results.js --all | --race <race-id>');
    process.exit(1);
  }

  for (const { raceId, stageNumber } of work) {
    try {
      const html = renderStagePage(raceId, stageNumber);
      const out = path.join(ROOT, 'results/race', `${raceId}-stage-${stageNumber}.html`);
      fs.writeFileSync(out, html);
      console.log(`✓ ${out}`);
    } catch (e) {
      console.error(`✗ ${raceId} stage ${stageNumber}: ${e.message}`);
      process.exitCode = 1;
    }
  }
}

main();
