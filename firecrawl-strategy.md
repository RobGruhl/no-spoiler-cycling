# Firecrawl Strategy for Non-Spoiler Cycling Content Discovery

## Executive Summary

This document outlines the optimal Firecrawl tool selection and implementation strategy for discovering spoiler-free cycling content across multiple platforms. The strategy leverages Firecrawl's advanced capabilities to handle authentication, anti-bot protection, structured data extraction, and intelligent content filtering while maintaining strict spoiler safety protocols.

## Core Requirements

### Spoiler Safety (Critical)
- **Zero tolerance** for race results, winner names, or podium positions
- Claude LLM must interpret all extracted content for spoiler detection
- Exclude uncertain content rather than risk spoiler exposure
- Focus on race context and significance, not outcomes

### Authentication & Access
- **FloBikes**: Email/password login required
- **Peacock**: Email/password for premium cycling content
- **HBO Max**: Email/password for documentaries
- **YouTube**: Public access, no authentication needed

### Target Content Types
- **Live race coverage** (full races, highlights)
- **Stage analyses** (route previews, terrain discussions)
- **Documentaries** (historical context, rider profiles)
- **Technical content** (bike tech, training insights)

## Platform-Specific Firecrawl Strategies

### 1. FloBikes - Premium Sports Streaming

**Primary Tool: Scrape with Actions + Extract**

**Authentication Flow:**
```javascript
// Login sequence using Firecrawl Actions
actions: [
  { type: 'wait', milliseconds: 2000 },
  { type: 'click', selector: 'button[data-testid="login-button"]' },
  { type: 'wait', milliseconds: 1000 },
  { type: 'write', text: process.env.FLOBIKES_EMAIL },
  { type: 'press', key: 'Tab' },
  { type: 'write', text: process.env.FLOBIKES_PASSWORD },
  { type: 'click', selector: 'button[type="submit"]' },
  { type: 'wait', milliseconds: 3000 }
]
```

**Content Discovery Strategy:**
1. **Map** cycling events directory (`/events/cycling`)
2. **Scrape with Actions** to navigate authenticated event pages
3. **Extract** race metadata using structured schemas
4. **Stealth mode** for anti-bot protection

**Extraction Schema:**
```json
{
  "type": "object",
  "properties": {
    "races": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "stage": {"type": "string"},
          "terrain": {"type": "string"},
          "videoUrl": {"type": "string"},
          "duration": {"type": "string"},
          "type": {"type": "string"},
          "description": {"type": "string"}
        }
      }
    }
  }
}
```

**Cost Optimization:**
- Use `maxAge: 3600000` (1 hour cache) for event listings
- Batch process multiple events with `extract` endpoint
- `proxy: "auto"` for intelligent stealth mode usage

### 2. YouTube - Open Platform Discovery

**Primary Tool: Search + Map + Extract**

**Content Discovery Strategy:**
1. **Search** for cycling-specific channels and recent content
2. **Map** official cycling channels (GCN, UCI, FloSports, etc.)
3. **Extract** video metadata with spoiler filtering

**Search Queries:**
```javascript
// Recent cycling content discovery
queries: [
  "cycling race highlights 2025",
  "tour de france stage preview",
  "cycling documentary",
  "pro cycling analysis",
  "bike race coverage"
]
```

**Channel Mapping:**
```javascript
// Official cycling channels to map
channels: [
  "https://youtube.com/@gcn",
  "https://youtube.com/@uci",
  "https://youtube.com/@flosports",
  "https://youtube.com/@eurosport",
  "https://youtube.com/@letour"
]
```

**Spoiler Filtering Prompt:**
```
Extract cycling video information while strictly avoiding any spoiler content. Focus on:
- Stage/race previews and analysis
- Technical discussions and bike reviews
- Historical context and documentaries
- Training and educational content

EXCLUDE any content that mentions:
- Race winners or podium positions
- Final results or standings
- Outcome-revealing thumbnails
- Post-race celebrations or disappointments
```

