#!/usr/bin/env node

// v2 design — UCI Roadbook rider detail sheet
// Outputs riders/<slug>.html (men) or riders-women/<slug>.html (women) with
// a mini-calendar of the rider's announced 2026 race program.

import fs from 'fs';
import path from 'path';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAY_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const SPECIALTY_LABELS = {
  'climber': 'Climber',
  'sprinter': 'Sprinter',
  'puncheur': 'Puncheur',
  'gc-contender': 'GC Contender',
  'time-trialist': 'Time Trialist',
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

const GENDER_CFG = {
  men: {
    ridersData: './data/riders.json',
    outputDir: './riders',
    indexPath: '../riders.html',
    indexLabel: "Men's Riders",
    navOn: 'men',
    docCode: 'NSC/MEN',
    sectionLabel: '§ 02 — Rider Sheet',
  },
  women: {
    ridersData: './data/riders-women.json',
    outputDir: './riders-women',
    indexPath: '../riders-women.html',
    indexLabel: "Women's Riders",
    navOn: 'women',
    docCode: 'NSC/WOM',
    sectionLabel: '§ 03 — Rider Sheet',
  },
};

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmtShortDate(ymd) {
  const d = parseUTC(ymd);
  if (!d) return '';
  return `${WEEKDAY_SHORT[d.getUTCDay()]}, ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function formatSurnameFirst(name) {
  const parts = (name || '').trim().split(/\s+/);
  if (parts.length < 2) return name || '';
  const surname = parts[0];
  const given = parts.slice(1).join(' ');
  const titleCase = surname.charAt(0) + surname.slice(1).toLowerCase();
  return `${given} ${titleCase}`;
}

function computeAge(dob) {
  const d = parseUTC(dob);
  if (!d) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - d.getUTCFullYear();
  const mDiff = now.getUTCMonth() - d.getUTCMonth();
  if (mDiff < 0 || (mDiff === 0 && now.getUTCDate() < d.getUTCDate())) age--;
  return age;
}

function renderRaceProgram(rider, raceData) {
  const program = rider.raceProgram;
  if (!program || program.status !== 'announced' || !program.races?.length) {
    return `<p class="prose">Program not yet announced. Check back as 2026 progresses.</p>`;
  }

  // Group by month, match to race-data.json entries for canonical slugs
  const raceIndex = new Map();
  if (raceData?.races) {
    raceData.races.forEach(r => raceIndex.set(r.id, r));
  }

  const byMonth = {};
  program.races.forEach(pr => {
    const month = pr.raceDate ? parseUTC(pr.raceDate)?.getUTCMonth() ?? -1 : -1;
    if (month < 0) return;
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(pr);
  });

  return Object.keys(byMonth).sort((a, b) => a - b).map(m => {
    const rows = byMonth[m].sort((a, b) => (a.raceDate || '').localeCompare(b.raceDate || '')).map(pr => {
      // Attempt to resolve to an existing race-details page by matching raceSlug + year
      const candidates = [pr.raceSlug, `${pr.raceSlug}-2026`, `${pr.raceSlug}-${(pr.raceDate || '').slice(0, 4)}`].filter(Boolean);
      const match = candidates.find(c => raceIndex.has(c));
      const href = match ? `../race-details/${match}.html` : null;
      const cell = `<div class="c first mono">${htmlEscape(fmtShortDate(pr.raceDate))}</div>
        <div class="c"><span class="name">${htmlEscape(pr.raceName || pr.raceSlug)}</span></div>
        <div class="c mono cat">${htmlEscape(pr.raceClass || '')}</div>`;
      return href
        ? `<a class="prow" href="${href}">${cell}</a>`
        : `<div class="prow">${cell}</div>`;
    }).join('');
    return `<div class="pm">
      <div class="pm-head">
        <div class="pm-num mono">${String(Number(m) + 1).padStart(2, '0')}</div>
        <div class="pm-name">${MONTH_NAMES[Number(m)]}</div>
        <div class="pm-count mono">${byMonth[m].length} race${byMonth[m].length !== 1 ? 's' : ''}</div>
      </div>
      <div class="pm-list">${rows}</div>
    </div>`;
  }).join('');
}

function generateRiderDetailsHTML(rider, raceData, cfg) {
  const built = new Date().toISOString().slice(0, 10);
  const flag = NATIONALITY_FLAGS[rider.nationalityCode] || NATIONALITY_FLAGS.XX;
  const photo = rider.photoUrl && rider.photoUrl.startsWith('riders')
    ? `../${rider.photoUrl}`
    : null;
  const specialties = (rider.specialties || []).map(s => SPECIALTY_LABELS[s] || s);
  const age = computeAge(rider.dateOfBirth);
  const display = formatSurnameFirst(rider.name);
  const nameParts = display.split(' ');
  const given = nameParts[0];
  const surname = nameParts.slice(1).join(' ');

  const programHtml = renderRaceProgram(rider, raceData);
  const programCount = rider.raceProgram?.status === 'announced' ? (rider.raceProgram?.races?.length || 0) : 0;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(display)} — No Spoiler Cycling</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>
.crumbs{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);padding:16px 0;border-bottom:1px solid var(--rule-soft)}
.crumbs a{color:var(--ink-3);border-bottom:1px solid transparent}
.crumbs a:hover{color:var(--ink);border-bottom-color:var(--ink)}
.crumbs .sep{margin:0 10px;color:var(--rule-soft)}

.hero{display:grid;grid-template-columns:240px 1.3fr 1fr;gap:40px;padding:40px 0 32px;border-bottom:3px solid var(--ink)}
.hero .photo{aspect-ratio:1/1;background:var(--paper-2);border:1px solid var(--rule);overflow:hidden;display:flex;align-items:center;justify-content:center}
.hero .photo img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(.12) contrast(1.03)}
.hero .tag{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
.hero h1{font-family:var(--font-sans);font-weight:800;font-size:clamp(48px,5.5vw,84px);line-height:.9;letter-spacing:-.04em;margin:0}
.hero h1 .em{font-weight:500;font-style:italic;color:var(--signal);display:block}
.hero .sub{font-family:var(--font-mono);font-size:13px;letter-spacing:.06em;color:var(--ink-2);margin-top:14px;line-height:1.5}
.hero aside{border-left:1px solid var(--rule);padding-left:28px;display:grid;grid-template-columns:1fr 1fr;gap:18px 24px;align-content:start}
.stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.stat .v{font-family:var(--font-sans);font-weight:700;font-size:28px;letter-spacing:-.02em;line-height:1;margin-top:4px}
.stat .v.sm{font-size:16px}
.stat .v.mono{font-family:var(--font-mono);font-weight:600;letter-spacing:-.01em}

.section{padding:28px 0;border-bottom:1px solid var(--rule-soft)}
.section h2{font-family:var(--font-sans);font-weight:700;font-size:22px;letter-spacing:-.01em;margin:0 0 10px}
.section .eyebrow{margin-bottom:4px;font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3)}

.chips-inline{display:flex;gap:6px;flex-wrap:wrap}
.sp{display:inline-flex;align-items:center;height:22px;padding:0 10px;border:1px solid var(--ink);font-family:var(--font-mono);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;line-height:1}

.program{margin-top:14px}
.pm{margin-top:24px}
.pm-head{display:grid;grid-template-columns:auto 1fr auto;gap:18px;align-items:baseline;padding:16px 0 8px;border-top:3px solid var(--ink)}
.pm-head .pm-num{font-family:var(--font-sans);font-weight:800;font-size:48px;line-height:.9;letter-spacing:-.04em}
.pm-head .pm-name{font-family:var(--font-sans);font-weight:600;font-size:22px;letter-spacing:-.02em}
.pm-head .pm-count{font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);text-align:right}
.pm-list{border-top:1px solid var(--rule)}
.prow{display:grid;grid-template-columns:140px 1fr 100px;gap:0;padding:10px 0;border-bottom:1px solid var(--rule-soft);align-items:center;color:inherit}
.prow:hover{background:var(--paper-2)}
.prow .c{padding:0 10px;min-width:0}
.prow .c.first{padding-left:0}
.prow .c .name{font-family:var(--font-sans);font-weight:600;font-size:15px;letter-spacing:-.005em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.prow .c .cat{font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.08em;text-transform:uppercase;text-align:right;display:block}
.prow .c.mono{font-family:var(--font-mono);font-size:12px;color:var(--ink-2);letter-spacing:.04em}

.prose{font-family:var(--font-sans);font-size:15px;line-height:1.6;color:var(--ink-2);margin:10px 0;max-width:72ch}

.bio{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--rule);margin-top:14px}
.bio .s{padding:18px;border-right:1px solid var(--rule-soft);border-bottom:1px solid var(--rule-soft)}
.bio .s:last-child{border-right:0}
.bio .s .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.bio .s .v{font-family:var(--font-sans);font-weight:700;font-size:22px;letter-spacing:-.02em;margin-top:4px;line-height:1}
.bio .s .v.mono{font-family:var(--font-mono);font-weight:600}

@media (max-width:1100px){
  .hero{grid-template-columns:1fr}
  .hero aside{border-left:0;padding-left:0;border-top:1px solid var(--rule);padding-top:20px}
  .bio{grid-template-columns:repeat(2,1fr)}
}
</style>
</head>
<body>
  <div class="rainbow thick"></div>
  <header class="masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div class="wordmark">No<span class="slash">/</span>Spoiler Cycling
          <span class="sub">Union Cycliste Internationale · Rider Sheet · Season MMXXVI</span>
        </div>
        <div class="mast-meta">
          Document <b>${htmlEscape(cfg.docCode)}/${htmlEscape((rider.slug || rider.id || '').toUpperCase().slice(0, 10))}</b><br/>
          Built <b>${built}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="../index.html">01 — Calendar</a>
        <a href="../riders.html"${cfg.navOn === 'men' ? ' class="on"' : ''}>02 — Men's Riders</a>
        <a href="../riders-women.html"${cfg.navOn === 'women' ? ' class="on"' : ''}>03 — Women's Riders</a>
        <a href="../about.html">04 — About</a>
        <span class="spacer"></span>
        <span class="edition mono">EN</span>
      </nav>
    </div>
  </header>

  <main class="frame">

    <div class="crumbs"><a href="../index.html">Calendar</a><span class="sep">/</span><a href="${cfg.indexPath}">${htmlEscape(cfg.indexLabel)}</a><span class="sep">/</span>${htmlEscape(display)}</div>

    <section class="hero">
      <div class="photo">
        ${photo ? `<img src="${htmlEscape(photo)}" alt="${htmlEscape(display)}" onerror="this.parentNode.innerHTML='<span style=\\'font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)\\'>No photo</span>'"/>` : `<span style="font-family:var(--font-mono);font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)">No photo</span>`}
      </div>
      <div>
        <div class="tag">
          <span>${flag} ${htmlEscape(rider.nationality || '')}</span>
          <span${rider.isOutsider ? ' style="color:var(--signal);font-weight:600"' : ''}>${rider.isOutsider ? '✦ Outsider' : `UCI #${rider.ranking || '—'}`}</span>
          ${age ? `<span>Age ${age}</span>` : ''}
        </div>
        <h1>${htmlEscape(given)}<span class="em">${htmlEscape(surname)}</span></h1>
        <p class="sub">${htmlEscape(rider.team || 'Team TBD')}</p>
        ${rider.isOutsider && rider.outsiderNote ? `<p class="prose" style="margin-top:10px;font-style:italic;color:var(--ink-2);font-size:14px">${htmlEscape(rider.outsiderNote)}</p>` : ''}
        <div class="chips-inline" style="margin-top:14px">
          ${specialties.map(s => `<span class="sp">${htmlEscape(s)}</span>`).join('')}
        </div>
      </div>
      <aside>
        ${rider.isOutsider
          ? `<div class="stat"><span class="k">Status</span><span class="v sm" style="color:var(--signal)">✦ Outsider</span></div>`
          : `<div class="stat"><span class="k">UCI Rank</span><span class="v">${rider.ranking || '—'}</span></div>`}
        <div class="stat"><span class="k">Points</span><span class="v mono">${rider.points || '—'}</span></div>
        <div class="stat"><span class="k">Team</span><span class="v sm">${htmlEscape(rider.team || 'TBD')}</span></div>
        <div class="stat"><span class="k">2026 Races</span><span class="v">${programCount || '—'}</span></div>
      </aside>
    </section>

    <section class="section">
      <div class="eyebrow">§ 01 — Bio</div>
      <h2>Profile</h2>
      <div class="bio">
        <div class="s"><div class="k">Nationality</div><div class="v sm">${flag} ${htmlEscape(rider.nationality || 'Unknown')}</div></div>
        <div class="s"><div class="k">Date of Birth</div><div class="v sm mono">${htmlEscape(rider.dateOfBirth || '—')}</div></div>
        <div class="s"><div class="k">Height / Weight</div><div class="v sm mono">${rider.height ? rider.height.toFixed(2) + ' m' : '—'} / ${rider.weight ? rider.weight + ' kg' : '—'}</div></div>
      </div>
      ${rider.pcsUrl ? `<p class="prose" style="margin-top:16px"><a href="${htmlEscape(rider.pcsUrl)}" style="border-bottom:1px solid var(--ink)" target="_blank" rel="noopener">ProCyclingStats profile →</a></p>` : ''}
    </section>

    <section class="section">
      <div class="eyebrow">§ 02 — 2026 Race Program</div>
      <h2>Announced races</h2>
      <div class="program">${programHtml}</div>
    </section>

    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cycling · 2026 Roadbook</span>
        <span>${htmlEscape(cfg.sectionLabel)} · ${htmlEscape(display)}</span>
        <span>Built ${built}</span>
      </div>
    </footer>
  </main>
</body>
</html>
`;
}

function generateRiderDetailsPage(rider, raceData, gender = 'men') {
  const cfg = GENDER_CFG[gender];
  if (!fs.existsSync(cfg.outputDir)) fs.mkdirSync(cfg.outputDir, { recursive: true });
  const filepath = path.join(cfg.outputDir, `${rider.slug || rider.id}.html`);
  fs.writeFileSync(filepath, generateRiderDetailsHTML(rider, raceData, cfg));
  return filepath;
}

function generateAllRiderDetailsPages(gender = 'men') {
  const cfg = GENDER_CFG[gender];
  const ridersData = JSON.parse(fs.readFileSync(cfg.ridersData, 'utf8'));
  let raceData = null;
  try { raceData = JSON.parse(fs.readFileSync('./data/race-data.json', 'utf8')); } catch {}
  let n = 0;
  for (const rider of ridersData.riders) {
    generateRiderDetailsPage(rider, raceData, gender);
    n++;
  }
  // Men also pull in outsiders.json so chip clicks from race pages resolve.
  let outsiderCount = 0;
  if (gender === 'men') {
    const outsidersPath = './data/outsiders.json';
    if (fs.existsSync(outsidersPath)) {
      const outsidersData = JSON.parse(fs.readFileSync(outsidersPath, 'utf8'));
      for (const rider of outsidersData.riders || []) {
        generateRiderDetailsPage(rider, raceData, gender);
        outsiderCount++;
      }
    }
  }
  console.log(`✓ generated ${n} ${gender} rider pages${outsiderCount ? ` + ${outsiderCount} outsiders` : ''} in ${cfg.outputDir}`);
}

const args = process.argv.slice(2);
const genderIdx = args.indexOf('--gender');
const gender = genderIdx !== -1 && args[genderIdx + 1] ? args[genderIdx + 1] : 'men';

if (!GENDER_CFG[gender]) {
  console.error(`❌ invalid gender: ${gender} (use men|women)`);
  process.exit(1);
}

if (args.includes('--all')) {
  generateAllRiderDetailsPages(gender);
} else if (args.includes('--rider') && args.length >= 2) {
  const slug = args[args.indexOf('--rider') + 1];
  const cfg = GENDER_CFG[gender];
  const ridersData = JSON.parse(fs.readFileSync(cfg.ridersData, 'utf8'));
  const rider = ridersData.riders.find(r => (r.slug || r.id) === slug);
  if (!rider) { console.error(`❌ rider not found: ${slug}`); process.exit(1); }
  let raceData = null;
  try { raceData = JSON.parse(fs.readFileSync('./data/race-data.json', 'utf8')); } catch {}
  const out = generateRiderDetailsPage(rider, raceData, gender);
  console.log(`✓ ${out}`);
} else if (args.includes('--help')) {
  console.log(`Rider Details Page Generator (v2)

Usage:
  node generate-rider-details.js --all                       men riders (default)
  node generate-rider-details.js --all --gender women        women riders
  node generate-rider-details.js --rider <slug>              single man
  node generate-rider-details.js --rider <slug> --gender women  single woman
`);
} else {
  console.log('No arguments provided. Use --help.');
}

export { generateRiderDetailsHTML, generateRiderDetailsPage, generateAllRiderDetailsPages };
