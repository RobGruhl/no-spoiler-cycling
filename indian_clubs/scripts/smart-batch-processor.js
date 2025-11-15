#!/usr/bin/env node

/**
 * Smart Batch Processor for HeroicSport Video Transcripts
 * Handles timeout limitations with resumable processing and intelligent batching
 */

import 'dotenv/config';
import { extractYouTubeTranscript, createTranscriptReport, extractVideoId } from '../../lib/youtube-transcript-utils.js';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = './indian_clubs';
const DELAY_BETWEEN_VIDEOS = 5000; // 5 seconds
const BATCH_SIZE = process.argv[2] ? parseInt(process.argv[2]) : 3; // Process N videos per batch (configurable)

// Ensure output directories exist
const dirs = ['transcripts', 'data'];
dirs.forEach(dir => {
  const fullPath = join(OUTPUT_DIR, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }
});

/**
 * Load video inventory from discovery
 */
function loadVideoInventory() {
  const inventoryPath = join(OUTPUT_DIR, 'data', 'heroicsport-video-inventory.json');

  if (!existsSync(inventoryPath)) {
    throw new Error('Video inventory not found. Run discovery first.');
  }

  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  return inventory.videos;
}

/**
 * Load processing progress to enable resuming
 */
function loadProgress() {
  const progressPath = join(OUTPUT_DIR, 'data', 'processing-progress.json');

  if (existsSync(progressPath)) {
    return JSON.parse(readFileSync(progressPath, 'utf8'));
  }

  return {
    processedVideoIds: [],
    lastProcessedIndex: -1,
    startedAt: new Date().toISOString(),
    batches: []
  };
}

/**
 * Save processing progress
 */
function saveProgress(progress) {
  const progressPath = join(OUTPUT_DIR, 'data', 'processing-progress.json');
  writeFileSync(progressPath, JSON.stringify(progress, null, 2));
}

/**
 * Check if video has already been processed
 */
function isVideoProcessed(videoId, progress) {
  return progress.processedVideoIds.includes(videoId);
}

/**
 * Detect educational series from title
 */
function detectSeries(title) {
  const titleLower = title.toLowerCase();

  if (titleLower.includes('101')) return '101';
  if (titleLower.includes('102')) return '102';
  if (titleLower.includes('103')) return '103';
  if (titleLower.includes('104')) return '104';
  if (titleLower.includes('105')) return '105';

  if (titleLower.includes('beginner')) return 'beginner';
  if (titleLower.includes('tutorial')) return 'tutorial';
  if (titleLower.includes('flow')) return 'flow';
  if (titleLower.includes('exercise')) return 'exercises';
  if (titleLower.includes('training')) return 'training';
  if (titleLower.includes('advanced')) return 'advanced';

  return 'general';
}

/**
 * Process a single video with transcript extraction
 */
