#!/usr/bin/env node

/**
 * Single Video Processor - Maximum Reliability
 * Processes one video at a time with full error handling and resume capability
 */

import 'dotenv/config';
import { extractYouTubeTranscript, createTranscriptReport, extractVideoId } from '../../lib/youtube-transcript-utils.js';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const OUTPUT_DIR = './indian_clubs';

// Ensure output directories exist
const dirs = ['transcripts', 'data'];
dirs.forEach(dir => {
  const fullPath = join(OUTPUT_DIR, dir);
  if (!existsSync(fullPath)) {
    mkdirSync(fullPath, { recursive: true });
  }
});

/**
 * Get next unprocessed video
 */
function getNextVideo() {
  // Load video inventory
  const inventoryPath = join(OUTPUT_DIR, 'data', 'heroicsport-video-inventory.json');
  if (!existsSync(inventoryPath)) {
    throw new Error('Video inventory not found. Run discovery first.');
  }

  const inventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const allVideos = inventory.videos;

  // Load progress
  const progressPath = join(OUTPUT_DIR, 'data', 'processing-progress.json');
  const processedVideoIds = existsSync(progressPath)
    ? JSON.parse(readFileSync(progressPath, 'utf8')).processedVideoIds || []
    : [];

  // Find first unprocessed video
  const remainingVideos = allVideos.filter(video => {
    const videoId = extractVideoId(video.url);
    return !processedVideoIds.includes(videoId);
  });

  if (remainingVideos.length === 0) {
    return null; // All done
  }

  const nextVideo = remainingVideos[0];
  const totalProcessed = processedVideoIds.length;
  const totalVideos = allVideos.length;

  return {
    video: nextVideo,
    progress: {
      current: totalProcessed + 1,
      total: totalVideos,
      remaining: remainingVideos.length
    }
  };
}

/**
 * Mark video as processed
 */
function markVideoProcessed(videoId) {
  const progressPath = join(OUTPUT_DIR, 'data', 'processing-progress.json');

  let progress = existsSync(progressPath)
    ? JSON.parse(readFileSync(progressPath, 'utf8'))
    : { processedVideoIds: [], startedAt: new Date().toISOString(), batches: [] };

  if (!progress.processedVideoIds.includes(videoId)) {
    progress.processedVideoIds.push(videoId);
    progress.lastUpdated = new Date().toISOString();
    writeFileSync(progressPath, JSON.stringify(progress, null, 2));
  }
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
 * Main single video processing function
 */
async function main() {
  try {
    console.log('🎯 Single Video Processor - Processing next unprocessed video...');

    const nextInfo = getNextVideo();

    if (!nextInfo) {
      console.log('🎉 All HeroicSport videos have been processed!');

      // Show final summary
      const progressPath = join(OUTPUT_DIR, 'data', 'processing-progress.json');
      if (existsSync(progressPath)) {
        const progress = JSON.parse(readFileSync(progressPath, 'utf8'));
        console.log(`📊 Total videos processed: ${progress.processedVideoIds.length}`);
      }
      return;
    }

    const { video, progress } = nextInfo;
    const videoId = extractVideoId(video.url);

    console.log(`\n[${progress.current}/${progress.total}] Processing: ${video.title}`);
    console.log(`🔗 Video ID: ${videoId}`);
    console.log(`⏳ Remaining: ${progress.remaining} videos`);

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
      processingIndex: progress.current,
      totalVideos: progress.total,
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

    // Mark as processed
    markVideoProcessed(videoId);

    console.log(`✅ Successfully processed and saved`);
    console.log(`💾 JSON: ${jsonPath}`);
    console.log(`📄 Report: ${reportPath}`);

    if (transcriptResult.success) {
      console.log(`🎯 Transcript: ${transcriptResult.transcriptLines} lines, ${transcriptResult.wordCount} words`);
    } else {
      console.log(`❌ Transcript extraction failed: ${transcriptResult.reason}`);
    }

    console.log(`📊 Series: ${videoData.series}, Status: ${videoData.statusCode}`);

    if (progress.remaining > 1) {
      console.log(`\n🔄 ${progress.remaining - 1} videos remaining. Run again to continue.`);
    } else {
      console.log(`\n🎉 This was the last video! All HeroicSport videos processed.`);
    }

  } catch (error) {
    console.error('❌ Single video processing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}