### 3. Peacock - NBC Premium Sports

**Primary Tool: Scrape with Actions + Search within site**

**Authentication & Navigation:**
```javascript
// Multi-step navigation to cycling content
actions: [
  { type: 'wait', milliseconds: 2000 },
  { type: 'click', selector: 'a[href="/signin"]' },
  { type: 'write', text: process.env.PEACOCK_EMAIL },
  { type: 'press', key: 'Tab' },
  { type: 'write', text: process.env.PEACOCK_PASSWORD },
  { type: 'click', selector: 'button[type="submit"]' },
  { type: 'wait', milliseconds: 5000 },
  { type: 'click', selector: 'a[href="/sports"]' },
  { type: 'wait', milliseconds: 2000 }
]
```

**Content Strategy:**
1. **Scrape** sports homepage with authentication
2. **Search within site** for cycling-specific content
3. **Extract** with cycling content filter
4. **Stealth mode** required for subscription protection

**Site-Specific Search:**
```javascript
// Search within Peacock for cycling
searchParams: {
  query: "cycling OR tour de france OR giro d'italia OR vuelta",
  limit: 20,
  scrapeOptions: {
    formats: ["json"],
    onlyMainContent: true
  }
}
```

### 4. HBO Max - Documentary Content

**Primary Tool: Search + Extract with Web Search**

**Content Discovery:**
```javascript
// Focus on cycling documentaries and series
searchStrategy: {
  query: "cycling documentary HBO Max",
  sources: ["web"],
  enableWebSearch: true,
  scrapeOptions: {
    formats: ["json"],
    prompt: "Extract cycling documentary information including titles, descriptions, and streaming availability"
  }
}
```

**Documentary-Focused Extraction:**
```json
{
  "type": "object",
  "properties": {
    "documentaries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "title": {"type": "string"},
          "description": {"type": "string"},
          "year": {"type": "number"},
          "duration": {"type": "string"},
          "availability": {"type": "string"},
          "themes": {"type": "array"}
        }
      }
    }
  }
}
```

## Workflow Implementation Patterns

### 1. Discovery Session Workflow

```javascript
// Complete platform discovery session
async function discoverCyclingContent() {
  const results = {
    flobikes: [],
    youtube: [],
    peacock: [],
    hbomax: []
  };

  // FloBikes authenticated discovery
  const flobikesScrape = await firecrawl.scrape(
    'https://flobikes.com/events/cycling',
    {
      formats: ['json'],
      actions: FLOBIKES_LOGIN_ACTIONS,
      proxy: 'auto',
      maxAge: 3600000
    }
  );

  // YouTube channel mapping and search
  const youtubeResults = await firecrawl.search(
    'cycling race preview analysis 2025',
    {
      limit: 15,
      sources: ['web'],
      scrapeOptions: {
        formats: ['json'],
        prompt: SPOILER_SAFE_EXTRACTION_PROMPT
      }
    }
  );

  // Process and filter all results through Claude LLM
  return await processWithSpoilerFilter(results);
}
```

### 2. Intelligent Batch Processing

```javascript
// Batch extract from discovered URLs
async function batchExtractRaceData(urls) {
  return await firecrawl.extract({
    urls: urls,
    prompt: "Extract race information focusing on stage terrain, distance, and strategic significance while avoiding any spoiler content",
    schema: RACE_METADATA_SCHEMA,
    enableWebSearch: false
  });
}
```

### 3. Error Handling & Retry Logic

