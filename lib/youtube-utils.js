#!/usr/bin/env node

/**
 * YouTube Utilities Library
 * Tiered search strategy for discovering cycling content on YouTube
 *
 * Search Priority:
 * 1. Official channels (UCI, GCN, Eurosport, FloBikes, race organizers)
 * 2. Trusted third-party channels (Lanterne Rouge, cycling news)
 * 3. Broad YouTube search (fallback)
 */

import 'dotenv/config';
import { searchContent } from './firecrawl-utils.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load broadcasters reference data
 */
export function loadBroadcasters() {
  const broadcastersPath = join(__dirname, '..', 'data', 'broadcasters.json');
  return JSON.parse(readFileSync(broadcastersPath, 'utf-8'));
}

/**
 * Save broadcasters reference data (for adding emerging channels)
 */
export function saveBroadcasters(broadcasters) {
  const broadcastersPath = join(__dirname, '..', 'data', 'broadcasters.json');
  broadcasters.lastUpdated = new Date().toISOString();
  writeFileSync(broadcastersPath, JSON.stringify(broadcasters, null, 2));
}

/**
 * Search a specific YouTube channel for content
 * Includes channel name in query for better results
 *
 * @param {string} handle - YouTube handle (e.g., "gcn" or "@gcn")
 * @param {string} query - Search query
 * @param {object} options - Search options
 */
export async function searchYouTubeChannel(handle, query, options = {}) {
  // Normalize handle (remove @ if present)
  const normalizedHandle = handle.replace('@', '');

  // Map handles to channel names for better search results
  const channelNames = {
    'ucicycling': 'UCI',
    'gcn': 'GCN',
    'gcnracing': 'GCN Racing',
    'eurosportcycling': 'Eurosport cycling',
    'flobikes': 'FloBikes',
    'nbcsports': 'NBC Sports',
    'tourdefrance': 'Tour de France official',
    'gaboracing': 'Giro',
    'lanternerouge': 'Lanterne Rouge',
    'cyclingnewsvideos': 'Cyclingnews',
    'velonews': 'VeloNews'
  };

  const channelName = channelNames[normalizedHandle.toLowerCase()] || normalizedHandle;
  const channelQuery = `site:youtube.com ${channelName} ${query}`;

  console.log(`   📺 Searching ${channelName}: "${query}"`);

  return searchContent(channelQuery, {
    limit: options.limit || 5,
    ...options
  });
}

/**
 * Search multiple YouTube channels in parallel
 *
 * @param {string[]} handles - Array of YouTube handles
 * @param {string} query - Search query
 * @param {object} options - Search options
 */
export async function searchMultipleChannels(handles, query, options = {}) {
  const searches = handles.map(handle =>
    searchYouTubeChannel(handle, query, { limit: options.limitPerChannel || 3 })
  );

  const results = await Promise.all(searches);

  // Flatten and dedupe by URL
  const seen = new Set();
  const combined = [];

  results.flat().forEach(result => {
    if (!seen.has(result.url)) {
      seen.add(result.url);
      combined.push(result);
    }
  });

  return combined;
}

/**
 * Get official channel handles from broadcasters reference
 */
export function getOfficialChannelHandles() {
  const broadcasters = loadBroadcasters();
  return Object.values(broadcasters.officialChannels)
    .filter(c => c.youtubeHandle)
    .map(c => c.youtubeHandle.replace('@', ''));
}

/**
 * Get trusted channel handles from broadcasters reference
 */
export function getTrustedChannelHandles() {
  const broadcasters = loadBroadcasters();
  return Object.values(broadcasters.trustedChannels)
    .filter(c => c.youtubeHandle)
    .map(c => c.youtubeHandle.replace('@', ''));
}

/**
 * Look up channel trust level
 *
 * @param {string} channelIdentifier - YouTube handle or channel ID
 * @returns {object} Trust info { level, channel, data }
 */
