#!/usr/bin/env node

/**
 * Firecrawl Utilities Library
 * Reusable functions for search, scrape, and content analysis
 */

import 'dotenv/config';

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_BASE_URL = 'https://api.firecrawl.dev/v2';

if (!FIRECRAWL_API_KEY) {
  throw new Error('FIRECRAWL_API_KEY not found in environment variables');
}

/**
 * Core Firecrawl API request function
 */
async function firecrawlRequest(endpoint, data) {
  const response = await fetch(`${FIRECRAWL_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Firecrawl ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Search for content using Firecrawl
 * Returns candidate URLs for further analysis
 */
export async function searchContent(query, options = {}) {
  const searchParams = {
    query,
    limit: options.limit || 5,
    sources: options.sources || [{ type: 'web' }],
    ...options
  };

  console.log(`🔍 Searching: "${query}"`);

  try {
    const result = await firecrawlRequest('/search', searchParams);

    if (!result.data?.web) {
      console.log('   ⚠️ No results found');
      return [];
    }

    console.log(`   ✅ Found ${result.data.web.length} candidates`);
    return result.data.web;

  } catch (error) {
    console.error(`   ❌ Search failed: ${error.message}`);
    return [];
  }
}

/**
 * Platform-specific search functions
 */

// YouTube-specific search
export async function youtubeSearch(query, options = {}) {
  const youtubeQuery = `site:youtube.com ${query}`;
  return searchContent(youtubeQuery, {
    limit: options.limit || 8,
    ...options
  });
}

// FloBikes-specific search
export async function flobikeSearch(query, options = {}) {
  const flobikeQuery = `site:flobikes.com ${query}`;
  return searchContent(flobikeQuery, {
    limit: options.limit || 8,
    ...options
  });
}

// Peacock-specific search
export async function peacockSearch(query, options = {}) {
  const peacockQuery = `site:peacocktv.com ${query}`;
  return searchContent(peacockQuery, {
    limit: options.limit || 5,
    ...options
  });
}

// HBO Max-specific search
export async function hboSearch(query, options = {}) {
  const hboQuery = `site:hbomax.com ${query}`;
  return searchContent(hboQuery, {
    limit: options.limit || 5,
    ...options
  });
}

/**
 * Scrape a single URL and return content
 * Used for content verification and spoiler analysis
 */
export async function scrapeContent(url, options = {}) {
  const scrapeParams = {
    url,
    formats: options.formats || ['markdown'],
    onlyMainContent: options.onlyMainContent !== false,
    maxAge: options.maxAge || 0,
    ...options
  };

  console.log(`📄 Scraping: ${url}`);

  try {
    const result = await firecrawlRequest('/scrape', scrapeParams);

    if (!result.data) {
      console.log('   ⚠️ No content returned');
      return null;
    }

    console.log(`   ✅ Scraped successfully (${result.data.metadata?.statusCode || 'unknown'} status)`);
    return result.data;

  } catch (error) {
    console.error(`   ❌ Scrape failed: ${error.message}`);
    return null;
  }
}

/**
 * Batch scrape multiple URLs with delay
 * Includes basic error handling and retry logic
 */
export async function batchScrapeContent(urls, options = {}) {
  const delay = options.delay || 1000;
  const results = [];

  // Remove delay from scrape options (it's not a Firecrawl parameter)
  const { delay: _, ...scrapeOptions } = options;

  console.log(`📦 Batch scraping ${urls.length} URLs`);

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];

    // Add index info for tracking
    console.log(`[${i + 1}/${urls.length}]`);

    const content = await scrapeContent(url, scrapeOptions);

    if (content) {
      results.push({
        url,
        content,
        index: i
      });
    }

    // Delay between requests (except for last one)
    if (i < urls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.log(`📦 Batch complete: ${results.length}/${urls.length} successful`);
  return results;
}

/**
 * Search and then scrape candidates
 * This implements the two-stage discovery process
 */
export async function searchAndScrape(query, options = {}) {
  const searchOptions = {
    limit: options.searchLimit || 5,
    sources: options.sources || [{ type: 'web' }]
  };

  const scrapeOptions = {
    formats: options.formats || ['markdown'],
    onlyMainContent: options.onlyMainContent !== false,
    delay: options.delay || 1000
  };

  console.log(`🔄 Search and scrape: "${query}"`);

  // Stage 1: Search for candidates
  const candidates = await searchContent(query, searchOptions);

  if (candidates.length === 0) {
    return [];
  }

  // Stage 2: Scrape candidate URLs
  const urls = candidates.map(c => c.url);
  const scrapedResults = await batchScrapeContent(urls, scrapeOptions);

  // Combine search metadata with scraped content
  const combinedResults = scrapedResults.map(result => {
    const candidate = candidates.find(c => c.url === result.url);
    return {
      ...result,
      searchMetadata: candidate
    };
  });

  console.log(`🔄 Complete: ${combinedResults.length} URLs with content`);
  return combinedResults;
}



/**
 * Extract platform information from URL
 */
export function extractPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('flobikes.com')) return 'FloBikes';
  if (url.includes('peacocktv.com')) return 'Peacock';
  if (url.includes('hbomax.com')) return 'HBO Max';
  if (url.includes('uci.org')) return 'UCI';
  if (url.includes('cyclingnews.com')) return 'CyclingNews';
  if (url.includes('letour.fr')) return 'Tour de France';
  return 'Web';
}

/**
 * Helper function to create race data entries
 */
export function createRaceEntry(result, customData = {}) {
  const platform = extractPlatform(result.url);
  const metadata = result.content?.metadata || {};
  const searchMeta = result.searchMetadata || {};

  return {
    id: customData.id || `race-${Date.now()}`,
    name: customData.name || searchMeta.title || metadata.title || 'Unknown Race',
    description: customData.description || searchMeta.description || metadata.description || '',
    platform,
    url: result.url,
    type: customData.type || 'unknown',
    discoveredAt: new Date().toISOString(),
    ...customData
  };
}

// Core functions are already exported above