# Non-Spoiler Cycling - Implementation Plan

**Version**: 2.0 MVP (Race Content Focus)
**Date**: September 21, 2025
**Status**: MVP Step 1 COMPLETED ✅

## Implementation Overview

This plan outlined the baby steps verification process and implementation phases for the race-focused cycling content discovery system. **MVP Step 1 has been successfully completed** with working UCI World Championships content discovery and spoiler-free presentation.

## ✅ COMPLETED: MVP Step 1 - Core System Verification

### What Was Accomplished:
- **Real content discovery**: Successfully found and filtered UCI World Championships race footage
- **Spoiler filtering**: Claude's intelligence properly identified and removed spoiler content
- **Working presentation**: Generated beautiful steephill.tv-style HTML with verified race content
- **End-to-end workflow**: Demonstrated complete Claude Code + Firecrawl + HTML generation pipeline

## Baby Steps Verification Process

### Step 1: YouTube Public Content Discovery
**Goal**: Verify YouTube content availability and structure without authentication

#### What We're Testing
- Can we find cycling content through public search?
- What information is available in video metadata?
- How does Firecrawl handle YouTube's structure?
- What are the key cycling channels and their URL patterns?

#### Implementation
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

#### Key URLs to Explore
- `https://www.youtube.com/@gcn` (Global Cycling Network)
- `https://www.youtube.com/@uci` (UCI - Union Cycliste Internationale)
- `https://www.youtube.com/@letour` (Tour de France Official)
- `https://www.youtube.com/@eurosport` (Eurosport Cycling)
- `https://www.youtube.com/@flosports` (FloSports)

#### Success Criteria
- Extract at least 10 cycling video entries with complete metadata
- Identify 3-5 reliable cycling channels with consistent content
- Verify race content can be distinguished from preview content

### Step 2: FloBikes Anonymous vs Authenticated Content
**Goal**: Compare what's visible on FloBikes without login vs with credentials

#### Implementation
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
```

#### Success Criteria
- Extract event titles, dates, and basic metadata without authentication
- Identify specific cycling event pages and their URL structure
- Confirm video content requires authentication
- Document the difference between public and private content

### Step 3: FloBikes Authenticated Content Access
**Goal**: Test login flow and verify authenticated content accessibility

#### Implementation
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

const authenticatedEventPage = await firecrawl.scrape(
  'https://www.flobikes.com/events/14300386-2025-uci-road-world-championships',
  {
    formats: ['markdown', 'json'],
    actions: loginActions,
    proxy: 'auto'
  }
);
```

#### Success Criteria
- Complete login flow without errors
- Access at least one video player page
- Extract video URLs that can be used for direct linking
- Document the complete flow from event listing to video player

### Step 4: Peacock Sports Section Exploration
**Goal**: Map Peacock's sports content structure and cycling availability

#### Implementation
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
```

#### Success Criteria
- Locate cycling content within Peacock's navigation
- Identify at least 3-5 cycling-related programs or events
- Understand the difference between free and premium cycling content
- Document the authentication requirements for full access

### Step 5: Cross-Platform Race Content Verification
**Goal**: Test content extraction and race footage identification across platforms

#### Implementation
```javascript
// Test extraction with race content filtering across platforms
const raceContentPrompt = `
Extract cycling content information focusing on actual race footage:

INCLUDE:
- Live race coverage and recordings
- Extended highlights and race summaries
- Full stage/event recordings
- Race replay content

EXCLUDE:
- Race previews and predictions
- Post-race analysis and speculation
- Pre-race shows and interviews
- Course profiles and tactics discussions

Return structured data with content type classification.
`;

