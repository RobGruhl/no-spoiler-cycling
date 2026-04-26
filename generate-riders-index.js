#!/usr/bin/env node

// v2 design — UCI Roadbook riders index
// Outputs riders.html (men) or riders-women.html when passed gender=women via
// generate-riders-women-index.js. Reuses the same buildRidersIndex() renderer.

import fs from 'fs';

const SPECIALTY_LABELS = {
  'climber': 'Climber',
  'sprinter': 'Sprinter',
  'puncheur': 'Puncheur',
  'gc-contender': 'GC',
  'time-trialist': 'Time Trial',
  'one-day': 'Classics',
  'rouleur': 'Rouleur',
};

const NATIONALITY_FLAGS = {
  SL: '🇸🇮', SI: '🇸🇮', DE: '🇩🇪', DK: '🇩🇰', BE: '🇧🇪', NL: '🇳🇱', NE: '🇳🇱',
  FR: '🇫🇷', IT: '🇮🇹', ES: '🇪🇸', GB: '🇬🇧', UK: '🇬🇧', US: '🇺🇸', AU: '🇦🇺',
  CO: '🇨🇴', PT: '🇵🇹', PO: '🇵🇹', MX: '🇲🇽', ME: '🇲🇽', AT: '🇦🇹', NO: '🇳🇴',
  PL: '🇵🇱', CH: '🇨🇭', SW: '🇨🇭', IE: '🇮🇪', CA: '🇨🇦', NZ: '🇳🇿', CZ: '🇨🇿',
  XX: '🏳️',
};

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatSurnameFirst(name) {
  // Data stores names as "POGAČAR Tadej" (surname first, uppercase surname).
  // Render as "T. Pogačar" for display.
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length < 2) return name || '';
  const surname = parts[0];
  const given = parts.slice(1).join(' ');
  const titleCase = surname.charAt(0) + surname.slice(1).toLowerCase();
  const initial = given.charAt(0);
  return `${initial}. ${titleCase}`;
}

