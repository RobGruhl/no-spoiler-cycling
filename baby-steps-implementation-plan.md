# Baby Steps Implementation Plan
## 5-Step Verification & Discovery Process

### Overview
Before building the full content discovery system, we need to verify our assumptions about each platform and identify the key entry points. Each step focuses on a simple verification that will inform our implementation strategy.

---

## Step 1: YouTube Public Content Discovery
**Goal**: Verify YouTube content availability and structure without authentication

### What We're Testing
- Can we find cycling content through public search?
- What information is available in video metadata?
- How does Firecrawl handle YouTube's structure?
- What are the key cycling channels and their URL patterns?

### Implementation
```javascript
// Test basic YouTube cycling content discovery
const firecrawl = new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY });

// Test 1: Search for recent cycling content
const searchResults = await firecrawl.search(
  'cycling race highlights 2025 OR tour de france',
  {
    limit: 5,
    sources: ['web'],
    scrapeOptions: {
      formats: ['markdown', 'json']
    }
  }
);

// Test 2: Map a known cycling channel
const gcnMapping = await firecrawl.map(
  'https://www.youtube.com/@gcn',
  {
    limit: 20,
    search: 'cycling race'
  }
);
```

### Key URLs to Explore
- `https://www.youtube.com/@gcn` (Global Cycling Network)
- `https://www.youtube.com/@uci` (UCI - Union Cycliste Internationale)
- `https://www.youtube.com/@letour` (Tour de France Official)
- `https://www.youtube.com/@eurosport` (Eurosport Cycling)
- `https://www.youtube.com/@flosports` (FloSports)

### Expected Outcomes
- ✅ Find 5+ cycling videos with clear metadata
- ✅ Identify video URLs, titles, durations, upload dates
- ✅ Verify no authentication needed for basic metadata
- ✅ Document channel URL patterns and content structure
- ❌ Identify any anti-bot measures or rate limiting

### Success Criteria
- Extract at least 10 cycling video entries with complete metadata
- Identify 3-5 reliable cycling channels with consistent content
- Verify spoiler-free content can be distinguished from result-containing content

---

## Step 2: FloBikes Anonymous vs Authenticated Content
**Goal**: Compare what's visible on FloBikes without login vs with credentials

### What We're Testing
- What cycling content is visible on FloBikes without authentication?
- How does the site structure change after login?
- What are the key cycling event listing pages?
- How does authentication affect content accessibility?

### Implementation
```javascript
// Test 1: Anonymous scraping of FloBikes cycling section
const anonymousContent = await firecrawl.scrape(
  'https://www.flobikes.com/events',
  {
    formats: ['markdown', 'json'],
    maxAge: 0  // Force fresh content
  }
);

// Test 2: Map FloBikes cycling events (anonymous)
const eventsMapping = await firecrawl.map(
  'https://www.flobikes.com/events',
  {
    limit: 50,
    search: 'cycling OR bike race'
  }
);

// Test 3: Attempt to scrape specific event page (anonymous)
const eventPageAnonymous = await firecrawl.scrape(
  'https://www.flobikes.com/events/14300386-2025-uci-road-world-championships',
  {
    formats: ['markdown'],
    proxy: 'auto'
  }
);
```

### Key URLs to Explore
- `https://www.flobikes.com/events` (Main events listing)
- `https://www.flobikes.com/events?sport=cycling` (Cycling-specific events)
- `https://www.flobikes.com/cycling` (Cycling homepage)
- `https://www.flobikes.com/live` (Live events)
- Individual event pages (pattern: `/events/{id}-{event-name}`)

### Expected Outcomes
- ✅ Identify what event information is public (titles, dates, basic descriptions)
- ✅ Find cycling event listing pages and their URL patterns
- ❌ Discover video access restrictions (login required)
- ✅ Map the site structure for cycling content
- ✅ Identify login/signup flow requirements

### Success Criteria
- Extract event titles, dates, and basic metadata without authentication
- Identify specific cycling event pages and their URL structure
- Confirm video content requires authentication
- Document the difference between public and private content

