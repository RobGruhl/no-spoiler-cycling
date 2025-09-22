# Non-Spoiler Cycling - Technical Documentation

**Version**: 2.0 MVP (Race Content Focus)
**Date**: September 21, 2025

## 🧠 CRITICAL: Claude Code Intelligence Workflow

**IMPORTANT**: This system is designed around Claude Code's native intelligence handling all content analysis, filtering, and decision-making. DO NOT write code for:

- **Language parsing or keyword detection** - Claude analyzes content naturally
- **Spoiler detection logic** - Claude identifies spoilers using contextual understanding
- **Content deduplication** - Claude recognizes duplicate content intelligently
- **Race content classification** - Claude determines if content is actual race footage vs preview
- **Search term generation** - Claude creates intelligent, platform-specific search queries
- **Content verification** - Claude reads and analyzes scraped content to verify it's race footage

### Working Session Flow:
1. **User**: "Find UCI World Championships race content"
2. **Claude**: Generates intelligent search terms using native understanding
3. **Claude**: Uses Bash tool to execute Node.js commands calling firecrawl-utils.js functions
4. **Claude**: Analyzes results, identifies race content, filters spoilers
5. **Claude**: Deduplicates and structures data using intelligence
6. **Claude**: Uses Edit tool to update race-data.json with verified content
7. **Claude**: Regenerates HTML with npm run build

The utilities (lib/firecrawl-utils.js) provide only basic API wrappers called via Node.js commands. All intelligence, analysis, and decision-making happens in the Claude Code working session.

## Technical Architecture

### Working Session Architecture
```
Working Session (Claude Code + User):
├── User: "Find UCI World Championships race recordings"
├── Claude: Generate intelligent search terms
├── Claude: Execute Node.js commands via Bash tool for platform searches
├── Claude: Analyze results for actual race content using natural language understanding
├── Claude: Execute Node.js scraping commands to verify race footage
├── Claude: Use Edit tool to add verified race content to race-data.json
└── Claude: Run npm run build via Bash tool to regenerate HTML

User Experience:
└── Static HTML file with embedded CSS and race links
    ├── Offline capable
    ├── Direct video access
    ├── Mobile responsive
    └── Self-contained (no external dependencies)
```

## Core Technology Stack

### Primary Tool: Firecrawl API
- **Session-based discovery**: Claude makes API calls during working sessions
- API key available in `.env` as `FIRECRAWL_API_KEY`
- Returns clean markdown/JSON for Claude to interpret
- Handles platform authentication via provided credentials
- Built-in stealth mode for anti-bot protection

### Intelligence Layer: Claude Code LLM
- **Two-Stage Content Discovery**:
  1. **Search**: Execute Node.js commands via Bash tool to call firecrawl-utils.js search functions
  2. **Scrape & Analyze**: Execute Node.js commands via Bash tool to scrape and verify race footage
- **Content interpretation**: Parse Firecrawl responses using natural language understanding
- **Race content detection**: Intelligently identify actual race footage vs preview content
- **Race classification**: Categorize as Grand Tour, Classic, Stage Race, World Championships
- **Metadata extraction**: Pull titles, durations, platform info, video types
- **Data structuring**: Use Edit tool to update race-data.json with discovered content

### Static Presentation Layer
- **Self-contained HTML**: All CSS and minimal JavaScript embedded
- **No external dependencies**: Completely portable and offline-capable
- **Direct video links**: Bypass platform homepages and preview pages
- **Mobile responsive**: Works perfectly on all devices
- **Fast loading**: No API calls or complex authentication flows

## Platform-Specific Firecrawl Strategies

### 1. FloBikes - Premium Sports Streaming
**Primary Tool**: Scrape with Actions + Extract

**Authentication Flow:**
```javascript
const loginActions = [
  { type: 'wait', milliseconds: 2000 },
  { type: 'click', selector: 'button[data-testid="login-button"]' },
  { type: 'wait', milliseconds: 1000 },
  { type: 'write', text: process.env.FLOBIKES_EMAIL },
  { type: 'press', key: 'Tab' },
  { type: 'write', text: process.env.FLOBIKES_PASSWORD },
  { type: 'click', selector: 'button[type="submit"]' },
  { type: 'wait', milliseconds: 3000 }
];
```

**Content Discovery Strategy:**
1. **Map** cycling events directory (`/events/cycling`)
2. **Scrape with Actions** to navigate authenticated event pages
3. **Extract** race metadata using structured schemas
4. **Stealth mode** for anti-bot protection

**Cost Optimization:**
- Use `maxAge: 3600000` (1 hour cache) for event listings
- Batch process multiple events with `extract` endpoint
- `proxy: "auto"` for intelligent stealth mode usage

### 2. YouTube - Open Platform Discovery
**Primary Tool**: Search + Map + Extract

