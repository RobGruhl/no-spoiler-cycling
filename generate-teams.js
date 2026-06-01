#!/usr/bin/env node

// Teams results page generator — produces results/teams.html.
//
// This is a SPOILER-GATED aggregation page (part of the /results/ subsystem,
// the inverse of the spoiler-free calendar). It walks every race result JSON,
// collects the per-race teamStories[], groups them by team (and by the race's
// gender), and renders a season-long team-by-team verdict view behind the same
// localStorage interstitial used by the race/rider results pages.
//
// One page, two sections (Men's Teams / Women's Teams) with a filter toggle —
// matching the single "Teams (spoilers)" main-nav entry.
//
// Usage:
//   node generate-teams.js

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname));
const RACE_DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/race-data.json'), 'utf8'));
const RIDERS = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/riders.json'), 'utf8')).riders;
const RIDERS_WOMEN = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/riders-women.json'), 'utf8')).riders; } catch { return []; }
})();
const OUTSIDERS = (() => {
  try { return JSON.parse(fs.readFileSync(path.join(ROOT, 'data/outsiders.json'), 'utf8')).riders; } catch { return []; }
})();
const ALL_TRACKED = [...RIDERS, ...RIDERS_WOMEN, ...OUTSIDERS];

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function fmtDate(ymd) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTH_SHORT[m - 1]} ${d}`;
}

function findRider(id) { return ALL_TRACKED.find(r => r.id === id || r.slug === id) || null; }
function raceMeta(id) { return RACE_DATA.races.find(r => r.id === id) || null; }

// Normalise a team name to a grouping key by dropping the sponsor suffix after
// the first " - " / " | " separator, so "UAE Team Emirates - XRG" and
// "UAE Team Emirates" collapse to one card.
function teamKey(team) {
  return team.toLowerCase().split(/\s+[-|]\s+/)[0].replace(/[^a-z0-9]+/g, ' ').trim();
}

// ============================================================================
// Aggregation
// ============================================================================

function collectTeams() {
  // genderKey → teamKey → { display, appearances:[] }
  const byGender = { men: new Map(), women: new Map() };
  const racesDir = path.join(ROOT, 'data/results/races');
  for (const f of fs.readdirSync(racesDir).filter(f => f.endsWith('.json'))) {
    const result = JSON.parse(fs.readFileSync(path.join(racesDir, f), 'utf8'));
    if (!Array.isArray(result.teamStories) || !result.teamStories.length) continue;
    const raceId = f.replace('.json', '');
    const meta = raceMeta(raceId);
    const gender = meta?.gender === 'women' ? 'women' : 'men';
    const bucket = byGender[gender];
    for (const t of result.teamStories) {
      if (!t.team || !t.narrative) continue;
      const key = teamKey(t.team);
      if (!bucket.has(key)) bucket.set(key, { display: t.team, appearances: [] });
      const group = bucket.get(key);
      // Prefer the longest variant of the name as the display label.
      if (t.team.length > group.display.length) group.display = t.team;
      group.appearances.push({
        raceId,
        raceName: meta?.name || raceId,
        raceDate: meta?.raceDate || '',
        verdict: t.verdict || '',
        verdictClass: t.verdictClass || 'neutral',
        narrative: t.narrative,
        riderIds: t.riderIds || [],
      });
    }
  }
  // Sort each team's appearances chronologically; sort teams by appearance count desc.
  const finalise = (bucket) => [...bucket.values()]
    .map(g => { g.appearances.sort((a, b) => (a.raceDate || '').localeCompare(b.raceDate || '')); return g; })
    .sort((a, b) => b.appearances.length - a.appearances.length || a.display.localeCompare(b.display));
  return { men: finalise(byGender.men), women: finalise(byGender.women) };
}

// ============================================================================
// Rendering
// ============================================================================

function renderTeamCard(group) {
  const total = group.appearances.length;
  const wins = group.appearances.filter(a => a.verdictClass === 'win').length;
  return `<article class="r-team-card t-card">
    <header class="r-team-head">
      <div class="r-team-name">${htmlEscape(group.display)}</div>
      <div class="t-card-meta mono">${total} race${total !== 1 ? 's' : ''}${wins ? ` · ${wins} marked win${wins !== 1 ? 's' : ''}` : ''}</div>
    </header>
    <div class="t-appearances">
      ${group.appearances.map(a => `<div class="t-appear">
        <div class="t-appear-head">
          <a class="t-appear-race" href="race/${a.raceId}.html">${htmlEscape(a.raceName)}</a>
          <span class="t-appear-date mono">${fmtDate(a.raceDate)}</span>
          ${a.verdict ? `<span class="r-team-verdict mono ${a.verdictClass}">${htmlEscape(a.verdict)}</span>` : ''}
        </div>
        <p class="t-appear-narrative">${htmlEscape(a.narrative)}</p>
        ${a.riderIds.length ? `<div class="t-appear-riders mono"><span class="lbl">Riders:</span> ${a.riderIds.map(id => {
          const r = findRider(id);
          if (!r) return htmlEscape(id);
          const slug = r.slug || r.id;
          // Only link riders who actually have a published season page.
          return fs.existsSync(path.join(ROOT, 'results/rider', `${slug}.html`))
            ? `<a href="rider/${slug}.html" class="r-team-rider">${htmlEscape(r.name)}</a>`
            : `<span class="r-team-rider-plain">${htmlEscape(r.name)}</span>`;
        }).join(', ')}</div>` : ''}
      </div>`).join('')}
    </div>
  </article>`;
}

function renderSection(label, gender, groups) {
  const body = groups.length
    ? `<div class="r-teams t-grid">${groups.map(renderTeamCard).join('')}</div>`
    : `<p class="t-empty mono">No ${label.toLowerCase()} results published yet — these populate as ${gender === 'women' ? "women's" : "men's"} races are raced and analysed.</p>`;
  return `<section class="r-section t-section" data-gender="${gender}">
    <div class="r-section-head">
      <span class="r-eyebrow mono">§ · ${gender === 'women' ? 'WWT' : 'UWT'}</span>
      <h2 class="r-h2">${htmlEscape(label)}</h2>
    </div>
    ${body}
  </section>`;
}

function renderPage() {
  const { men, women } = collectTeams();
  const teamCount = men.length + women.length;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Results — Teams 2026 — No Spoiler Cycling</title>
<meta name="robots" content="noindex"/>
<meta name="description" content="Spoiler-gated season-long team-by-team analysis. Read only if you are caught up on the 2026 season."/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<link rel="stylesheet" href="_assets/results.css"/>
<style>
  .t-grid{display:grid;grid-template-columns:1fr;gap:0}
  .t-card{padding:22px 0;border-bottom:1px solid var(--rule-soft)}
  .t-card-meta{font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
  .t-appearances{margin-top:14px;display:flex;flex-direction:column;gap:16px}
  .t-appear{padding-left:16px;border-left:2px solid var(--rule)}
  .t-appear-head{display:flex;align-items:baseline;flex-wrap:wrap;gap:10px;margin-bottom:5px}
  .t-appear-race{font-family:var(--font-sans);font-weight:700;font-size:15px;color:var(--ink);text-decoration:none;border-bottom:1px solid var(--signal)}
  .t-appear-race:hover{color:var(--signal)}
  .t-appear-date{font-size:11px;color:var(--ink-3);letter-spacing:.08em}
  .t-appear-narrative{margin:0;font-size:14.5px;line-height:1.55;color:var(--ink-2)}
  .t-appear-riders{margin-top:6px;font-size:11px;color:var(--ink-3)}
  .t-appear-riders .lbl{letter-spacing:.16em;text-transform:uppercase}
  .t-empty{color:var(--ink-3);font-size:12px;letter-spacing:.06em;padding:8px 0}
  .t-toggle{display:flex;gap:8px;margin:8px 0 28px}
  .t-toggle .chip{cursor:pointer}
  .t-section.hidden{display:none}
</style>
</head>
<body class="needs-consent">

<!-- =========== SPOILER INTERSTITIAL =========== -->
<div id="spoiler-gate" class="spoiler-gate">
  <div class="spoiler-rainbow"><span></span><span></span><span></span><span></span><span></span></div>
  <div class="frame">
    <div class="gate-inner">
      <div class="gate-mark mono">NSC / RESULTS — SPOILERS BEYOND THIS PAGE</div>
      <h1 class="gate-h1">You're about to read<br/><span class="em">how the teams' seasons went.</span></h1>
      <div class="gate-meta">
        <div><span class="mono lbl">View</span><div class="val">Team-by-team · 2026</div></div>
        <div><span class="mono lbl">Teams</span><div class="val">${teamCount} covered</div></div>
        <div><span class="mono lbl">Scope</span><div class="val">Every analysed race so far</div></div>
      </div>
      <p class="gate-prose">
        This page aggregates per-race team verdicts and analysis across the whole season —
        wins, losses, and how each squad's campaign unfolded. Read no further if you intend
        to watch any of these races unspoiled.
      </p>
      <div class="gate-actions">
        <button class="gate-btn primary" id="gate-continue">Continue — I'm caught up</button>
        <a class="gate-btn ghost" href="../index.html">Take me back to the spoiler-free calendar</a>
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
            <span class="sub">Results · Team-by-Team · Édition 2026</span>
          </div>
        </div>
        <div class="mast-meta">
          <span class="results-badge mono">RESULTS</span><br/>
          Document <b>NSC/RES/TEAMS</b><br/>
          ${teamCount} teams covered
        </div>
      </div>
      <nav class="navstrip">
        <a href="../index.html">01 — Calendar</a>
        <a href="../riders.html">02 — Men's Riders</a>
        <a href="../riders-women.html">03 — Women's Riders</a>
        <a href="teams.html" class="on">04 — Teams</a>
        <a href="../about.html">05 — About</a>
        <span class="spacer"></span>
        <a href="../index.html" class="back-spoilerfree mono">← spoiler-free site</a>
      </nav>
    </div>
  </header>

  <main class="frame">

    <!-- BREADCRUMBS -->
    <div class="crumbs mono">
      <a href="../index.html">Calendar</a><span class="sep">›</span>
      <span>Teams · Results</span>
    </div>

    <!-- HERO -->
    <section class="r-hero">
      <div>
        <div class="r-eyebrow mono">§ R · TEAM-BY-TEAM · 2026</div>
        <h1 class="r-h1">The teams'<br/><span class="em">season so far.</span></h1>
        <p class="r-lede">Every squad's 2026, assembled race by race from our post-race analysis — who pressed, who missed, and how the campaigns are shaping up. Spoiler-gated.</p>
      </div>
    </section>

    <!-- GENDER TOGGLE -->
    <div class="t-toggle" role="tablist" aria-label="Filter teams by gender">
      <button class="chip on" data-gf="all">All</button>
      <button class="chip" data-gf="men">Men</button>
      <button class="chip" data-gf="women">Women</button>
    </div>

    ${renderSection("Men's Teams", 'men', men)}
    ${renderSection("Women's Teams", 'women', women)}

    <footer class="r-footer">
      <p class="mono">Aggregated from per-race team analysis across the 2026 season. Research via Perplexity (English + native-language press). Synthesis and prose by Claude.</p>
    </footer>

  </main>
</div>

<!-- =========== GATE + TOGGLE SCRIPT =========== -->
<script>
(function() {
  const SEEN = 'nsc:results:seen-teams';
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
    if (localStorage.getItem(SEEN) || localStorage.getItem(ALLCLEAR)) { reveal(); }
  } catch (e) {}

  document.getElementById('gate-continue').addEventListener('click', () => {
    try {
      localStorage.setItem(SEEN, '1');
      if (document.getElementById('gate-allclear').checked) localStorage.setItem(ALLCLEAR, '1');
    } catch (e) {}
    reveal();
  });

  // Gender filter
  const chips = document.querySelectorAll('.t-toggle .chip[data-gf]');
  const sections = document.querySelectorAll('.t-section[data-gender]');
  chips.forEach(btn => btn.addEventListener('click', () => {
    const v = btn.dataset.gf;
    chips.forEach(b => b.classList.toggle('on', b === btn));
    sections.forEach(s => s.classList.toggle('hidden', v !== 'all' && s.dataset.gender !== v));
  }));
})();
</script>

</body>
</html>`;
}

function main() {
  const html = renderPage();
  const out = path.join(ROOT, 'results', 'teams.html');
  fs.writeFileSync(out, html);
  console.log(`✓ wrote ${out}`);
}

main();