---

## Step 3: FloBikes Authenticated Content Access
**Goal**: Test login flow and verify authenticated content accessibility

### What We're Testing
- Can Firecrawl successfully authenticate with FloBikes?
- What additional content becomes available after login?
- How do we access video URLs and streaming content?
- What are the direct video player URL patterns?

### Implementation
```javascript
// Test authenticated login and content access
const loginActions = [
  { type: 'wait', milliseconds: 2000 },
  { type: 'click', selector: 'a[href="/login"]' },
  { type: 'wait', milliseconds: 1000 },
  { type: 'write', text: process.env.FLOBIKES_EMAIL },
  { type: 'press', key: 'Tab' },
  { type: 'write', text: process.env.FLOBIKES_PASSWORD },
  { type: 'click', selector: 'button[type="submit"]' },
  { type: 'wait', milliseconds: 5000 }
];

// Test 1: Login and scrape the same event page
const authenticatedEventPage = await firecrawl.scrape(
  'https://www.flobikes.com/events/14300386-2025-uci-road-world-championships',
  {
    formats: ['markdown', 'json'],
    actions: loginActions,
    proxy: 'auto'
  }
);

// Test 2: Navigate to video player
const videoPlayerActions = [
  ...loginActions,
  { type: 'click', selector: 'a[data-testid="watch-button"]' },
  { type: 'wait', milliseconds: 3000 }
];

const videoPlayerPage = await firecrawl.scrape(
  'https://www.flobikes.com/events/14300386-2025-uci-road-world-championships',
  {
    formats: ['markdown'],
    actions: videoPlayerActions
  }
);
```

### Key URLs to Explore After Login
- Event pages with video access
- Video player pages (pattern: `/events/{id}/videos?playing={video-id}`)
- User dashboard/my events
- Live streaming pages

### Expected Outcomes
- ✅ Successfully authenticate with provided credentials
- ✅ Access video content and player pages
- ✅ Extract video metadata (duration, quality, direct URLs)
- ✅ Identify video URL patterns for direct linking
- ❌ Discover any session management or token requirements

### Success Criteria
- Complete login flow without errors
- Access at least one video player page
- Extract video URLs that can be used for direct linking
- Document the complete flow from event listing to video player

---

## Step 4: Peacock Sports Section Exploration
**Goal**: Map Peacock's sports content structure and cycling availability

### What We're Testing
- Where is cycling content located within Peacock's structure?
- What's available without authentication vs with login?
- How is cycling content organized (live, replays, documentaries)?
- What are the URL patterns for cycling content?

### Implementation
```javascript
// Test 1: Anonymous exploration of Peacock sports
const peacockSports = await firecrawl.scrape(
  'https://www.peacocktv.com/sports',
  {
    formats: ['markdown'],
    proxy: 'auto'
  }
);

// Test 2: Search within Peacock for cycling content
const peacockCyclingSearch = await firecrawl.search(
  'cycling site:peacocktv.com OR "tour de france" site:peacocktv.com',
  {
    limit: 10,
    scrapeOptions: {
      formats: ['markdown']
    }
  }
);

// Test 3: Map Peacock sports structure
const peacockMapping = await firecrawl.map(
  'https://www.peacocktv.com/sports',
  {
    limit: 30,
    search: 'cycling'
  }
);
```

### Key URLs to Explore
- `https://www.peacocktv.com/sports` (Main sports section)
- `https://www.peacocktv.com/sports/cycling` (If it exists)
- `https://www.peacocktv.com/live-tv` (Live sports content)
- Search results for cycling content
- Individual cycling event pages

### Expected Outcomes
- ✅ Map the sports content structure on Peacock
- ✅ Identify if cycling has a dedicated section
- ✅ Find cycling content availability (current vs historical)
- ❌ Discover subscription requirements for cycling content
- ✅ Document URL patterns for cycling events

### Success Criteria
- Locate cycling content within Peacock's navigation
- Identify at least 3-5 cycling-related programs or events
- Understand the difference between free and premium cycling content
- Document the authentication requirements for full access

