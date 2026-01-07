#!/usr/bin/env node

/**
 * Perplexity Search API Utilities Library
 * For researching race details, stage information, and cycling event context
 *
 * Results are returned as-is for Claude to process - no automatic parsing.
 * Queries request structured/tabular output where appropriate.
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
 * Search for cycling race information with detailed context request
 */
export async function searchRaceInfo(query, options = {}) {
  const detailedQuery = `${query}

Please provide comprehensive details including:
- Race distance and total elevation gain
- Key climbs or technical sections with gradients
- Start and finish locations
- Notable course features (cobbles, gravel, crosswinds risk, etc.)
- Historical context if relevant`;

  return perplexitySearch(detailedQuery, {
    maxResults: options.maxResults || 10,
    recency: options.recency || 'month',
    ...options
  });
}

/**
 * Get complete Grand Tour stage overview as structured table
 * Works for Tour de France, Giro d'Italia, Vuelta a España
 */
export async function searchGrandTourStages(tour, year = 2026, options = {}) {
  const tourNames = {
    'tdf': 'Tour de France',
    'giro': "Giro d'Italia",
    'vuelta': 'Vuelta a España'
  };

  const tourName = tourNames[tour.toLowerCase()] || tour;

  const query = `For the ${tourName} ${year}, please provide a complete table of all stages with the following columns:
- Stage number
- Date
- Start city
- Finish city
- Distance (km)
- Stage type (flat/sprint, hilly, mountain, individual time trial, team time trial, rest day)
- Total elevation gain (meters)
- Key features (notable climbs with category/gradient, cobblestone sectors, gravel sections, crosswind risk areas, summit finishes, technical descents)
- Intermediate sprints locations if known

Format as a structured table or list.`;

  return perplexitySearch(query, {
    maxResults: options.maxResults || 15,
    allowDomains: ['letour.fr', 'giroditalia.it', 'lavuelta.es', 'cyclingnews.com', 'procyclingstats.com', 'velonews.com', 'firstcycling.com'],
    ...options
  });
}

/**
 * Search for detailed single stage information
 */
export async function searchGrandTourStage(tour, stageNumber, year = 2026, options = {}) {
  const tourNames = {
    'tdf': 'Tour de France',
    'giro': "Giro d'Italia",
    'vuelta': 'Vuelta a España'
  };

  const tourName = tourNames[tour.toLowerCase()] || tour;

  const query = `${tourName} ${year} Stage ${stageNumber} - provide complete stage details:

- Start city and finish city
- Total distance (km) and elevation gain (m)
- Stage type classification
- Detailed route profile with all categorized climbs:
  * Climb name, category (HC, 1, 2, 3, 4), length, average gradient, max gradient
  * Location in stage (km from start)
- Technical sections: cobbles (sector names/lengths), gravel, tunnels, technical descents
- Weather/terrain considerations: typical crosswind zones, exposed sections
- Intermediate sprint locations
- Is it a summit finish? If so, details on final climb
- Any historical significance of the stage or key climbs`;

  return perplexitySearch(query, {
    maxResults: options.maxResults || 10,
    allowDomains: ['letour.fr', 'giroditalia.it', 'lavuelta.es', 'cyclingnews.com', 'procyclingstats.com', 'velonews.com', 'firstcycling.com', 'climbbybike.com'],
    ...options
  });
}

/**
 * Search for UCI World Championships race details
 */
export async function searchWorldChampionships(raceType, year = 2026, options = {}) {
  const query = `UCI Road World Championships ${year} ${raceType} - provide complete race details:

- Host city/country and venue
- Race date and start time
- Total distance and elevation gain
- Number of laps and circuit details
- Detailed course profile:
  * All climbs with name, length, gradient (avg and max)
  * Technical sections, descents, cobbles
- Start/finish location
- Course records and historical winners at this venue if applicable
- Weather expectations for the location/time of year

Format key data in a structured way.`;

  return perplexitySearch(query, {
    maxResults: options.maxResults || 10,
    allowDomains: ['uci.org', 'cyclingnews.com', 'procyclingstats.com', 'velonews.com', 'firstcycling.com'],
    ...options
  });
}

/**
 * Search for classic/monument race details
 */
