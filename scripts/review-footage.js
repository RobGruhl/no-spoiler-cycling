#!/usr/bin/env node

/**
 * Batched human review for the spoiler-video quarantine.
 *
 * The daily calendar-footage routine writes auto-found videos as `review.status =
 * "pending"` (scripts/set-race-footage.js), and the generators render ONLY approved
 * entries (lib/footage-review.js). This tool is the human gate: list what's waiting,
 * then approve or reject in a batch.
 *
 *   node scripts/review-footage.js --list                 # pending entries + live titles
 *   node scripts/review-footage.js --approve <id> [<id>…] # publish (renders on next build)
 *   node scripts/review-footage.js --reject  <id> [<id>…] # quarantine permanently
 *
 * An <id> is a race id (e.g. `paris-roubaix-2026`, race-level footage) or a stage id
 * (`tour-de-suisse-2026-stage-5`) — exactly the ids `--list` prints.
 *
 * --list fetches each pending video's REAL title + channel LIVE from YouTube oEmbed
 * (title/author only — no description, so no spoiler exposure). Titles are shown, not
 * stored: data/race-data.json ships in the public Pages repo, so an unreviewed title
 * is never persisted there. Apply the runbook's name-only judgment before approving.
 *
 * --reject keeps the record (status "rejected", URL retained) so the routine's
 * work-list sees the slot as filled and never re-adds the same video.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { footageStatus, hasFootageUrl } from '../lib/footage-review.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = path.join(ROOT, 'data/race-data.json');
const argv = process.argv.slice(2);
const TODAY = new Date().toISOString().slice(0, 10);

const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const races = Array.isArray(data) ? data : data.races;

// ── Enumerate every footage entry as {id, kind, race, stage, entry} ────────
function* footageEntries() {
  for (const race of races) {
    if (hasFootageUrl(race)) yield { id: race.id, kind: 'race', race, stage: null, entry: race };
    for (const stage of race.stages || []) {
      if (hasFootageUrl(stage)) {
        yield { id: `${race.id}-stage-${stage.stageNumber}`, kind: 'stage', race, stage, entry: stage };
      }
    }
  }
}
function findById(id) {
  for (const e of footageEntries()) if (e.id === id) return e;
  return null;
}

async function oembed(url) {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, { signal: AbortSignal.timeout(15000) });
    if (!r.ok) return { title: `(oEmbed HTTP ${r.status})`, author: '' };
    const j = await r.json();
    return { title: j.title || '(no title)', author: j.author_name || '' };
  } catch (e) { return { title: `(oEmbed unreachable: ${e.message})`, author: '' }; }
}

async function list() {
  const pending = [...footageEntries()].filter(e => footageStatus(e.entry) === 'pending');
  if (!pending.length) { console.log('No pending footage. Review queue is empty.'); return; }
  console.log(`${pending.length} footage entr${pending.length === 1 ? 'y' : 'ies'} pending review:\n`);
  for (const e of pending) {
    const { title, author } = await oembed(e.entry.url);
    const stageLbl = e.kind === 'stage' ? `stage ${e.stage.stageNumber}` : 'whole race';
    const duration = (e.stage && e.stage.duration) || e.race.duration || '—';
    console.log(`  id:       ${e.id}`);
    console.log(`  race:     ${e.race.name} (${stageLbl}, added ${e.entry.review?.added || '?'})`);
    console.log(`  title:    ${title}`);
    console.log(`  channel:  ${author || '—'}    duration: ${duration}`);
    console.log(`  url:      ${e.entry.url}`);
    console.log('');
  }
  console.log('Approve:  node scripts/review-footage.js --approve ' + pending.map(e => e.id).join(' '));
  console.log('Reject:   node scripts/review-footage.js --reject  <id> [<id>…]');
}

function setStatus(ids, status) {
  if (!ids.length) { console.error(`no ids given. usage: --${status === 'approved' ? 'approve' : 'reject'} <id> [<id>…]`); process.exit(2); }
  let changed = 0;
  for (const id of ids) {
    const e = findById(id);
    if (!e) { console.error(`✗ not a footage entry: ${id}`); continue; }
    const prev = footageStatus(e.entry);
    e.entry.review = { ...(e.entry.review || {}), status, reviewed: TODAY };
    console.log(`  ${id}: ${prev} → ${status}`);
    changed++;
  }
  if (changed) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`✓ ${changed} entr${changed === 1 ? 'y' : 'ies'} updated in data/race-data.json`);
    console.log('  Run `npm run build:all` to (re)render approved footage; rejected stays hidden.');
  }
}

const approveIdx = argv.indexOf('--approve');
const rejectIdx = argv.indexOf('--reject');
const idsAfter = (i) => argv.slice(i + 1).filter(a => !a.startsWith('--'));

if (argv.includes('--list')) {
  await list();
} else if (approveIdx >= 0) {
  setStatus(idsAfter(approveIdx), 'approved');
} else if (rejectIdx >= 0) {
  setStatus(idsAfter(rejectIdx), 'rejected');
} else {
  console.error('usage: node scripts/review-footage.js --list | --approve <id…> | --reject <id…>');
  process.exit(2);
}