**Content Discovery Strategy:**
1. **Search** for cycling-specific channels and recent content
2. **Map** official cycling channels (GCN, UCI, FloSports, etc.)
3. **Extract** video metadata with race content filtering

**Search Queries:**
```javascript
const searchQueries = [
  "cycling race full coverage 2025",
  "tour de france stage recording",
  "cycling extended highlights",
  "pro cycling race replay",
  "bike race complete coverage"
];
```

**Channel Mapping:**
```javascript
const channels = [
  "https://youtube.com/@gcn",
  "https://youtube.com/@uci",
  "https://youtube.com/@flosports",
  "https://youtube.com/@eurosport",
  "https://youtube.com/@letour"
];
```

**Race Content Filtering Prompt:**
```
Extract cycling video information focusing on actual race footage. Include:
- Full race recordings and live coverage
- Extended highlights and race summaries
- Stage/event replays and complete coverage

EXCLUDE any content that is:
- Race previews and predictions
- Post-race analysis and speculation
- Pre-race shows and interviews
- Course profiles and tactics discussions
```

### 3. Peacock - NBC Premium Sports
**Primary Tool**: Scrape with Actions + Search within site

**Authentication & Navigation:**
```javascript
const peacockActions = [
  { type: 'wait', milliseconds: 2000 },
  { type: 'click', selector: 'a[href="/signin"]' },
  { type: 'write', text: process.env.PEACOCK_EMAIL },
  { type: 'press', key: 'Tab' },
  { type: 'write', text: process.env.PEACOCK_PASSWORD },
  { type: 'click', selector: 'button[type="submit"]' },
  { type: 'wait', milliseconds: 5000 },
  { type: 'click', selector: 'a[href="/sports"]' },
  { type: 'wait', milliseconds: 2000 }
];
```

**Content Strategy:**
1. **Scrape** sports homepage with authentication
2. **Search within site** for cycling-specific content
3. **Extract** with cycling content filter
4. **Stealth mode** required for subscription protection

### 4. HBO Max - Documentary Content
**Primary Tool**: Search + Extract with Web Search

**Content Discovery:**
```javascript
const hboSearchStrategy = {
  query: "cycling documentary HBO Max",
  sources: ["web"],
  enableWebSearch: true,
  scrapeOptions: {
    formats: ["json"],
    prompt: "Extract cycling documentary information including titles, descriptions, and streaming availability"
  }
};
```

## Library Functions

### Core Utility Library: `lib/firecrawl-utils.js`

```javascript
// Platform-specific search functions
export async function youtubeSearch(query, options = {}) {
  const youtubeQuery = `site:youtube.com ${query}`;
  return searchContent(youtubeQuery, {
    limit: options.limit || 8,
    ...options
  });
}

export async function flobikeSearch(query, options = {}) {
  const flobikeQuery = `site:flobikes.com ${query}`;
  return searchContent(flobikeQuery, {
    limit: options.limit || 8,
    ...options
  });
}

export async function peacockSearch(query, options = {}) {
  const peacockQuery = `site:peacocktv.com ${query}`;
  return searchContent(peacockQuery, {
    limit: options.limit || 5,
    ...options
  });
}

export async function hboSearch(query, options = {}) {
  const hboQuery = `site:hbomax.com ${query}`;
  return searchContent(hboQuery, {
    limit: options.limit || 5,
    ...options
  });
}

// Core search and scrape functions
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

// Two-stage discovery process
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

// Helper functions
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
```

## Data Structure

### race-data.json Schema
```json
{
  "lastUpdated": "2025-09-21T15:30:00Z",
  "event": {
    "name": "UCI Road World Championships 2025",
    "location": "Rwanda",
    "year": 2025
  },
  "races": [
    {
      "id": "race-unique-id",
      "name": "UCI Worlds 2025 Men's Road Race",
      "description": "Complete coverage of the men's road race",
      "platform": "FloBikes",
      "url": "https://flobikes.com/events/123/videos?playing=456",
      "type": "full-race",
      "duration": "4:23:15",
      "discoveredAt": "2025-09-21T15:25:00Z"
    }
  ]
}
```

### Content Type Classifications
- **full-race**: Complete race recordings (3-5 hours)
- **extended-highlights**: Extended race summaries (30+ minutes)
- **highlights**: Regular race highlights (10-30 minutes)
- **live**: Currently live events
- **recording**: General race recordings

## HTML Generation

