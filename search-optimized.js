#!/usr/bin/env node

/**
 * Optimized UCI World Championships Content Discovery
 * Rate-limited, strategic approach to finding race content
 */

import { youtubeSearch, flobikeSearch, searchAndScrape } from './lib/firecrawl-utils.js';
import fs from 'fs';

// Strategic search terms - fewer but more targeted
const strategicSearchTerms = [
  "UCI World Championships 2025 Rwanda",
  "UCI Road Worlds 2025 Rwanda cycling"
];

console.log('🏁 Optimized UCI World Championships Content Discovery\n');
console.log('⏱️ Using rate-limited approach (60s between searches)\n');

async function optimizedDiscovery() {
  const allCandidates = [];

  for (let i = 0; i < strategicSearchTerms.length; i++) {
    const searchTerm = strategicSearchTerms[i];
    console.log(`🔍 [${i + 1}/${strategicSearchTerms.length}] Searching: "${searchTerm}"`);

    try {
      // Search YouTube only for now to conserve API calls
      const youtubeCandidates = await youtubeSearch(searchTerm, { limit: 5 });
      console.log(`   ✅ Found ${youtubeCandidates.length} YouTube candidates`);

      allCandidates.push(...youtubeCandidates);

      // Rate limiting: wait 65 seconds between searches
      if (i < strategicSearchTerms.length - 1) {
        console.log('   ⏳ Waiting 65s for rate limit...\n');
        await new Promise(resolve => setTimeout(resolve, 65000));
      }

    } catch (error) {
      console.error(`   ❌ Search failed: ${error.message}`);

      if (error.message.includes('Rate limit')) {
        console.log('   ⏳ Rate limited. Waiting 65s before retry...\n');
        await new Promise(resolve => setTimeout(resolve, 65000));
      }
    }
  }

  return allCandidates;
}

// Export for use in other scripts
export { optimizedDiscovery };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log('🚀 Starting optimized discovery...');
    const candidates = await optimizedDiscovery();

    console.log(`\n✅ Discovery complete! Found ${candidates.length} candidates.`);

    if (candidates.length > 0) {
      fs.writeFileSync('./candidates-optimized.json', JSON.stringify(candidates, null, 2));
      console.log('💾 Saved to candidates-optimized.json');
    }

  } catch (error) {
    console.error('❌ Discovery failed:', error.message);
  }
}