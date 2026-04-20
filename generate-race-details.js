#!/usr/bin/env node

/**
 * v2 design — UCI Roadbook race sheets
 *
 * Generates per-race HTML pages in race-details/<slug>.html, one of two shapes:
 *   - renderOneDay()   — Paris-Roubaix-style Monument sheet
 *   - renderStageRace() — Tour-Down-Under-style stage manual
 *
 * Per-stage sub-pages (<slug>-stage-N.html) use a compact stage sheet.
 *
 * Placeholder markers: route/profile SVGs and the past-winners block are
 * wireframes — clearly marked PLACEHOLDER in the UI — until real data exists.
 */

import fs from 'fs';
import path from 'path';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAY_LONG = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function parseUTC(ymd) {
  if (!ymd) return null;
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fmtLongDate(ymd) {
  const d = parseUTC(ymd);
  if (!d) return '';
  return `${WEEKDAY_LONG[d.getUTCDay()]}, ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

function fmtDateRange(startYmd, endYmd) {
  const s = parseUTC(startYmd);
  if (!s) return '';
  const e = parseUTC(endYmd);
  if (!e || +e === +s) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} ${s.getUTCFullYear()}`;
  if (s.getUTCMonth() === e.getUTCMonth()) return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()}–${e.getUTCDate()} ${e.getUTCFullYear()}`;
  return `${MONTH_SHORT[s.getUTCMonth()]} ${s.getUTCDate()} – ${MONTH_SHORT[e.getUTCMonth()]} ${e.getUTCDate()} ${e.getUTCFullYear()}`;
}

function fmtShortDate(ymd) {
  const d = parseUTC(ymd);
  if (!d) return '';
  const w = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getUTCDay()];
  return `${w}, ${MONTH_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function htmlEscape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

function stars(n) {
  const on = '★'.repeat(n);
  const off = '★'.repeat(5 - n);
  return `<span class="stars">${on}<span class="off">${off}</span></span>`;
}

// UCI ranking → form-style stars (pure derivation, not a spoiler)
function rankingToStars(ranking) {
  if (!ranking) return 3;
  if (ranking <= 5) return 5;
  if (ranking <= 15) return 4;
  if (ranking <= 30) return 3;
  if (ranking <= 60) return 2;
  return 1;
}

function prestigeClass(race) {
  const p = race.prestige || [];
  if (p.includes('grand-tour')) return 'gt';
  if (p.includes('monument')) return 'mon';
  if (p.includes('world-championship')) return 'wc';
  return '';
}

function prestigeLabel(race) {
  const p = race.prestige || [];
  if (p.includes('grand-tour')) return 'GRAND TOUR';
  if (p.includes('monument')) return 'MONUMENT';
  if (p.includes('world-championship')) return 'WORLD CHAMPIONSHIP';
  return '';
}

function primaryBroadcaster(race) {
  return race.broadcast?.geos?.US?.primary?.broadcaster
    || race.broadcast?.geos?.UK?.primary?.broadcaster
    || race.platform
    || '';
}

const GEO_LABEL = {
  US: { flag: '🇺🇸', name: 'United States' },
  CA: { flag: '🇨🇦', name: 'Canada' },
  UK: { flag: '🇬🇧', name: 'United Kingdom' },
  AU: { flag: '🇦🇺', name: 'Australia' },
  BE: { flag: '🇧🇪', name: 'Belgium' },
  NL: { flag: '🇳🇱', name: 'Netherlands' },
  TH: { flag: '🇹🇭', name: 'Thailand' },
  INTL: { flag: '🌐', name: 'International' },
};
const PRIMARY_GEO_ORDER = ['US', 'CA', 'UK', 'AU', 'BE', 'NL', 'INTL'];

function renderWatchSection(race) {
  const geos = race.broadcast?.geos || {};
  const entries = PRIMARY_GEO_ORDER
    .filter(g => geos[g]?.primary)
    .concat(Object.keys(geos).filter(g => !PRIMARY_GEO_ORDER.includes(g) && geos[g]?.primary));
  const ytChannels = race.broadcast?.youtubeChannels || [];

  if (!entries.length && !ytChannels.length) {
    return `<section class="section">
      <div class="eyebrow">§ Watch</div>
      <h2>Where to watch <span class="placeholder">TBD</span></h2>
      <p class="prose">Broadcast details not yet confirmed. Check back closer to race day.</p>
    </section>`;
  }

  const rows = entries.map(g => {
    const geo = GEO_LABEL[g] || { flag: '🌍', name: g };
    const p = geos[g].primary;
    const alts = geos[g].alternatives || [];
    const typeTag = p.subscription ? '$' : 'free';
    const coverageTag = (p.coverage || 'live').toUpperCase();
    const cta = p.url
      ? `<a class="watch-cta" href="${htmlEscape(p.url)}" target="_blank" rel="noopener">Watch →</a>`
      : `<span class="watch-cta disabled">no link</span>`;
    const altsHtml = alts.length
      ? `<div class="w-alts">${alts.map(a => {
          const aTag = a.subscription ? '$' : 'free';
          const aCover = (a.coverage || '').toUpperCase();
          const aCta = a.url
            ? `<a href="${htmlEscape(a.url)}" target="_blank" rel="noopener">${htmlEscape(a.broadcaster)} →</a>`
            : `<span>${htmlEscape(a.broadcaster)}</span>`;
          return `<span class="w-alt">${aCta}<span class="w-altmeta mono">${aCover}${aTag ? ' · ' + aTag : ''}</span></span>`;
        }).join('')}</div>` : '';
    return `<div class="wrow">
      <div class="w-geo"><span class="w-flag">${geo.flag}</span><span class="w-name">${htmlEscape(geo.name)}</span></div>
      <div class="w-bc">
        <div class="w-bc-name">${htmlEscape(p.broadcaster || 'TBD')}</div>
        <div class="w-bc-meta mono">${htmlEscape(p.type || '')} · ${coverageTag} · ${typeTag}</div>
        ${p.notes ? `<div class="w-bc-notes">${htmlEscape(p.notes)}</div>` : ''}
        ${altsHtml}
      </div>
      <div class="w-cta">${cta}</div>
    </div>`;
  }).join('');

  const ytHtml = ytChannels.length ? `<div class="w-yt mono">
    <span class="w-yt-lbl">YouTube</span>
    ${ytChannels.map(c => {
      const url = c.handle ? `https://www.youtube.com/${encodeURIComponent(c.handle)}` : `https://www.youtube.com/results?search_query=${encodeURIComponent(c.channel || '')}`;
      return `<a href="${htmlEscape(url)}" target="_blank" rel="noopener">${htmlEscape(c.handle || c.channel)}${c.contentType ? ' · ' + htmlEscape(c.contentType) : ''}</a>`;
    }).join('<span class="sep">·</span>')}
  </div>` : '';

  return `<section class="section watch">
    <div class="eyebrow">§ Watch</div>
    <h2>Where to watch</h2>
    <div class="wtable">${rows}</div>
    ${ytHtml}
    <p class="prose" style="margin-top:10px;font-size:12px;letter-spacing:.04em">⚠️ Spoiler warning: live streams and broadcaster home pages may show current standings. Disable autoplay &amp; avoid sidebar recommendations on YouTube.</p>
  </section>`;
}

function renderStageWatchSection(race, stage) {
  const links = [];
  if (stage.url && stage.url !== 'TBD' && stage.platform) {
    links.push({ label: stage.platform, url: stage.url, type: 'primary', tag: stage.duration ? `full · ${stage.duration}` : 'full replay' });
  }
  if (stage.youtubeHighlights && stage.youtubeHighlights !== 'TBD') {
    links.push({ label: 'YouTube Highlights', url: stage.youtubeHighlights, type: 'highlights', tag: 'highlights' });
  }
  const geos = race.broadcast?.geos || {};
  const raceLinks = PRIMARY_GEO_ORDER
    .filter(g => geos[g]?.primary?.url)
    .map(g => ({
      geo: g,
      flag: GEO_LABEL[g]?.flag || '🌍',
      broadcaster: geos[g].primary.broadcaster,
      url: geos[g].primary.url,
    }));

  if (!links.length && !raceLinks.length) {
    return `<section class="section">
      <div class="eyebrow">§ Watch</div>
      <h2>Watch this stage <span class="placeholder">TBD</span></h2>
      <p class="prose">Stage broadcast details not yet confirmed.</p>
    </section>`;
  }

  const primaryCtas = links.length ? `<div class="stage-ctas">
    ${links.map(l => `<a class="stage-cta ${l.type}" href="${htmlEscape(l.url)}" target="_blank" rel="noopener">
      <span class="stage-cta-label">${htmlEscape(l.label)}</span>
      <span class="stage-cta-meta mono">${htmlEscape(l.tag)} →</span>
    </a>`).join('')}
  </div>` : '';

  const raceLinksHtml = raceLinks.length ? `<div class="stage-geo-links mono">
    <span class="stage-geo-lbl">Race coverage</span>
    ${raceLinks.map(r => `<a href="${htmlEscape(r.url)}" target="_blank" rel="noopener">${r.flag} ${htmlEscape(r.broadcaster)}</a>`).join('<span class="sep">·</span>')}
  </div>` : '';

  return `<section class="section watch">
    <div class="eyebrow">§ Watch</div>
    <h2>Watch this stage</h2>
    ${primaryCtas}
    ${raceLinksHtml}
    <p class="prose" style="margin-top:10px;font-size:12px;letter-spacing:.04em">⚠️ Spoiler warning: disable autoplay and avoid sidebar recommendations to stay spoiler-free.</p>
  </section>`;
}

// ============================================
// SHARED PAGE SCAFFOLD
// ============================================

function pageScaffold({ title, docCode, navOn, crumbs, body, footerSection }) {
  const built = new Date().toISOString().slice(0, 10);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${htmlEscape(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet"/>
<link rel="stylesheet" href="../shared.css"/>
<style>
.crumbs{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);padding:16px 0;border-bottom:1px solid var(--rule-soft)}
.crumbs a{color:var(--ink-3);border-bottom:1px solid transparent}
.crumbs a:hover{color:var(--ink);border-bottom-color:var(--ink)}
.crumbs .sep{margin:0 10px;color:var(--rule-soft)}
.hero{display:grid;grid-template-columns:1.5fr 1fr;gap:48px;padding:40px 0 32px;border-bottom:3px solid var(--ink);position:relative}
.hero .tag{font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);display:flex;gap:12px;align-items:center;margin-bottom:18px;flex-wrap:wrap}
.hero h1{font-family:var(--font-sans);font-weight:800;font-size:clamp(56px,6.5vw,104px);line-height:.86;letter-spacing:-.04em;margin:0}
.hero h1 .em{font-style:italic;font-weight:500;color:var(--signal)}
.hero .sub{font-family:var(--font-mono);font-size:13px;letter-spacing:.06em;color:var(--ink-2);margin-top:18px;max-width:62ch;line-height:1.5}
.hero aside{border-left:1px solid var(--rule);padding-left:28px;display:grid;grid-template-columns:1fr 1fr;gap:18px 24px;align-content:start}
.stat{display:block}
.stat .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.stat .v{font-family:var(--font-sans);font-weight:700;font-size:32px;letter-spacing:-.02em;line-height:1;margin-top:4px}
.stat .v.sm{font-size:18px;line-height:1.15}
.stat .v.mono{font-family:var(--font-mono);font-weight:600;letter-spacing:-.01em}
.section{padding:28px 0;border-bottom:1px solid var(--rule-soft)}
.section h2{font-family:var(--font-sans);font-weight:700;font-size:22px;letter-spacing:-.01em;margin:0 0 6px}
.section .eyebrow{margin-bottom:4px}
.placeholder{display:inline-block;border:1px dashed var(--ink-3);padding:2px 8px;font-family:var(--font-mono);font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3);margin-left:10px;vertical-align:middle;border-radius:2px}
.section.watch{background:linear-gradient(180deg, rgba(200,16,46,.04), transparent 70%)}
.wtable{display:grid;grid-template-columns:1fr;border-top:1px solid var(--rule);margin-top:14px}
.wrow{display:grid;grid-template-columns:200px 1fr 120px;gap:0;padding:16px 0;border-bottom:1px solid var(--rule-soft);align-items:center}
.wrow .w-geo{display:flex;align-items:center;gap:10px;padding:0 10px 0 0}
.wrow .w-flag{font-size:24px;line-height:1}
.wrow .w-name{font-family:var(--font-sans);font-weight:600;font-size:14px;letter-spacing:-.005em}
.wrow .w-bc{padding:0 16px;min-width:0}
.wrow .w-bc-name{font-family:var(--font-sans);font-weight:600;font-size:15px;letter-spacing:-.005em;line-height:1.2}
.wrow .w-bc-meta{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3);margin-top:4px}
.wrow .w-bc-notes{font-family:var(--font-sans);font-size:12.5px;color:var(--ink-2);margin-top:6px;line-height:1.4}
.wrow .w-alts{margin-top:8px;display:flex;flex-wrap:wrap;gap:8px 14px;font-family:var(--font-mono);font-size:11px}
.wrow .w-alt{display:flex;align-items:center;gap:6px;color:var(--ink-2)}
.wrow .w-alt a{border-bottom:1px solid var(--rule-soft);color:var(--ink)}
.wrow .w-alt a:hover{border-bottom-color:var(--ink)}
.wrow .w-altmeta{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.wrow .w-cta{text-align:right}
.watch-cta{display:inline-flex;align-items:center;padding:10px 16px;background:var(--ink);color:var(--paper);font-family:var(--font-mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:600;border:1px solid var(--ink);line-height:1;transition:background .12s,color .12s}
.watch-cta:hover{background:var(--signal);border-color:var(--signal);color:#fff}
.watch-cta.disabled{background:transparent;color:var(--ink-3);border-color:var(--rule-soft);cursor:default}
.w-yt{margin-top:18px;padding:14px;border:1px dashed var(--rule);display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:11.5px;letter-spacing:.08em}
.w-yt-lbl{font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3);margin-right:6px}
.w-yt a{border-bottom:1px solid var(--rule-soft);color:var(--ink)}
.w-yt a:hover{border-bottom-color:var(--ink)}
.w-yt .sep{color:var(--rule-soft);margin:0 4px}
.stage-ctas{display:flex;flex-wrap:wrap;gap:14px;margin-top:14px}
.stage-cta{display:inline-grid;grid-template-rows:auto auto;gap:4px;padding:14px 20px;background:var(--ink);color:var(--paper);border:1px solid var(--ink);transition:background .12s,color .12s}
.stage-cta.primary:hover{background:var(--signal);border-color:var(--signal)}
.stage-cta.highlights{background:transparent;color:var(--ink);border:1px solid var(--ink)}
.stage-cta.highlights:hover{background:var(--paper-2)}
.stage-cta-label{font-family:var(--font-sans);font-weight:700;font-size:15px;letter-spacing:-.005em;line-height:1}
.stage-cta-meta{font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;opacity:.8}
.stage-geo-links{margin-top:16px;padding:12px 14px;border:1px solid var(--rule-soft);display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:11.5px;letter-spacing:.08em}
.stage-geo-lbl{font-weight:600;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3);margin-right:6px}
.stage-geo-links a{border-bottom:1px solid var(--rule-soft);color:var(--ink)}
.stage-geo-links a:hover{border-bottom-color:var(--ink)}
.stage-geo-links .sep{color:var(--rule-soft);margin:0 4px}
.statband{display:grid;grid-template-columns:repeat(5,1fr);gap:0;border-top:3px solid var(--ink);border-bottom:1px solid var(--rule);margin-top:18px}
.statband .s{padding:20px 16px;border-right:1px solid var(--rule-soft)}
.statband .s:last-child{border-right:0}
.statband .s .k{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.2em;text-transform:uppercase;color:var(--ink-3)}
.statband .s .v{font-family:var(--font-sans);font-weight:700;font-size:30px;letter-spacing:-.02em;margin-top:6px;line-height:1}
.statband .s .v small{font-family:var(--font-mono);font-size:11px;font-weight:500;color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase;margin-left:4px}
.statband .s .v.sm{font-size:16px;line-height:1.2}
.statband .s .v.mono{font-family:var(--font-mono);font-weight:600}
.sectors{display:grid;grid-template-columns:1fr;border-top:1px solid var(--rule);margin-top:14px}
.sec{display:grid;grid-template-columns:80px 56px 1fr 90px 90px;gap:0;padding:14px 0;border-bottom:1px solid var(--rule-soft);align-items:center}
.sec .c{padding:0 10px;min-width:0}
.sec .c.first{padding-left:0}
.sec .km{font-family:var(--font-mono);font-weight:600;font-size:14px}
.sec .km small{color:var(--ink-3);font-weight:500;font-size:10px;letter-spacing:.14em;text-transform:uppercase;display:block;margin-top:2px}
.sec .no{font-family:var(--font-sans);font-weight:800;font-size:24px;letter-spacing:-.03em}
.sec .nm{font-family:var(--font-sans);font-weight:600;font-size:16px;overflow:hidden;text-overflow:ellipsis}
.sec .ln{font-family:var(--font-mono);font-size:12px;color:var(--ink-2);text-align:right}
.sec .rt{font-family:var(--font-mono);font-size:12px;letter-spacing:.1em;text-align:right}
.sec.five{background:linear-gradient(90deg, rgba(200,16,46,.08), transparent 55%)}
.sec.five .no{color:var(--signal)}
.sec:hover{background:var(--paper-2)}
.climbs{display:grid;grid-template-columns:1fr;border-top:1px solid var(--rule);margin-top:14px}
.climb{display:grid;grid-template-columns:80px 70px 1fr 90px 120px;gap:0;padding:14px 0;border-bottom:1px solid var(--rule-soft);align-items:center}
.climb .c{padding:0 10px;min-width:0}
.climb .c.first{padding-left:0}
.climb .km{font-family:var(--font-mono);font-weight:600;font-size:14px}
.climb .km small{color:var(--ink-3);font-weight:500;font-size:10px;letter-spacing:.14em;text-transform:uppercase;display:block;margin-top:2px}
.climb .cat{font-family:var(--font-mono);font-weight:700;font-size:14px;letter-spacing:.1em}
.climb .cat.hc{color:var(--signal)}
.climb .nm{font-family:var(--font-sans);font-weight:600;font-size:16px}
.climb .ln{font-family:var(--font-mono);font-size:12px;color:var(--ink-2);text-align:right}
.climb .gr{font-family:var(--font-mono);font-size:12px;letter-spacing:.04em;text-align:right;color:var(--ink-2)}
.climb:hover{background:var(--paper-2)}
.fav{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border-top:1px solid var(--rule);margin-top:14px}
.fav .card{padding:18px;border-right:1px solid var(--rule-soft);border-bottom:1px solid var(--rule-soft);display:grid;grid-template-rows:auto auto auto;gap:6px}
.fav .card:nth-child(3n){border-right:0}
.fav .card .no{font-family:var(--font-mono);font-size:11px;letter-spacing:.18em;color:var(--ink-3)}
.fav .card .nm{font-family:var(--font-sans);font-weight:700;font-size:20px;letter-spacing:-.015em}
.fav .card .tm{font-family:var(--font-mono);font-size:12px;color:var(--ink-2);letter-spacing:.04em}
.fav .card .ft{display:flex;justify-content:space-between;align-items:center;margin-top:4px;font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.1em;text-transform:uppercase}
.fav .card .ft .st{color:var(--ink)}
.route{margin-top:14px}
.route svg{width:100%;height:220px;display:block;border:1px solid var(--rule);background:var(--paper)}
.route .cap{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ink-3);margin-top:8px}
.winners{display:grid;grid-template-columns:60px 1fr 1fr 80px;border-top:1px solid var(--rule);margin-top:14px}
.winners > *{padding:10px;border-bottom:1px solid var(--rule-soft);font-family:var(--font-sans)}
.winners .yr{font-family:var(--font-mono);font-weight:600;color:var(--ink-3)}
.winners .who{font-weight:600}
.winners .tm{font-family:var(--font-mono);color:var(--ink-2);font-size:12px}
.winners .gp{font-family:var(--font-mono);text-align:right;color:var(--ink-3);font-size:12px}
.narratives{margin-top:10px}
.narratives li{font-family:var(--font-sans);font-size:15px;line-height:1.55;color:var(--ink-2);margin:8px 0;padding-left:18px;position:relative}
.narratives li::before{content:"§";position:absolute;left:0;color:var(--ink-3);font-family:var(--font-mono);font-weight:600}
.prose{font-family:var(--font-sans);font-size:15px;line-height:1.6;color:var(--ink-2);margin:10px 0;max-width:72ch}
.stamp{position:absolute;top:40px;right:0;transform:rotate(-6deg);border:2px solid var(--signal);color:var(--signal);padding:8px 14px;font-family:var(--font-mono);font-weight:600;font-size:11px;letter-spacing:.22em;text-transform:uppercase;line-height:1.1;text-align:center;pointer-events:none}
.stamp b{display:block;font-size:16px;letter-spacing:.06em;color:var(--signal);margin-top:2px}
.stages{display:grid;grid-template-columns:1fr;gap:0;margin-top:16px;border-top:1px solid var(--rule)}
.stage{display:grid;grid-template-columns:68px 80px 120px 1.2fr 80px 80px 1fr;gap:0;padding:14px 0;border-bottom:1px solid var(--rule-soft);align-items:center;color:inherit}
.stage.qs{background:linear-gradient(90deg, rgba(200,16,46,.08), transparent 60%)}
.stage .c{padding:0 10px;min-width:0}
.stage .c.first{padding-left:0}
.stage .no{font-family:var(--font-sans);font-weight:800;font-size:26px;letter-spacing:-.03em}
.stage .no.qs{color:var(--signal)}
.stage .lbl{font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2)}
.stage .dt{font-family:var(--font-mono);font-size:12px;letter-spacing:.02em}
.stage .rt{font-family:var(--font-sans);font-weight:600;font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.stage .rt .arr{color:var(--ink-3);margin:0 .4em}
.stage .km{font-family:var(--font-mono);font-size:13px;font-weight:600;text-align:right;letter-spacing:.02em}
.stage .km small{display:block;font-weight:400;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-3);margin-top:2px}
.stage .terrcell{font-family:var(--font-mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);text-align:center}
.stage .desc{font-family:var(--font-sans);font-size:12.5px;color:var(--ink-2);line-height:1.45;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.stage:hover{background:var(--paper-2)}
.stage.qs:hover{background:rgba(200,16,46,.12)}
.twocol{display:grid;grid-template-columns:1.3fr 1fr;gap:40px;align-items:start;margin-top:14px}
.sl{display:grid;grid-template-columns:44px 1fr 1fr;gap:0;border-top:1px solid var(--rule)}
.sl > *{padding:10px 10px;border-bottom:1px solid var(--rule-soft);font-family:var(--font-sans)}
.sl .num{font-family:var(--font-mono);font-weight:600;padding-left:0;color:var(--ink-3)}
.sl .riderx{font-weight:600}
.sl .team{font-family:var(--font-mono);font-size:12px;color:var(--ink-2);letter-spacing:.02em}
.jerseys{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-top:14px}
.jersey{border:1px solid var(--rule);padding:14px;display:grid;grid-template-rows:36px auto auto;gap:8px}
.jersey .band{height:14px}
.jersey.y .band{background:var(--uci-yellow)}
.jersey.g .band{background:linear-gradient(90deg, var(--uci-green), #a4d4b4)}
.jersey.p .band{background:var(--signal)}
.jersey.w .band{background:repeating-linear-gradient(90deg,#fff 0 14px,#ddd 14px 28px);border:1px solid var(--rule-soft)}
.jersey .name{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-3)}
.jersey .desc{font-family:var(--font-sans);font-size:12.5px;color:var(--ink-2);line-height:1.4}
@media (max-width:1100px){
  .hero{grid-template-columns:1fr}
  .hero aside{border-left:0;padding-left:0;border-top:1px solid var(--rule);padding-top:20px}
  .statband{grid-template-columns:repeat(2,1fr)}
  .statband .s{border-bottom:1px solid var(--rule-soft)}
  .fav{grid-template-columns:1fr}
  .stamp{display:none}
  .stage{grid-template-columns:48px 70px 1fr 70px}
  .stage .c.dt,.stage .c.terrcell,.stage .c.desc{display:none}
  .twocol{grid-template-columns:1fr}
  .jerseys{grid-template-columns:repeat(2,1fr)}
  .sec{grid-template-columns:60px 40px 1fr 70px}
  .sec .c.rt{display:none}
  .climb{grid-template-columns:60px 50px 1fr 80px}
  .climb .c.gr{display:none}
  .wrow{grid-template-columns:1fr;gap:10px;padding:14px 10px}
  .wrow .w-cta{text-align:left}
}
</style>
</head>
<body>
  <div class="rainbow thick"></div>
  <header class="masthead">
    <div class="frame">
      <div class="masthead-inner">
        <div class="wordmark">No<span class="slash">/</span>Spoiler Cycling
          <span class="sub">Union Cycliste Internationale · Race Sheet · Season MMXXVI</span>
        </div>
        <div class="mast-meta">
          Document <b>${htmlEscape(docCode)}</b><br/>
          Built <b>${built}</b>
        </div>
      </div>
      <nav class="navstrip">
        <a href="../index.html"${navOn==='cal'?' class="on"':''}>01 — Calendar</a>
        <a href="../riders.html"${navOn==='men'?' class="on"':''}>02 — Men's Riders</a>
        <a href="../riders-women.html"${navOn==='women'?' class="on"':''}>03 — Women's Riders</a>
        <a href="../about.html"${navOn==='about'?' class="on"':''}>04 — About</a>
        <span class="spacer"></span>
        <span class="edition mono">§ Race Sheet</span>
      </nav>
    </div>
  </header>

  <main class="frame">
    <div class="crumbs">${crumbs}</div>
    ${body}
    <footer class="foot">
      <div class="foot-row">
        <span>No Spoiler Cycling · 2026 Roadbook</span>
        <span>${htmlEscape(footerSection)}</span>
        <span>Built ${built}</span>
      </div>
    </footer>
  </main>
</body>
</html>
`;
}

