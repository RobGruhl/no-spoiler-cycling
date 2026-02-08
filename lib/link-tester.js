#!/usr/bin/env node

/**
 * Link Tester Module
 * Uses Playwright to verify that broadcast links actually work
 */

import { extractYouTubeVideoId, isValidUrl } from './url-validator.js';

// Spoiler keywords to detect in page content
const SPOILER_KEYWORDS = [
  'wins', 'winner', 'victory', 'champion', 'podium', 'finish first',
  'takes the stage', 'claims victory', 'crosses the line first',
  'final classification', 'general classification results',
  'ganador', 'vainqueur', 'vincitore', 'winnaar' // Multi-language
];

// Region lock indicators
const REGION_LOCK_INDICATORS = [
  'not available in your region',
  'not available in your country',
  'geo-restricted',
  'content is not available',
  'unavailable in your location',
  'this video is not available',
  'blocked in your country'
];

/**
 * Create a Playwright browser instance
 * @returns {Promise<{browser, context, page}>}
 */
async function createBrowser() {
  // Dynamic import to avoid requiring playwright unless needed
  const { chromium } = await import('playwright');

  const browser = await chromium.launch({
    headless: true
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  return { browser, context, page };
}

/**
 * Test a broadcast URL for accessibility
 * @param {string} url - The URL to test
 * @param {object} options - Test options
 * @returns {Promise<object>} - Test results
 */
export async function testBroadcastLink(url, options = {}) {
  const result = {
    url,
    accessible: false,
    statusCode: null,
    regionLocked: false,
    spoilerSafe: true,
    loadTime: null,
    errors: [],
    warnings: [],
    screenshot: null
  };

  if (!isValidUrl(url)) {
    result.errors.push('Invalid URL format');
    return result;
  }

  let browser, page;

  try {
    const startTime = Date.now();
    ({ browser, page } = await createBrowser());

    // Navigate to URL
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeout || 30000
    });

    result.loadTime = Date.now() - startTime;
    result.statusCode = response?.status() || null;

    // Check for successful load
    if (response && response.ok()) {
      result.accessible = true;
    } else if (result.statusCode === 403 || result.statusCode === 451) {
      result.regionLocked = true;
      result.warnings.push(`HTTP ${result.statusCode} - possibly region locked`);
    } else if (result.statusCode >= 400) {
      result.errors.push(`HTTP ${result.statusCode}`);
    }

    // Get page content for analysis
    const pageContent = await page.content();
    const pageText = await page.evaluate(() => document.body?.innerText || '');
    const pageLower = pageText.toLowerCase();

    // Check for region lock indicators
    for (const indicator of REGION_LOCK_INDICATORS) {
      if (pageLower.includes(indicator.toLowerCase())) {
        result.regionLocked = true;
        result.warnings.push(`Region lock indicator found: "${indicator}"`);
        break;
      }
    }

    // Check for spoilers (only if requested)
    if (options.checkSpoilers !== false) {
      for (const keyword of SPOILER_KEYWORDS) {
        if (pageLower.includes(keyword.toLowerCase())) {
          result.spoilerSafe = false;
          result.warnings.push(`Potential spoiler keyword found: "${keyword}"`);
          break;
        }
      }
    }

    // Take screenshot if requested
    if (options.screenshot) {
      result.screenshot = await page.screenshot({
        type: 'png',
        fullPage: false
      });
    }

    // Check for login walls
    const loginIndicators = ['sign in', 'log in', 'subscribe', 'start your free trial'];
    for (const indicator of loginIndicators) {
      if (pageLower.includes(indicator)) {
        result.warnings.push(`Login/subscription required: "${indicator}" found`);
        break;
      }
    }

  } catch (error) {
    result.errors.push(error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return result;
}

/**
 * Test a YouTube URL for video availability
 * @param {string} url - YouTube URL
 * @param {object} options - Test options
 * @returns {Promise<object>} - Test results
 */
export async function testYouTubeLink(url, options = {}) {
  const result = {
    url,
    available: false,
    videoId: null,
    title: null,
    spoilerSafe: true,
    duration: null,
    errors: [],
    warnings: []
  };

  const videoId = extractYouTubeVideoId(url);
  if (!videoId) {
    result.errors.push('Could not extract video ID from URL');
    return result;
  }

  result.videoId = videoId;

  let browser, page;

  try {
    ({ browser, page } = await createBrowser());

    // Navigate to YouTube video
    await page.goto(`https://www.youtube.com/watch?v=${videoId}`, {
      waitUntil: 'domcontentloaded',
      timeout: options.timeout || 30000
    });

    // Wait for title to load
    await page.waitForSelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata', {
      timeout: 10000
    }).catch(() => null);

    // Get video title
    const titleElement = await page.$('h1.ytd-video-primary-info-renderer yt-formatted-string, h1.ytd-watch-metadata yt-formatted-string');
    if (titleElement) {
      result.title = await titleElement.innerText();
    }

    // Check for unavailable video
    const pageContent = await page.content();
    const unavailableIndicators = [
      'Video unavailable',
      'This video is private',
      'This video has been removed',
      'This video is no longer available'
    ];

    for (const indicator of unavailableIndicators) {
      if (pageContent.includes(indicator)) {
        result.errors.push(indicator);
        return result;
      }
    }

    result.available = true;

    // Check title for spoilers
    if (result.title) {
      const titleLower = result.title.toLowerCase();
      for (const keyword of SPOILER_KEYWORDS) {
        if (titleLower.includes(keyword.toLowerCase())) {
          result.spoilerSafe = false;
          result.warnings.push(`Spoiler keyword in title: "${keyword}"`);
        }
      }

      // Check for winner names in title (common pattern: "Name WINS Race")
      const winnerPatterns = [
        /(\w+)\s+wins/i,
        /(\w+)\s+takes\s+(the\s+)?victory/i,
        /(\w+)\s+triumphs/i
      ];
      for (const pattern of winnerPatterns) {
        if (pattern.test(result.title)) {
          result.spoilerSafe = false;
          result.warnings.push('Winner name likely in title');
          break;
        }
      }
    }

    // Try to get duration
    const durationElement = await page.$('.ytp-time-duration');
    if (durationElement) {
      result.duration = await durationElement.innerText();
    }

  } catch (error) {
    result.errors.push(error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }

  return result;
}

/**
 * Test multiple links in parallel with rate limiting
 * @param {string[]} urls - URLs to test
 * @param {object} options - Test options including concurrency
 * @returns {Promise<object[]>} - Array of test results
 */
export async function testMultipleLinks(urls, options = {}) {
  const concurrency = options.concurrency || 3;
  const results = [];

  // Process in batches
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchPromises = batch.map(url => {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return testYouTubeLink(url, options);
      }
      return testBroadcastLink(url, options);
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);

    // Rate limiting delay between batches
    if (i + concurrency < urls.length) {
      await new Promise(resolve => setTimeout(resolve, options.delay || 1000));
    }
  }

  return results;
}

/**
 * Quick check if a URL is accessible (HEAD request style check)
 * Faster than full page load, but less detailed
 * @param {string} url - URL to check
 * @returns {Promise<{accessible: boolean, statusCode: number|null, error: string|null}>}
 */
export async function quickAccessCheck(url) {
  if (!isValidUrl(url)) {
    return { accessible: false, statusCode: null, error: 'Invalid URL' };
  }

  let browser, page;

  try {
    ({ browser, page } = await createBrowser());

    const response = await page.goto(url, {
      waitUntil: 'commit', // Faster than full load
      timeout: 15000
    });

    const statusCode = response?.status() || null;
    const accessible = response?.ok() || false;

    return { accessible, statusCode, error: null };

  } catch (error) {
    return { accessible: false, statusCode: null, error: error.message };

  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Export default
export default {
  testBroadcastLink,
  testYouTubeLink,
  testMultipleLinks,
  quickAccessCheck,
  SPOILER_KEYWORDS,
  REGION_LOCK_INDICATORS
};