function buildRidersIndex(riders, opts = {}) {
  const {
    pageTitle = 'Men\'s Riders',
    pageEyebrow = 'UCI Men\'s World Tour Ranking',
    docCode = 'NSC/RID/26',
    gender = 'men',
    navOn = 'men',
    riderPagesDir = 'riders',
    lastUpdated = null,
    outsiders = [],
  } = opts;

  const built = new Date().toISOString().slice(0, 10);
  const updateLabel = lastUpdated ? parseUTC(String(lastUpdated).slice(0, 10)) : null;
  const updateStr = updateLabel
    ? `${String(updateLabel.getUTCDate()).padStart(2,'0')} ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][updateLabel.getUTCMonth()]} ${updateLabel.getUTCFullYear()}`
    : built;

  const riderRows = riders.map((r, i) => {
    const flag = NATIONALITY_FLAGS[r.nationalityCode] || NATIONALITY_FLAGS.XX;
    const photo = r.photoUrl && r.photoUrl.startsWith(`${riderPagesDir}/`) ? r.photoUrl : `${riderPagesDir}/photos/placeholder.jpg`;
    const specialtyTags = (r.specialties || []).slice(0, 3).map(s => (SPECIALTY_LABELS[s] || s).toUpperCase()).join(' · ');
    const specialtyData = (r.specialties || []).join(' ');
    const programCount = r.raceProgram?.status === 'announced' ? (r.raceProgram?.races?.length || 0) : 0;
    const teamTag = htmlEscape(r.team || '');
    return {
      num: String(i + 1).padStart(2, '0'),
      rank: r.ranking || 0,
      name: htmlEscape(formatSurnameFirst(r.name)),
      fullName: htmlEscape(r.name),
      team: teamTag,
      flag,
      nat: htmlEscape(r.nationality || ''),
      photo: htmlEscape(photo),
      specialtyTags,
      specialtyData,
      programCount,
      slug: r.slug || r.id,
    };
  });

  const cardsHtml = riderRows.map(r => `<a class="rc" data-sp="${htmlEscape(r.specialtyData)}" href="${riderPagesDir}/${htmlEscape(r.slug)}.html">
    <div class="rc-num">№ ${r.num}</div>
    <div class="rc-photo"><img loading="lazy" src="${r.photo}" alt="${r.name}" onerror="this.style.display='none'"/></div>
    <div class="rc-body">
      <div class="rc-rank mono">UCI #${r.rank}</div>
      <div class="rc-name">${r.name}</div>
      <div class="rc-team mono">${r.team}</div>
      <div class="rc-tags mono">${r.specialtyTags || ''}</div>
      <div class="rc-foot mono"><span>${r.flag} ${r.nat}</span><span>${r.programCount ? r.programCount + ' races' : 'TBD'}</span></div>
    </div>
  </a>`).join('');

  const outsiderRows = (outsiders || []).map((r, i) => {
    const flag = NATIONALITY_FLAGS[r.nationalityCode] || NATIONALITY_FLAGS.XX;
    const photo = r.photoUrl && r.photoUrl.startsWith(`${riderPagesDir}/`) ? r.photoUrl : `${riderPagesDir}/photos/placeholder.jpg`;
    const specialtyTags = (r.specialties || []).slice(0, 3).map(s => (SPECIALTY_LABELS[s] || s).toUpperCase()).join(' · ');
    const programCount = r.raceProgram?.status === 'announced' ? (r.raceProgram?.races?.length || 0) : 0;
    return {
      num: String(i + 1).padStart(2, '0'),
      name: htmlEscape(formatSurnameFirst(r.name)),
      team: htmlEscape(r.team || ''),
      flag,
      nat: htmlEscape(r.nationality || ''),
      photo: htmlEscape(photo),
      specialtyTags,
      programCount,
      slug: r.slug || r.id,
      note: htmlEscape(r.outsiderNote || ''),
    };
  });

  const outsiderCardsHtml = outsiderRows.map(r => `<a class="rc rc-out" href="${riderPagesDir}/${htmlEscape(r.slug)}.html">
    <div class="rc-num">✦ ${r.num}</div>
    <div class="rc-photo"><img loading="lazy" src="${r.photo}" alt="${r.name}" onerror="this.style.display='none'"/></div>
    <div class="rc-body">
      <div class="rc-rank mono">✦ Outsider</div>
      <div class="rc-name">${r.name}</div>
      <div class="rc-team mono">${r.team}</div>
      <div class="rc-tags mono">${r.specialtyTags || ''}</div>
      <div class="rc-foot mono"><span>${r.flag} ${r.nat}</span><span>${r.programCount ? r.programCount + ' races' : 'TBD'}</span></div>
    </div>
  </a>`).join('');

  const title = gender === 'women' ? 'Top Women Riders 2026' : 'Top Men Riders 2026';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(title)} — No Spoiler Cycling</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="shared.css"/>
<style>
.hero{display:grid;grid-template-columns:1.3fr 1fr;gap:40px;padding:44px 0 32px;border-bottom:1px solid var(--rule)}
.hero h1{font-family:var(--font-sans);font-weight:800;font-size:clamp(56px,7vw,96px);line-height:.88;letter-spacing:-.045em;margin:0}
.hero h1 .em{font-style:italic;font-weight:500;color:var(--signal)}
.hero .lead{font-family:var(--font-mono);font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);margin-top:18px}
.hero aside{border-left:1px solid var(--rule);padding-left:32px;display:grid;grid-template-columns:repeat(2,1fr);gap:18px 24px;align-content:start}
.stat{display:block}
.stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3)}
.stat .v{font-family:var(--font-sans);font-weight:700;font-size:32px;letter-spacing:-.02em;line-height:1;margin-top:4px}

.toolbar{position:sticky;top:0;background:var(--paper);z-index:10;border-bottom:1px solid var(--rule);padding:12px 0 10px;margin-top:18px}
.toolbar-row{display:flex;flex-wrap:wrap;gap:6px 6px;align-items:center}
.tb-label{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);margin-right:10px;min-width:56px}
.showing{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase;margin-left:auto}
.showing b{color:var(--ink);font-weight:600}

