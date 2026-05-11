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

/**
 * Phrase-level false-positive guards.
 * A keyword hit whose surrounding window matches one of these is dropped.
 * Each pattern is matched against a ±30-char window around the keyword.
 *
 * Intent: catch idioms and generic descriptors that don't name a winner.
 * If the regex hits, the keyword is treated as a non-spoiler.
 */
const PHRASE_GUARDS = [
  // "the race is won or lost", "GC is won and lost on Climb X"
  /\bwon\s+(?:or|and)\s+lost\b/i,
  /\bmade\s+(?:or|and)\s+lost\b/i,
  // "rider to beat", "teams to beat Pro squads", forward-looking
  /\b(?:rider|riders|team|teams|squad|squads|formation|formations)\s+to\s+beat\b/i,
  // "broadcasts/reveal/show often show the winner" — viewing-warning context
  /\b(?:reveal|reveals|show|shows|display|displays|broadcast|broadcasts)\s+the\s+winner\b/i,
  /\bwinner\s+announcements?\b/i,
  /\bwinner\s*[—–-]\s*disable\b/i,
  // Generic descriptors: "the overall/race/stage winner will/gets/emerges/consolidates/traditionally"
  /\bthe\s+(?:overall|race|stage|gc)\s+winner\s+(?:will|gets|emerges|consolidates|traditionally)\b/i,
  /\b(?:race|stage|overall|gc)\s+winner\s+traditionally\b/i,
  // "where the race is won", "where the GC is won"
  /\bwhere\s+(?:the\s+)?(?:race|gc|stage)\s+is\s+won\b/i,
  // "home soil victor(y|ies)" — generic
  /\b(?:home\s+soil|local\s+soil)\s+victor(?:y|ies)\b/i,
  // "the winner will emerge", "the winner Italian development" (descriptive)
  /\bthe\s+(?:overall|race|stage|gc)\s+winner\s+(?:will\s+emerge|emerges)\b/i,
  // Stage/race "winner" appearing in a sentence about footage content
  /\b(?:often\s+)?(?:show|shows|reveal|reveals)\s+the\s+(?:overall|race|stage)?\s*winner\b/i,
  // "rider to beat after dominating" — descriptive of form
  /\bto\s+beat\s+after\s+dominating\b/i,
  // "won back-to-back" — historical descriptor (career stat)
  /\bwon\s+(?:back[-\s]?to[-\s]?back|consecutive|multiple)\b/i,
  // "X has won it Y times" — career stat, not current-race result
  /\bhas\s+won\s+(?:it\s+)?(?:twice|three\s+times|multiple\s+times|\d+\s+times)\b/i,
  /\bwon\s+(?:it\s+)?(?:twice|thrice|three\s+times|multiple\s+times|\d+\s+times)\b/i,
  // "first stage winner" / "stage X winner" as part of viewing copy
  /\b(?:first|last|each)\s+stage\s+winner\b/i,
  // "cross the line victorious" — viewing-warning context (describes what footage shows)
  /\bcross\s+the\s+line\s+victorious\b/i,
  // "experienced champions" — descriptive of the rider field, not a result
  /\bexperienced\s+champions?\b/i,
  // "Winner gets a live pig" — tradition copy (no name)
  /\bwinner\s+gets\s+(?:a|the)\b/i,
  // "race is usually won by a solo ride" — descriptive of race character
  /\b(?:usually|often|typically|always|generally|traditionally|frequently)\s+(?:won|decided)\b/i,
  // "determining/crowning/etc the (overall) (race) (stage) winner" — generic
  /\b(?:determine|determines|determining|determined|crown|crowns|crowning|crowned|establish|establishes|establishing|reveal|reveals|revealing|produce|produces|producing)\s+the\s+(?:overall\s+)?(?:race\s+)?(?:stage\s+)?winner\b/i,
  // "where the winner consolidates/builds/extends" — descriptive
  /\bwhere\s+the\s+winner\s+(?:consolidates|builds|extends|sits|decides|comes\s+from)\b/i,
  // "result for the winner Italian/[nationality] development team" — describes rider profile
  /\bresult\s+for\s+the\s+winner\b/i,
  // "a podium" / "the podium" / "final podium" used as a target/goal/viewing context
  /\b(?:a|the|final)\s+podium\b/i,
  /\bpodium\s+(?:close|finish|spot|position|chance|opportunity|threat|goal)\b/i,
  // "the winner will" already covered above; explicit variant
  /\bthe\s+winner\s+will\b/i,
];

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

  // Race-name allowlist — for races whose own name contains a flagged
  // keyword (e.g. "Aveiro Region Champions Classic"), don't flag the
  // race name's own appearance inside its courseSummary/description.
  const raceNameLower = (race.name || '').toLowerCase();
  const opts = { raceNameLower };

  const hits = [];

  for (const [label, getter] of SCANNED_FIELDS) {
    const text = getter(race);
    if (typeof text !== 'string' || !text.trim()) continue;
    const fieldHits = findKeywordHits(text, opts);
    for (const h of fieldHits) hits.push({ field: label, ...h });
  }

  // Per-stage fields
  const stages = Array.isArray(race.stages) ? race.stages : [];
  for (const s of stages) {
    for (const [label, getter] of STAGE_SCANNED_FIELDS) {
      const text = getter(s);
      if (typeof text !== 'string' || !text.trim()) continue;
      const fieldHits = findKeywordHits(text, opts);
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
 * Applies false-positive guards on "champion" + phrase-level idioms +
 * race-name allowlist.
 */
function findKeywordHits(text, { raceNameLower = '' } = {}) {
  const hits = [];

  // Pre-compute race-name occurrence ranges in this text so we can skip
  // keyword matches that fall inside the race's own name (e.g. "Champions
  // Classic" landing in courseSummary).
  const nameRanges = [];
  if (raceNameLower && raceNameLower.length > 4) {
    const lower = text.toLowerCase();
    let idx = lower.indexOf(raceNameLower);
    while (idx !== -1) {
      nameRanges.push([idx, idx + raceNameLower.length]);
      idx = lower.indexOf(raceNameLower, idx + raceNameLower.length);
    }
  }
  const insideRaceName = (pos) => nameRanges.some(([a, b]) => pos >= a && pos < b);

  // Single-word keywords
  let m;
  KEYWORD_RE.lastIndex = 0;
  while ((m = KEYWORD_RE.exec(text)) !== null) {
    const word = m[1].toLowerCase();

    // Skip if the match is inside the race name (race-name allowlist)
    if (insideRaceName(m.index)) continue;

    // False-positive guard for "champion(s)" — career-achievement contexts
    if (word.startsWith('champion')) {
      const window = sliceWindow(text, m.index, word.length, 30, 20);
      if (CHAMPION_OK_PREFIXES.test(window)) continue;
    }

    // Phrase-level guards — drop if any registered idiom matches the window
    if (phraseGuardMatches(text, m.index, word.length)) continue;

    hits.push({ keyword: word, snippet: snippet(text, m.index, word.length) });
  }

  // Multi-word phrases
  for (const re of PHRASE_HITS) {
    re.lastIndex = 0;
    let pm;
    while ((pm = re.exec(text)) !== null) {
      if (insideRaceName(pm.index)) continue;
      if (phraseGuardMatches(text, pm.index, pm[0].length)) continue;
      hits.push({ keyword: pm[0].toLowerCase(), snippet: snippet(text, pm.index, pm[0].length) });
    }
  }

  return hits;
}

function sliceWindow(text, idx, len, leftPad, rightPad) {
  const start = Math.max(0, idx - leftPad);
  const end = Math.min(text.length, idx + len + rightPad);
  return text.slice(start, end);
}

function phraseGuardMatches(text, idx, len) {
  // ±30-char window around the hit
  const window = sliceWindow(text, idx, len, 30, 30);
  return PHRASE_GUARDS.some(re => re.test(window));
}

function snippet(text, idx, len) {
  const start = Math.max(0, idx - 15);
  const end = Math.min(text.length, idx + len + 15);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

export const SPOILER_KEYWORDS = {
  KEYWORD_RE, PHRASE_HITS, CHAMPION_OK_PREFIXES, SCANNED_FIELDS, STAGE_SCANNED_FIELDS,
};
