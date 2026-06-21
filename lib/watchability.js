/**
 * watchability.js — spoiler-safe "is this worth watching?" rating for races/stages.
 *
 * Philosophy (per the brief): drama is about the MANNER of victory + NOVELTY, not
 * just how close the line was. A superstar winning a routine bunch sprint is dull;
 * the same rider raiding solo from 100 km, or a breakaway of unknowns holding off
 * the peloton, is must-watch. So the engine classifies HOW the race was won
 * (archetype → base excitement) and then applies modifiers (upset, chaos, photo
 * finish, GC carnage, comeback). Closeness is one input, not the whole story.
 *
 * Spoiler-safety:
 *   Tier 0 (always safe): the 1–5 🔥 score + a generic "worth it?" blurb. A number
 *           can't reveal who won. A high score is ambiguous by design (audacious
 *           ride? upset? crash? photo finish?) so it never fingers a rider.
 *   Tier 1 (opt-in flavour): outcome-agnostic race-SHAPE tags ("long-range
 *           racing", "a breakaway day", "sprint finale", "foul-weather chaos").
 *           These describe how it unfolded, never who prevailed.
 *   Never exposed alone: the upset modifier — it would imply the favourite lost.
 *           It only feeds the blended aggregate.
 *
 * Output is derived from the spoiler-side results JSON but is meant to live on the
 * spoiler-SAFE calendar so a viewer can decide what to watch.
 */

import fs from 'fs';
import path from 'path';

export function parseGapSeconds(gap) {
  if (gap == null) return null;
  const g = String(gap).trim().toLowerCase();
  if (g === 's.t.' || g === 'st' || g === '' || /^\+?0?:?0+$/.test(g.replace(/\s/g, ''))) return 0;
  const colon = g.replace('+', '').match(/^(\d+):(\d+)(?::(\d+))?$/);
  if (colon) {
    const a = +colon[1], b = +colon[2], c = colon[3] != null ? +colon[3] : null;
    return c != null ? a * 3600 + b * 60 + c : a * 60 + b;
  }
  const secs = g.match(/^\+?(\d+)\s*s?$/);
  if (secs) return +secs[1];
  return 0;
}

const RX = {
  upset: /\b(career[- ]best|biggest win of (?:his|her) career|standout ride of (?:his|her) career|maiden|first (?:ever )?(?:pro|professional|world ?tour|uci|grand tour)?\s*(?:road |stage )?win|first win|surprise|surprised|upset|outsider|unexpected|stunn|shock|breakthrough|unheralded|neo[- ]?pro|stole|audacious|against the odds|denied the home|fairy[- ]?tale|sensational)\b/i,
  dominant: /\b(as expected|odds[- ]on|untouchable|imperious|masterclass|favou?rite delivered|in (?:full )?control|routine|comfortable|never in doubt)\b/i,
  // archetypes
  kmSolo: /(\d{2,})\s?-?\s?(?:kilometre|kilometer|km)\b[^.]{0,30}\bsolo|solo[^.]{0,30}?(\d{2,})\s?-?\s?(?:kilometre|kilometer|km)|attack(?:ed|ing)?[^.]{0,20}?(\d{2,})\s?-?\s?(?:km|kilometre)[^.]{0,20}?(?:out|to go|from (?:the )?(?:finish|line))/i,
  solo: /\bsolo|soloed|rode away|rode clear|went clear alone|alone (?:to|at) the (?:line|finish)\b/i,
  breakawayWin: /\b(from the (?:break|front group|breakaway)|breakaway (?:held|stayed|survived|won|stuck)|stayed away|(?:held|holding|holds) off (?:the |a )?(?:sprinting |charging |chasing )?(?:peloton|bunch|chase|sprint|field)|just held (?:on|off)|the break (?:held|stuck)|survivor of the break)\b/i,
  itt: /\b(time[- ]?trial|\bitt\b|\btt\b|against the clock|race of truth|prologue)\b/i,
  nailbiterCatch: /\bby (?:a |just )?(?:handful of |few )?(?:metres|meters|a wheel|inches|millimetres|centimetres|a bike length)|right on the line|just before the (?:line|catch)|caught (?:the|inside the last)|nearly caught|swept up (?:just|inside)/i,
  twoUp: /\b(two[- ]up|2[- ]up|head[- ]to[- ]head|duel|reduced group sprint|small[- ]group sprint|from a (?:reduced|select|small) group|select group)\b/i,
  reducedSprint: /\b(reduced bunch sprint|reduced sprint|crash[- ]?(?:strewn|marred|hit)[^.]{0,30}sprint|thinned[^.]{0,30}(?:field|sprint)|whittled[- ]down (?:bunch|group)|depleted (?:bunch|group))\b/i,
  bunchSprint: /\b(bunch (?:sprint|kick|gallop)|mass sprint|lead[- ]?out|sprint(?:ers)? (?:classic|stage|finish)|flat[- ]day sprint)\b/i,
  uphillSprint: /\b(uphill sprint|sprint up the|punch(?:y)? (?:finish|sprint)|drag to the line|sprint on the (?:rise|ramp|climb))\b/i,
  weather: /\b(rain|wet|soak|downpour|crosswind|echelon|hail|snow|storm|gale|sweltering|heat ?wave|fog|mist|freezing|ice|wind[- ]battered|blustery|monsoon)\b/i,
  hardparcours: /\b(cobble|pavé|gravel|ribin|sterrato|mur\b|wall\b|berg\b|summit finish|hors caté|hc climb|attritional|savage|brutal|leg[- ]breaking)\b/i,
  comeback: /\b(despite (?:a )?(?:crash|puncture|mechanical|flat)|after crashing|bounced back|recovered from|chased back (?:on|after)|fought back)\b/i,
  gcImpact: /\b(seized? the (?:overall|lead|yellow|pink|red|maglia)|took (?:over )?(?:the )?(?:overall|race lead|lead|yellow|pink|red|jersey)|blew (?:apart|up) the (?:race|gc)|overturned|shook up the gc|new (?:race )?leader|into (?:the )?(?:lead|yellow|pink|red)|toppled|on the wrong side|distanced .* (?:gc|favou?rites)|gc (?:exploded|blown|carnage)|overall (?:was )?(?:decided|settled|turned))\b/i,
  processional: /\b(processional|uneventful|routine|formality|controlled (?:affair|day)|nothing (?:much )?happened|sleepy|dull)\b/i,
};