.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;margin-top:24px;border-top:1px solid var(--rule)}
.rc{display:grid;grid-template-rows:auto auto;border-right:1px solid var(--rule-soft);border-bottom:1px solid var(--rule-soft);padding:16px;transition:background .08s;min-height:260px;color:inherit}
.rc:nth-child(4n){border-right:0}
.rc:hover{background:var(--paper-2)}
.rc-num{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;color:var(--ink-3);text-transform:uppercase;margin-bottom:10px}
.rc-photo{width:100%;aspect-ratio:1/1;background:var(--paper-2);margin-bottom:12px;overflow:hidden;display:flex;align-items:center;justify-content:center;border:1px solid var(--rule-soft)}
.rc-photo img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(.15) contrast(1.02)}
.rc-rank{font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);margin-bottom:4px}
.rc-name{font-family:var(--font-sans);font-weight:700;font-size:18px;letter-spacing:-.01em;line-height:1.1;margin-bottom:4px}
.rc-team{font-size:11px;color:var(--ink-2);letter-spacing:.04em;margin-bottom:8px;line-height:1.3}
.rc-tags{font-size:10px;letter-spacing:.14em;color:var(--ink-3);margin-bottom:10px}
.rc-foot{display:flex;justify-content:space-between;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);margin-top:auto;padding-top:8px;border-top:1px solid var(--rule-soft)}
.rc.hidden{display:none}
.rc-out{background:var(--paper-2)}
.rc-out .rc-num,.rc-out .rc-rank{color:var(--signal)}
.outsider-band{margin-top:48px;padding-top:18px;border-top:1px solid var(--rule);display:flex;align-items:baseline;justify-content:space-between;gap:16px}
.outsider-band h2{font-family:var(--font-sans);font-weight:800;font-size:28px;letter-spacing:-.02em;margin:0}
.outsider-band h2 .mark{color:var(--signal);margin-right:8px}
.outsider-band .lede{font-family:var(--font-mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3);max-width:480px;text-align:right}

