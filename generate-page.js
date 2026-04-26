#!/usr/bin/env node

// v2 design — UCI Roadbook calendar
// Reads data/race-data.json, transforms to a compact row shape, embeds it in
// index.html alongside the new-design markup and shared.css at the repo root.

import fs from 'fs';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatDateRange(raceDate, endDate) {
  const s = parseUTC(raceDate);
  if (!s) return '';
  const e = parseUTC(endDate);
  if (!e || +e === +s) {
    return `${WEEKDAY_SHORT[s.getUTCDay()]}, ${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}`;
  }
  if (s.getUTCMonth() === e.getUTCMonth()) {
    return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()}`;
  }
  return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTH_SHORT[e.getUTCMonth()]} ${e.getUTCDate()}`;
}

const GENDER_CODE = { men: 'm', women: 'w', mixed: 'x' };
const FORMAT_CODE = { 'one-day': 'one', 'stage-race': 'stage', itt: 'itt', ttt: 'ttt' };
const PRESTIGE_CODE = { 'grand-tour': 'grand_tour', monument: 'monument', 'world-championship': 'worlds' };

const PRIMARY_GEO_ORDER = ['US', 'CA', 'UK', 'AU'];

function transformRace(r) {
  const month = r.raceDate ? Number(r.raceDate.slice(5, 7)) : 0;
  const disc = r.discipline === 'cyclocross' ? 'cx' : (r.discipline || 'road');
  const gender = GENDER_CODE[r.gender] || 'm';
  const format = FORMAT_CODE[r.raceFormat] || r.raceFormat || 'one';
  const prestige = [...new Set((r.prestige || []).map(p => PRESTIGE_CODE[p] || p))];
  const terrain = (r.terrain || []).map(t => t === 'cyclocross' ? 'circuit' : t);

  // Primary-audience geos (US/CA/UK/AU) that have a broadcaster with a URL
  const geos = PRIMARY_GEO_ORDER.filter(g => r.broadcast?.geos?.[g]?.primary?.url);
  // Note any other geos present (BE, NL, etc.) for visibility
  const otherGeos = Object.keys(r.broadcast?.geos || {})
    .filter(g => !PRIMARY_GEO_ORDER.includes(g) && r.broadcast.geos[g]?.primary?.url);

  return {
    d: formatDateRange(r.raceDate, r.endDate),
    start: r.raceDate,
    end: r.endDate || r.raceDate,
    month,
    name: r.name,
    loc: r.location || '',
    cat: r.category || '',
    rating: r.rating || 0,
    disc,
    gender,
    format,
    terrain,
    prestige,
    geos,
    otherGeos,
    stages: Array.isArray(r.stages) ? r.stages.length : 0,
    slug: r.id,
  };
}

function computeStats(races) {
  return {
    total: races.length,
    grandTours: races.filter(r => r.prestige.includes('grand_tour')).length,
    monuments: races.filter(r => r.prestige.includes('monument')).length,
    worlds: races.filter(r => r.prestige.includes('worlds')).length,
    fiveStar: races.filter(r => r.rating === 5).length,
    fourPlus: races.filter(r => r.rating >= 4).length,
  };
}