### generate-page.js Structure
```javascript
import fs from 'fs';

function generateHTML() {
  const raceData = JSON.parse(fs.readFileSync('./data/race-data.json', 'utf8'));

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${raceData.event.name}</title>
    <style>
        /* Embedded CSS for self-contained file */
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        .race-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
            gap: 1rem;
        }
        .race-card {
            background: #f5f5f5;
            border-radius: 8px;
            padding: 1rem;
            cursor: pointer;
            transition: transform 0.2s;
        }
        .race-card:hover { transform: translateY(-2px); }
        .full-race { background: #fff3cd; }
        .extended-highlights { background: #d4edda; }
        .highlights { background: #cce7ff; }
    </style>
</head>
<body>
    <h1>${raceData.event.name}</h1>
    <div class="race-grid">
        ${raceData.races.map(race => generateRaceCard(race)).join('')}
    </div>
</body>
</html>`;

  fs.writeFileSync('./index.html', html);
  console.log('✅ Generated index.html with updated race content');
}

function generateRaceCard(race) {
  return `
    <div class="race-card ${race.type}" onclick="window.open('${race.url}', '_blank')">
        <h3>${race.name}</h3>
        <p><strong>Platform:</strong> ${race.platform}</p>
        <p><strong>Type:</strong> ${race.type}</p>
        ${race.duration ? `<p><strong>Duration:</strong> ${race.duration}</p>` : ''}
        <p>${race.description}</p>
    </div>`;
}
```

## Claude Working Session Workflow

### Claude's 7-Step Process
```bash
# Example Claude session implementation via Bash tool

# Step 1: Claude generates intelligent search terms using natural language understanding

# Step 2: Platform-specific searches via Node.js commands
node -e "
import { youtubeSearch, flobikeSearch } from './lib/firecrawl-utils.js';
async function searchMultiplePlatforms() {
  const term = 'UCI World Championships 2025 Rwanda';
  const youtubeCandidates = await youtubeSearch(term, { limit: 3 });
  const flobikeCandidates = await flobikeSearch(term, { limit: 3 });
  console.log('YouTube results:', youtubeCandidates.length);
  console.log('FloBikes results:', flobikeCandidates.length);
}
searchMultiplePlatforms().catch(console.error);
"

# Step 3: Claude analyzes results using natural language understanding

# Step 4: Scrape promising candidates via Node.js commands
node -e "
import { scrapeContent } from './lib/firecrawl-utils.js';
async function verifyRaceContent() {
  const scrapedContent = await scrapeContent('https://example-race-url.com');
  if (scrapedContent && scrapedContent.markdown) {
    console.log('Content verification complete');
  }
}
verifyRaceContent().catch(console.error);
"

# Step 5: Claude uses Edit tool to update race-data.json with verified content

# Step 6: Generate updated HTML via npm run build
npm run build
```

## Performance Optimization

### Caching Strategy
- **Event listings**: `maxAge: 3600000` (1 hour)
- **Video metadata**: `maxAge: 86400000` (24 hours)
- **Static content**: `maxAge: 604800000` (1 week)

### Cost Optimization
- Start with `proxy: "auto"` for cost efficiency
- Use `proxy: "stealth"` only for confirmed bot protection
- Batch operations with `extract` endpoint
- Schema-driven extraction reduces processing costs

### File Size Targets
- **HTML File Size**: <8KB including embedded CSS
- **Data File Size**: race-data.json optimized for essential information only
- **Performance**: <1 second load time on modern devices

## Security & Compliance

### Credential Management
```bash
# .env file structure
FIRECRAWL_API_KEY=your_firecrawl_api_key
FLOBIKES_EMAIL=your_flobikes_email
FLOBIKES_PASSWORD=your_flobikes_password
PEACOCK_EMAIL=your_peacock_email
PEACOCK_PASSWORD=your_peacock_password
HBOMAX_EMAIL=your_hbomax_email
HBOMAX_PASSWORD=your_hbomax_password
```

### Rate Limiting & Respectful Scraping
- Built-in Firecrawl rate limiting
- Appropriate delays between requests
- Cache utilization to minimize requests
- Respect robots.txt and platform terms of service

## Error Handling

### Robust Error Handling with Stealth Fallback
```javascript
async function scrapeWithFallback(url, options = {}) {
  try {
    // First attempt with basic proxy
    return await firecrawl.scrape(url, {
      ...options,
      proxy: 'basic'
    });
  } catch (error) {
    if (error.status === 403 || error.status === 401) {
      // Retry with stealth mode
      return await firecrawl.scrape(url, {
        ...options,
        proxy: 'stealth'
      });
    }
    throw error;
  }
}
```

### Content Validation
- Verify all extracted content is actual race footage
- Exclude uncertain content rather than risk including previews
- Validate video links before adding to data
- Regular cleanup of broken or outdated links

## Monitoring & Analytics

### Success Rate Tracking
- Monitor authentication success rates
- Track content discovery effectiveness
- Measure race content accuracy
- Link functionality validation

### Content Quality Metrics
- Full race recordings vs highlights ratio
- Platform distribution of content
- User engagement with different content types
- Discovery session efficiency

---

**Document Status**: Implementation Ready
**Next Steps**: Set up development environment and begin baby steps verification