/**
 * Cross-reference checker — verify that race-data.json references
 * (topRiders[].id, broadcaster IDs) resolve in their respective tables.
 *
 * Severity policy (per plan):
 *   - Road race topRiders orphan          → FAIL  (riders should exist in riders.json/outsiders.json)
 *   - Gravel/cyclocross orphan            → WARN  (specialist tables incomplete by design)
 *   - Women's race orphan                 → WARN  (some races use a riders-women.json subset)
 *   - Broadcaster ID orphan               → WARN  (licensedBroadcasters table is hand-curated)
 *
 * `loadRiderIndex()` reads four rider files + broadcasters.json once and
 * returns a memoized index. Pass it through to `checkCrossRefs(race, index)`.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _cached = null;

export function loadRiderIndex() {
  if (_cached) return _cached;

  const root = join(__dirname, '..', 'data');
  const safeLoad = (name) => {
    const p = join(root, name);
    if (!existsSync(p)) return null;
    try { return JSON.parse(readFileSync(p, 'utf-8')); }
    catch { return null; }
  };

  const collect = (data, dest) => {
    if (!data) return;
    const arr = Array.isArray(data) ? data : data.riders;
    if (!Array.isArray(arr)) return;
    for (const r of arr) if (r?.id) dest.add(r.id);
  };

  const rankedMen = new Set();
  const outsiders = new Set();
  const ridersWomen = new Set();
  const ridersCxMen = new Set();
  const ridersCxWomen = new Set();

  collect(safeLoad('riders.json'), rankedMen);
  collect(safeLoad('outsiders.json'), outsiders);
  collect(safeLoad('riders-women.json'), ridersWomen);
  collect(safeLoad('riders-cyclocross-men.json'), ridersCxMen);
  collect(safeLoad('riders-cyclocross-women.json'), ridersCxWomen);

  // Broadcaster IDs across licensed table (primary + alternatives + fta).
  const broadcasterIds = new Set();
  const b = safeLoad('broadcasters.json');
  if (b?.licensedBroadcasters) {
    for (const geo of Object.values(b.licensedBroadcasters)) {
      for (const list of [geo?.primary, geo?.alternatives, geo?.fta]) {
        if (!Array.isArray(list)) continue;
        for (const item of list) if (item?.id) broadcasterIds.add(item.id);
      }
    }
  }

  _cached = {
    rankedMen,
    outsiders,
    ridersWomen,
    ridersCxMen,
    ridersCxWomen,
    broadcasterIds,
    // Union helpers
    allRoadMen: new Set([...rankedMen, ...outsiders]),
    allWomen: ridersWomen,
    allCx: new Set([...ridersCxMen, ...ridersCxWomen]),
  };
  return _cached;
}

export function checkCrossRefs(race, index = loadRiderIndex()) {
  const checks = [];

  // ── topRiders[].id resolution ───────────────────────────────────────
  const tr = Array.isArray(race.topRiders) ? race.topRiders : [];
  if (tr.length) {
    const { severity, allowed, label } = riderLookupFor(race, index);
    const orphans = tr.filter(r => r?.id && !allowed.has(r.id)).map(r => r.id);
    checks.push({
      label: `topRiders resolve in ${label}`,
      status: orphans.length === 0 ? 'pass' : severity,
      value: orphans.length === 0
        ? `${tr.length} riders OK`
        : `${orphans.length} orphan${orphans.length > 1 ? 's' : ''}: ${orphans.slice(0, 4).join(', ')}${orphans.length > 4 ? ` … +${orphans.length - 4}` : ''}`,
    });
  }

  // ── Per-stage topRiders ─────────────────────────────────────────────
  const stages = Array.isArray(race.stages) ? race.stages : [];
  let stageOrphans = [];
  const { allowed: stageAllowed } = riderLookupFor(race, index);
  for (const s of stages) {
    const stagers = Array.isArray(s?.topRiders) ? s.topRiders : [];
    for (const r of stagers) if (r?.id && !stageAllowed.has(r.id)) stageOrphans.push(`s${s.stageNumber}:${r.id}`);
  }
  if (stages.some(s => Array.isArray(s?.topRiders) && s.topRiders.length)) {
    const { severity } = riderLookupFor(race, index);
    checks.push({
      label: 'stage topRiders resolve',
      status: stageOrphans.length === 0 ? 'pass' : severity,
      value: stageOrphans.length === 0
        ? 'all stage riders OK'
        : `${stageOrphans.length} orphan${stageOrphans.length > 1 ? 's' : ''}: ${stageOrphans.slice(0, 3).join(', ')}`,
    });
  }

  // ── broadcast.geos[*].primary.broadcasterId + alternatives ───────────
  const geos = race.broadcast?.geos || {};
  const bOrphans = [];
  for (const [geo, block] of Object.entries(geos)) {
    const ids = [];
    if (block?.primary?.broadcasterId) ids.push(block.primary.broadcasterId);
    if (Array.isArray(block?.alternatives)) {
      for (const alt of block.alternatives) if (alt?.broadcasterId) ids.push(alt.broadcasterId);
    }
    for (const id of ids) if (!index.broadcasterIds.has(id)) bOrphans.push(`${geo}:${id}`);
  }
  if (Object.keys(geos).length > 0) {
    checks.push({
      label: 'broadcaster IDs resolve',
      status: bOrphans.length === 0 ? 'pass' : 'warn',
      value: bOrphans.length === 0
        ? `${Object.keys(geos).length} geo(s) OK`
        : `${bOrphans.length} unknown: ${bOrphans.slice(0, 4).join(', ')}${bOrphans.length > 4 ? ` … +${bOrphans.length - 4}` : ''}`,
    });
  }

  return { checks };
}

/**
 * Determine which rider-id set is authoritative for this race and what
 * severity an orphan triggers.
 */
function riderLookupFor(race, index) {
  const isWomen = race.gender === 'women';
  const isCx = race.discipline === 'cyclocross';
  const isGravel = race.discipline === 'gravel';

  if (isCx) {
    // CX riders can show up across men/women specialist tables
    return { severity: 'warn', allowed: index.allCx, label: 'cyclocross tables' };
  }
  if (isGravel) {
    // Allow any of the road/road-women/cyclocross/outsiders pools — gravel
    // pulls from many specialties and we don't have a dedicated table.
    return {
      severity: 'warn',
      allowed: new Set([...index.allRoadMen, ...index.allWomen, ...index.allCx]),
      label: 'rider tables (gravel any)',
    };
  }
  if (isWomen) {
    // Some women's races include outsiders too
    return {
      severity: 'warn',
      allowed: new Set([...index.allWomen, ...index.outsiders]),
      label: 'women rider tables',
    };
  }
  // Default: road race → must resolve in riders.json or outsiders.json
  return { severity: 'fail', allowed: index.allRoadMen, label: 'riders.json/outsiders.json' };
}