async function processSingleVideo(video, index, total, batchInfo) {
  const videoId = extractVideoId(video.url);
  console.log(`\n[${index + 1}/${total}] [Batch ${batchInfo.batchNumber}] Processing: ${video.title}`);
  console.log(`🔗 Video ID: ${videoId}`);

  try {
    // Extract transcript using Firecrawl browser actions
    const transcriptResult = await extractYouTubeTranscript(video.url, {
      saveRaw: false,
      outputDir: join(OUTPUT_DIR, 'data')
    });

    // Create comprehensive video data object
    const videoData = {
      url: video.url,
      originalTitle: video.title,
      originalDescription: video.description,
      videoId: videoId,
      series: detectSeries(video.title),
      processingIndex: index + 1,
      totalVideos: total,
      batchNumber: batchInfo.batchNumber,
      processedAt: new Date().toISOString(),
      foundVia: video.foundVia,

      // Transcript extraction results
      transcriptSuccess: transcriptResult.success,
      transcriptText: transcriptResult.transcriptText || '',
      transcriptLines: transcriptResult.transcriptLines || 0,
      wordCount: transcriptResult.wordCount || 0,
      extractionError: transcriptResult.reason || null,

      // Metadata from Firecrawl
      scrapedTitle: transcriptResult.metadata?.title,
      scrapedDescription: transcriptResult.metadata?.description,
      statusCode: transcriptResult.metadata?.statusCode,
      metadata: transcriptResult.metadata
    };

    // Save JSON data immediately
    const jsonPath = join(OUTPUT_DIR, 'data', `video-${videoId}-${Date.now()}.json`);
    writeFileSync(jsonPath, JSON.stringify(videoData, null, 2));

    // Save transcript as text file if successful
    if (transcriptResult.success && transcriptResult.transcriptText) {
      const transcriptPath = join(OUTPUT_DIR, 'transcripts', `${videoId}-transcript.txt`);
      writeFileSync(transcriptPath, transcriptResult.transcriptText);
      console.log(`📝 Saved transcript: ${transcriptPath}`);
    }

    // Create and save comprehensive markdown report
    const reportContent = createTranscriptReport(transcriptResult, {
      title: video.title,
      description: video.description,
      series: videoData.series,
      duration: transcriptResult.metadata?.duration,
      foundVia: video.foundVia
    });

    const reportPath = join(OUTPUT_DIR, 'transcripts', `${videoId}-report.md`);
    writeFileSync(reportPath, reportContent);

    console.log(`✅ Processed successfully`);
    console.log(`💾 Saved JSON: ${jsonPath}`);
    console.log(`📄 Saved report: ${reportPath}`);

    if (transcriptResult.success) {
      console.log(`🎯 Transcript: ${transcriptResult.transcriptLines} lines, ${transcriptResult.wordCount} words`);
    } else {
      console.log(`❌ Transcript extraction failed: ${transcriptResult.reason}`);
    }

    console.log(`📊 Series: ${videoData.series}, Status: ${videoData.statusCode}`);

    return videoData;

  } catch (error) {
    console.error(`❌ Processing failed: ${error.message}`);

    // Save error immediately
    const errorData = {
      url: video.url,
      title: video.title,
      videoId: videoId,
      error: error.message,
      failedAt: new Date().toISOString(),
      processingIndex: index + 1,
      totalVideos: total,
      batchNumber: batchInfo.batchNumber
    };

    const errorPath = join(OUTPUT_DIR, 'data', `error-${videoId}-${Date.now()}.json`);
    writeFileSync(errorPath, JSON.stringify(errorData, null, 2));

    console.log(`💾 Saved error: ${errorPath}`);
    return null;
  }
}

/**
 * Main smart batch processing function
 */