export function detectArchetype(text, gapSec, stageType) {
  // returns {key, base, label}; priority order matters
  const heldOff = /(?:held|holding|holds) off|by (?:a |just )?(?:handful of |few )?(?:metres|meters|a wheel|inches|a bike length)/i.test(text);
  // ITT/prologue: usually a low-drama watch unless the margin is wafer-thin (handled by modifiers)
  if ((stageType && /itt|ttt|tt|prologue|time/i.test(stageType)) || (RX.itt.test(text) && !RX.solo.test(text) && !RX.bunchSprint.test(text))) {
    return { key: 'itt', base: 42, label: 'Time trial' };
  }
  const kmMatch = text.match(RX.kmSolo);
  if (kmMatch) {
    const n = Math.max(...[kmMatch[1], kmMatch[2], kmMatch[3]].filter(Boolean).map(Number));
    const base = n >= 50 ? 84 : n >= 25 ? 76 : 66;
    return { key: 'longSolo', base, label: 'Long-range solo' };
  }
  if (RX.breakawayWin.test(text)) {
    // breakaway to the line; nail-biter catch nudges it up
    const base = (RX.nailbiterCatch.test(text) || heldOff) ? 76 : 70;
    return { key: 'breakaway', base, label: 'A breakaway day' };
  }
  if (RX.solo.test(text)) {
    // a solo victory is a spectacle regardless of final gap; caught-to-the-line is the most thrilling
    const base = (RX.nailbiterCatch.test(text) || heldOff) ? 74 : 60;
    return { key: 'solo', base, label: 'Solo to the line' };
  }
  if (RX.twoUp.test(text)) {
    return { key: 'twoUp', base: 66, label: 'Small-group showdown' };
  }
  if (RX.reducedSprint.test(text)) {
    return { key: 'reducedSprint', base: 58, label: 'Reduced bunch sprint' };
  }
  if (RX.uphillSprint.test(text)) {
    return { key: 'uphillSprint', base: 52, label: 'Uphill sprint finale' };
  }
  if (RX.bunchSprint.test(text)) {
    return { key: 'bunchSprint', base: 40, label: 'Sprint finale' };
  }
  return { key: 'unknown', base: 50, label: null };
}

