#!/usr/bin/env node

/**
 * Real UCI World Championships 2025 Content Discovery
 * Strategic approach to find actual race footage
 */

import { youtubeSearch, flobikeSearch, scrapeContent, createRaceEntry } from './lib/firecrawl-utils.js';
import fs from 'fs';

// Realistic search strategy - target known cycling content sources
const realSearchStrategy = [
  {
    platform: "YouTube",
    searches: [
      "UCI World Championships 2025 Rwanda cycling",
      "UCI Road Worlds 2025 highlights",
      "World Championships cycling 2025"
    ]
  },
  {
    platform: "FloBikes",
    searches: [
      "UCI World Championships 2025",
      "World Championships cycling Rwanda"
    ]
  }
];

console.log('🔍 Real UCI World Championships Content Discovery');
console.log('🎯 Target: Find actual race footage, highlights, and coverage\n');

async function discoverRealUCIContent() {
  const verifiedRaceContent = [];

  for (const strategy of realSearchStrategy) {
    console.log(`\n📺 Searching ${strategy.platform}...`);

    for (const searchTerm of strategy.searches) {
      console.log(`🔍 "${searchTerm}"`);

      try {
        let candidates;
        if (strategy.platform === "YouTube") {
          candidates = await youtubeSearch(searchTerm, { limit: 5 });
        } else if (strategy.platform === "FloBikes") {
          candidates = await flobikeSearch(searchTerm, { limit: 5 });
        }

        console.log(`   ✅ Found ${candidates.length} candidates`);

        // Analyze candidates for race content
        for (const candidate of candidates) {
          const title = candidate.title?.toLowerCase() || '';
          const description = candidate.description?.toLowerCase() || '';

          // Look for actual race content indicators
          const raceIndicators = [
            'highlights', 'full race', 'complete', 'coverage', 'recording',
            'time trial', 'road race', 'replay', 'broadcast'
          ];

          // Exclude preview/analysis content
          const excludeTerms = [
            'preview', 'prediction', 'who will win', 'analysis', 'speculation',
            'pre-race', 'tactics', 'breakdown'
          ];

          const hasRaceContent = raceIndicators.some(indicator =>
            title.includes(indicator) || description.includes(indicator)
          );

          const isPreview = excludeTerms.some(term =>
            title.includes(term) || description.includes(term)
          );

          if (hasRaceContent && !isPreview) {
            console.log(`   🎯 RACE CONTENT: ${candidate.title}`);

            // Create race entry
            const raceEntry = createRaceEntry({
              url: candidate.url,
              searchMetadata: candidate
            }, {
              name: candidate.title,
              description: candidate.description || `Race content from ${strategy.platform}`,
              type: determineContentType(candidate.title),
              platform: strategy.platform
            });

            verifiedRaceContent.push(raceEntry);
          }
        }

        // Rate limiting - wait between searches
        await new Promise(resolve => setTimeout(resolve, 12000)); // 12 second delay

      } catch (error) {
        console.error(`   ❌ ${strategy.platform} search failed: ${error.message}`);

        if (error.message.includes('Rate limit')) {
          console.log('   ⏳ Rate limited. Waiting 60s...');
          await new Promise(resolve => setTimeout(resolve, 60000));
        }
      }
    }
  }

  return verifiedRaceContent;
}

function determineContentType(title) {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('full race') || titleLower.includes('complete') || titleLower.includes('full coverage')) {
    return 'full-race';
  }
  if (titleLower.includes('extended highlights') || titleLower.includes('long highlights')) {
    return 'extended-highlights';
  }
  if (titleLower.includes('highlights')) {
    return 'highlights';
  }
  if (titleLower.includes('time trial')) {
    return 'time-trial';
  }

  return 'recording';
}

// Run discovery
try {
  console.log('🚀 Starting real content discovery...\n');

  const raceContent = await discoverRealUCIContent();

  console.log(`\n🏆 Discovery Results:`);
  console.log(`✅ Found ${raceContent.length} verified race content items\n`);

  if (raceContent.length > 0) {
    // Load existing race data
    const raceDataPath = './data/race-data.json';
    const existingData = JSON.parse(fs.readFileSync(raceDataPath, 'utf8'));

    // Update with new content
    existingData.races = raceContent;
    existingData.lastUpdated = new Date().toISOString();

    // Save updated data
    fs.writeFileSync(raceDataPath, JSON.stringify(existingData, null, 2));

    console.log('📊 Race content found:');
    raceContent.forEach((race, i) => {
      console.log(`${i + 1}. ${race.name}`);
      console.log(`   Platform: ${race.platform} | Type: ${race.type}`);
      console.log(`   URL: ${race.url}`);
      console.log('');
    });

    console.log(`💾 Updated race-data.json with ${raceContent.length} races`);
    console.log('🎨 Ready to regenerate index.html');

  } else {
    console.log('⚠️ No race content found. Consider:');
    console.log('1. Upgrading Firecrawl plan for higher rate limits');
    console.log('2. Trying different search terms');
    console.log('3. Checking if UCI Worlds 2025 content is actually available yet');
  }

} catch (error) {
  console.error('❌ Discovery failed:', error.message);
}