const youtubeSafeContent = await firecrawl.search(
  'cycling race full coverage OR extended highlights',
  {
    limit: 5,
    scrapeOptions: {
      formats: ['json'],
      prompt: raceContentPrompt
    }
  }
);
```

#### Success Criteria
- Extract 10+ pieces of verified race content from multiple platforms
- Develop reliable patterns for identifying actual race footage
- Create content categorization schema (full-race, extended-highlights, highlights)
- Establish confidence metrics for automated race content filtering

## Implementation Timeline

### Week 1: Foundation Testing
- **Days 1-2**: Step 1 (YouTube) - Establish basic content discovery
- **Days 3-4**: Step 2 (FloBikes Anonymous) - Map platform structure
- **Days 5-7**: Step 3 (FloBikes Authenticated) - Verify login flow

### Week 2: Platform Expansion & Validation
- **Days 1-3**: Step 4 (Peacock) - Explore additional platform
- **Days 4-7**: Step 5 (Cross-Platform) - Validate race content filtering

## Full System Implementation Phases

### Phase 1: Core Discovery System (Week 3)
**Deliverables:**
- Platform-specific search functions (youtubeSearch, flobikeSearch, etc.)
- Content verification and scraping logic
- Basic race data structure (race-data.json)
- Initial HTML presentation generator

**User Requests to Claude:**
- "Set up FloBikes race content discovery"
- "Create initial race metadata structure"
- "Generate first HTML presentation file"
- "Test race content detection with sample data"

### Phase 2: Multi-Platform Integration (Week 4)
**Deliverables:**
- YouTube, Peacock, HBO Max discovery functions
- Enhanced content filtering for race footage
- Improved HTML design with race categorization
- Content verification and quality scoring

**User Requests to Claude:**
- "Add YouTube cycling channel discovery"
- "Integrate Peacock sports content discovery"
- "Include HBO Max cycling documentaries"
- "Enhance HTML design with steephill.tv styling"

### Phase 3: Intelligence & Polish (Week 5)
**Deliverables:**
- Optimized search term generation
- Enhanced content verification accuracy
- Link validation and error handling
- Mobile-responsive presentation improvements

**User Requests to Claude:**
- "Optimize race content detection accuracy"
- "Add comprehensive error handling"
- "Enhance mobile responsiveness"
- "Add content freshness tracking"

### Phase 4: Production Ready (Week 6)
**Deliverables:**
- Performance optimization and caching
- Comprehensive link validation
- Final presentation polish
- Documentation and deployment guides

**User Requests to Claude:**
- "Optimize HTML file size and performance"
- "Validate all video links for functionality"
- "Create final production-ready presentation"
- "Add comprehensive logging and monitoring"

## Success Metrics for Each Phase

### Baby Steps Verification:
1. **Technical Success**: API calls complete without errors
2. **Content Discovery**: Find relevant cycling race content
3. **Data Quality**: Extract structured, usable metadata
4. **Race Content Accuracy**: Verify content filtering effectiveness
5. **Documentation**: Create detailed URL and pattern documentation

### Full Implementation:
1. **Discovery Accuracy**: High-quality race content found during sessions
2. **Zero Preview Content**: No analysis/speculation mixed in
3. **Link Reliability**: 95%+ success rate for direct video access
4. **Performance**: <5 minute discovery sessions, <8KB HTML files

## Risk Mitigation Strategies

### Technical Risks:
- **Anti-bot Protection**: Start with basic proxy, escalate to stealth if needed
- **Authentication Issues**: Verify credentials in .env file before testing
- **Rate Limiting**: Space out requests, use appropriate maxAge caching
- **Content Changes**: Document current site structure, expect future adjustments

### Content Risks:
- **Preview vs Race Content**: Develop robust filtering based on duration and content analysis
- **Broken Links**: Implement link validation and automatic cleanup
- **Platform Changes**: Build adaptable scraping logic that can handle structure changes

### User Experience Risks:
- **Slow Discovery**: Optimize search terms and batch processing
- **Poor Mobile Experience**: Prioritize responsive design and fast loading
- **Authentication Complexity**: Keep user experience simple with direct links

## Working Session Interaction Patterns

### Regular Content Updates:
```
User: "Update all cycling content for the weekend"
Claude: [Discovers from all platforms, updates data, regenerates HTML]

User: "Focus on Tour de France updates only"
Claude: [Targeted discovery for Grand Tour content]

User: "Find any new cycling documentaries"
Claude: [Searches HBO Max and other platforms for documentary content]
```

### Content Management:
```
User: "Remove any races older than 30 days"
Claude: [Cleans old content from metadata and regenerates HTML]

User: "Verify all video links are still working"
Claude: [Tests links using Firecrawl, updates broken ones]

User: "Add more context to race descriptions"
Claude: [Enhances descriptions while maintaining focus on race content]
```

### Quality Assurance:
```
User: "Audit everything for preview content"
Claude: [Reviews all content, removes any non-race material]

User: "Check if any new platforms have cycling race content"
Claude: [Explores additional platforms for content discovery]

User: "Optimize the HTML for mobile viewing"
Claude: [Updates CSS and layout for better mobile experience]
```

This baby steps approach ensures we verify each assumption before building the full system, identifying potential issues early and establishing reliable patterns for race content discovery.

---

**Document Status**: Ready for Implementation
**Next Steps**: Begin Step 1 (YouTube Discovery) verification