---

## Step 5: Cross-Platform Content Verification & Spoiler Assessment
**Goal**: Test content extraction and spoiler filtering across discovered sources

### What We're Testing
- Can we extract structured cycling content from each platform?
- How effective is our spoiler detection and filtering?
- What types of content are consistently spoiler-free?
- How do we reliably identify race previews vs race results?

### Implementation
```javascript
// Test extraction with spoiler filtering across platforms
const spoilerSafePrompt = `
Extract cycling content information while strictly avoiding spoilers:

INCLUDE:
- Race previews and stage analysis
- Technical discussions and equipment reviews
- Historical context and documentaries
- Training and preparation content
- Route descriptions and terrain analysis

EXCLUDE:
- Race results, winners, or podium positions
- Final standings or championship outcomes
- Post-race celebrations or disappointments
- Any content revealing race conclusions
- Results-based thumbnails or imagery

Return structured data with confidence scores for spoiler safety.
`;

// Test 1: Extract from YouTube search results
const youtubeSafeContent = await firecrawl.search(
  'cycling stage preview analysis',
  {
    limit: 5,
    scrapeOptions: {
      formats: ['json'],
      prompt: spoilerSafePrompt
    }
  }
);

// Test 2: Extract from FloBikes event page (authenticated)
const flobikesExtraction = await firecrawl.extract({
  urls: ['https://www.flobikes.com/events/14300386-2025-uci-road-world-championships'],
  prompt: spoilerSafePrompt,
  schema: {
    type: 'object',
    properties: {
      eventName: { type: 'string' },
      stages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            stageNumber: { type: 'number' },
            terrain: { type: 'string' },
            description: { type: 'string' },
            spoilerSafe: { type: 'boolean' }
          }
        }
      }
    }
  }
});
```

### Content Types to Test
- **Race Previews**: Stage breakdowns, route analysis, weather forecasts
- **Technical Content**: Bike tech, training tips, nutrition advice
- **Historical Content**: Past race documentaries (non-recent)
- **Live Coverage**: Pre-race analysis and commentary
- **Educational Content**: Cycling fundamentals, racing tactics

### Expected Outcomes
- ✅ Successfully extract spoiler-free content from multiple platforms
- ✅ Identify reliable indicators of spoiler-safe content
- ✅ Create confidence scoring for content safety
- ✅ Document content patterns that are consistently safe
- ❌ Find edge cases where spoiler detection might fail

### Success Criteria
- Extract 10+ pieces of verified spoiler-free content
- Develop reliable patterns for identifying safe content
- Create content categorization schema (preview, analysis, documentary, etc.)
- Establish confidence metrics for automated spoiler filtering

---

## Implementation Order & Timeline

### Week 1: Foundation Testing
- **Days 1-2**: Step 1 (YouTube) - Establish basic content discovery
- **Days 3-4**: Step 2 (FloBikes Anonymous) - Map platform structure
- **Days 5-7**: Step 3 (FloBikes Authenticated) - Verify login flow

### Week 2: Platform Expansion & Validation
- **Days 1-3**: Step 4 (Peacock) - Explore additional platform
- **Days 4-7**: Step 5 (Cross-Platform) - Validate spoiler filtering

### Success Metrics for Each Step
1. **Technical Success**: API calls complete without errors
2. **Content Discovery**: Find relevant cycling content
3. **Data Quality**: Extract structured, usable metadata
4. **Spoiler Safety**: Verify content filtering effectiveness
5. **Documentation**: Create detailed URL and pattern documentation

### Risk Mitigation
- **Anti-bot Protection**: Start with basic proxy, escalate to stealth if needed
- **Authentication Issues**: Verify credentials in .env file before testing
- **Rate Limiting**: Space out requests, use appropriate maxAge caching
- **Content Changes**: Document current site structure, expect future adjustments

This baby steps approach ensures we verify each assumption before building the full system, identifying potential issues early and establishing reliable patterns for content discovery.