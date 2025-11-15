#!/usr/bin/env node

/**
 * Comprehensive search for HeroicSport 101-105 series videos
 */

import { youtubeSearch } from '../../lib/firecrawl-utils-phase1.js';
import fs from 'fs';

async function findAllSeriesVideos() {
  console.log('🎯 Comprehensive search for HeroicSport 101-105 series videos...');

  const searchStrategies = [
    // Direct series searches
    'site:youtube.com "HeroicSport" "101"',
    'site:youtube.com "HeroicSport" "102"',
    'site:youtube.com "HeroicSport" "103"',
    'site:youtube.com "HeroicSport" "104"',
    'site:youtube.com "HeroicSport" "105"',

    // Series with context
    'site:youtube.com "HeroicSport" "indian club 101"',
    'site:youtube.com "HeroicSport" "indian club 102"',
    'site:youtube.com "HeroicSport" "indian club 103"',
    'site:youtube.com "HeroicSport" "indian club 104"',
    'site:youtube.com "HeroicSport" "indian club 105"',

    // Alternative formats
    'site:youtube.com "HeroicSport" "101" tutorial',
    'site:youtube.com "HeroicSport" "102" tutorial',
    'site:youtube.com "HeroicSport" "103" tutorial',
    'site:youtube.com "HeroicSport" "104" tutorial',
    'site:youtube.com "HeroicSport" "105" tutorial',

    // Matt Pasquinilli with series
    'site:youtube.com "Matt Pasquinilli" "101"',
    'site:youtube.com "Matt Pasquinilli" "102"',
    'site:youtube.com "Matt Pasquinilli" "103"',
    'site:youtube.com "Matt Pasquinilli" "104"',
    'site:youtube.com "Matt Pasquinilli" "105"',

    // Broader searches
    'site:youtube.com HeroicSport indian club series',
    'site:youtube.com HeroicSport tutorial series',
  ];

  const allVideos = new Map();

  for (const [index, query] of searchStrategies.entries()) {
    console.log(`\n[${index + 1}/${searchStrategies.length}] Searching: ${query}`);

    try {
      const results = await youtubeSearch(query, { limit: 20 });

      results.forEach(result => {
        if (result.url && result.url.includes('youtube.com/watch') && result.url.includes('v=')) {
          const videoId = result.url.match(/v=([^&]+)/)?.[1];
          if (videoId && !allVideos.has(result.url)) {
            const title = result.title.toLowerCase();
            const hasSeries = title.includes('101') || title.includes('102') ||
                             title.includes('103') || title.includes('104') || title.includes('105');

            if (hasSeries) {
              allVideos.set(result.url, {
                url: result.url,
                videoId: videoId,
                title: result.title,
                description: result.description,
                foundVia: query,
                detectedSeries: title.includes('101') ? '101' :
                              title.includes('102') ? '102' :
                              title.includes('103') ? '103' :
                              title.includes('104') ? '104' :
                              title.includes('105') ? '105' : 'unknown'
              });
              console.log(`   🎯 Found: ${result.title}`);
            }
          }
        }
      });

      console.log(`   Results: ${results.length}, Series total: ${allVideos.size}`);

    } catch (error) {
      console.log(`   ❌ Search failed: ${error.message}`);
    }

    // Small delay between searches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const seriesVideos = Array.from(allVideos.values());
  console.log(`\n📚 Complete: ${seriesVideos.length} videos with 101-105 series`);

  // Group by series
  const bySeries = {};
  seriesVideos.forEach(video => {
    const series = video.detectedSeries;
    if (!bySeries[series]) bySeries[series] = [];
    bySeries[series].push(video);
  });

  console.log('\n📋 Found by series:');
  Object.keys(bySeries).sort().forEach(series => {
    console.log(`  ${series}: ${bySeries[series].length} videos`);
    bySeries[series].forEach((video, i) => {
      console.log(`    ${i + 1}. ${video.title} (${video.videoId})`);
    });
  });

  // Save the series inventory
  const seriesInventory = {
    discoveredAt: new Date().toISOString(),
    searchStrategies: searchStrategies,
    filterCriteria: 'Videos with 101, 102, 103, 104, or 105 in title',
    totalVideos: seriesVideos.length,
    bySeriesCount: Object.fromEntries(Object.entries(bySeries).map(([k,v]) => [k, v.length])),
    videos: seriesVideos
  };

  fs.writeFileSync('./indian_clubs/data/series-101-105-comprehensive.json', JSON.stringify(seriesInventory, null, 2));
  console.log('\n💾 Saved comprehensive series inventory to: ./indian_clubs/data/series-101-105-comprehensive.json');

  return seriesVideos;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  findAllSeriesVideos().catch(console.error);
}