export function getChannelTrustLevel(channelIdentifier) {
  const broadcasters = loadBroadcasters();
  const normalized = channelIdentifier.replace('@', '').toLowerCase();

  // Check official channels
  for (const [key, channel] of Object.entries(broadcasters.officialChannels)) {
    const handle = channel.youtubeHandle?.replace('@', '').toLowerCase();
    if (handle === normalized || channel.youtubeChannelId === channelIdentifier) {
      return { level: 'official', channel: key, data: channel };
    }
  }

  // Check trusted channels
  for (const [key, channel] of Object.entries(broadcasters.trustedChannels)) {
    const handle = channel.youtubeHandle?.replace('@', '').toLowerCase();
    if (handle === normalized || channel.youtubeChannelId === channelIdentifier) {
      return { level: 'trusted', channel: key, data: channel };
    }
  }

  // Check emerging channels
  const emerging = broadcasters.emergingChannels?.find(c =>
    c.youtubeHandle?.replace('@', '').toLowerCase() === normalized
  );
  if (emerging) {
    return { level: 'emerging', data: emerging };
  }

  // Check blocked channels
  const blocked = broadcasters.blockedChannels?.find(c =>
    c.youtubeHandle?.replace('@', '').toLowerCase() === normalized
  );
  if (blocked) {
    return { level: 'blocked', reason: blocked.reason };
  }

  return { level: 'unknown' };
}

/**
 * Extract YouTube channel handle from URL
 *
 * @param {string} url - YouTube URL
 * @returns {object|null} { type, value } or null
 */
export function extractChannelFromUrl(url) {
  const patterns = [
    { pattern: /youtube\.com\/@([^\/\?]+)/, type: 'handle' },
    { pattern: /youtube\.com\/channel\/([^\/\?]+)/, type: 'id' },
    { pattern: /youtube\.com\/c\/([^\/\?]+)/, type: 'custom' },
    { pattern: /youtube\.com\/user\/([^\/\?]+)/, type: 'user' }
  ];

  for (const { pattern, type } of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { type, value: match[1] };
    }
  }
  return null;
}

/**
 * Comprehensive YouTube search with tiered strategy
 *
 * Tier 1: Official channels (highest quality, lowest spoiler risk)
 * Tier 2: Trusted third-party channels (quality extended highlights)
 * Tier 3: Broad YouTube search (fallback)
 *
 * @param {string} raceName - Race name to search for
 * @param {number} year - Race year
 * @param {object} options - Search options
 */