// ============================================
// ONE-DAY RACE SHEET
// ============================================

function renderOneDay(race) {
  const rd = race.raceDetails || {};
  const coverage = primaryBroadcaster(race);
  const distance = race.distance || 0;
  const dateLabel = fmtLongDate(race.raceDate);
  const category = race.category || '';
  const pClass = prestigeClass(race);
  const pLabel = prestigeLabel(race);
  const keySectors = rd.keySectors || [];
  const keyClimbs = rd.keyClimbs || [];

  // Split name on an en-dash / em-dash / hyphen for hero typography
  const titleParts = race.name.split(/[–—-]/);
  const heroH1 = titleParts.length >= 2
    ? `${htmlEscape(titleParts[0].trim())}–<span class="em">${htmlEscape(titleParts.slice(1).join('-').trim())}</span>`
    : htmlEscape(race.name);

  const stamp = pClass ? `<div class="stamp">${pLabel}<br/><b>${race.rating || 0}★</b></div>` : '';
  const codeCls = pClass === 'wc' ? 'code wc' : (category.includes('UWT') || category.includes('WWT')) ? 'code inv' : 'code';
  const prestigeBadge = pClass === 'mon' ? '<span class="code sig">MONUMENT</span>'
    : pClass === 'gt' ? '<span class="code" style="background:var(--uci-yellow);color:#111;border-color:var(--uci-yellow)">GRAND TOUR</span>'
    : pClass === 'wc' ? '<span class="code wc">WORLDS</span>'
    : '';

  // Flatten favourites from raceDetails.favorites groups, rank by topRiders order
  const favBlock = renderFavourites(race);

  // Stats band — keep sectors/climbs counts defensive
  const sectorsCount = keySectors.length;
  const climbsCount = keyClimbs.length;

  const routeSvg = renderRouteSchematic(race, keySectors, keyClimbs);

  const narrativesHtml = (rd.narratives || []).length
    ? `<ul class="narratives">${rd.narratives.map(n => `<li>${htmlEscape(n)}</li>`).join('')}</ul>`
    : '';

  const sectorsSection = keySectors.length ? `
    <section class="section">
      <div class="eyebrow">§ 02 — Key Sectors</div>
      <h2>The decisive pavé</h2>
      <div class="sectors">
        ${keySectors.map((s, i) => {
          const stars5 = s.difficulty === 5 ? 'five' : '';
          const kmFromStart = distance && s.kmFromFinish != null ? (distance - s.kmFromFinish).toFixed(1) : '—';
          const no = keySectors.length - i;
          return `<div class="sec ${stars5}">
            <div class="c first km">${kmFromStart}<small>km in</small></div>
            <div class="c"><span class="no">${no}</span></div>
            <div class="c"><span class="nm">${htmlEscape(s.name)}</span></div>
            <div class="c ln">${s.length ? Number(s.length).toFixed(1) + ' km' : ''}</div>
            <div class="c rt">${stars(s.difficulty || 3)}</div>
          </div>`;
        }).join('')}
      </div>
    </section>` : '';

  const climbsSection = keyClimbs.length ? `
    <section class="section">
      <div class="eyebrow">§ 02b — Key Climbs</div>
      <h2>Where the race is made</h2>
      <div class="climbs">
        ${keyClimbs.map(c => {
          const cat = (c.category || '').toUpperCase();
          const catCls = cat === 'HC' ? 'hc' : '';
          const kmLabel = c.kmFromFinish != null ? c.kmFromFinish + '<small>km to go</small>' : '';
          return `<div class="climb">
            <div class="c first km">${kmLabel}</div>
            <div class="c cat ${catCls}">${cat || '—'}</div>
            <div class="c"><span class="nm">${htmlEscape(c.name)}</span></div>
            <div class="c ln">${c.length ? c.length + ' km' : ''}</div>
            <div class="c gr">${c.avgGradient || ''}${c.maxGradient ? ' · max ' + c.maxGradient : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </section>` : '';

  const historySection = rd.historicalContext ? `
    <section class="section">
      <div class="eyebrow">§ 04 — Historical Context</div>
      <h2>Form book &amp; lore</h2>
      <p class="prose">${htmlEscape(rd.historicalContext)}</p>
      ${renderPlaceholderWinners(race)}
    </section>` : renderPlaceholderWinners(race) ? `
    <section class="section">
      <div class="eyebrow">§ 04 — Historical Context</div>
      <h2>Past editions <span class="placeholder">placeholder</span></h2>
      ${renderPlaceholderWinners(race)}
    </section>` : '';

  const narrativesSection = narrativesHtml ? `
    <section class="section">
      <div class="eyebrow">§ 05 — Storylines</div>
      <h2>Narratives to watch</h2>
      ${narrativesHtml}
    </section>` : '';

  const viewingNotesSection = rd.watchNotes ? `
    <section class="section">
      <div class="eyebrow">§ 07 — Viewing Notes</div>
      <h2>When to tune in</h2>
      <p class="prose">${htmlEscape(rd.watchNotes)}</p>
    </section>` : '';

  const watchLinksSection = renderWatchSection(race);

  const body = `
    <section class="hero">
      ${stamp}
      <div>
        <div class="tag">
          ${category ? `<span class="${codeCls}">${htmlEscape(category)}</span>` : ''}
          ${prestigeBadge}
          <span>${'★'.repeat(race.rating || 0)}</span>
          <span>${htmlEscape(dateLabel)}</span>
        </div>
        <h1>${heroH1}</h1>
        <p class="sub">${htmlEscape(rd.courseSummary || race.description || '')}</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Location</span><span class="v sm">${htmlEscape(race.location || '—')}</span></div>
        <div class="stat"><span class="k">Distance</span><span class="v mono">${distance || '—'}${distance ? '<small style="font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase;margin-left:4px">km</small>' : ''}</span></div>
        <div class="stat"><span class="k">Key sectors</span><span class="v mono">${sectorsCount || '—'}</span></div>
        <div class="stat"><span class="k">Key climbs</span><span class="v mono">${climbsCount || '—'}</span></div>
        <div class="stat"><span class="k">Coverage</span><span class="v sm">${htmlEscape(coverage || 'TBD')}</span></div>
        <div class="stat"><span class="k">Category</span><span class="v sm">${htmlEscape(category)}</span></div>
      </aside>
    </section>

    ${watchLinksSection}

    <section class="section">
      <div class="eyebrow">§ 02 — Route Schematic <span class="placeholder">placeholder</span></div>
      <h2>${htmlEscape(race.name)}</h2>
      <div class="route">
        ${routeSvg}
        <div class="cap">Schematic built from sector/climb count — not geographically accurate. Real map coming later.</div>
      </div>
    </section>

    ${sectorsSection}
    ${climbsSection}

    <section class="section">
      <div class="eyebrow">§ 04 — Favourites</div>
      <h2>Who to watch</h2>
      ${favBlock}
    </section>

    ${narrativesSection}
    ${historySection}
    ${viewingNotesSection}
  `;

  return pageScaffold({
    title: `${race.name} ${race.raceDate ? race.raceDate.slice(0, 4) : ''} — No Spoiler Cycling`,
    docCode: `NSC/${race.id.toUpperCase().slice(0, 12)}`,
    navOn: 'cal',
    crumbs: `<a href="../index.html">Calendar</a><span class="sep">/</span>${MONTH_NAMES[(parseUTC(race.raceDate) || new Date()).getUTCMonth()]} ${(parseUTC(race.raceDate) || new Date()).getUTCFullYear()}<span class="sep">/</span>${htmlEscape(race.name)}`,
    body,
    footerSection: `§ Race Sheet · ${race.name}`,
  });
}

// ============================================
// STAGE-RACE MANUAL
// ============================================

function renderStageRace(race) {
  const rd = race.raceDetails || {};
  const coverage = primaryBroadcaster(race);
  const category = race.category || '';
  const dateRange = fmtDateRange(race.raceDate, race.endDate);
  const stages = race.stages || [];
  const totalKm = stages.reduce((sum, s) => sum + (s.distance || 0), 0);
  const pClass = prestigeClass(race);
  const codeCls = pClass === 'wc' ? 'code wc' : (category.includes('UWT') || category.includes('WWT')) ? 'code inv' : 'code';

  // Identify queen stage heuristic: highest-elevation mountain stage, else longest mountain
  const mountainStages = stages.filter(s => s.stageType === 'mountain');
  let queenStageNum = null;
  if (mountainStages.length) {
    const longest = mountainStages.slice().sort((a, b) => (b.distance || 0) - (a.distance || 0))[0];
    queenStageNum = longest.stageNumber;
  }

  const titleParts = race.name.split(/ /);
  const heroH1 = race.name.length > 18 && titleParts.length > 1
    ? `${htmlEscape(titleParts[0])}<br/>${htmlEscape(titleParts.slice(1).join(' '))}`
    : htmlEscape(race.name);

  const stageTypeCode = {
    'itt': 'ITT', 'ttt': 'TTT', 'flat': 'ROAD', 'hilly': 'ROAD', 'mountain': 'MTN', 'rest-day': 'REST', 'prologue': 'PRO',
  };

  const stagesHtml = stages.map(s => {
    const n = s.stageNumber;
    const isQueen = queenStageNum != null && n === queenStageNum;
    const code = stageTypeCode[s.stageType] || 'ROAD';
    const terr = (s.terrain || []).map(t => t === 'cyclocross' ? 'circuit' : t).join(' · ').toUpperCase();
    const routeMatch = s.name.match(/:\s*(.+?)(?:\s*\(|$)/);
    const routeText = routeMatch ? routeMatch[1] : s.name;
    const href = `${race.id}-stage-${n}.html`;
    const hasDetails = s.stageDetails && Object.keys(s.stageDetails).length > 0;
    const tag = hasDetails ? 'a' : 'div';
    const attrs = hasDetails ? ` href="${href}"` : '';
    return `<${tag} class="stage${isQueen ? ' qs' : ''}"${attrs}>
      <div class="c first"><span class="no${isQueen ? ' qs' : ''}">${n === 0 ? 'P' : n}</span></div>
      <div class="c lbl">${code}${isQueen ? '<br/>QUEEN' : ''}</div>
      <div class="c dt">${fmtShortDate(s.date)}</div>
      <div class="c rt">${htmlEscape(routeText).replace(/→/g, '<span class="arr">→</span>')}</div>
      <div class="c km">${s.distance || '—'}<small>km</small></div>
      <div class="c terrcell">${terr}</div>
      <div class="c desc">${htmlEscape(s.description || '')}</div>
    </${tag}>`;
  }).join('');

  // Startlist from topRiders (limit 16)
  const riders = (race.topRiders || []).slice(0, 16);
  const startlistHtml = riders.length ? `
    <div class="sl">
      ${riders.map((r, i) => {
        const surname = r.name.split(' ')[0];
        const initial = r.name.split(' ')[1] ? r.name.split(' ')[1][0] + '. ' : '';
        return `<div class="num">${String(i + 1).padStart(2, '0')}</div>
                <div class="riderx">${initial}${htmlEscape(surname.charAt(0) + surname.slice(1).toLowerCase())}</div>
                <div class="team">${htmlEscape(r.team || '')}</div>`;
      }).join('')}
    </div>` : `<p class="prose">Startlist TBD.</p>`;

  const jerseys = `
    <div class="jerseys">
      <div class="jersey y">
        <div class="band"></div>
        <div class="name">Leader's Jersey</div>
        <div class="desc">Overall GC leader on aggregate time.</div>
      </div>
      <div class="jersey g">
        <div class="band"></div>
        <div class="name">Points / Sprint</div>
        <div class="desc">Top sprinter across finishes &amp; intermediates.</div>
      </div>
      <div class="jersey p">
        <div class="band"></div>
        <div class="name">King of the Mountains</div>
        <div class="desc">Best climber across categorised ascents.</div>
      </div>
      <div class="jersey w">
        <div class="band"></div>
        <div class="name">Best Young Rider</div>
        <div class="desc">Top GC rider under 25 where awarded.</div>
      </div>
    </div>
    <p class="prose" style="margin-top:10px"><span class="placeholder">placeholder</span> Actual jersey colours depend on the race. Shown here as a generic template.</p>`;

  const narrativesHtml = (rd.narratives || []).length
    ? `<ul class="narratives">${rd.narratives.map(n => `<li>${htmlEscape(n)}</li>`).join('')}</ul>`
    : '';

  const favBlock = renderFavourites(race);

  const body = `
    <section class="hero">
      <div>
        <div class="tag">
          ${category ? `<span class="${codeCls}">${htmlEscape(category)}</span>` : ''}
          <span>Stage race · ${stages.length} stages${totalKm ? ' · ' + Math.round(totalKm) + ' km' : ''}</span>
          <span>${'★'.repeat(race.rating || 0)}</span>
        </div>
        <h1>${heroH1}</h1>
        <p class="sub">${htmlEscape(rd.courseSummary || race.description || '')}</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Dates</span><span class="v sm">${htmlEscape(dateRange)}</span></div>
        <div class="stat"><span class="k">Country</span><span class="v sm">${htmlEscape(race.location || '—')}</span></div>
        <div class="stat"><span class="k">Stages</span><span class="v">${stages.length}</span></div>
        <div class="stat"><span class="k">Total km</span><span class="v mono">${totalKm ? Math.round(totalKm) : '—'}</span></div>
        <div class="stat"><span class="k">Coverage</span><span class="v sm">${htmlEscape(coverage || 'TBD')}</span></div>
        <div class="stat"><span class="k">Category</span><span class="v sm">${htmlEscape(category)}</span></div>
      </aside>
    </section>

    ${renderWatchSection(race)}

    <section class="section">
      <div class="eyebrow">§ 02 — Stages</div>
      <h2>The route, day by day</h2>
      <div class="stages">
        ${stagesHtml || '<p class="prose">Stage list TBD.</p>'}
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">§ 03 — Startlist &amp; Jerseys</div>
      <h2>Who to watch &amp; what to watch for</h2>
      <div class="twocol">
        <div>
          <h3 style="font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px;font-weight:500">Top Starters</h3>
          ${startlistHtml}
        </div>
        <div>
          <h3 style="font-family:var(--font-mono);font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:var(--ink-3);margin:0 0 10px;font-weight:500">Jerseys</h3>
          ${jerseys}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="eyebrow">§ 04 — GC Favourites</div>
      <h2>Fight for the overall</h2>
      ${favBlock}
    </section>

    ${narrativesHtml ? `
    <section class="section">
      <div class="eyebrow">§ 05 — Storylines</div>
      <h2>Narratives to watch</h2>
      ${narrativesHtml}
    </section>` : ''}

    ${rd.historicalContext ? `
    <section class="section">
      <div class="eyebrow">§ 06 — Historical Context</div>
      <h2>Form book &amp; lore</h2>
      <p class="prose">${htmlEscape(rd.historicalContext)}</p>
    </section>` : ''}

    ${rd.watchNotes ? `
    <section class="section">
      <div class="eyebrow">§ 07 — Viewing Notes</div>
      <h2>When to tune in</h2>
      <p class="prose">${htmlEscape(rd.watchNotes)}</p>
    </section>` : ''}
  `;

  return pageScaffold({
    title: `${race.name} ${race.raceDate ? race.raceDate.slice(0, 4) : ''} — No Spoiler Cycling`,
    docCode: `NSC/${race.id.toUpperCase().slice(0, 14)}`,
    navOn: 'cal',
    crumbs: `<a href="../index.html">Calendar</a><span class="sep">/</span>${MONTH_NAMES[(parseUTC(race.raceDate) || new Date()).getUTCMonth()]} ${(parseUTC(race.raceDate) || new Date()).getUTCFullYear()}<span class="sep">/</span>${htmlEscape(race.name)}`,
    body,
    footerSection: `§ Race Manual · ${race.name}`,
  });
}

// ============================================
// PER-STAGE SHEET
// ============================================

function renderStage(race, stage) {
  const sd = stage.stageDetails || {};
  const coverage = stage.platform || primaryBroadcaster(race);
  const keyClimbs = sd.keyClimbs || [];
  const keySectors = sd.keySectors || [];
  const terrCodes = (stage.terrain || []).map(t => (t === 'cyclocross' ? 'circuit' : t).toUpperCase()).join(' · ');
  const stageTypeLabel = stage.stageType ? stage.stageType.toUpperCase().replace('-', ' ') : '';
  const routeMatch = stage.name.match(/:\s*(.+?)(?:\s*\(|$)/);
  const routeText = routeMatch ? routeMatch[1] : stage.name;

  const climbsSection = keyClimbs.length ? `
    <section class="section">
      <div class="eyebrow">§ 02 — Key Climbs</div>
      <h2>Where the stage is decided</h2>
      <div class="climbs">
        ${keyClimbs.map(c => {
          const cat = (c.category || '').toUpperCase();
          const catCls = cat === 'HC' ? 'hc' : '';
          const kmLabel = c.kmFromFinish != null ? c.kmFromFinish + '<small>km to go</small>' : '';
          return `<div class="climb">
            <div class="c first km">${kmLabel}</div>
            <div class="c cat ${catCls}">${cat || '—'}</div>
            <div class="c"><span class="nm">${htmlEscape(c.name)}</span></div>
            <div class="c ln">${c.length ? c.length + ' km' : ''}</div>
            <div class="c gr">${c.avgGradient || ''}${c.maxGradient ? ' · max ' + c.maxGradient : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </section>` : '';

  const sectorsSection = keySectors.length ? `
    <section class="section">
      <div class="eyebrow">§ 02b — Key Sectors</div>
      <h2>Surface battles</h2>
      <div class="sectors">
        ${keySectors.map((s, i) => `<div class="sec ${s.difficulty === 5 ? 'five' : ''}">
          <div class="c first km">${s.kmFromFinish != null ? s.kmFromFinish : '—'}<small>km to go</small></div>
          <div class="c"><span class="no">${keySectors.length - i}</span></div>
          <div class="c"><span class="nm">${htmlEscape(s.name)}</span></div>
          <div class="c ln">${s.length ? Number(s.length).toFixed(1) + ' km' : ''}</div>
          <div class="c rt">${stars(s.difficulty || 3)}</div>
        </div>`).join('')}
      </div>
    </section>` : '';

  const body = `
    <section class="hero">
      <div>
        <div class="tag">
          <span class="code">${htmlEscape(race.category || '')}</span>
          <span>Stage ${stage.stageNumber} · ${htmlEscape(stageTypeLabel)}</span>
          <span>${htmlEscape(fmtLongDate(stage.date))}</span>
        </div>
        <h1>Stage ${stage.stageNumber}<br/><span class="em">${htmlEscape(routeText)}</span></h1>
        <p class="sub">${htmlEscape(sd.courseSummary || stage.description || '')}</p>
      </div>
      <aside>
        <div class="stat"><span class="k">Race</span><span class="v sm"><a href="${race.id}.html" style="border-bottom:1px solid var(--ink)">${htmlEscape(race.name)}</a></span></div>
        <div class="stat"><span class="k">Distance</span><span class="v mono">${stage.distance || '—'}${stage.distance ? '<small style="font-family:var(--font-mono);font-size:11px;color:var(--ink-3);letter-spacing:.12em;text-transform:uppercase;margin-left:4px">km</small>' : ''}</span></div>
        <div class="stat"><span class="k">Terrain</span><span class="v sm">${htmlEscape(terrCodes)}</span></div>
        <div class="stat"><span class="k">Coverage</span><span class="v sm">${htmlEscape(coverage || 'TBD')}</span></div>
      </aside>
    </section>

    ${renderStageWatchSection(race, stage)}

    ${climbsSection}
    ${sectorsSection}

    ${sd.watchNotes ? `
    <section class="section">
      <div class="eyebrow">§ 04 — Viewing Notes</div>
      <h2>When to tune in</h2>
      <p class="prose">${htmlEscape(sd.watchNotes)}</p>
    </section>` : ''}
  `;

  return pageScaffold({
    title: `${race.name} · Stage ${stage.stageNumber} — No Spoiler Cycling`,
    docCode: `NSC/${race.id.toUpperCase().slice(0, 10)}/S${stage.stageNumber}`,
    navOn: 'cal',
    crumbs: `<a href="../index.html">Calendar</a><span class="sep">/</span><a href="${race.id}.html">${htmlEscape(race.name)}</a><span class="sep">/</span>Stage ${stage.stageNumber}`,
    body,
    footerSection: `§ Stage Sheet · ${race.name} S${stage.stageNumber}`,
  });
}

// ============================================
// FAVOURITES (shared)
// ============================================

function renderFavourites(race) {
  // Prefer explicit topRiders (already ranked) — promote to cards with derived form stars.
  // Fall back to raceDetails.favorites groups if topRiders is empty.
  const riders = (race.topRiders || []).slice(0, 6);
  if (riders.length) {
    return `<div class="fav">${riders.map((r, i) => {
      const surname = (r.name.split(' ')[0] || '');
      const given = r.name.split(' ').slice(1).join(' ');
      const display = given ? `${given.charAt(0)}. ${surname.charAt(0) + surname.slice(1).toLowerCase()}` : surname;
      const specialty = (r.specialties || [])[0] || '';
      const formStars = '★'.repeat(rankingToStars(r.ranking));
      return `<div class="card">
        <div class="no">№ ${String(i + 1).padStart(2, '0')}${specialty ? ' · ' + specialty.toUpperCase() : ''}</div>
        <div class="nm">${htmlEscape(display)}</div>
        <div class="tm">${htmlEscape(r.team || '')}</div>
        <div class="ft"><span>UCI #${r.ranking || '—'}</span><span class="st">${formStars}</span></div>
      </div>`;
    }).join('')}</div>`;
  }

  // Fallback: flatten raceDetails.favorites groups
  const groups = race.raceDetails?.favorites || {};
  const flat = [];
  for (const [group, arr] of Object.entries(groups)) {
    if (group === 'description') continue;
    if (!Array.isArray(arr)) continue;
    arr.forEach(s => flat.push({ group, text: s }));
  }
  if (!flat.length) return `<p class="prose">Favourites TBD.</p>`;
  return `<div class="fav">${flat.slice(0, 6).map((f, i) => {
    const [name, ...rest] = f.text.split(/\s*[-–]\s*/);
    const teamMatch = name.match(/\(([^)]+)\)/);
    const team = teamMatch ? teamMatch[1] : '';
    const cleanName = name.replace(/\s*\([^)]+\)/, '').trim();
    return `<div class="card">
      <div class="no">№ ${String(i + 1).padStart(2, '0')} · ${f.group.toUpperCase()}</div>
      <div class="nm">${htmlEscape(cleanName)}</div>
      <div class="tm">${htmlEscape(team)}</div>
      <div class="ft"><span>${htmlEscape(rest.join(' — ').slice(0, 60))}</span></div>
    </div>`;
  }).join('')}</div>`;
}

// ============================================
// ROUTE SCHEMATIC (placeholder SVG)
// ============================================

function renderRouteSchematic(race, keySectors, keyClimbs) {
  const markers = [];
  const baseline = 150;

  // Distribute sectors along 200-980 x-axis
  if (keySectors.length) {
    keySectors.forEach((s, i) => {
      const x = 200 + ((i + 1) / (keySectors.length + 1)) * 780;
      const isFive = s.difficulty === 5;
      markers.push(isFive
        ? `<line x1="${x.toFixed(0)}" y1="${baseline - 18}" x2="${x.toFixed(0)}" y2="${baseline + 18}" stroke="#c8102e" stroke-width="2"/>`
        : `<line x1="${x.toFixed(0)}" y1="${baseline - 6}" x2="${x.toFixed(0)}" y2="${baseline + 6}" stroke="#14110f" stroke-width="1.25"/>`);
      if (isFive) {
        markers.push(`<text x="${x.toFixed(0)}" y="${baseline - 24}" font-family="JetBrains Mono" font-size="9" fill="#c8102e" text-anchor="middle" letter-spacing=".1em">${htmlEscape(s.name.slice(0, 18).toUpperCase())}</text>`);
      }
    });
  } else if (keyClimbs.length) {
    keyClimbs.forEach((c, i) => {
      const x = 200 + ((i + 1) / (keyClimbs.length + 1)) * 780;
      const isHard = c.category === 'HC' || c.category === '1';
      markers.push(`<polygon points="${x - 8},${baseline + 8} ${x},${baseline - (isHard ? 28 : 14)} ${x + 8},${baseline + 8}" fill="${isHard ? '#c8102e' : '#14110f'}" opacity=".85"/>`);
      if (isHard) {
        markers.push(`<text x="${x.toFixed(0)}" y="${baseline - 34}" font-family="JetBrains Mono" font-size="9" fill="#c8102e" text-anchor="middle" letter-spacing=".1em">${htmlEscape(c.name.slice(0, 16).toUpperCase())}</text>`);
      }
    });
  }

  return `<svg viewBox="0 0 1000 220" preserveAspectRatio="none">
    <line x1="20" y1="${baseline}" x2="980" y2="${baseline}" stroke="#14110f" stroke-width="1" stroke-dasharray="2 3"/>
    ${markers.join('\n    ')}
    <circle cx="20" cy="${baseline}" r="5" fill="#14110f"/>
    <circle cx="980" cy="${baseline}" r="5" fill="#c8102e"/>
    <g font-family="Inter Tight" font-weight="700" fill="#14110f">
      <text x="20" y="${baseline + 30}" font-size="12" letter-spacing=".02em">Start</text>
      <text x="980" y="${baseline + 30}" font-size="12" text-anchor="end" letter-spacing=".02em">Finish</text>
    </g>
    <g font-family="JetBrains Mono" font-size="10" fill="#6b635a" letter-spacing=".14em">
      <text x="20"  y="${baseline + 50}">00.0 KM</text>
      <text x="980" y="${baseline + 50}" text-anchor="end">${race.distance || '—'} KM</text>
    </g>
  </svg>`;
}

// ============================================
// PAST WINNERS (placeholder — no data yet)
// ============================================

function renderPlaceholderWinners(_race) {
  // Winners aren't in the canonical data yet. Once a winners[] field lands, this
  // returns a filled table; for now it stays empty to keep the layout clean.
  return '';
}

// ============================================
// ENTRY POINTS
// ============================================

function generateRaceDetailsHTML(race) {
  if (race.raceFormat === 'stage-race' && Array.isArray(race.stages) && race.stages.length) {
    return renderStageRace(race);
  }
  return renderOneDay(race);
}

function generateRaceDetailsPage(race, outputDir = './race-details') {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const filepath = path.join(outputDir, `${race.id}.html`);
  fs.writeFileSync(filepath, generateRaceDetailsHTML(race));
  return filepath;
}

function generateStageDetailsPage(race, stageNumber, outputDir = './race-details') {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const stage = race.stages.find(s => s.stageNumber === stageNumber);
  if (!stage) throw new Error(`Stage ${stageNumber} not found on ${race.id}`);
  const filepath = path.join(outputDir, `${race.id}-stage-${stageNumber}.html`);
  fs.writeFileSync(filepath, renderStage(race, stage));
  return filepath;
}

function generateAllRaceDetailsPages(raceDataPath = './data/race-data.json', outputDir = './race-details') {
  const data = JSON.parse(fs.readFileSync(raceDataPath, 'utf8'));
  let count = 0, stageCount = 0, skipped = 0;

  for (const race of data.races) {
    if (!race.id) { skipped++; continue; }
    generateRaceDetailsPage(race, outputDir);
    count++;
    if (Array.isArray(race.stages)) {
      for (const s of race.stages) {
        if (s.stageDetails && Object.keys(s.stageDetails).length > 0) {
          generateStageDetailsPage(race, s.stageNumber, outputDir);
          stageCount++;
        }
      }
    }
  }
  console.log(`✓ generated ${count} race pages + ${stageCount} stage pages${skipped ? ' · skipped ' + skipped + ' (missing id)' : ''}`);
}

// ============================================
// CLI
// ============================================

const args = process.argv.slice(2);

if (args.includes('--all')) {
  generateAllRaceDetailsPages();
} else if (args.includes('--stages') && args.length >= 2) {
  const raceId = args[args.indexOf('--stages') + 1];
  const data = JSON.parse(fs.readFileSync('./data/race-data.json', 'utf8'));
  const race = data.races.find(r => r.id === raceId);
  if (!race) { console.error(`❌ Race not found: ${raceId}`); process.exit(1); }
  if (!race.stages || !race.stages.length) { console.error(`❌ Race ${raceId} has no stages`); process.exit(1); }
  generateRaceDetailsPage(race);
  let n = 0;
  for (const s of race.stages) {
    if (s.stageDetails && Object.keys(s.stageDetails).length > 0) {
      generateStageDetailsPage(race, s.stageNumber);
      n++;
    }
  }
  console.log(`✓ ${race.name}: race sheet + ${n} stage sheets`);
} else if (args.includes('--race') && args.length >= 2) {
  const raceId = args[args.indexOf('--race') + 1];
  const data = JSON.parse(fs.readFileSync('./data/race-data.json', 'utf8'));
  const race = data.races.find(r => r.id === raceId);
  if (!race) { console.error(`❌ Race not found: ${raceId}`); process.exit(1); }
  const out = generateRaceDetailsPage(race);
  console.log(`✓ ${out}`);
} else if (args.includes('--help')) {
  console.log(`Race Details Page Generator (v2)

Usage:
  node generate-race-details.js --all             Generate pages for all races with raceDetails
  node generate-race-details.js --race <id>       Generate one race's sheet
  node generate-race-details.js --stages <id>     Generate race + stage sheets for a stage race
  node generate-race-details.js --help            Show this help

Output: ./race-details/<race-id>.html
        ./race-details/<race-id>-stage-<num>.html
`);
} else {
  console.log('No arguments provided. Use --help for usage information.');
}

export {
  generateRaceDetailsHTML,
  generateRaceDetailsPage,
  generateAllRaceDetailsPages,
  generateStageDetailsPage,
};
