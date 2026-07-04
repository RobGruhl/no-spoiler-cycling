#!/usr/bin/env node

/**
 * Spoiler-video quarantine regression test.
 *
 * Asserts the built site contains ZERO footage links whose entry is not approved
 * (pending / rejected / unreviewed). This is the automated backstop for the render
 * gate in lib/footage-review.js: if a generator ever rendered a non-approved URL,
 * or a migration missed an entry, this fails the build.
 *
 * `npm test` cannot judge whether a video is a spoiler (a URL is opaque), but it CAN
 * prove that an un-reviewed video never reached the page. Run after `npm run
 * build:all`. Exit 1 on any leak.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { footageStatus, hasFootageUrl } from '../lib/footage-review.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/race-data.json'), 'utf8'));
const races = Array.isArray(data) ? data : data.races;

// Every footage URL, partitioned by whether ANY entry using it is approved.
const approved = new Set();
const nonApproved = new Set();
for (const race of races) {
  for (const entry of [race, ...(race.stages || [])]) {
    if (!hasFootageUrl(entry)) continue;
    (footageStatus(entry) === 'approved' ? approved : nonApproved).add(entry.url);
  }
}
// A URL approved somewhere is allowed to render; only URLs that are exclusively
// non-approved must never appear in the build.
const blocked = [...nonApproved].filter(u => !approved.has(u));

// Collect built HTML to scan (footage renders in race-details; scan index too).
const htmlFiles = [];
const rd = path.join(ROOT, 'race-details');
if (fs.existsSync(rd)) for (const f of fs.readdirSync(rd)) if (f.endsWith('.html')) htmlFiles.push(path.join(rd, f));
for (const f of ['index.html']) { const p = path.join(ROOT, f); if (fs.existsSync(p)) htmlFiles.push(p); }

if (!htmlFiles.length) {
  console.error('✗ footage-review test: no built HTML found — run `npm run build:all` first');
  process.exit(1);
}

const leaks = [];
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const url of blocked) {
    if (html.includes(url)) leaks.push({ file: path.relative(ROOT, file), url });
  }
}

const pendingCount = [...nonApproved].length;
if (leaks.length) {
  console.error(`✗ footage-review: ${leaks.length} non-approved footage link(s) leaked into the build:`);
  for (const l of leaks) console.error(`   ${l.file}  ←  ${l.url}`);
  process.exit(1);
}
console.log(`✓ footage-review: 0 non-approved footage links in build (${blocked.length} quarantined URL(s) across ${pendingCount} non-approved entr${pendingCount === 1 ? 'y' : 'ies'}; ${htmlFiles.length} HTML files scanned)`);
process.exit(0);
