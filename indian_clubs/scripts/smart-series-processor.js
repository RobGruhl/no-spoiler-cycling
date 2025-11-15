#!/usr/bin/env node

/**
 * Smart batch processor for 101-105 series videos with timeout handling
 */

import { extractYouTubeTranscript } from '../../lib/youtube-transcript-utils.js';
import fs from 'fs';
import { join } from 'path';

const BATCH_SIZE = process.argv[2] ? parseInt(process.argv[2]) : 2;
const DELAY_BETWEEN_VIDEOS = 5000; // 5 seconds as requested
const OUTPUT_DIR = './indian_clubs';

async function processSeriesVideosBatch() {
  console.log('🚀 Starting Smart Series Batch Processing for HeroicSport 101-105 videos...');
  console.log(`📦 Batch size: ${BATCH_SIZE} videos per batch`);
  console.log(`⏱️ Delay between videos: ${DELAY_BETWEEN_VIDEOS/1000} seconds`);

  // Load the discovered series videos
  const seriesData = JSON.parse(fs.readFileSync('./indian_clubs/data/channel-search-results.json', 'utf8'));
  const allSeriesVideos = seriesData.videos;

  console.log(`📚 Total series videos discovered: ${allSeriesVideos.length}`);
  console.log(`📋 By series: ${Object.entries(seriesData.bySeriesCount).map(([s,c]) => `${s}(${c})`).join(', ')}`);

  // Check what's already been processed
  const seriesProgressFile = join(OUTPUT_DIR, 'data', 'series-processing-progress.json');
  let processedVideoIds = new Set();

  if (fs.existsSync(seriesProgressFile)) {
    const progress = JSON.parse(fs.readFileSync(seriesProgressFile, 'utf8'));
    processedVideoIds = new Set(progress.processedVideoIds || []);
    console.log(`✅ Previously processed: ${processedVideoIds.size} series videos`);
  }

  // Filter to unprocessed videos
  const remainingVideos = allSeriesVideos.filter(video => !processedVideoIds.has(video.videoId));
  console.log(`⏳ Remaining to process: ${remainingVideos.length}`);

  if (remainingVideos.length === 0) {
    console.log('🎉 All series videos have been processed!');
    return;
  }

  // Calculate batch info
  const totalBatches = Math.ceil(remainingVideos.length / BATCH_SIZE);
  const currentBatchNumber = Math.floor(processedVideoIds.size / BATCH_SIZE) + 1;
  const videosInThisBatch = Math.min(BATCH_SIZE, remainingVideos.length);

  console.log(`\n📦 Processing Batch #${currentBatchNumber}: ${videosInThisBatch} videos`);
  console.log(`🎯 Videos ${processedVideoIds.size + 1}-${processedVideoIds.size + videosInThisBatch} of ${allSeriesVideos.length} total`);

  const batchStartTime = new Date().toISOString();
  const processedInThisBatch = [];
  const errorsInThisBatch = [];

  // Process batch
  for (let i = 0; i < videosInThisBatch; i++) {
    const video = remainingVideos[i];
    const globalIndex = processedVideoIds.size + i + 1;

    console.log(`\n[${globalIndex}/${allSeriesVideos.length}] [Batch ${currentBatchNumber}] Processing: ${video.title}`);
    console.log(`🔗 Video ID: ${video.videoId}`);
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
        processingIndex: globalIndex,
        totalVideos: allSeriesVideos.length,
        batchNumber: currentBatchNumber,
        processedAt: new Date().toISOString(),
        foundVia: video.foundVia,
        transcriptSuccess: transcriptResult.success,
        extractionError: transcriptResult.reason || null,
        ...transcriptResult
      };

      // Save individual video data immediately
      const videoFile = join(OUTPUT_DIR, 'data', `series-video-${video.videoId}-${Date.now()}.json`);
      fs.writeFileSync(videoFile, JSON.stringify(videoData, null, 2));

      // Generate markdown report
      const reportContent = `# ${video.title}

**Video URL**: ${video.url}
**Video ID**: ${video.videoId}
**Extracted**: ${transcriptResult.transcriptSuccess ? new Date().toISOString() : 'undefined'}
**Success**: ${transcriptResult.transcriptSuccess}
**Series**: ${video.detectedSeries}

## Video Information

**Description**: ${video.description || 'N/A'}
**Found Via**: ${video.foundVia}

## Transcript

${transcriptResult.transcriptSuccess ?
  transcriptResult.transcriptText :
  `**Error**: ${transcriptResult.extractionError}`}

---

*Extracted using Firecrawl browser automation*
*Series video from HeroicSport ${video.detectedSeries} collection*
`;

      const reportFile = join(OUTPUT_DIR, 'transcripts', `series-${video.videoId}-report.md`);
      fs.writeFileSync(reportFile, reportContent);

      if (transcriptResult.success) {
        console.log(`✅ Processed successfully`);
        console.log(`💾 Saved JSON: ${videoFile}`);
        console.log(`📄 Saved report: ${reportFile}`);
        console.log(`🎯 Transcript: ${transcriptResult.transcriptLines} lines, ${transcriptResult.wordCount} words`);
        console.log(`📊 Series: ${video.detectedSeries}, Status: ${transcriptResult.statusCode || 'N/A'}`);
      } else {
        console.log(`❌ Failed: ${transcriptResult.reason || 'Unknown error'}`);
      }

      processedInThisBatch.push(videoData);
      processedVideoIds.add(video.videoId);

    } catch (error) {
      console.log(`❌ Error processing ${video.videoId}: ${error.message}`);
      errorsInThisBatch.push({
        videoId: video.videoId,
        url: video.url,
        series: video.detectedSeries,
        error: error.message,
        processedAt: new Date().toISOString()
      });
    }

    // Delay between videos (except for the last one in batch)
    if (i < videosInThisBatch - 1) {
      console.log(`⏱️ Waiting ${DELAY_BETWEEN_VIDEOS/1000} seconds before next video...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_VIDEOS));
    }
  }

  // Update progress file
  const updatedProgress = {
    lastUpdated: new Date().toISOString(),
    processedVideoIds: Array.from(processedVideoIds),
    totalSeriesVideos: allSeriesVideos.length,
    processedCount: processedVideoIds.size,
    remainingCount: allSeriesVideos.length - processedVideoIds.size,
    lastBatchNumber: currentBatchNumber
  };
  fs.writeFileSync(seriesProgressFile, JSON.stringify(updatedProgress, null, 2));

  // Save batch summary
  const batchSummary = {
    batchNumber: currentBatchNumber,
    processedAt: new Date().toISOString(),
    videosInBatch: videosInThisBatch,
    successful: processedInThisBatch.filter(v => v.transcriptSuccess).length,
    failed: processedInThisBatch.filter(v => !v.transcriptSuccess).length + errorsInThisBatch.length,
    totalWordsExtracted: processedInThisBatch.reduce((sum, v) => sum + (v.wordCount || 0), 0),
    totalLinesExtracted: processedInThisBatch.reduce((sum, v) => sum + (v.transcriptLines || 0), 0),
    batchInfo: {
      batchNumber: currentBatchNumber,
      batchSize: BATCH_SIZE,
      batchStarted: batchStartTime
    },
    processedVideos: processedInThisBatch,
    errors: errorsInThisBatch
  };

  const batchSummaryFile = join(OUTPUT_DIR, 'data', `series-batch-${currentBatchNumber}-summary-${Date.now()}.json`);
  fs.writeFileSync(batchSummaryFile, JSON.stringify(batchSummary, null, 2));

  console.log(`\n📊 Batch Processing Complete!`);
  console.log(`✅ Successfully processed: ${batchSummary.successful}/${videosInThisBatch} videos in this batch`);
  console.log(`❌ Errors: ${batchSummary.failed}`);
  console.log(`💾 Batch summary saved: ${batchSummaryFile}`);
  console.log(`📝 Total words extracted in this batch: ${batchSummary.totalWordsExtracted.toLocaleString()}`);
  console.log(`📄 Total transcript lines in this batch: ${batchSummary.totalLinesExtracted}`);

  // Show overall progress
  const remaining = allSeriesVideos.length - processedVideoIds.size;
  if (remaining > 0) {
    console.log(`\n⏭️ Next batch: ${Math.min(BATCH_SIZE, remaining)} videos remaining`);
    console.log(`🔄 Run again to continue processing remaining series videos`);
  } else {
    console.log(`\n🎉 All ${allSeriesVideos.length} series videos have been processed!`);
  }

  console.log(`\n📁 Files saved to:`);
  console.log(`   📊 JSON data: ${OUTPUT_DIR}/data/`);
  console.log(`   📝 Transcripts: ${OUTPUT_DIR}/transcripts/`);
  console.log(`   📄 Reports: ${OUTPUT_DIR}/transcripts/`);
  console.log(`   📈 Progress: ${seriesProgressFile}`);

  return batchSummary;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processSeriesVideosBatch().catch(console.error);
}