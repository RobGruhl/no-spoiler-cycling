#!/usr/bin/env node

/**
 * URL Validation Utilities
 * Validates URL format, detects root URLs vs deep links, and identifies broadcaster patterns
 */

/**
 * Known root URL patterns for broadcasters - these should NOT be used as direct links
 * A root URL is just the homepage with no specific race/event content
 */
export const ROOT_URL_PATTERNS = {
  flobikes: /^https?:\/\/(www\.)?flobikes\.com\/?(\?.*)?$/,
  discoveryplus: /^https?:\/\/(www\.)?discoveryplus\.(com|co\.uk)\/?(\?.*)?$/,
  peacock: /^https?:\/\/(www\.)?peacocktv\.com\/?(\?.*)?$/,
  max: /^https?:\/\/(www\.)?max\.com\/?(\?.*)?$/,
  eurosport: /^https?:\/\/(www\.)?eurosport\.(com|co\.uk|de|fr|es|it)\/?(\?.*)?$/,
  gcn: /^https?:\/\/(www\.)?gcn\.(com|tv)\/?(\?.*)?$/,
  sbs: /^https?:\/\/(www\.)?sbs\.com\.au\/?(\?.*)?$/,
  sporza: /^https?:\/\/(www\.)?sporza\.be\/?(\?.*)?$/,
  youtube: /^https?:\/\/(www\.)?youtube\.com\/?(\?.*)?$/,
  stan: /^https?:\/\/(www\.)?stan\.com\.au\/?(\?.*)?$/
};

/**
 * Expected deep link patterns for broadcasters
 * A deep link goes directly to race content (event page, video, etc.)
 */
export const DEEP_LINK_PATTERNS = {
  flobikes: [
    /flobikes\.com\/events\/\d+/,
    /flobikes\.com\/video\/\d+/,
    /flobikes\.com\/collections\//,
    /flobikes\.com\/live\//
  ],
  discoveryplus: [
    /discoveryplus\.(com|co\.uk)\/video\//,
    /discoveryplus\.(com|co\.uk)\/show\//,
    /discoveryplus\.(com|co\.uk)\/sport\//
  ],
  peacock: [
    /peacocktv\.com\/watch\//,
    /peacocktv\.com\/sports\//,
    /peacocktv\.com\/browse\/sports\//
  ],
  max: [
    /max\.com\/video\//,
    /max\.com\/movies\//,
    /max\.com\/shows\//
  ],
  eurosport: [
    /eurosport\.(com|co\.uk|de|fr|es|it)\/cycling\//,
    /eurosport\.(com|co\.uk|de|fr|es|it)\/.*\/video\//
  ],
  youtube: [
    /youtube\.com\/watch\?v=/,
    /youtube\.com\/live\//,
    /youtu\.be\//
  ],
  gcn: [
    /gcn\.(com|tv)\/show\//,
    /gcn\.(com|tv)\/video\//
  ],
  sbs: [
    /sbs\.com\.au\/ondemand\//,
    /sbs\.com\.au\/sport\//
  ],
  sporza: [
    /sporza\.be\/nl\/matches\//,
    /sporza\.be\/.*\/video\//
  ],
  stan: [
    /stan\.com\.au\/watch\//,
    /stan\.com\.au\/programs\//
  ]
};

/**
 * Check if a string is a valid URL format
 * @param {string} url - The URL to validate
 * @returns {boolean}
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url === 'TBD' || url === 'undefined' || url === 'null') return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a URL is a root/homepage URL (not a deep link to specific content)
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
export function isRootUrl(url) {
  if (!isValidUrl(url)) return false;

  for (const [broadcaster, pattern] of Object.entries(ROOT_URL_PATTERNS)) {
    if (pattern.test(url)) {
      return true;
    }
  }
  return false;
}

/**
 * Detect which broadcaster a URL belongs to
 * @param {string} url - The URL to analyze
 * @returns {string|null} - Broadcaster identifier or null if unknown
 */
export function detectBroadcaster(url) {
  if (!isValidUrl(url)) return null;

  const urlLower = url.toLowerCase();

  // Check domain patterns
  if (urlLower.includes('flobikes.com')) return 'flobikes';
  if (urlLower.includes('discoveryplus')) return 'discoveryplus';
  if (urlLower.includes('peacocktv.com')) return 'peacock';
  if (urlLower.includes('max.com')) return 'max';
  if (urlLower.includes('eurosport')) return 'eurosport';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'youtube';
  if (urlLower.includes('gcn.com') || urlLower.includes('gcn.tv')) return 'gcn';
  if (urlLower.includes('sbs.com.au')) return 'sbs';
  if (urlLower.includes('sporza.be')) return 'sporza';
  if (urlLower.includes('stan.com.au')) return 'stan';

  return null;
}

/**
 * Check if a URL is a deep link (goes to specific content)
 * @param {string} url - The URL to check
 * @returns {boolean}
 */