async function main() {
  try {
    console.log('🚀 Starting Smart Batch Processing for HeroicSport videos...');
    console.log(`📦 Batch size: ${BATCH_SIZE} videos per batch`);
    console.log(`⏱️ Delay between videos: ${DELAY_BETWEEN_VIDEOS / 1000} seconds`);

    // Load video inventory and progress
    const allVideos = loadVideoInventory();
    const progress = loadProgress();

    console.log(`📚 Total videos discovered: ${allVideos.length}`);
    console.log(`✅ Previously processed: ${progress.processedVideoIds.length}`);

    // Filter out already processed videos
    const remainingVideos = allVideos.filter(video => {
      const videoId = extractVideoId(video.url);
      return !isVideoProcessed(videoId, progress);
    });

    console.log(`⏳ Remaining to process: ${remainingVideos.length}`);

    if (remainingVideos.length === 0) {
      console.log('🎉 All videos have been processed!');
      return;
    }

    // Process videos in batches
    const startIndex = progress.lastProcessedIndex + 1;
    const batchStart = Math.floor(startIndex / BATCH_SIZE) * BATCH_SIZE;
    const currentBatch = remainingVideos.slice(0, BATCH_SIZE);
    const batchNumber = Math.floor(startIndex / BATCH_SIZE) + 1;

    console.log(`\n📦 Processing Batch #${batchNumber}: ${currentBatch.length} videos`);
    console.log(`🎯 Videos ${batchStart + 1}-${Math.min(batchStart + BATCH_SIZE, allVideos.length)} of ${allVideos.length} total`);

    const batchInfo = {
      batchNumber: batchNumber,
      batchSize: BATCH_SIZE,
      batchStarted: new Date().toISOString()
    };

    const processedVideos = [];
    const errors = [];

    // Process each video in the current batch
    for (let i = 0; i < currentBatch.length; i++) {
      const video = currentBatch[i];
      const globalIndex = startIndex + i;

      const result = await processSingleVideo(video, globalIndex, allVideos.length, batchInfo);

      if (result) {
        processedVideos.push(result);

        // Update progress immediately
        const videoId = extractVideoId(video.url);
        progress.processedVideoIds.push(videoId);
        progress.lastProcessedIndex = globalIndex;
        saveProgress(progress);

      } else {
        errors.push(video);
      }

      // Delay before next video (except for last one)
      if (i < currentBatch.length - 1) {
        console.log(`⏱️ Waiting ${DELAY_BETWEEN_VIDEOS / 1000} seconds before next video...`);
        await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_VIDEOS));
      }
    }

    // Save batch summary
    const batchSummary = {
      batchNumber: batchNumber,
      processedAt: new Date().toISOString(),
      videosInBatch: currentBatch.length,
      successful: processedVideos.length,
      failed: errors.length,
      totalWordsExtracted: processedVideos.reduce((sum, v) => sum + (v.wordCount || 0), 0),
      totalLinesExtracted: processedVideos.reduce((sum, v) => sum + (v.transcriptLines || 0), 0),
      batchInfo: batchInfo,
      processedVideos: processedVideos,
      errors: errors
    };

    const batchSummaryPath = join(OUTPUT_DIR, 'data', `batch-${batchNumber}-summary-${Date.now()}.json`);
    writeFileSync(batchSummaryPath, JSON.stringify(batchSummary, null, 2));

    // Update progress with batch info
    progress.batches.push(batchSummary);
    saveProgress(progress);

    // Final batch report
    console.log('\n📊 Batch Processing Complete!');
    console.log(`✅ Successfully processed: ${processedVideos.length}/${currentBatch.length} videos in this batch`);
    console.log(`❌ Errors: ${errors.length}`);
    console.log(`💾 Batch summary saved: ${batchSummaryPath}`);

    if (batchSummary.totalWordsExtracted > 0) {
      console.log(`📝 Total words extracted in this batch: ${batchSummary.totalWordsExtracted.toLocaleString()}`);
      console.log(`📄 Total transcript lines in this batch: ${batchSummary.totalLinesExtracted.toLocaleString()}`);
    }

    const totalRemaining = remainingVideos.length - currentBatch.length;
    if (totalRemaining > 0) {
      console.log(`\n⏭️ Next batch: ${Math.min(totalRemaining, BATCH_SIZE)} videos remaining`);
      console.log(`🔄 Run again to continue processing remaining videos`);
    } else {
      console.log(`\n🎉 All ${allVideos.length} HeroicSport videos have been processed!`);

      // Generate final summary
      const totalStats = {
        totalVideos: allVideos.length,
        processedSuccessfully: progress.processedVideoIds.length,
        totalBatches: progress.batches.length,
        totalWordsExtracted: progress.batches.reduce((sum, b) => sum + (b.totalWordsExtracted || 0), 0),
        totalLinesExtracted: progress.batches.reduce((sum, b) => sum + (b.totalLinesExtracted || 0), 0),
        completedAt: new Date().toISOString()
      };

      console.log(`\n📈 Final Summary:`);
      console.log(`   📚 Total videos: ${totalStats.totalVideos}`);
      console.log(`   ✅ Successfully processed: ${totalStats.processedSuccessfully}`);
      console.log(`   📦 Total batches: ${totalStats.totalBatches}`);
      console.log(`   📝 Total words extracted: ${totalStats.totalWordsExtracted.toLocaleString()}`);
      console.log(`   📄 Total transcript lines: ${totalStats.totalLinesExtracted.toLocaleString()}`);
    }

    console.log(`\n📁 Files saved to:`);
    console.log(`   📊 JSON data: indian_clubs/data/`);
    console.log(`   📝 Transcripts: indian_clubs/transcripts/`);
    console.log(`   📄 Reports: indian_clubs/transcripts/`);
    console.log(`   📈 Progress: indian_clubs/data/processing-progress.json`);

  } catch (error) {
    console.error('❌ Batch processing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}