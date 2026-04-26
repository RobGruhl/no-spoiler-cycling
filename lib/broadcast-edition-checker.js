#!/usr/bin/env node

/**
 * Broadcast Edition Checker
 *
 * Detects when a broadcast URL points to a prior-year edition of a race
 * (e.g., a 2025 Peacock UUID page sitting on a 2026 race entry).
 *
 * Backed by Firecrawl /scrape (markdown + page metadata). No Playwright dep —
 * markdown parses cleaner than DOM scrape and aligns with the rest of the
 * discovery pipeline.
 *
 * Returns { status, expectedYear, detectedYears, evidence, siblingUrls } where:
 *   - 'match'   expected year confidently present (URL or page title/meta/body)
 *   - 'stale'   a non-expected year dominates and expected year is absent
 *   - 'unknown' edition-agnostic landing page, or no year evidence either way
 *   - 'error'   fetch failed
 *
 * `siblingUrls` collects same-domain links extracted from the markdown — handy
 * for the auto-replace flow ("You May Also Like" links on Peacock include the
 * other-year edition of the race).
 */

import { scrapeContent } from './firecrawl-utils.js';
import { isValidUrl } from './url-validator.js';

const MONTHS = {
  '01': ['january', 'janvier', 'gennaio', 'enero', 'januari'],
  '02': ['february', 'février', 'febbraio', 'febrero', 'februari'],
  '03': ['march', 'mars', 'marzo', 'marzo', 'maart'],
  '04': ['april', 'avril', 'aprile', 'abril', 'april'],
  '05': ['may', 'mai', 'maggio', 'mayo', 'mei'],
  '06': ['june', 'juin', 'giugno', 'junio', 'juni'],
  '07': ['july', 'juillet', 'luglio', 'julio', 'juli'],
  '08': ['august', 'août', 'agosto', 'agosto', 'augustus'],
  '09': ['september', 'septembre', 'settembre', 'septiembre', 'september'],
  '10': ['october', 'octobre', 'ottobre', 'octubre', 'oktober'],
  '11': ['november', 'novembre', 'novembre', 'noviembre', 'november'],
  '12': ['december', 'décembre', 'dicembre', 'diciembre', 'december']
};