function buildHtml(rows, stats, updatedLabel) {
  const racesJson = JSON.stringify(rows);
  const stamp = new Date().toISOString().slice(0, 10);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>No Spoiler Cycling — 2026 Calendar</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="shared.css"/>
<style>
.hero{display:grid;grid-template-columns:1.3fr 1fr;gap:40px;padding:44px 0 32px;border-bottom:1px solid var(--rule)}
.hero h1{font-family:var(--font-sans);font-weight:800;font-size:clamp(56px,7vw,104px);line-height:.88;letter-spacing:-.045em;margin:0}
.hero h1 .rb{background:linear-gradient(90deg,var(--uci-blue) 0 20%,var(--uci-red) 20% 40%,var(--uci-black) 40% 60%,var(--uci-yellow) 60% 80%,var(--uci-green) 80% 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.hero .lead{font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin-top:18px}
.hero aside{border-left:1px solid var(--rule);padding-left:32px;display:grid;grid-template-columns:repeat(2,1fr);gap:18px 24px;align-content:start}
.stat{display:block}
.stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.stat .v{font-family:var(--font-sans);font-weight:700;font-size:32px;letter-spacing:-.02em;line-height:1;margin-top:4px}
.stat .v.sm{font-size:22px}
.toolbar{position:sticky;top:0;background:var(--paper);z-index:10;border-bottom:1px solid var(--rule);padding:12px 0 10px;margin-top:18px}
.toolbar-row{display:flex;flex-wrap:wrap;gap:6px 6px;align-items:center}
.toolbar-row + .toolbar-row{margin-top:8px}
.tb-label{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);margin-right:10px;min-width:56px}
.showing{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase;margin-left:auto}
.showing b{color:var(--ink);font-weight:600}
.cal{margin-top:0}
.row{display:grid;grid-template-columns:56px 56px 120px 1fr 140px 90px 44px 120px 80px;gap:0;padding:10px 0;border-bottom:1px solid var(--rule-soft);align-items:center;transition:background .08s}
.row:hover{background:var(--paper-2)}
.row .c{padding:0 10px;display:flex;align-items:center;min-width:0}
.row .c.first{padding-left:0}
.row .stars{letter-spacing:.08em}
.row .name{font-family:var(--font-sans);font-weight:600;font-size:16px;letter-spacing:-.005em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .loc{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.04em;text-transform:uppercase;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row .dt{font-family:var(--font-mono);font-size:12px;letter-spacing:.02em}
.row .stg{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase;text-align:right}
.row .gender{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.16em;color:var(--ink-3)}
.row .bc{font-family:var(--font-mono);font-size:13px;text-align:right;line-height:1;display:flex;gap:4px;justify-content:flex-end;align-items:center}
.row .bc .f{display:inline-block;font-size:16px}
.row .bc .more{font-size:10px;color:var(--ink-3);letter-spacing:.08em;margin-left:2px}
.row .bc.tbd{font-size:10.5px;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase}
.row .terr{font-family:var(--font-mono);font-size:10.5px;color:var(--ink-2);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.row.gt{background:linear-gradient(90deg, rgba(245,197,24,.14), transparent 40%)}
.row.mon{background:linear-gradient(90deg, rgba(200,16,46,.10), transparent 40%)}
.row.wc{background:linear-gradient(90deg, rgba(31,58,138,.10), transparent 40%)}
.row .pq{display:flex;gap:4px}
.pq .p{height:14px;padding:0 5px;border:1px solid var(--ink);font-family:var(--font-mono);font-size:9px;letter-spacing:.08em;text-transform:uppercase;display:inline-flex;align-items:center;line-height:1;font-weight:600}
.pq .p.gt{background:var(--uci-yellow);border-color:var(--uci-yellow);color:#111}
.pq .p.mon{background:var(--signal);border-color:var(--signal);color:#fff}
.pq .p.wc{background:var(--uci-blue);border-color:var(--uci-blue);color:#fff}
.legend{margin-top:48px;padding:22px 0;border-top:3px solid var(--ink);border-bottom:1px solid var(--rule);display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:32px}
.legend h3{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);margin:0 0 14px;font-weight:500}
.legend .row2{display:grid;grid-template-columns:auto 1fr;column-gap:14px;row-gap:8px;font-family:var(--font-mono);font-size:12px}
.legend .row2 .k{color:var(--ink);font-weight:600;letter-spacing:.04em}
.legend .row2 .v{color:var(--ink-3)}
@media (max-width:1100px){
  .row{grid-template-columns:50px 54px 110px 1fr 90px}
  .row .c.terr,.row .c.bc,.row .c.stg,.row .c.gender,.row .c.loc{display:none}
  .hero{grid-template-columns:1fr}
  .hero aside{border-left:0;padding-left:0;border-top:1px solid var(--rule);padding-top:20px}
}
@media (max-width:640px){
  .row{grid-template-columns:48px 1fr 70px}
  .row .c.first,.row .c:nth-child(4),.row .c:nth-child(9){display:flex}
  .row .c:nth-child(2),.row .c:nth-child(3),.row .c.loc,.row .c.terr,.row .c.gender,.row .c.bc{display:none}
}
</style>
</head>
<body>
  <div class="rainbow thick"></div>
  <header class="masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div>
          <div class="wordmark">No<span class="slash">/</span>Spoiler<br/>Cycling
            <span class="sub">Union Cycliste Internationale · Calendrier Élite · Season MMXXVI</span>
          </div>
        </div>
        <div class="mast-meta">
          Édition <b>2026</b><br/>
          Document <b>NSC/CAL/26</b><br/>
          Updated <b>${updatedLabel}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="index.html" class="on">01 — Calendar</a>
        <a href="riders.html">02 — Men's Riders</a>
        <a href="riders-women.html">03 — Women's Riders</a>
        <a href="about.html">04 — About</a>
        <span class="spacer"></span>
        <span class="edition mono">EN</span>
      </nav>
    </div>
  </header>

  <main class="frame">

    <section class="hero">
      <div>
        <div class="eyebrow">UCI Elite Road &amp; Cyclocross · 2026</div>
        <h1>The 2026<br/>Season, <span class="rb">Unspoiled</span>.</h1>
        <p class="lead">Every race worth watching. Rated, coded, and scheduled — without telling you who won.</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Races on file</span><span class="v">${stats.total}</span></div>
        <div class="stat"><span class="k">Grand Tours</span><span class="v">${stats.grandTours}</span></div>
        <div class="stat"><span class="k">Monuments</span><span class="v">${stats.monuments}</span></div>
        <div class="stat"><span class="k">World Champs</span><span class="v">${stats.worlds}</span></div>
        <div class="stat"><span class="k">★★★★★ events</span><span class="v sm">${stats.fiveStar}</span></div>
        <div class="stat"><span class="k">★★★★+ events</span><span class="v sm">${stats.fourPlus}</span></div>
      </aside>
    </section>

    <section class="toolbar" id="toolbar">
      <div class="toolbar-row">
        <span class="tb-label">Rating</span>
        <button class="chip on" data-f="rating" data-v="0">All</button>
        <button class="chip" data-f="rating" data-v="2">★★+</button>
        <button class="chip" data-f="rating" data-v="3">★★★+</button>
        <button class="chip" data-f="rating" data-v="4">★★★★+</button>
        <button class="chip" data-f="rating" data-v="5">★★★★★</button>
        <span class="tb-label" style="margin-left:18px">Disc.</span>
        <button class="chip on" data-f="disc" data-v="all">All</button>
        <button class="chip" data-f="disc" data-v="road">Road</button>
        <button class="chip" data-f="disc" data-v="cx">Cyclocross</button>
        <span class="tb-label" style="margin-left:18px">Gender</span>
        <button class="chip on" data-f="gender" data-v="all">All</button>
        <button class="chip" data-f="gender" data-v="m">Men's</button>
        <button class="chip" data-f="gender" data-v="w">Women's</button>
        <span class="showing"><b id="shown">—</b> of <b id="total">—</b> races</span>
      </div>
      <div class="toolbar-row">
        <span class="tb-label">Format</span>
        <button class="chip on" data-f="format" data-v="all">All</button>
        <button class="chip" data-f="format" data-v="one">One-Day</button>
        <button class="chip" data-f="format" data-v="stage">Stage</button>
        <button class="chip" data-f="format" data-v="itt">ITT</button>
        <button class="chip" data-f="format" data-v="ttt">TTT</button>
        <span class="tb-label" style="margin-left:18px">Terrain</span>
        <button class="chip on" data-f="terrain" data-v="all">All</button>
        <button class="chip" data-f="terrain" data-v="flat">Flat</button>
        <button class="chip" data-f="terrain" data-v="hilly">Hilly</button>
        <button class="chip" data-f="terrain" data-v="mountain">Mountain</button>
        <button class="chip" data-f="terrain" data-v="cobbles">Cobbles</button>
        <button class="chip" data-f="terrain" data-v="gravel">Gravel</button>
        <button class="chip" data-f="terrain" data-v="itt">Time Trial</button>
        <span class="tb-label" style="margin-left:18px">Prestige</span>
        <button class="chip on" data-f="prestige" data-v="all">All</button>
        <button class="chip" data-f="prestige" data-v="grand_tour">Grand Tour</button>
        <button class="chip" data-f="prestige" data-v="monument">Monument</button>
        <button class="chip" data-f="prestige" data-v="worlds">Worlds</button>
      </div>
    </section>

    <section class="cal" id="cal"></section>

    <section class="legend">
      <div>
        <h3>★ Rating Guide</h3>
        <div class="row2">
          <span class="k">★★★★★</span><span class="v">Can't miss — Grand Tours, Monuments, WC Road</span>
          <span class="k">★★★★</span><span class="v">Major events — World Tour races</span>
          <span class="k">★★★</span><span class="v">Good racing — Pro Series</span>
          <span class="k">★★</span><span class="v">Nice to catch — Continental stage</span>
          <span class="k">★</span><span class="v">Completionist — Minor one-days</span>
        </div>
      </div>
      <div>
        <h3>Race Codes</h3>
        <div class="row2">
          <span class="k">2.UWT / 1.UWT</span><span class="v">UCI World Tour · stage / one-day</span>
          <span class="k">2.Pro / 1.Pro</span><span class="v">UCI Pro Series</span>
          <span class="k">2.1 / 1.1</span><span class="v">UCI Continental calendar</span>
          <span class="k">WWT</span><span class="v">Women's World Tour</span>
          <span class="k">CX.WC / WCh</span><span class="v">Cyclocross World Cup / Worlds</span>
        </div>
      </div>
      <div>
        <h3>Colophon</h3>
        <div class="row2">
          <span class="k">Set in</span><span class="v">Inter Tight · JetBrains Mono</span>
          <span class="k">Bands</span><span class="v">Blue · Red · Black · Yellow · Green</span>
          <span class="k">Edition</span><span class="v">${updatedLabel}</span>
          <span class="k">Source</span><span class="v">UCI calendar · editorial selection</span>
        </div>
      </div>
    </section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cycling · 2026 Roadbook</span>
        <span>§ 01 — Calendar</span>
        <span>Built ${stamp}</span>
      </div>
    </footer>
  </main>

  <div id="consent-banner" class="consent-banner" hidden>
    <div class="consent-body">
      <strong>Remember your filters?</strong>
      <span>We can store your filter selections in a cookie so they're applied next time you visit. No tracking, no third parties.</span>
    </div>
    <div class="consent-actions">
      <button class="chip on" data-consent="yes">Yes, remember</button>
      <button class="chip" data-consent="no">No thanks</button>
    </div>
  </div>

  <script>
  window.MONTHS = ${JSON.stringify(MONTH_NAMES)};
  window.RACES = ${racesJson};
  </script>
  <script>
  const DEFAULTS = {rating:0, disc:"all", gender:"all", format:"all", terrain:"all", prestige:"all"};
  const state = {...DEFAULTS};
  let showOlder = false;
  const MONTHS = window.MONTHS;

  const TODAY = new Date(); TODAY.setHours(0,0,0,0);
  const CUTOFF = new Date(TODAY); CUTOFF.setDate(CUTOFF.getDate() - 14);
  const cutoffIso = CUTOFF.toISOString().slice(0,10);

  // ——— cookie helpers ———
  function getCookie(name){
    return document.cookie.split('; ').reduce((acc,c)=>{
      const i = c.indexOf('=');
      const k = c.slice(0,i), v = c.slice(i+1);
      return k===name ? decodeURIComponent(v) : acc;
    }, '');
  }
  function setCookie(name,value,days){
    const d = new Date(); d.setTime(d.getTime()+days*86400000);
    document.cookie = name+'='+encodeURIComponent(value)+'; expires='+d.toUTCString()+'; path=/; samesite=lax';
  }
  function loadFilters(){
    if (getCookie('nsc-consent')!=='yes') return;
    try { Object.assign(state, JSON.parse(getCookie('nsc-filters')||'{}')); } catch(e){}
  }
  function saveFilters(){
    if (getCookie('nsc-consent')!=='yes') return;
    const compact = Object.fromEntries(
      Object.entries(state).filter(([k,v]) => v!==DEFAULTS[k])
    );
    if (Object.keys(compact).length){
      setCookie('nsc-filters', JSON.stringify(compact), 365);
    } else {
      setCookie('nsc-filters', '', -1);
    }
  }
  function applyChipsFromState(){
    document.querySelectorAll('.chip[data-f]').forEach(b => {
      const f = b.dataset.f, v = b.dataset.v;
      const matches = (f==='rating') ? Number(v)===state[f] : v===state[f];
      b.classList.toggle('on', matches);
    });
  }

  const starsHtml = (n) => {
    const on = "★".repeat(n), off = "★".repeat(5-n);
    return \`<span class="stars">\${on}<span class="off">\${off}</span></span>\`;
  };
  const terrMap = {flat:"FLT", hilly:"HIL", mountain:"MTN", cobbles:"PAV", gravel:"GRV", itt:"TT", circuit:"CIR", 'crosswind-risk':"WND", 'summit-finish':"SUM"};
  const terrHtml = (arr) => arr.map(t=>terrMap[t]||t.toUpperCase()).join(" · ");
  const genderLbl = {m:"M", w:"W", x:"MIX"};
  const GEO_FLAG = {US:"🇺🇸",CA:"🇨🇦",UK:"🇬🇧",AU:"🇦🇺",BE:"🇧🇪",NL:"🇳🇱",TH:"🇹🇭",INTL:"🌐"};
  const geoCell = (r) => {
    if (!r.geos.length && !r.otherGeos.length) return '<span class="bc tbd">no stream</span>';
    const main = r.geos.map(g => \`<span class="f" title="\${g}">\${GEO_FLAG[g]||g}</span>\`).join("");
    const extra = r.otherGeos.length ? \`<span class="more">+\${r.otherGeos.length}</span>\` : "";
    return main + extra;
  };

  function match(r){
    if (state.rating && r.rating < state.rating) return false;
    if (state.disc!=="all" && r.disc!==state.disc) return false;
    if (state.gender!=="all" && r.gender!==state.gender) return false;
    if (state.format!=="all" && r.format!==state.format) return false;
    if (state.terrain!=="all" && !r.terrain.includes(state.terrain)) return false;
    if (state.prestige!=="all" && !r.prestige.includes(state.prestige)) return false;
    return true;
  }

  function rowHtml(r){
    const href = r.slug ? \`race-details/\${r.slug}.html\` : "#";
    const cls = r.prestige.includes("grand_tour")?"gt":r.prestige.includes("monument")?"mon":r.prestige.includes("worlds")?"wc":"";
    const codeCls = r.prestige.includes("worlds")?"code wc":(r.cat.includes("UWT")||r.cat.includes("WWT"))?"code inv":"code";
    return \`<a class="row \${cls}" href="\${href}">
      <div class="c first">\${starsHtml(r.rating)}</div>
      <div class="c"><span class="\${codeCls}">\${r.cat}</span></div>
      <div class="c dt">\${r.d}</div>
      <div class="c"><span class="name">\${r.name}</span></div>
      <div class="c loc">\${r.loc}</div>
      <div class="c terr">\${terrHtml(r.terrain)}</div>
      <div class="c gender">\${genderLbl[r.gender]||""}</div>
      <div class="c bc">\${geoCell(r)}</div>
      <div class="c stg">\${r.format==="stage"?(r.stages?r.stages+" stg":"stg"):r.format.toUpperCase()}</div>
    </a>\`;
  }

  function render(){
    const host = document.getElementById("cal");
    const filtered = window.RACES.filter(match);
    const olderArr = filtered.filter(r => r.start < cutoffIso);
    const visibleArr = showOlder ? filtered : filtered.filter(r => r.start >= cutoffIso);

    document.getElementById("shown").textContent = visibleArr.length;
    document.getElementById("total").textContent = window.RACES.length;

    // Group visible races by month + compute totals (post-filter, all months)
    // so partial months can show "X of Y races".
    const grouped = {}, groupedAll = {};
    visibleArr.forEach(r => (grouped[r.month] = grouped[r.month]||[]).push(r));
    filtered.forEach(r => (groupedAll[r.month] = groupedAll[r.month]||[]).push(r));

    let html = "";

    // Disclosure row at the top when older races exist (post-filter).
    if (olderArr.length){
      if (showOlder){
        html += \`<button class="older-toggle" type="button" data-action="toggle-older">↥ Hide older races</button>\`;
      } else {
        const olderMonths = [...new Set(olderArr.map(r=>r.month))].sort((a,b)=>a-b);
        const rangeLbl = olderMonths.length===1
          ? MONTHS[olderMonths[0]-1]
          : \`\${MONTHS[olderMonths[0]-1].slice(0,3)} – \${MONTHS[olderMonths[olderMonths.length-1]-1].slice(0,3)}\`;
        html += \`<button class="older-toggle" type="button" data-action="toggle-older">↧ Show older races (\${olderArr.length} hidden · \${rangeLbl})</button>\`;
      }
    }

    Object.keys(grouped).sort((a,b)=>a-b).forEach(m => {
      const races = grouped[m];
      const total = (groupedAll[m]||[]).length;
      const countLabel = (showOlder || races.length===total)
        ? \`\${races.length} race\${races.length!==1?"s":""}\`
        : \`\${races.length} of \${total} races\`;
      html += \`<header class="month-head">
        <div><div class="lbl">Month</div><div class="num mono">\${String(m).padStart(2,"0")}</div></div>
        <div><div class="lbl">2026</div><div class="name">\${MONTHS[m-1]}</div></div>
        <div class="count">\${countLabel}</div>
      </header>\`;
      races.forEach(r => { html += rowHtml(r); });
    });

    if (!visibleArr.length && !olderArr.length){
      html = \`<div style="padding:60px 0;text-align:center;font-family:var(--font-mono);color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase">No races match these filters.</div>\`;
    } else if (!visibleArr.length){
      html += \`<div style="padding:40px 0;text-align:center;font-family:var(--font-mono);color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase">No upcoming races match these filters.</div>\`;
    }

    host.innerHTML = html;

    const toggleBtn = host.querySelector('[data-action="toggle-older"]');
    if (toggleBtn){
      toggleBtn.addEventListener('click', () => { showOlder = !showOlder; render(); });
    }
  }

  document.querySelectorAll(".chip[data-f]").forEach(btn => {
    btn.addEventListener("click", () => {
      const f = btn.dataset.f, v = btn.dataset.v;
      state[f] = (f==="rating") ? Number(v) : v;
      document.querySelectorAll(\`.chip[data-f="\${f}"]\`).forEach(b => b.classList.toggle("on", b===btn));
      saveFilters();
      render();
    });
  });

  // ——— consent banner ———
  function initConsentBanner(){
    const banner = document.getElementById('consent-banner');
    if (!banner) return;
    if (!getCookie('nsc-consent')) banner.hidden = false;
    banner.querySelectorAll('button[data-consent]').forEach(btn => {
      btn.addEventListener('click', () => {
        setCookie('nsc-consent', btn.dataset.consent, 365);
        banner.hidden = true;
        if (btn.dataset.consent === 'yes') saveFilters();
      });
    });
  }

  loadFilters();
  applyChipsFromState();
  render();
  initConsentBanner();
  </script>
</body>
</html>
`;
}

function main() {
  const data = JSON.parse(fs.readFileSync('./data/race-data.json', 'utf8'));
  const rows = data.races
    .map(transformRace)
    .filter(r => r.start)
    .sort((a, b) => a.start.localeCompare(b.start));
  const stats = computeStats(rows);
  const updated = parseUTC((data.lastUpdated || '').slice(0, 10)) || new Date();
  const updatedLabel = `${String(updated.getUTCDate()).padStart(2, '0')} ${MONTH_SHORT[updated.getUTCMonth()].toUpperCase()} ${updated.getUTCFullYear()}`;

  const html = buildHtml(rows, stats, updatedLabel);
  fs.writeFileSync('./index.html', html);
  console.log(`✓ wrote index.html — ${rows.length} races · ${stats.grandTours} GT · ${stats.monuments} MON · ${stats.worlds} WC`);
}

main();