@media (max-width:1100px){
  .grid{grid-template-columns:repeat(3,1fr)}
  .rc:nth-child(4n){border-right:1px solid var(--rule-soft)}
  .rc:nth-child(3n){border-right:0}
  .hero{grid-template-columns:1fr}
  .hero aside{border-left:0;padding-left:0;border-top:1px solid var(--rule);padding-top:20px}
}
@media (max-width:640px){
  .grid{grid-template-columns:repeat(2,1fr)}
  .rc:nth-child(3n){border-right:1px solid var(--rule-soft)}
  .rc:nth-child(2n){border-right:0}
}
</style>
</head>
<body>
  <div class="rainbow thick"></div>
  <header class="masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div class="wordmark">No<span class="slash">/</span>Spoiler Cycling
          <span class="sub">Union Cycliste Internationale · Startlist · Season MMXXVI</span>
        </div>
        <div class="mast-meta">
          Document <b>${docCode}</b><br/>
          Updated <b>${updateStr}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="index.html">01 — Calendar</a>
        <a href="riders.html"${navOn==='men'?' class="on"':''}>02 — Men's Riders</a>
        <a href="riders-women.html"${navOn==='women'?' class="on"':''}>03 — Women's Riders</a>
        <a href="about.html">04 — About</a>
        <span class="spacer"></span>
        <span class="edition mono">EN</span>
      </nav>
    </div>
  </header>

  <main class="frame">

    <section class="hero">
      <div>
        <div class="eyebrow">${htmlEscape(pageEyebrow)} · 2026</div>
        <h1>${htmlEscape(pageTitle.split(' ')[0])}<br/><span class="em">${htmlEscape(pageTitle.split(' ').slice(1).join(' '))}</span></h1>
        <p class="lead">Top ${riders.length} riders by UCI ranking. Click through for each rider's announced race program.</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Riders on file</span><span class="v">${riders.length}</span></div>
        <div class="stat"><span class="k">With program</span><span class="v">${riders.filter(r => r.raceProgram?.status === 'announced').length}</span></div>
        <div class="stat"><span class="k">Teams</span><span class="v">${new Set(riders.map(r => r.team).filter(Boolean)).size}</span></div>
        <div class="stat"><span class="k">Nations</span><span class="v">${new Set(riders.map(r => r.nationalityCode).filter(Boolean)).size}</span></div>
      </aside>
    </section>

    <section class="toolbar" id="toolbar">
      <div class="toolbar-row">
        <span class="tb-label">Specialty</span>
        <button class="chip on" data-f="sp" data-v="all">All</button>
        <button class="chip" data-f="sp" data-v="climber">Climber</button>
        <button class="chip" data-f="sp" data-v="sprinter">Sprinter</button>
        <button class="chip" data-f="sp" data-v="puncheur">Puncheur</button>
        <button class="chip" data-f="sp" data-v="gc-contender">GC</button>
        <button class="chip" data-f="sp" data-v="time-trialist">TT</button>
        <button class="chip" data-f="sp" data-v="one-day">Classics</button>
        <button class="chip" data-f="sp" data-v="rouleur">Rouleur</button>
        <span class="showing"><b id="shown">${riders.length}</b> of <b>${riders.length}</b> riders</span>
      </div>
    </section>

    <section class="grid" id="grid">${cardsHtml}</section>

    ${outsiderCardsHtml ? `
    <section class="outsider-band">
      <h2><span class="mark">✦</span>Outsiders <span class="em" style="font-style:italic;font-weight:500;color:var(--signal)">&amp; Espoirs</span></h2>
      <div class="lede">Riders to watch beyond the top 50 — neo-pros, breakouts, and dangerous wildcards.</div>
    </section>
    <section class="grid">${outsiderCardsHtml}</section>` : ''}

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cycling · 2026 Roadbook</span>
        <span>§ ${gender === 'women' ? '03 — Women\'s Riders' : '02 — Men\'s Riders'}</span>
        <span>Built ${built}</span>
      </div>
    </footer>
  </main>

  <script>
  (function(){
    const chips = document.querySelectorAll('.chip[data-f="sp"]');
    const grid = document.getElementById('grid');
    const shown = document.getElementById('shown');
    chips.forEach(btn => btn.addEventListener('click', () => {
      const v = btn.dataset.v;
      chips.forEach(b => b.classList.toggle('on', b === btn));
      let n = 0;
      grid.querySelectorAll('.rc').forEach(card => {
        const sp = (card.dataset.sp || '').split(' ');
        const match = v === 'all' || sp.includes(v);
        card.classList.toggle('hidden', !match);
        if (match) n++;
      });
      shown.textContent = n;
    }));
  })();
  </script>
</body>
</html>
`;
}

function generateRidersIndexPage(ridersDataPath = './data/riders.json', outputPath = './riders.html', opts = {}) {
  const ridersData = JSON.parse(fs.readFileSync(ridersDataPath, 'utf8'));
  // Only the men's index pulls in outsiders.json; women's index has its own generator.
  let outsiders = [];
  const isWomen = opts.gender === 'women';
  if (!isWomen) {
    const outsidersPath = './data/outsiders.json';
    if (fs.existsSync(outsidersPath)) {
      outsiders = JSON.parse(fs.readFileSync(outsidersPath, 'utf8')).riders || [];
    }
  }
  const html = buildRidersIndex(ridersData.riders, { lastUpdated: ridersData.lastUpdated, outsiders, ...opts });
  fs.writeFileSync(outputPath, html);
  console.log(`✓ wrote ${outputPath} — ${ridersData.riders.length} riders${outsiders.length ? ` + ${outsiders.length} outsiders` : ''}`);
  return outputPath;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(`Riders index generator (v2)

Usage:
  node generate-riders-index.js         Generate riders.html (men)
  node generate-riders-index.js --help  Show this help
`);
  } else {
    generateRidersIndexPage();
  }
}

export { buildRidersIndex, generateRidersIndexPage };