export async function discoverYouTubeContent(raceName, year = 2026, options = {}) {
  const results = {
    official: [],
    trusted: [],
    broad: [],
    metadata: {
      searchedAt: new Date().toISOString(),
      raceName,
      year,
      strategy: 'tiered',
      apiCallsUsed: 0
    }
  };

  console.log(`\n🎯 YouTube Discovery: ${raceName} ${year}`);
  console.log('─'.repeat(50));

  // Tier 1: Official channels
  console.log('\n📺 Tier 1: Searching official channels...');
  const officialHandles = getOfficialChannelHandles();

  for (const handle of officialHandles) {
    const channelResults = await searchYouTubeChannel(handle, `${raceName} ${year}`, { limit: 3 });
    results.official.push(...channelResults.map(r => ({ ...r, sourceChannel: handle, sourceTier: 'official' })));
    results.metadata.apiCallsUsed++;
  }
  console.log(`   Found ${results.official.length} official channel results`);

  // Tier 2: Trusted channels (if official results insufficient)
  const minOfficialResults = options.minOfficialResults || 3;
  if (results.official.length < minOfficialResults) {
    console.log('\n📺 Tier 2: Searching trusted channels...');
    const trustedHandles = getTrustedChannelHandles();

    for (const handle of trustedHandles) {
      const channelResults = await searchYouTubeChannel(handle, `${raceName} ${year} highlights`, { limit: 2 });
      results.trusted.push(...channelResults.map(r => ({ ...r, sourceChannel: handle, sourceTier: 'trusted' })));
      results.metadata.apiCallsUsed++;
    }
    console.log(`   Found ${results.trusted.length} trusted channel results`);
  }

  // Tier 3: Broad search (if combined results insufficient)
  const totalResults = results.official.length + results.trusted.length;
  const minTotalResults = options.minTotalResults || 5;

  if (totalResults < minTotalResults) {
    console.log('\n📺 Tier 3: Broad YouTube search...');
    const broadResults = await broadYouTubeSearch(raceName, year, options);
    results.broad.push(...broadResults.map(r => ({ ...r, sourceTier: 'broad' })));
    results.metadata.apiCallsUsed++;
    console.log(`   Found ${results.broad.length} broad search results`);
  }

  // Year fallback: If current year has no results, try previous year
  const allResults = [...results.official, ...results.trusted, ...results.broad];
  if (allResults.length === 0 && !options.skipYearFallback) {
    console.log(`\n📅 No ${year} results - trying ${year - 1}...`);
    const fallbackResults = await discoverYouTubeContent(raceName, year - 1, {
      ...options,
      skipYearFallback: true
    });

    // Tag fallback results
    fallbackResults.official.forEach(r => r.yearFallback = true);
    fallbackResults.trusted.forEach(r => r.yearFallback = true);
    fallbackResults.broad.forEach(r => r.yearFallback = true);

    results.fallback = fallbackResults;
    results.metadata.usedYearFallback = true;
  }

  // Summary
  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Discovery complete: ${allResults.length} results (${results.metadata.apiCallsUsed} API calls)`);

  return results;
}

/**
 * Broad YouTube search with intelligent query construction
 * Only used as fallback when channel-specific searches yield insufficient results
 *
 * @param {string} raceName - Race name
 * @param {number} year - Race year
 * @param {object} options - Search options
 */
export async function broadYouTubeSearch(raceName, year = 2026, options = {}) {
  const queries = [
    `site:youtube.com ${raceName} ${year} extended highlights`,
    `site:youtube.com ${raceName} ${year} full race`,
    `site:youtube.com ${raceName} ${year} highlights`
  ];

  // Try each query, stop when we find enough results
  for (const query of queries) {
    const results = await searchContent(query, { limit: 5 });
    if (results.length >= 3) {
      return results;
    }
  }

  // Return whatever we found
  return await searchContent(`site:youtube.com ${raceName} ${year}`, { limit: 5 });
}

/**
 * Search for specific content type
 *
 * @param {string} raceName - Race name
 * @param {number} year - Race year
 * @param {string} contentType - Type: 'full-race', 'extended-highlights', 'highlights', 'stage'
 * @param {object} options - Search options (stageNumber for stage searches)
 */
export async function findContentType(raceName, year = 2026, contentType, options = {}) {
  const typeQueries = {
    'full-race': [`${raceName} ${year} full race`, `${raceName} ${year} complete coverage`],
    'extended-highlights': [`${raceName} ${year} extended highlights`, `${raceName} ${year} highlights 30 minutes`],
    'highlights': [`${raceName} ${year} highlights`],
    'stage': [`${raceName} ${year} stage ${options.stageNumber || ''}`, `${raceName} ${year} stage ${options.stageNumber || ''} full`]
  };

  const queries = typeQueries[contentType] || [`${raceName} ${year} ${contentType}`];

  // Search official channels first
  const officialHandles = getOfficialChannelHandles();

  for (const query of queries) {
    for (const handle of officialHandles) {
      const results = await searchYouTubeChannel(handle, query, { limit: 3 });
      if (results.length > 0) {
        return results.map(r => ({ ...r, sourceChannel: handle, contentType }));
      }
    }
  }

  // Fallback to broad search
  for (const query of queries) {
    const results = await searchContent(`site:youtube.com ${query}`, { limit: 5 });
    if (results.length > 0) {
      return results.map(r => ({ ...r, contentType }));
    }
  }

  return [];
}

/**
 * Add a new channel to emerging channels list
 *
 * @param {string} handle - YouTube handle
 * @param {string} name - Channel name
 * @param {string} notes - Notes about the channel
 */
export function addEmergingChannel(handle, name, notes = '') {
  const broadcasters = loadBroadcasters();

  // Check if already exists
  const normalized = handle.replace('@', '').toLowerCase();
  const exists = broadcasters.emergingChannels?.some(c =>
    c.youtubeHandle?.replace('@', '').toLowerCase() === normalized
  );

  if (exists) {
    console.log(`Channel @${normalized} already in emerging channels`);
    return false;
  }

  if (!broadcasters.emergingChannels) {
    broadcasters.emergingChannels = [];
  }

  broadcasters.emergingChannels.push({
    name,
    youtubeHandle: `@${normalized}`,
    trustLevel: 'emerging',
    addedAt: new Date().toISOString(),
    usageCount: 0,
    notes
  });

  saveBroadcasters(broadcasters);
  console.log(`✅ Added @${normalized} to emerging channels`);
  return true;
}

/**
 * Promote an emerging channel to trusted
 *
 * @param {string} handle - YouTube handle
 * @param {object} additionalData - Additional data to add (contentTypes, spoilerRisk, etc.)
 */
export function promoteToTrusted(handle, additionalData = {}) {
  const broadcasters = loadBroadcasters();
  const normalized = handle.replace('@', '').toLowerCase();

  // Find in emerging
  const emergingIndex = broadcasters.emergingChannels?.findIndex(c =>
    c.youtubeHandle?.replace('@', '').toLowerCase() === normalized
  );

  if (emergingIndex === -1) {
    console.log(`Channel @${normalized} not found in emerging channels`);
    return false;
  }

  const channel = broadcasters.emergingChannels[emergingIndex];

  // Move to trusted
  const trustedKey = channel.name.replace(/\s+/g, '');
  broadcasters.trustedChannels[trustedKey] = {
    ...channel,
    trustLevel: 'trusted',
    promotedAt: new Date().toISOString(),
    ...additionalData
  };

  // Remove from emerging
  broadcasters.emergingChannels.splice(emergingIndex, 1);

  saveBroadcasters(broadcasters);
  console.log(`✅ Promoted @${normalized} to trusted channels`);
  return true;
}

/**
 * Block a channel (known to have spoilers or misleading content)
 *
 * @param {string} handle - YouTube handle
 * @param {string} reason - Reason for blocking
 */
export function blockChannel(handle, reason) {
  const broadcasters = loadBroadcasters();
  const normalized = handle.replace('@', '').toLowerCase();

  if (!broadcasters.blockedChannels) {
    broadcasters.blockedChannels = [];
  }

  // Check if already blocked
  const exists = broadcasters.blockedChannels.some(c =>
    c.youtubeHandle?.replace('@', '').toLowerCase() === normalized
  );

  if (exists) {
    console.log(`Channel @${normalized} already blocked`);
    return false;
  }

  broadcasters.blockedChannels.push({
    youtubeHandle: `@${normalized}`,
    reason,
    blockedAt: new Date().toISOString()
  });

  // Remove from emerging if present
  if (broadcasters.emergingChannels) {
    broadcasters.emergingChannels = broadcasters.emergingChannels.filter(c =>
      c.youtubeHandle?.replace('@', '').toLowerCase() !== normalized
    );
  }

  saveBroadcasters(broadcasters);
  console.log(`🚫 Blocked @${normalized}: ${reason}`);
  return true;
}

// Export for CLI usage
export default {
  loadBroadcasters,
  saveBroadcasters,
  searchYouTubeChannel,
  searchMultipleChannels,
  getOfficialChannelHandles,
  getTrustedChannelHandles,
  getChannelTrustLevel,
  extractChannelFromUrl,
  discoverYouTubeContent,
  broadYouTubeSearch,
  findContentType,
  addEmergingChannel,
  promoteToTrusted,
  blockChannel
};