// URL patterns whose pages are inherently year-agnostic (broadcaster hubs,
// channel handles, generic sport sections). Skip the fetch and return 'unknown'.
const EDITION_AGNOSTIC_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/@[^/?#]+\/?$/i,
  /^https?:\/\/(www\.)?youtube\.com\/c\/[^/?#]+\/?$/i,
  /^https?:\/\/(www\.)?youtube\.com\/channel\/[^/?#]+\/?$/i,
  /^https?:\/\/(www\.)?hbomax\.com\/[a-z]{2}\/[a-z]{2}\/sports\/?$/i,
  /^https?:\/\/(www\.)?hbomax\.com\/sports\/?$/i,
  /^https?:\/\/(www\.)?max\.com\/?(sports\/?)?$/i,
  /^https?:\/\/(www\.)?discoveryplus\.com\/?$/i,
  /^https?:\/\/(www\.)?discoveryplus\.com\/[a-z]{2}\/?$/i,
  /^https?:\/\/(www\.)?peacocktv\.com\/?$/i,
  /^https?:\/\/(www\.)?peacocktv\.com\/sports\/?$/i,
  /^https?:\/\/(www\.)?itv\.com\/sport\/?$/i,
  /^https?:\/\/(www\.)?gcn\.com\/?$/i,
  /^https?:\/\/(www\.)?flobikes\.com\/?$/i
];

const YEAR_REGEX = /\b(20[0-2]\d)\b/g;

function expectedYearFromRace(race) {
  if (race?.raceDate) return race.raceDate.slice(0, 4);
  const idMatch = race?.id && race.id.match(/-(\d{4})$/);
  if (idMatch) return idMatch[1];
  return null;
}

function isEditionAgnosticUrl(url) {
  return EDITION_AGNOSTIC_PATTERNS.some(re => re.test(url));
}

function countYearsIn(text) {
  if (!text) return {};
  const counts = {};
  for (const m of text.matchAll(YEAR_REGEX)) {
    counts[m[1]] = (counts[m[1]] || 0) + 1;
  }
  return counts;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build name keys for race-name proximity matching. Returns the canonical name,
 * a slug-normalized form, and the most distinctive single token (e.g. "Liège"
 * for "Liège-Bastogne-Liège") so we catch loose mentions on broadcaster pages.
 */
function buildRaceNameKeys(race) {
  const keys = new Set();
  if (race?.name) {
    keys.add(race.name);
    // Slug-style alt form (dashes → spaces, accents preserved as-is)
    keys.add(race.name.replace(/-/g, ' '));
  }
  return [...keys].filter(s => s && s.length >= 4);
}

/**
 * Count year tokens that occur near (within `radius` chars of) any race-name
 * mention in the text. These name-proximity hits are much stronger evidence
 * than raw counts because they ignore footer/copyright noise.
 */
function countNameProximityYears(text, nameKeys, radius = 120) {
  const counts = {};
  if (!text) return counts;
  const lower = text.toLowerCase();
  for (const key of nameKeys) {
    const re = new RegExp(escapeRegex(key.toLowerCase()), 'g');
    for (const m of lower.matchAll(re)) {
      const start = Math.max(0, m.index - radius);
      const end = Math.min(text.length, m.index + key.length + radius);
      const window = text.slice(start, end);
      for (const yr of window.matchAll(YEAR_REGEX)) {
        counts[yr[1]] = (counts[yr[1]] || 0) + 1;
      }
    }
  }
  return counts;
}

function buildRaceDateStrings(race) {
  if (!race?.raceDate) return [];
  const [year, month, day] = race.raceDate.split('-');
  const dayInt = String(parseInt(day, 10));
  const monthNames = MONTHS[month] || [];
  const out = new Set();
  for (const name of monthNames) {
    out.add(`${dayInt} ${name} ${year}`);
    out.add(`${name} ${dayInt}, ${year}`);
    out.add(`${name} ${dayInt} ${year}`);
  }
  out.add(`${day}.${month}.${year}`);
  out.add(`${month}/${day}/${year}`);
  out.add(`${year}-${month}-${day}`);
  return [...out];
}

function extractMarkdownLinks(markdown, sameHostAs) {
  if (!markdown) return [];
  const links = new Set();
  const linkRegex = /\]\((https?:\/\/[^\s)]+)\)/g;
  let host;
  try { host = new URL(sameHostAs).host; } catch { return []; }
  for (const m of markdown.matchAll(linkRegex)) {
    try {
      if (new URL(m[1]).host === host) links.add(m[1].split('#')[0]);
    } catch { /* skip */ }
  }
  return [...links];
}

/**
 * Check whether a broadcast URL refers to the expected race edition.
 * @param {string} url
 * @param {object} race - race-data.json entry (uses raceDate, name, id)
 * @param {object} [options]
 * @returns {Promise<{url, status, expectedYear, detectedYears, evidence, siblingUrls}>}
 */
export async function checkBroadcastEdition(url, race, options = {}) {
  const expectedYear = expectedYearFromRace(race);
  const result = {
    url,
    status: 'unknown',
    expectedYear,
    detectedYears: {},
    evidence: [],
    siblingUrls: []
  };

  if (!isValidUrl(url)) {
    result.status = 'error';
    result.evidence.push('Invalid URL');
    return result;
  }

  if (!expectedYear) {
    result.evidence.push('No expected year derivable from race');
    return result;
  }

  // Cheap URL-only signals first.
  const urlYears = countYearsIn(url);
  result.detectedYears = { ...urlYears };
  if (urlYears[expectedYear] > 0) {
    result.status = 'match';
    result.evidence.push(`URL contains expected year ${expectedYear}`);
    return result;
  }
  const wrongYearInUrl = Object.keys(urlYears).find(y => y !== expectedYear);
  if (wrongYearInUrl) {
    result.status = 'stale';
    result.evidence.push(`URL contains prior-edition year ${wrongYearInUrl}`);
    return result;
  }

  if (isEditionAgnosticUrl(url)) {
    result.status = 'unknown';
    result.evidence.push('URL matches edition-agnostic landing page pattern');
    return result;
  }

  // Need a page fetch. Use Firecrawl for markdown + metadata.
  let scrape;
  try {
    scrape = await scrapeContent(url, { formats: ['markdown'], maxAge: options.maxAge ?? 0 });
  } catch (e) {
    result.status = 'error';
    result.evidence.push(`Scrape error: ${e.message}`);
    return result;
  }

  if (!scrape) {
    result.status = 'error';
    result.evidence.push('Scrape returned null');
    return result;
  }

  const meta = scrape.metadata || {};
  const markdown = scrape.markdown || '';
  const highWeightText = [
    meta.title,
    meta.ogTitle,
    meta['og:title'],
    meta.ogDescription,
    meta['og:description'],
    meta.description,
    meta.keywords
  ].filter(Boolean).join(' | ');

  const highYears = countYearsIn(highWeightText);
  const bodyYears = countYearsIn(markdown);
  const nameKeys = buildRaceNameKeys(race);
  const proxYears = countNameProximityYears(highWeightText + '\n' + markdown, nameKeys);

  // Combine with weighting: name-proximity 10×, high-weight 5×, body 1×.
  const combined = { ...result.detectedYears };
  for (const [y, n] of Object.entries(proxYears)) combined[y] = (combined[y] || 0) + n * 10;
  for (const [y, n] of Object.entries(highYears)) combined[y] = (combined[y] || 0) + n * 5;
  for (const [y, n] of Object.entries(bodyYears)) combined[y] = (combined[y] || 0) + n;
  result.detectedYears = combined;

  result.siblingUrls = extractMarkdownLinks(markdown, url);

  // Race-date string detection (strong match signal).
  const dateStrings = buildRaceDateStrings(race);
  const haystack = (highWeightText + ' ' + markdown).toLowerCase();
  const matchedDate = dateStrings.find(s => haystack.includes(s.toLowerCase()));
  if (matchedDate) {
    result.status = 'match';
    result.evidence.push(`Page contains race date string: "${matchedDate}"`);
    return result;
  }

  // Name-proximity is the strongest signal — a year next to the race name
  // beats a stray boilerplate year elsewhere on the page.
  if ((proxYears[expectedYear] || 0) > 0) {
    result.status = 'match';
    result.evidence.push(`Race name appears near expected year ${expectedYear} (×${proxYears[expectedYear]})`);
    return result;
  }
  const wrongProxYears = Object.entries(proxYears)
    .filter(([y, n]) => y !== expectedYear && n > 0)
    .sort((a, b) => b[1] - a[1]);
  if (wrongProxYears.length > 0) {
    const [domYear, domCount] = wrongProxYears[0];
    result.status = 'stale';
    result.evidence.push(`Race name appears near prior-edition year ${domYear} (×${domCount})`);
    return result;
  }

  if (highYears[expectedYear] > 0) {
    result.status = 'match';
    result.evidence.push(`Title/meta contains expected year ${expectedYear}`);
    return result;
  }

  const otherHighYears = Object.entries(highYears)
    .filter(([y]) => y !== expectedYear)
    .sort((a, b) => b[1] - a[1]);
  if (otherHighYears.length > 0) {
    const [domYear, domCount] = otherHighYears[0];
    result.status = 'stale';
    result.evidence.push(`Title/meta references ${domYear} (×${domCount}) and not expected ${expectedYear}`);
    const titleSnippet = (meta.title || meta.ogTitle || '').slice(0, 200);
    if (titleSnippet) result.evidence.push(`title="${titleSnippet}"`);
    return result;
  }

  // Fall back to body-text evidence (weakest signal).
  if ((bodyYears[expectedYear] || 0) > 0) {
    const otherBodyMax = Math.max(0, ...Object.entries(bodyYears).filter(([y]) => y !== expectedYear).map(([, n]) => n));
    if (bodyYears[expectedYear] >= otherBodyMax) {
      result.status = 'match';
      result.evidence.push(`Body text references expected year ${expectedYear} (×${bodyYears[expectedYear]}; no dominant other-year)`);
      return result;
    }
  }

  const wrongBodyYears = Object.entries(bodyYears)
    .filter(([y, n]) => y !== expectedYear && n > 0 && (bodyYears[expectedYear] || 0) === 0)
    .sort((a, b) => b[1] - a[1]);
  if (wrongBodyYears.length > 0) {
    const [domYear, domCount] = wrongBodyYears[0];
    result.status = 'stale';
    result.evidence.push(`Body references ${domYear} (×${domCount}) and not expected ${expectedYear}`);
    return result;
  }

  result.status = 'unknown';
  result.evidence.push('No year evidence found in page');
  return result;
}

/**
 * Run checkBroadcastEdition over many URLs with bounded concurrency.
 * @param {Array<{url: string, race: object, [k: string]: any}>} jobs
 * @param {object} [options]
 * @returns {Promise<Array>}
 */
export async function checkBroadcastEditionsBatch(jobs, options = {}) {
  const concurrency = options.concurrency || 3;
  const delay = options.delay || 1000;
  const onProgress = options.onProgress || (() => {});
  const results = [];
  for (let i = 0; i < jobs.length; i += concurrency) {
    const batch = jobs.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async job => {
        const check = await checkBroadcastEdition(job.url, job.race, options);
        return { ...job, check };
      })
    );
    results.push(...batchResults);
    onProgress(results.length, jobs.length);
    if (i + concurrency < jobs.length) {
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return results;
}

export default {
  checkBroadcastEdition,
  checkBroadcastEditionsBatch,
  EDITION_AGNOSTIC_PATTERNS
};
