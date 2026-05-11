/**
 * Race-data schema validation — hand-rolled, no ajv dependency.
 *
 * Exports `validateRace(race)` returning `{ checks: [{label,status,value?}] }`.
 * Statuses follow the project's reporter convention: pass | warn | fail | info.
 *
 * Severity defaults match the test-automation plan
 * (/Users/robgruhl/.claude/plans/let-s-do-both-as-quizzical-sundae.md):
 *
 *   FAIL  — missing core fields, enum violations, stage-race with <2 stages
 *           when STRICT (otherwise warn), per-stage required fields missing.
 *   WARN  — unknown terrain values, rating out of range, empty stages[] on a
 *           stage race (day-one severity per plan; --strict promotes).
 *
 * Strictness is passed in via `validateRace(race, { strict })`. When strict
 * is true, the few rules tagged ⇧strict promote from warn → fail.
 */

const GENDER_ENUM = new Set(['men', 'women', 'mixed']);
const DISCIPLINE_ENUM = new Set(['road', 'gravel', 'cyclocross']);
const FORMAT_ENUM = new Set(['one-day', 'stage-race', 'itt', 'ttt']);
const TERRAIN_ENUM = new Set([
  'flat', 'hilly', 'mountain', 'itt', 'ttt', 'circuit',
  'cobbles', 'gravel', 'cyclocross', 'crosswind-risk', 'summit-finish',
]);
const STAGE_TYPE_ENUM = new Set([
  'flat', 'hilly', 'mountain', 'itt', 'ttt', 'rest-day', 'prologue', 'summit-finish',
]);

const CORE_REQUIRED = ['id', 'name', 'raceDate', 'gender', 'discipline', 'raceFormat'];

export function validateRace(race, { strict = false } = {}) {
  const checks = [];

  // Required core fields
  const missing = CORE_REQUIRED.filter(f => !race[f]);
  checks.push({
    label: 'Required core fields',
    status: missing.length === 0 ? 'pass' : 'fail',
    value: missing.length === 0 ? 'all present' : `missing: ${missing.join(', ')}`,
  });

  // raceDate format (YYYY-MM-DD)
  if (race.raceDate) {
    const ok = /^\d{4}-\d{2}-\d{2}$/.test(race.raceDate);
    checks.push({
      label: 'raceDate format',
      status: ok ? 'pass' : 'fail',
      value: ok ? race.raceDate : `bad format: ${race.raceDate}`,
    });
  }

  // Enums
  enumCheck(checks, 'gender', race.gender, GENDER_ENUM, 'fail');
  enumCheck(checks, 'discipline', race.discipline, DISCIPLINE_ENUM, 'fail');
  enumCheck(checks, 'raceFormat', race.raceFormat, FORMAT_ENUM, 'fail');

  // terrain[] — warn on unknown values (data still renders)
  if (Array.isArray(race.terrain) && race.terrain.length) {
    const bad = race.terrain.filter(t => !TERRAIN_ENUM.has(t));
    checks.push({
      label: 'terrain values',
      status: bad.length === 0 ? 'pass' : 'warn',
      value: bad.length === 0 ? race.terrain.join(', ') : `unknown: ${bad.join(', ')}`,
    });
  }

  // rating — integer 1..5 if present
  if (race.rating != null) {
    const isInt = Number.isInteger(race.rating);
    const inRange = isInt && race.rating >= 1 && race.rating <= 5;
    checks.push({
      label: 'rating range',
      status: inRange ? 'pass' : 'warn',
      value: inRange ? `${race.rating}★` : `out of range: ${race.rating}`,
    });
  }

  // Stage-race must have stages[] with >= 2 entries.
  // Day-one severity = warn; --strict promotes to fail (66 known empty races).
  if (race.raceFormat === 'stage-race') {
    const stages = Array.isArray(race.stages) ? race.stages : [];
    const ok = stages.length >= 2;
    checks.push({
      label: 'stage-race has stages[]',
      status: ok ? 'pass' : (strict ? 'fail' : 'warn'),
      value: ok ? `${stages.length} entries` : (stages.length === 0 ? 'empty' : `only ${stages.length}`),
    });

    // Per-stage required fields
    if (stages.length) {
      const stageRequired = ['stageNumber', 'date', 'stageType'];
      let stageProblems = [];
      stages.forEach((s, i) => {
        const miss = stageRequired.filter(f => s[f] === undefined || s[f] === null);
        if (miss.length) stageProblems.push(`#${i + 1}: ${miss.join(',')}`);
        if (s.stageType && !STAGE_TYPE_ENUM.has(s.stageType)) {
          stageProblems.push(`#${i + 1}: bad stageType "${s.stageType}"`);
        }
      });
      checks.push({
        label: 'stages[] schema',
        status: stageProblems.length === 0 ? 'pass' : 'fail',
        value: stageProblems.length === 0
          ? `${stages.length} stages OK`
          : stageProblems.slice(0, 3).join('; ') + (stageProblems.length > 3 ? ` … +${stageProblems.length - 3}` : ''),
      });
    }
  }

  return { checks };
}

function enumCheck(checks, label, value, allowed, severity) {
  if (value === undefined || value === null) return; // missing handled by required-fields check
  const ok = allowed.has(value);
  checks.push({
    label: `${label} enum`,
    status: ok ? 'pass' : severity,
    value: ok ? value : `bad value: ${value}`,
  });
}

export const ENUMS = {
  GENDER_ENUM, DISCIPLINE_ENUM, FORMAT_ENUM, TERRAIN_ENUM, STAGE_TYPE_ENUM,
};
