#!/usr/bin/env node

// v2 design — UCI Roadbook women's riders index
// Delegates to buildRidersIndex() with gender=women.

import fs from 'fs';
import { buildRidersIndex } from './generate-riders-index.js';

function generateWomenRidersIndexPage() {
  const ridersDataPath = './data/riders-women.json';
  const outputPath = './riders-women.html';
  const ridersData = JSON.parse(fs.readFileSync(ridersDataPath, 'utf8'));
  const html = buildRidersIndex(ridersData.riders, {
    lastUpdated: ridersData.lastUpdated,
    pageTitle: 'Top Women Riders 2026',
    pageEyebrow: 'UCI Women\'s World Tour Ranking',
    docCode: 'NSC/RDW/26',
    gender: 'women',
    navOn: 'women',
    riderPagesDir: 'riders-women',
  });
  fs.writeFileSync(outputPath, html);
  console.log(`✓ wrote ${outputPath} — ${ridersData.riders.length} riders`);
  return outputPath;
}

const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`Women's riders index generator (v2)

Usage:
  node generate-riders-women-index.js         Generate riders-women.html
  node generate-riders-women-index.js --help  Show this help
`);
} else {
  generateWomenRidersIndexPage();
}

export { generateWomenRidersIndexPage };