export async function searchClassicRace(raceName, year = 2026, options = {}) {
  const query = `${raceName} ${year} cycling race - provide complete race details:

- Race date
- Start city and finish city
- Total distance and elevation gain
- Race classification (Monument, World Tour, etc.)
- Detailed route breakdown:
  * Famous sectors/climbs with names, distances, gradients
  * Cobblestone sectors (if applicable): names, lengths, star ratings
  * Gravel sections (if applicable)
  * Key bergs/hellingen with gradients
- Typical decisive points in the race
- Weather considerations typical for this race
- Course records and notable historical editions

Format the sectors/climbs as a structured list.`;

  return perplexitySearch(query, {
    maxResults: options.maxResults || 10,
    allowDomains: ['cyclingnews.com', 'procyclingstats.com', 'velonews.com', 'firstcycling.com', 'wielerflits.nl'],
    ...options
  });
}

/**
 * Search for one-day race calendar information
 */
export async function searchOneDayRaces(category, year = 2026, options = {}) {
  const categoryQueries = {
    'monuments': 'five monuments (Milan-San Remo, Tour of Flanders, Paris-Roubaix, Liege-Bastogne-Liege, Il Lombardia)',
    'classics': 'spring classics and cobbled classics',
    'ardennes': 'Ardennes classics (Amstel Gold, Fleche Wallonne, Liege-Bastogne-Liege)',
    'cobbles': 'cobbled classics (Tour of Flanders, Paris-Roubaix, E3, Gent-Wevelgem, Dwars door Vlaanderen)',
    'all': 'major one-day races and classics'
  };

  const categoryDesc = categoryQueries[category.toLowerCase()] || category;

  const query = `${year} UCI cycling calendar ${categoryDesc} - provide a table with:
- Race name
- Date
- Race category/classification
- Start and finish cities
- Distance
- Key features (monuments status, cobbles, climbs, etc.)
- Typical weather/conditions

Format as a structured calendar table.`;

  return perplexitySearch(query, {
    maxResults: options.maxResults || 15,
    allowDomains: ['uci.org', 'cyclingnews.com', 'procyclingstats.com', 'firstcycling.com'],
    ...options
  });
}

/**
 * Search for climb/mountain details
 */
export async function searchClimbDetails(climbName, options = {}) {
  const query = `${climbName} cycling climb - provide complete details:

- Location (country, region, nearby town)
- Length (km)
- Elevation gain (m)
- Average gradient (%)
- Maximum gradient (%) and where
- Starting elevation and summit elevation
- UCI category when used in races
- Road surface quality
- Which races feature this climb (Grand Tours, classics, etc.)
- Best side/approach if multiple exist
- Notable moments in race history on this climb
- Strava segment data if available

Format gradients and key stats in a structured way.`;

  return perplexitySearch(query, {
    maxResults: options.maxResults || 10,
    allowDomains: ['climbbybike.com', 'cyclingnews.com', 'procyclingstats.com', 'velonews.com', 'strava.com'],
    ...options
  });
}

/**
 * Search for race broadcast/streaming information
 */
export async function searchRaceBroadcast(raceName, year = 2026, options = {}) {
  const query = `${raceName} ${year} TV broadcast streaming coverage - provide:

- Official broadcasters by region (US, UK, Europe, etc.)
- Streaming platforms carrying the race
- Race start time (local and UTC)
- Expected broadcast duration
- Pre-race coverage availability
- On-demand/replay availability after race
- Official race YouTube or social media channels
- GCN+ or Discovery+ coverage details if applicable

Format by region/platform.`;

  return perplexitySearch(query, {
    maxResults: options.maxResults || 10,
    recency: 'month',
    ...options
  });
}

/**
 * Multi-query comprehensive race research
 */
export async function searchRaceComprehensive(raceName, year = 2026, options = {}) {
  const queries = [
    `${raceName} ${year} complete route profile with all climbs distances and gradients`,
    `${raceName} ${year} stage types terrain features cobbles gravel crosswinds`,
    `${raceName} ${year} race schedule dates times broadcast coverage`,
    `${raceName} ${year} historical data course records previous winners`,
    `${raceName} ${year} key favorites contenders startlist teams`
  ];

  console.log(`🔎 Comprehensive search: ${raceName} ${year}`);
  console.log(`   Running ${queries.length} parallel queries...`);

  return perplexitySearch(queries, {
    maxResults: options.maxResults || 8,
    ...options
  });
}
