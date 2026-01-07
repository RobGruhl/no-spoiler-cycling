#!/usr/bin/env node

/**
 * Perplexity Search API Utilities Library
 * For researching race details, stage information, and cycling event context
 *
 * API Reference: https://docs.perplexity.ai/api-reference/search-post
 */

import 'dotenv/config';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
const PERPLEXITY_BASE_URL = 'https://api.perplexity.ai';

/**
 * Check if API key is configured
 */
function checkApiKey() {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('PERPLEXITY_API_KEY not found in environment variables');
  }
}

/**
 * Core Perplexity API request function
 */
async function perplexityRequest(endpoint, data) {
  checkApiKey();

  const response = await fetch(`${PERPLEXITY_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Perplexity ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Search using Perplexity API
 * Returns AI-synthesized results with citations
 *
 * @param {string|string[]} query - Search query or array of queries (max 5)
 * @param {object} options - Search options
 * @param {number} options.maxResults - Results per query (1-20, default 10)
 * @param {number} options.maxTokens - Overall content budget (default 25000)
 * @param {number} options.maxTokensPerPage - Content per webpage (default 2048)
 * @param {string[]} options.allowDomains - Allowlist domains (max 20)
 * @param {string[]} options.blockDomains - Blocklist domains (max 20)
 * @param {string} options.country - ISO country code for regional results
 * @param {string[]} options.languages - ISO 639-1 language codes
 * @param {string} options.recency - day|week|month|year
 * @param {string} options.startDate - Start date (MM/DD/YYYY format)
 * @param {string} options.endDate - End date (MM/DD/YYYY format)
 */
export async function perplexitySearch(query, options = {}) {
  const searchParams = {
    query: query
  };

  // Add optional parameters if provided
  if (options.maxResults) searchParams.max_results = options.maxResults;
  if (options.maxTokens) searchParams.max_tokens = options.maxTokens;
  if (options.maxTokensPerPage) searchParams.max_tokens_per_page = options.maxTokensPerPage;

  // Domain filtering
  if (options.allowDomains) {
    searchParams.search_domain_filter = options.allowDomains.map(d => d);
  }
  if (options.blockDomains) {
    searchParams.search_domain_filter = (searchParams.search_domain_filter || [])
      .concat(options.blockDomains.map(d => `-${d}`));
  }

  // Regional and language filters
  if (options.country) searchParams.country = options.country;
  if (options.languages) searchParams.search_language_filter = options.languages;

  // Date/recency filters
  if (options.recency) searchParams.search_recency_filter = options.recency;
  if (options.startDate) searchParams.search_start_published_date = options.startDate;
  if (options.endDate) searchParams.search_end_published_date = options.endDate;

  const queryDisplay = Array.isArray(query) ? query.join(', ') : query;
  console.log(`🔎 Perplexity search: "${queryDisplay}"`);

  try {
    const result = await perplexityRequest('/search', searchParams);

    if (!result.results && !result.answer) {
      console.log('   ⚠️ No results found');
      return { answer: null, results: [], citations: [] };
    }

    const resultCount = result.results?.length || 0;
    console.log(`   ✅ Found ${resultCount} sources`);

    return {
      answer: result.answer || null,
      results: result.results || [],
      citations: result.citations || [],
      raw: result
    };

  } catch (error) {
    console.error(`   ❌ Search failed: ${error.message}`);
    return { answer: null, results: [], citations: [], error: error.message };
  }
}

/**
 * Search for cycling race information
 * Pre-configured for cycling content research
 */
export async function searchRaceInfo(query, options = {}) {
  const cyclingQuery = `cycling ${query}`;
  return perplexitySearch(cyclingQuery, {
    maxResults: options.maxResults || 10,
    recency: options.recency || 'month',
    ...options
  });
}

/**
 * Search for Tour de France stage details
 */
export async function searchTourStage(stageNumber, year = 2026, options = {}) {
  const query = `Tour de France ${year} stage ${stageNumber} route profile details`;
  return perplexitySearch(query, {
    maxResults: options.maxResults || 8,
    allowDomains: ['letour.fr', 'cyclingnews.com', 'procyclingstats.com', 'velonews.com'],
    ...options
  });
}

/**
 * Search for UCI World Championships race details
 */
export async function searchWorldChampionships(raceType, year = 2026, options = {}) {
  const query = `UCI Road World Championships ${year} ${raceType} course route details`;
  return perplexitySearch(query, {
    maxResults: options.maxResults || 8,
    allowDomains: ['uci.org', 'cyclingnews.com', 'procyclingstats.com', 'velonews.com'],
    ...options
  });
}

/**
 * Search for Grand Tour stage information
 * Works for Tour de France, Giro d'Italia, Vuelta a España
 */
export async function searchGrandTourStage(tour, stageNumber, year = 2026, options = {}) {
  const tourNames = {
    'tdf': 'Tour de France',
    'giro': 'Giro d\'Italia',
    'vuelta': 'Vuelta a España'
  };

  const tourName = tourNames[tour.toLowerCase()] || tour;
  const query = `${tourName} ${year} stage ${stageNumber} route profile climb details`;

  return perplexitySearch(query, {
    maxResults: options.maxResults || 8,
    ...options
  });
}

/**
 * Search for classic/monument race details
 */
export async function searchClassicRace(raceName, year = 2026, options = {}) {
  const query = `${raceName} ${year} cycling race route course details`;
  return perplexitySearch(query, {
    maxResults: options.maxResults || 8,
    allowDomains: ['cyclingnews.com', 'procyclingstats.com', 'velonews.com', 'firstcycling.com'],
    ...options
  });
}

/**
 * Multi-query search for comprehensive race research
 * Searches multiple aspects of a race in parallel
 */
export async function searchRaceComprehensive(raceName, year = 2026, options = {}) {
  const queries = [
    `${raceName} ${year} route profile`,
    `${raceName} ${year} start list favorites`,
    `${raceName} ${year} key climbs difficulty`,
    `${raceName} ${year} race distance elevation`,
    `${raceName} ${year} broadcast schedule coverage`
  ];

  console.log(`🔎 Comprehensive search: ${raceName} ${year}`);
  console.log(`   Running ${queries.length} parallel queries...`);

  return perplexitySearch(queries, {
    maxResults: options.maxResults || 5,
    ...options
  });
}

/**
 * Extract key race details from Perplexity response
 * Helper to parse common race information
 */
export function extractRaceDetails(perplexityResult) {
  const details = {
    summary: perplexityResult.answer || '',
    sources: [],
    distance: null,
    elevation: null,
    startLocation: null,
    finishLocation: null
  };

  // Extract source URLs
  if (perplexityResult.citations) {
    details.sources = perplexityResult.citations.map(c => ({
      title: c.title || 'Unknown',
      url: c.url
    }));
  }

  // Try to extract common race metrics from the answer
  const answer = perplexityResult.answer || '';

  // Distance patterns (e.g., "164.6km", "200 km", "120 miles")
  const distanceMatch = answer.match(/(\d+(?:\.\d+)?)\s*(?:km|kilometers?)/i);
  if (distanceMatch) {
    details.distance = `${distanceMatch[1]}km`;
  }

  // Elevation patterns (e.g., "3,350m elevation", "4500m of climbing")
  const elevationMatch = answer.match(/(\d+[,.]?\d*)\s*m\s*(?:of\s+)?(?:elevation|climbing|ascent)/i);
  if (elevationMatch) {
    details.elevation = `${elevationMatch[1].replace(',', '')}m`;
  }

  return details;
}
