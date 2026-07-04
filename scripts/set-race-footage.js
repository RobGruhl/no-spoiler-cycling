#!/usr/bin/env node

/**
 * Apply spoiler-vetted YouTube footage to a race in data/race-data.json — the ONLY
 * sanctioned write path for the calendar-footage routine (and manual backfills).
 *
 * WHY THIS EXISTS: the results routine's spoiler-safety is architectural (calendar
 * generators only `fs.existsSync` results, never inline result text). Footage is
 * different — it writes a video URL straight onto the spoiler-FREE calendar, and
 * `npm test` cannot tell a spoiler video from a safe one (a URL is opaque). So this
 * tool is the enforcement boundary.
 *
 * It fetches the video's REAL title from YouTube's oEmbed endpoint (title + author
 * only — no description, so no spoiler exposure) and gates THAT, never a
 * caller-supplied title. This closes a real loophole: an upstream LLM can
 * "sanitize" a title in its report ("EXECUTED TO PERFECTION! | Stage 1" → "Stage 1
 * Highlights"), so trusting the caller's title would gate the wrong string. oEmbed
 * also gives a free existence check — a removed/private video 404s and is rejected.
 * A title that trips lib/spoiler-scanner.js `titleLeaksResult` is HARD-REFUSED.
 * (Name-only spoilers with no result word still need the routine's trusted-channel
 * + LLM judgment — see the runbook.)  --no-verify skips the fetch (offline/tests).
 *
 * Input JSON (via --file or --json):
 *   {
 *     "raceLevelUrl":   "https://www.youtube.com/watch?v=...",   // optional
 *     "raceLevelTitle": "Tour de Suisse 2026 – Stage 1 Highlights", // required if raceLevelUrl set
 *     "watchNote":      "…Disable autoplay, avoid sidebar/comments…", // optional
 *     "spoilerSafe":    true,   // optional, default true
 *     "stages": [ { "stageNumber": 1, "url": "https://youtu.be/…", "title": "… Stage 1 Highlights" } ]
 *   }
 *
 * Usage:
 *   node scripts/set-race-footage.js --id RACE_ID --file /tmp/footage.json [--dry-run]
 *   node scripts/set-race-footage.js --id RACE_ID --json '{"stages":[…]}'  [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { titleLeaksResult } from '../lib/spoiler-scanner.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const opt = (n) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };
const DRY = argv.includes('--dry-run');
const RACE_ID = opt('id');
const FILE = opt('file');
const INLINE = opt('json');

if (!RACE_ID || (!FILE && !INLINE)) {
  console.error('usage: node scripts/set-race-footage.js --id RACE_ID (--file f.json | --json \'{…}\') [--dry-run]');
  process.exit(2);
}

const payload = JSON.parse(INLINE || fs.readFileSync(FILE, 'utf8'));
const NO_VERIFY = argv.includes('--no-verify');
const isYouTube = (u) => typeof u === 'string' && /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/.test(u);

// Fetch the REAL video title (+ author) from YouTube oEmbed — title/author only, no
// description, so no spoiler exposure. Also serves as an existence check.
async function realTitle(url) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: AbortSignal.timeout(15000) });
    if ([401, 403, 404].includes(r.status)) return { ok: false, reason: `video unavailable (oEmbed ${r.status} — private/removed/geo)` };
    if (!r.ok) return { ok: false, reason: `oEmbed HTTP ${r.status}` };
    const j = await r.json();
    return { ok: true, title: j.title || '', author: j.author_name || '' };
  } catch (e) { return { ok: false, reason: `oEmbed fetch failed: ${e.message}` }; }
}

// ── Gate every entry on its REAL title BEFORE touching the file ──────────
const errors = [];
const resolved = [];
async function checkEntry(label, url, callerTitle) {
  if (!isYouTube(url)) { errors.push(`${label}: not a YouTube watch URL: ${JSON.stringify(url)}`); return; }
  let title = callerTitle, author = '(unverified)';
  if (!NO_VERIFY) {
    const rt = await realTitle(url);
    if (!rt.ok) { errors.push(`${label}: ${rt.reason} — ${url}`); return; }
    title = rt.title; author = rt.author;
  }
  if (!title || typeof title !== 'string') { errors.push(`${label}: no title to vet (oEmbed empty, no caller title) — ${url}`); return; }
  if (titleLeaksResult(title)) { errors.push(`${label}: REAL TITLE TRIPS SPOILER GATE → refusing: ${JSON.stringify(title)} [${author}]`); return; }
  resolved.push({ label, url, title, author });
}

const toCheck = [];
if (payload.raceLevelUrl) toCheck.push(['raceLevel', payload.raceLevelUrl, payload.raceLevelTitle]);
for (const s of payload.stages || []) toCheck.push([`stage ${s.stageNumber}`, s.url, s.title]);
for (const [l, u, t] of toCheck) await checkEntry(l, u, t);

if (errors.length) {
  console.error(`✗ set-race-footage REFUSED for ${RACE_ID}:`);
  for (const e of errors) console.error('   ' + e);
  process.exit(1);
}
for (const r of resolved) console.log(`   ✓ vetted [${r.author}] ${r.title}`);

// ── Apply ───────────────────────────────────────────────────────────────
const DATA_PATH = path.join(ROOT, 'data/race-data.json');
const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const races = Array.isArray(data) ? data : data.races;
const race = races.find((r) => r.id === RACE_ID);
if (!race) { console.error(`✗ race not found: ${RACE_ID}`); process.exit(1); }

const changes = [];
if (payload.raceLevelUrl) {
  race.platform = 'YouTube';
  race.url = payload.raceLevelUrl;
  changes.push(`race.platform=YouTube url=${payload.raceLevelUrl}`);
}
if (payload.watchNote || payload.spoilerSafe !== undefined || payload.raceLevelUrl) {
  if (!race.raceDetails || typeof race.raceDetails !== 'object') race.raceDetails = {};
  race.raceDetails.spoilerSafe = payload.spoilerSafe === undefined ? true : !!payload.spoilerSafe;
  if (payload.watchNote) race.raceDetails.watchNotes = payload.watchNote;
  changes.push(`raceDetails.spoilerSafe=${race.raceDetails.spoilerSafe}${payload.watchNote ? ' +watchNotes' : ''}`);
}
for (const sIn of payload.stages || []) {
  const stage = (race.stages || []).find((s) => s.stageNumber === sIn.stageNumber);
  if (!stage) { console.error(`✗ stage ${sIn.stageNumber} not found in ${RACE_ID}`); process.exit(1); }
  stage.platform = 'YouTube';
  stage.url = sIn.url;
  changes.push(`stage ${sIn.stageNumber}.url=${sIn.url}`);
}

if (!changes.length) { console.log('no changes in payload'); process.exit(0); }

console.log(`${DRY ? '[dry-run] ' : ''}${RACE_ID}: ${changes.length} change(s)`);
for (const c of changes) console.log('   ' + c);

if (!DRY) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log('✓ written to data/race-data.json');
}
