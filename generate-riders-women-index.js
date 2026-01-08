#!/usr/bin/env node

/**
 * Generate Women's Riders Index Page
 *
 * Creates riders-women.html showing a grid of top ranked women cyclists.
 * Reuses the refactored generateRidersIndexHTML from generate-riders-index.js.
 */

import fs from 'fs';
import { generateRidersIndexHTML } from './generate-riders-index.js';

function generateWomenRidersIndexPage() {
  const ridersDataPath = './data/riders-women.json';
  const outputPath = './riders-women.html';

  const ridersData = JSON.parse(fs.readFileSync(ridersDataPath, 'utf8'));

  const html = generateRidersIndexHTML(ridersData.riders, {
    lastUpdated: ridersData.lastUpdated,
    pageTitle: 'Top Women Riders 2026',
    pageSubtitle: 'WWT ranking leaders and their announced race programs',
    riderPagesDir: 'riders-women',
    gender: 'women'
  });

  fs.writeFileSync(outputPath, html);

  console.log(`✅ Generated: ${outputPath}`);
  console.log(`   ${ridersData.riders.length} riders`);
  if (ridersData.lastUpdated) {
    console.log(`   Last updated: ${new Date(ridersData.lastUpdated).toLocaleDateString()}`);
  }
  return outputPath;
}

// CLI
const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Women's Riders Index Page Generator

Usage:
  node generate-riders-women-index.js            Generate riders-women.html
  node generate-riders-women-index.js --help     Show this help

Output: ./riders-women.html
`);
} else {
  generateWomenRidersIndexPage();
}

export { generateWomenRidersIndexPage };
