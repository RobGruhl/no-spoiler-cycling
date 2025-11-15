#!/usr/bin/env node

/**
 * Process discovered 101-105 series videos for transcript extraction
 */

import { extractYouTubeTranscript } from '../../lib/youtube-transcript-utils.js';
import fs from 'fs';
import { join } from 'path';

const DELAY_BETWEEN_VIDEOS = 5000; // 5 seconds as requested
const OUTPUT_DIR = './indian_clubs';

async function processSeriesVideos() {
  console.log('🎯 Processing discovered 101-105 series videos...');

  // Load the discovered videos
  const seriesData = JSON.parse(fs.readFileSync('./indian_clubs/data/channel-search-results.json', 'utf8'));
  const videos = seriesData.videos;

  console.log(`📚 Total series videos to process: ${videos.length}`);
  console.log(`📋 By series: ${Object.entries(seriesData.bySeriesCount).map(([s,c]) => `${s}(${c})`).join(', ')}`);

  // Resume from where we left off if we have progress
  let startIndex = 0;
  const progressFile = join(OUTPUT_DIR, 'data', 'series-processing-progress.json');

  if (fs.existsSync(progressFile)) {
    const progress = JSON.parse(fs.readFileSync(progressFile, 'utf8'));
    startIndex = progress.lastProcessedIndex + 1;
    console.log(`📄 Resuming from video ${startIndex + 1}/${videos.length}`);
  }

  const processedVideos = [];
  const errors = [];

  for (let i = startIndex; i < videos.length; i++) {
    const video = videos[i];
    const processingIndex = i + 1;

    console.log(`\n[${processingIndex}/${videos.length}] Processing: ${video.title} (${video.videoId})`);
    console.log(`🔗 URL: ${video.url}`);
    console.log(`📊 Series: ${video.detectedSeries}`);

    try {
      const transcriptResult = await extractYouTubeTranscript(video.url, {
        saveRaw: false,
        outputDir: join(OUTPUT_DIR, 'data')
      });

      const videoData = {
        url: video.url,
        originalTitle: video.title,
        originalDescription: video.description || '',
        videoId: video.videoId,
        series: video.detectedSeries,
        processingIndex: processingIndex,
        totalVideos: videos.length,
        processedAt: new Date().toISOString(),
        foundVia: video.foundVia,
        ...transcriptResult
      };

      // Save individual video data
      const videoFile = join(OUTPUT_DIR, 'data', `video-${video.videoId}-${Date.now()}.json`);
      fs.writeFileSync(videoFile, JSON.stringify(videoData, null, 2));
      console.log(`💾 Saved: ${videoFile}`);

      // Generate markdown report for the video
      const reportContent = `# ${video.title}

**Video URL**: ${video.url}
**Video ID**: ${video.videoId}
**Extracted**: ${transcriptResult.transcriptSuccess ? new Date().toISOString() : 'undefined'}
**Success**: ${transcriptResult.transcriptSuccess}


## Video Information

**Description**: ${video.description || 'N/A'}

**Series**: ${video.detectedSeries}

## Transcript

${transcriptResult.transcriptSuccess ?
  transcriptResult.transcriptText :
  `**Error**: ${transcriptResult.extractionError}`}

---

*Extracted using Firecrawl browser automation*
`;

      const reportFile = join(OUTPUT_DIR, 'transcripts', `${video.videoId}-report.md`);
      fs.writeFileSync(reportFile, reportContent);
      console.log(`📄 Report: ${reportFile}`);

      if (transcriptResult.transcriptSuccess) {
        console.log(`✅ Success: ${transcriptResult.wordCount} words, ${transcriptResult.transcriptLines} lines`);
      } else {
        console.log(`❌ Failed: ${transcriptResult.extractionError}`);
      }

      processedVideos.push(videoData);

      // Update progress
      const progress = {
        lastProcessedIndex: i,
        processedAt: new Date().toISOString(),
        totalVideos: videos.length,
        videosProcessed: processedVideos.length
      };
      fs.writeFileSync(progressFile, JSON.stringify(progress, null, 2));

    } catch (error) {
      console.log(`❌ Error processing ${video.videoId}: ${error.message}`);
      errors.push({
        videoId: video.videoId,
        url: video.url,
        error: error.message,
        processedAt: new Date().toISOString()
      });
    }

    // Delay between videos
    if (i < videos.length - 1) {
      console.log(`⏳ Waiting ${DELAY_BETWEEN_VIDEOS/1000}s before next video...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_VIDEOS));
    }
  }

  const summary = {
    processedAt: new Date().toISOString(),
    totalVideos: videos.length,
    successful: processedVideos.filter(v => v.transcriptSuccess).length,
    failed: processedVideos.filter(v => !v.transcriptSuccess).length + errors.length,
    totalWordsExtracted: processedVideos.reduce((sum, v) => sum + (v.wordCount || 0), 0),
    totalLinesExtracted: processedVideos.reduce((sum, v) => sum + (v.transcriptLines || 0), 0),
    bySeries: {}
  };

  // Group by series
  ['101', '102', '103', '104', '105'].forEach(series => {
    const seriesVideos = processedVideos.filter(v => v.series === series);
    summary.bySeries[series] = {
      total: seriesVideos.length,
      successful: seriesVideos.filter(v => v.transcriptSuccess).length,
      failed: seriesVideos.filter(v => !v.transcriptSuccess).length,
      totalWords: seriesVideos.reduce((sum, v) => sum + (v.wordCount || 0), 0)
    };
  });

  console.log(`\n📊 Processing Complete!`);
  console.log(`✅ Successful: ${summary.successful}`);
  console.log(`❌ Failed: ${summary.failed}`);
  console.log(`📝 Total words: ${summary.totalWordsExtracted}`);
  console.log(`📋 Total lines: ${summary.totalLinesExtracted}`);

  console.log('\n📋 By Series:');
  Object.entries(summary.bySeries).forEach(([series, stats]) => {
    console.log(`  ${series}: ${stats.successful}/${stats.total} success, ${stats.totalWords} words`);
  });

  // Save final summary
  const summaryFile = join(OUTPUT_DIR, 'data', `series-processing-summary-${Date.now()}.json`);
  fs.writeFileSync(summaryFile, JSON.stringify({
    ...summary,
    processedVideos,
    errors
  }, null, 2));
  console.log(`\n💾 Final summary: ${summaryFile}`);

  return summary;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processSeriesVideos().catch(console.error);
}