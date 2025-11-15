#!/usr/bin/env node

/**
 * Search HeroicSport channel directly for 101-105 series videos
 */

import { scrapeContent } from '../../lib/firecrawl-utils-phase1.js';
import fs from 'fs';

async function searchHeroicSportChannel() {
  console.log('🎯 Searching HeroicSport channel directly for 101-105 series...');

  const channelSearchUrls = [
    'https://www.youtube.com/@HeroicSport/search?query=101',
    'https://www.youtube.com/@HeroicSport/search?query=102',
    'https://www.youtube.com/@HeroicSport/search?query=103',
    'https://www.youtube.com/@HeroicSport/search?query=104',
    'https://www.youtube.com/@HeroicSport/search?query=105'
  ];

  const allVideos = new Map();

  for (const [index, searchUrl] of channelSearchUrls.entries()) {
    const seriesNumber = searchUrl.split('query=')[1];
    console.log(`\n[${index + 1}/${channelSearchUrls.length}] Searching for series ${seriesNumber}...`);
    console.log(`🔗 URL: ${searchUrl}`);

    try {
      const result = await scrapeContent(searchUrl, {
        formats: ['markdown'],
        onlyMainContent: false
      });

      if (result && result.markdown) {
        console.log(`✅ Scraped ${result.markdown.length} characters`);

        // Extract video URLs and titles from the channel search results
        const content = result.markdown;

        // Look for YouTube video patterns
        const videoMatches = content.match(/https:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g);

        if (videoMatches) {
          console.log(`🎯 Found ${videoMatches.length} video URLs`);

          // Extract titles and descriptions from the content
          const lines = content.split('\n');

          videoMatches.forEach(videoUrl => {
            const videoId = videoUrl.match(/v=([a-zA-Z0-9_-]+)/)?.[1];
            if (videoId && !allVideos.has(videoUrl)) {

              // Find the title for this video in the content
              let title = `Series ${seriesNumber} Video`;
              let description = '';

              // Look for title patterns near the video URL
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes(videoId)) {
                  // Check surrounding lines for title
                  for (let j = Math.max(0, i-5); j <= Math.min(lines.length-1, i+5); j++) {
                    const line = lines[j].trim();
                    if (line.length > 10 && line.length < 200 &&
                        !line.includes('http') &&
                        !line.includes('youtube.com') &&
                        (line.includes(seriesNumber) || line.includes('tutorial') || line.includes('indian'))) {
                      title = line;
                      break;
                    }
                  }
                  break;
                }
              }

              allVideos.set(videoUrl, {
                url: videoUrl,
                videoId: videoId,
                title: title,
                description: description,
                detectedSeries: seriesNumber,
                foundVia: `Channel search for ${seriesNumber}`
              });

              console.log(`   📹 ${title} (${videoId})`);
            }
          });
        } else {
          console.log('   ⚠️ No video URLs found in scraped content');

          // Debug: show a sample of the content
          console.log('   📝 Content sample (first 500 chars):');
          console.log(content.substring(0, 500));
        }

      } else {
        console.log(`❌ No content scraped from ${searchUrl}`);
      }

    } catch (error) {
      console.log(`❌ Error scraping ${searchUrl}: ${error.message}`);
    }

    // Delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  const seriesVideos = Array.from(allVideos.values());
  console.log(`\n📚 Total series videos found: ${seriesVideos.length}`);

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

  // Save the results
  const inventory = {
    discoveredAt: new Date().toISOString(),
    method: 'Direct channel search',
    searchUrls: channelSearchUrls,
    totalVideos: seriesVideos.length,
    bySeriesCount: Object.fromEntries(Object.entries(bySeries).map(([k,v]) => [k, v.length])),
    videos: seriesVideos
  };

  fs.writeFileSync('./indian_clubs/data/channel-search-results.json', JSON.stringify(inventory, null, 2));
  console.log('\n💾 Saved results to: ./indian_clubs/data/channel-search-results.json');

  return seriesVideos;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  searchHeroicSportChannel().catch(console.error);
}