#!/usr/bin/env node

/**
 * UCI World Championships 2025 Content Discovery
 * Test script to find actual race footage using Firecrawl API
 */

import { youtubeSearch, flobikeSearch, searchAndScrape, createRaceEntry } from './lib/firecrawl-utils.js';
import fs from 'fs';

// Generate intelligent search terms for UCI World Championships 2025
const uciSearchTerms = [
  "UCI World Championships 2025 Rwanda full race recording",
  "UCI Road Worlds 2025 complete coverage",
  "UCI World Championships 2025 extended highlights",
  "Rwanda World Championships 2025 race replay",
  "UCI Worlds 2025 road race full broadcast",
  "UCI World Championships 2025 time trial recording"
];

console.log('🏁 Starting UCI World Championships 2025 Content Discovery\n');

async function discoverUCIContent() {
  const allCandidates = [];

  // Step 1: Search across platforms for UCI content
  console.log('📡 Phase 1: Searching for UCI World Championships content...\n');

  for (const searchTerm of uciSearchTerms) {
    console.log(`🔍 Searching: "${searchTerm}"`);

    // Search YouTube for cycling content
    const youtubeCandidates = await youtubeSearch(searchTerm, { limit: 3 });

    // Search FloBikes for cycling content
    const flobikeCandidates = await flobikeSearch(searchTerm, { limit: 3 });

    allCandidates.push(...youtubeCandidates, ...flobikeCandidates);

    // Small delay between searches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n📊 Total candidates found: ${allCandidates.length}`);

  // Step 2: Filter for race content (remove duplicates and filter by title)
  console.log('\n🔬 Phase 2: Filtering for actual race content...\n');

  const raceContentCandidates = allCandidates.filter(candidate => {
    const title = candidate.title?.toLowerCase() || '';
    const description = candidate.description?.toLowerCase() || '';

    // INCLUDE: Race footage indicators
    const includeKeywords = [
      'full race', 'complete coverage', 'extended highlights', 'race recording',
      'full broadcast', 'race replay', 'live coverage', 'stage recording'
    ];

    // EXCLUDE: Preview/analysis content
    const excludeKeywords = [
      'preview', 'prediction', 'who will win', 'analysis', 'speculation',
      'tactics', 'course breakdown', 'pre-race', 'preview show'
    ];

    const hasIncludeKeyword = includeKeywords.some(keyword =>
      title.includes(keyword) || description.includes(keyword)
    );

    const hasExcludeKeyword = excludeKeywords.some(keyword =>
      title.includes(keyword) || description.includes(keyword)
    );

    return hasIncludeKeyword && !hasExcludeKeyword;
  });

  // Remove duplicates by URL
  const uniqueCandidates = raceContentCandidates.filter((candidate, index, self) =>
    index === self.findIndex(c => c.url === candidate.url)
  );

  console.log(`📋 Race content candidates after filtering: ${uniqueCandidates.length}`);

  if (uniqueCandidates.length === 0) {
    console.log('⚠️ No race content candidates found. Trying broader search...');

    // Fallback: broader search terms
    const broadSearchResults = await youtubeSearch("UCI World Championships 2025 Rwanda cycling", { limit: 10 });
    console.log(`🔍 Broader search found ${broadSearchResults.length} additional candidates`);

    uniqueCandidates.push(...broadSearchResults.slice(0, 5)); // Take top 5
  }

  // Step 3: Display candidates for review
  console.log('\n🎯 Top race content candidates:');
  uniqueCandidates.slice(0, 8).forEach((candidate, i) => {
    console.log(`${i + 1}. ${candidate.title}`);
    console.log(`   URL: ${candidate.url}`);
    console.log(`   Description: ${candidate.description?.substring(0, 100)}...`);
    console.log('');
  });

  return uniqueCandidates.slice(0, 8); // Return top 8 candidates
}

// Run the discovery
try {
  const candidates = await discoverUCIContent();

  console.log(`\n✅ Discovery complete! Found ${candidates.length} potential race content candidates.`);
  console.log('\nNext steps:');
  console.log('1. Scrape these candidates to verify they contain actual race footage');
  console.log('2. Add verified content to race-data.json');
  console.log('3. Regenerate index.html with real race content');

  // Save candidates for review
  fs.writeFileSync('./candidates.json', JSON.stringify(candidates, null, 2));
  console.log('\n💾 Candidates saved to candidates.json for review');

} catch (error) {
  console.error('❌ Discovery failed:', error.message);
  console.error(error);
}