```javascript
// Robust error handling with stealth fallback
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

## Cost Optimization Strategies

### 1. Intelligent Caching
- **Event listings**: `maxAge: 3600000` (1 hour)
- **Video metadata**: `maxAge: 86400000` (24 hours)
- **Static content**: `maxAge: 604800000` (1 week)

### 2. Selective Stealth Mode
- Start with `proxy: "auto"` for cost efficiency
- Use `proxy: "stealth"` only for confirmed bot protection
- Monitor response codes (401, 403, 500) for stealth triggers

### 3. Batch Operations
- Use `extract` endpoint for multiple URLs simultaneously
- Combine `map` + `batch_scrape` for large site discovery
- Limit search results to necessary quantity

### 4. Schema-Driven Extraction
- Pre-defined JSON schemas reduce processing costs
- Specific prompts minimize token usage
- Targeted extraction vs. full page scraping

## Data Processing Pipeline

### 1. Raw Content Extraction
```javascript
// Firecrawl extracts raw content with authentication
const rawContent = await firecrawl.scrape(url, options);
```

### 2. LLM Spoiler Filtering
```javascript
// Claude processes content for spoiler safety
const filteredContent = await claude.process({
  content: rawContent,
  prompt: "Filter this cycling content to remove any spoilers while preserving race context and significance"
});
```

### 3. Structured Data Creation
```javascript
// Update race-metadata.json with new discoveries
const raceMetadata = {
  lastUpdated: new Date().toISOString(),
  discoverySession: {
    sessionId: generateSessionId(),
    platforms: ['flobikes', 'youtube', 'peacock'],
    racesFound: filteredContent.length,
    racesAdded: newRaces.length
  },
  races: structuredRaceData
};
```

### 4. HTML Generation
```javascript
// Generate static HTML presentation
await generateStaticHTML(raceMetadata);
```

## Security & Compliance

### 1. Credential Management
- Environment variables for all authentication
- No hardcoded credentials in code
- Secure session handling for authenticated scraping

### 2. Rate Limiting & Respectful Scraping
- Built-in Firecrawl rate limiting
- Appropriate delays between requests
- Cache utilization to minimize requests

### 3. Content Rights Compliance
- Focus on metadata extraction, not content piracy
- Link to official sources, don't duplicate content
- Respect robots.txt and platform terms of service

## Monitoring & Optimization

### 1. Success Rate Tracking
- Monitor authentication success rates
- Track content discovery effectiveness
- Measure spoiler filtering accuracy

### 2. Cost Management
- Weekly credit usage analysis
- Optimize based on most valuable content sources
- Adjust caching strategies based on update frequency

### 3. Content Quality Metrics
- Measure spoiler-safety of discovered content
- Track direct link functionality
- Monitor user engagement with different content types

## Future Enhancements

### 1. Advanced AI Integration
- **FIRE-1 Agent** for complex site navigation
- Enhanced spoiler detection using computer vision
- Automated quality scoring for discovered content

### 2. Real-Time Discovery
- **Webhook integrations** for immediate content updates
- Live event detection and filtering
- Dynamic content prioritization based on racing calendar

### 3. Platform Expansion
- Additional streaming services (Discovery+, Amazon Prime)
- Regional cycling coverage platforms
- Social media integration for breaking news

## Implementation Priority

### Phase 1: Core Platforms (Week 1-2)
1. **FloBikes** - Primary premium content source
2. **YouTube** - High-volume public content
3. **Basic spoiler filtering** and data structure

### Phase 2: Enhanced Discovery (Week 3-4)
1. **Peacock** integration with authentication
2. **HBO Max** documentary discovery
3. **Advanced spoiler detection** with LLM enhancement

### Phase 3: Optimization (Week 5-6)
1. **Cost optimization** and caching strategies
2. **Error handling** and retry mechanisms
3. **Performance monitoring** and analytics

### Phase 4: Advanced Features (Week 7+)
1. **FIRE-1 agent** integration for complex sites
2. **Real-time content updates**
3. **Quality scoring** and content recommendation

This strategy provides a comprehensive roadmap for leveraging Firecrawl's capabilities while maintaining the project's core requirement of spoiler-free cycling content discovery through intelligent working sessions with Claude Code.