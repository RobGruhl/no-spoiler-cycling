/**
 * Spoiler-keyword scanner for past-race copy.
 *
 * Scans only races whose raceDate is strictly before today. Only fields
 * surfaced on the public race-details page are scanned. Historical-context
 * fields (which legitimately describe past winners) are excluded.
 *
 * Severity defaults to WARN — per plan, promoted to FAIL in a follow-up PR
 * after the ~23 known existing hits are cleaned up.
 */

const KEYWORD_RE = /\b(won|winner|defeated|podium|champion|champions|triumph|triumphed|victory|victories|victorious|crowned|outsprinted|beat|beats|dominated)\b/gi;
const PHRASE_HITS = [
  /\bfinished\s+(?:first|1st)\b/gi,
  /\btook\s+the\s+win\b/gi,
  /\bsealed\s+the\s+win\b/gi,
];

// Contexts in which "champion" is allowed (rider achievement, not result).
const CHAMPION_OK_PREFIXES = /(world|national|olympic|reigning|former|defending|european|continental|junior|u23|champion's\s+jersey)/i;

const SCANNED_FIELDS = [
  // Top-level race fields
  ['description', r => r.description],
  ['raceDetails.courseSummary', r => r.raceDetails?.courseSummary],
  ['raceDetails.watchNotes', r => r.raceDetails?.watchNotes],
  ['raceDetails.narratives', r => (r.raceDetails?.narratives || []).join('\n')],
  ['raceDetails.keyClimbs[].notes', r => (r.raceDetails?.keyClimbs || []).map(c => c?.notes).filter(Boolean).join('\n')],
];

const STAGE_SCANNED_FIELDS = [
  ['stageDetails.courseSummary', s => s.stageDetails?.courseSummary],
  ['stageDetails.watchNotes',    s => s.stageDetails?.watchNotes],
  ['stageDetails.narratives',    s => (s.stageDetails?.narratives || []).join('\n')],
  ['description',                s => s.description],
];

/**
 * Returns { checks: [...] } where the check details list any hits.
 * Designed to plug into the existing test-reporter as a section.
 */
export function scanRaceForSpoilers(race, { todayIso = new Date().toISOString().slice(0, 10) } = {}) {
  const checks = [];

  if (!race.raceDate || race.raceDate >= todayIso) {
    // Not in scope — return single info check so the section renders neutrally.
    checks.push({ label: 'Spoiler scan', status: 'info', value: 'skipped (future race)' });
    return { checks, inScope: false };
  }

  const hits = [];

  for (const [label, getter] of SCANNED_FIELDS) {
    const text = getter(race);
    if (typeof text !== 'string' || !text.trim()) continue;
    const fieldHits = findKeywordHits(text);
    for (const h of fieldHits) hits.push({ field: label, ...h });
  }

  // Per-stage fields
  const stages = Array.isArray(race.stages) ? race.stages : [];
  for (const s of stages) {
    for (const [label, getter] of STAGE_SCANNED_FIELDS) {
      const text = getter(s);
      if (typeof text !== 'string' || !text.trim()) continue;
      const fieldHits = findKeywordHits(text);
      for (const h of fieldHits) hits.push({ field: `stage ${s.stageNumber} · ${label}`, ...h });
    }
  }

  if (hits.length === 0) {
    checks.push({ label: 'Spoiler scan', status: 'pass', value: 'no spoiler keywords' });
  } else {
    // Group by field for readability; show first 5 hits
    const preview = hits.slice(0, 5).map(h => `${h.field}: …${h.snippet}…`).join(' | ');
    checks.push({
      label: 'Spoiler keywords detected',
      status: 'warn',
      value: `${hits.length} hit${hits.length > 1 ? 's' : ''} — ${preview}${hits.length > 5 ? ` (+${hits.length - 5} more)` : ''}`,
    });
  }

  return { checks, inScope: true, hits };
}

/**
 * Returns array of { keyword, snippet } for true positives.
 * Applies false-positive guards on "champion".
 */
function findKeywordHits(text) {
  const hits = [];

  // Single-word keywords
  let m;
  KEYWORD_RE.lastIndex = 0;
  while ((m = KEYWORD_RE.exec(text)) !== null) {
    const word = m[1].toLowerCase();
    // False-positive guard for "champion(s)"
    if (word.startsWith('champion')) {
      const windowStart = Math.max(0, m.index - 30);
      const windowEnd = Math.min(text.length, m.index + word.length + 20);
      const window = text.slice(windowStart, windowEnd);
      if (CHAMPION_OK_PREFIXES.test(window)) continue;
    }
    hits.push({ keyword: word, snippet: snippet(text, m.index, word.length) });
  }

  // Multi-word phrases
  for (const re of PHRASE_HITS) {
    re.lastIndex = 0;
    let pm;
    while ((pm = re.exec(text)) !== null) {
      hits.push({ keyword: pm[0].toLowerCase(), snippet: snippet(text, pm.index, pm[0].length) });
    }
  }

  return hits;
}

function snippet(text, idx, len) {
  const start = Math.max(0, idx - 15);
  const end = Math.min(text.length, idx + len + 15);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

export const SPOILER_KEYWORDS = {
  KEYWORD_RE, PHRASE_HITS, CHAMPION_OK_PREFIXES, SCANNED_FIELDS, STAGE_SCANNED_FIELDS,
};