export function scoreResult(data, opts = {}) {
  const isStage = opts.isStage != null ? opts.isStage : (data.stageNumber != null);
  const text = [
    data.tldr,
    typeof data.narrative === 'string' ? data.narrative : JSON.stringify(data.narrative || ''),
    data.aftermath && data.aftermath.summary,
    JSON.stringify(data.gcImpact || ''),
    (data.decisiveMoments || []).map(m => m.headline + ' ' + (m.description || '')).join(' '),
  ].filter(Boolean).join('  ');
  const podium = data.podium || [];
  const dm = (data.decisiveMoments || []).map(m => m.kmFromFinish).filter(x => x != null && !isNaN(x));
  const incidents = data.incidents || {};
  const crashCount = (incidents.crashes || []).length;
  const cancelled = podium[0] && /cancel/i.test(podium[0].name || '');
  const gapSec = podium[1] ? parseGapSeconds(podium[1].gap) : null;
  const sameTime = gapSec === 0;
  const lastKm = dm.length ? Math.min(...dm) : null;

  const arch = detectArchetype(text, gapSec, data.stageType);
  let score = arch.base;
  const mods = []; // [label, delta]

  // upset / novelty (BLENDED ONLY) — the un-notable winner, the surprise
  if (RX.upset.test(text) && !RX.dominant.test(text)) { score += 15; mods.push(['novelty', 15]); }
  else if (RX.dominant.test(text) && /bunchSprint|uphillSprint|soloShort/.test(arch.key)) { score -= 8; mods.push(['expected', -8]); }

  // photo finish on a sprint/2-up adds tension
  if (sameTime && /Sprint|sprint|twoUp|reducedSprint|breakaway/.test(arch.key + ' ' + text)) { score += 8; mods.push(['photo-finish', 8]); }
  else if (gapSec != null && gapSec <= 3 && !/longSolo/.test(arch.key)) { score += 5; mods.push(['ultra-close', 5]); }

  // chaos
  let chaos = 0;
  if (crashCount) chaos += Math.min(7, 3 + crashCount);
  if (RX.weather.test(text)) chaos += 5;
  chaos = Math.min(10, chaos);
  if (chaos) { score += chaos; mods.push(['chaos', chaos]); }

  // comeback from setback
  if (RX.comeback.test(text)) { score += 5; mods.push(['comeback', 5]); }

  // GC carnage (stage races)
  if (isStage && RX.gcImpact.test(text)) { score += 8; mods.push(['GC-impact', 8]); }

  // hard parcours bump for one-day prestige if not already an epic
  if (!isStage && RX.hardparcours.test(text) && arch.base < 66) { score += 4; mods.push(['hard-parcours', 4]); }

  // processional penalty
  if (RX.processional.test(text)) { score -= 12; mods.push(['processional', -12]); }

  if (cancelled) score = 0;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const flames = cancelled ? 0 : Math.max(1, Math.min(5, Math.round(score / 20)));

  const BLURBS = {
    0: 'Race cancelled — nothing to watch.',
    1: 'One for completists — skip to the highlights.',
    2: 'Watch the finale; skim the rest.',
    3: 'Solid entertainment — worth a watch.',
    4: 'A real thriller — settle in for the whole thing.',
    5: 'Unmissable — clear your schedule.',
  };

  // Tier-1 opt-in, outcome-agnostic SHAPE tags
  const tags = [];
  if (!cancelled) {
    if (arch.label) tags.push(arch.label);
    if (lastKm != null && lastKm <= 1 && !/breakaway|longSolo|soloShort/.test(arch.key)) tags.push('Decided in the final metres');
    if ((arch.key === 'longSolo') || (lastKm != null && lastKm >= 30)) tags.push('Long-range racing');
    if (sameTime && /Sprint|sprint|twoUp|breakaway/.test(arch.key + arch.label)) tags.push('Photo finish');
    if (RX.weather.test(text)) tags.push('Foul-weather chaos');
    if (crashCount >= 1) tags.push('Crash-affected');
    if (RX.hardparcours.test(text)) tags.push('Brutal parcours');
    if (isStage && RX.gcImpact.test(text)) tags.push('GC shake-up');
  }

  return {
    score, flames, blurb: BLURBS[flames],
    archetype: arch.label || arch.key,
    tags: [...new Set(tags)].slice(0, 4),
    modifiers: mods,
  };
}

// ---- build-time helpers (read results JSON, return spoiler-safe flame counts) ----

/** Flames (1–5) for a ONE-DAY race — the only race-level "watchable unit".
 *  Returns null for stage races (each stage is its own unit — use flamesForStage),
 *  null if no results, 0 if cancelled. */
export function flamesForRace(raceId, { resultsDir = 'data/results', rating = 0 } = {}) {
  const racePath = path.join(resultsDir, 'races', `${raceId}.json`);
  if (!fs.existsSync(racePath)) return null;
  // If the race has per-stage results it's a multi-unit (stage) race — no single
  // race-level rating; the watchable units are the individual stages.
  const stagesDir = path.join(resultsDir, 'stages');
  if (fs.existsSync(stagesDir) && fs.readdirSync(stagesDir).some(f => f.startsWith(`${raceId}-stage-`) && f.endsWith('.json'))) {
    return null;
  }
  try { return scoreResult(JSON.parse(fs.readFileSync(racePath, 'utf8')), { rating }).flames; } catch { return null; }
}

/** Flames (1–5) for a single stage, or null if no results / 0 if cancelled. */
export function flamesForStage(raceId, n, { resultsDir = 'data/results', rating = 0 } = {}) {
  const p = path.join(resultsDir, 'stages', `${raceId}-stage-${n}.json`);
  if (!fs.existsSync(p)) return null;
  try { return scoreResult(JSON.parse(fs.readFileSync(p, 'utf8')), { rating }).flames; } catch { return null; }
}

/** Spoiler-safe badge markup: a flame + number, no explanation (hover title only). */
export function flameBadge(flames) {
  if (flames == null || flames === 0) return '';
  return `<span class="watch-flame" title="Worth-watching rating: ${flames}/5">🔥${flames}</span>`;
}