export function isDeepLink(url) {
  if (!isValidUrl(url)) return false;
  if (isRootUrl(url)) return false;

  const broadcaster = detectBroadcaster(url);
  if (!broadcaster) {
    // Unknown broadcaster - assume it's okay if it has path segments
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.pathname.length > 1;
    } catch {
      return false;
    }
  }

  // Check against known deep link patterns
  const patterns = DEEP_LINK_PATTERNS[broadcaster];
  if (!patterns) return true; // No patterns defined, assume it's okay

  return patterns.some(pattern => pattern.test(url));
}

/**
 * Get all problems with a URL
 * @param {string} url - The URL to analyze
 * @returns {string[]} - Array of problem descriptions
 */
export function getUrlProblems(url) {
  const problems = [];

  if (!url) {
    problems.push('URL is missing');
    return problems;
  }

  if (url === 'TBD') {
    problems.push('URL is TBD (not yet populated)');
    return problems;
  }

  if (url === 'undefined' || url === 'null') {
    problems.push('URL is undefined/null string');
    return problems;
  }

  if (!isValidUrl(url)) {
    problems.push('URL format is invalid');
    return problems;
  }

  if (isRootUrl(url)) {
    const broadcaster = detectBroadcaster(url);
    problems.push(`Root URL detected (${broadcaster || 'unknown'}) - should be deep link to specific content`);
  }

  return problems;
}

/**
 * Validate broadcast URL and return detailed status
 * @param {string} url - The URL to validate
 * @returns {object} - Validation result with status and details
 */
export function validateBroadcastUrl(url) {
  const problems = getUrlProblems(url);

  return {
    url,
    valid: problems.length === 0,
    isDeepLink: isDeepLink(url),
    isRootUrl: isRootUrl(url),
    broadcaster: detectBroadcaster(url),
    problems,
    status: problems.length === 0 ? 'ok' :
            url === 'TBD' ? 'tbd' :
            isRootUrl(url) ? 'root-url' : 'invalid'
  };
}

/**
 * Extract YouTube video ID from URL
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null
 */
export function extractYouTubeVideoId(url) {
  if (!url) return null;

  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Summarize URL validation for a race's broadcast info
 * @param {object} broadcast - The broadcast object from race data
 * @returns {object} - Summary of URL validation across all geos
 */
export function validateRaceBroadcast(broadcast) {
  if (!broadcast || !broadcast.geos) {
    return {
      hasGeos: false,
      totalUrls: 0,
      validUrls: 0,
      rootUrls: 0,
      tbdUrls: 0,
      problems: ['No broadcast.geos defined']
    };
  }

  const results = {
    hasGeos: true,
    geoCount: Object.keys(broadcast.geos).length,
    totalUrls: 0,
    validUrls: 0,
    rootUrls: 0,
    tbdUrls: 0,
    invalidUrls: 0,
    byGeo: {},
    problems: []
  };

  for (const [geo, geoData] of Object.entries(broadcast.geos)) {
    const geoResult = {
      primary: null,
      alternatives: []
    };

    // Check primary
    if (geoData.primary?.url) {
      results.totalUrls++;
      const validation = validateBroadcastUrl(geoData.primary.url);
      geoResult.primary = validation;

      if (validation.valid && validation.isDeepLink) {
        results.validUrls++;
      } else if (validation.status === 'tbd') {
        results.tbdUrls++;
      } else if (validation.isRootUrl) {
        results.rootUrls++;
        results.problems.push(`${geo} primary: root URL (${validation.broadcaster})`);
      } else {
        results.invalidUrls++;
        results.problems.push(`${geo} primary: ${validation.problems.join(', ')}`);
      }
    }

    // Check alternatives
    if (geoData.alternatives) {
      for (const alt of geoData.alternatives) {
        if (alt.url) {
          results.totalUrls++;
          const validation = validateBroadcastUrl(alt.url);
          geoResult.alternatives.push(validation);

          if (validation.valid && validation.isDeepLink) {
            results.validUrls++;
          } else if (validation.status === 'tbd') {
            results.tbdUrls++;
          } else if (validation.isRootUrl) {
            results.rootUrls++;
            results.problems.push(`${geo} alt (${alt.broadcaster}): root URL`);
          } else {
            results.invalidUrls++;
            results.problems.push(`${geo} alt: ${validation.problems.join(', ')}`);
          }
        }
      }
    }

    results.byGeo[geo] = geoResult;
  }

  return results;
}

// Export default for convenience
export default {
  isValidUrl,
  isRootUrl,
  isDeepLink,
  detectBroadcaster,
  getUrlProblems,
  validateBroadcastUrl,
  extractYouTubeVideoId,
  validateRaceBroadcast,
  ROOT_URL_PATTERNS,
  DEEP_LINK_PATTERNS
};
