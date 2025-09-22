# Non-Spoiler Cycling - Product Requirements Document

**Version**: 2.0 MVP (Race Content Focus)
**Date**: September 21, 2025
**Status**: Implementation Ready

## Executive Summary

Non-Spoiler Cycling v2 MVP is a working session-driven cycling video discovery system focused exclusively on **actual race content**. Claude Code handles all content discovery during live sessions, finding live events, full race recordings, and highlights while excluding preview/analysis content. The system delivers verified race footage through a beautiful, static HTML presentation layer.

## Core Vision

**"Find the Rides. Watch the Races. No Spoilers."**

Users work with Claude Code to discover actual cycling race content during live sessions. Claude finds live events, full recordings, extended highlights, and regular highlights - but excludes all preview, analysis, and speculation content. Users receive direct links to watchable race footage.

## Content Focus (Critical)

### What We Want (Priority Order):
1. **Live events** (currently in progress)
2. **Full race recordings** (complete coverage, 3-5 hours)
3. **Extended highlights** (30+ minutes of race action)
4. **Regular highlights** (shorter race summaries)

### What We Exclude:
- Preview content and predictions
- Post-race analysis and speculation
- Pre-race shows and interviews
- Course profiles and tactics discussions
- "Who will win" content

### Core User Need
*"I want links to actual race footage so I can watch cycling without spoilers. Once I've watched the race, I can search around freely without spoiler concerns."*

## Working Session Architecture

```
Working Session (Claude Code + User):
├── User: "Find UCI World Championships race recordings"
├── Claude: Generate intelligent search terms
├── Claude: Platform-specific searches (YouTube, FloBikes, Peacock)
├── Claude: Analyze results for actual race content
├── Claude: Scrape promising candidates to verify race footage
├── Claude: Add verified race content to race-data.json
└── Claude: Generate updated HTML with new races

User Experience:
└── Receives updated HTML file with direct race links
    ├── Click race → immediately watch
    ├── No authentication complexity
    ├── Modern responsive design with gradient backgrounds
    └── Offline capable presentation
```

## Content Discovery Workflow

### Claude's 7-Step Process:
1. **Generate Search Terms**: Create multiple intelligent queries optimized for each platform
2. **Platform-Specific Search**: Use youtubeSearch(), flobikeSearch(), peacockSearch(), etc.
3. **Candidate Analysis**: Filter search results for actual race content (not previews)
4. **Content Scraping**: Scrape most promising URLs to verify they contain race footage
5. **Content Verification**: Confirm scraped content is live/recorded races or highlights
6. **Data Updates**: Add verified race content directly to race-data.json
7. **HTML Generation**: Run generate-page.js to update presentation

### Example Search Terms Claude Generates:
- "UCI World Championships 2025 Rwanda full race"
- "Tour de France 2025 stage complete coverage"
- "Giro d'Italia 2025 extended highlights"
- "Paris-Roubaix 2025 race recording"
- "Vuelta España 2025 full broadcast"

## Platform Strategy

### Target Platforms:
- **FloBikes**: Full race recordings and live coverage
- **YouTube**: Official channels (GCN, UCI, FloSports) for highlights
- **Peacock**: NBC cycling coverage and live events
- **HBO Max**: Cycling documentaries and archive footage

### Platform-Specific Functions:
```javascript
// Available in lib/firecrawl-utils.js
youtubeSearch(query, options)   // YouTube site-specific search
flobikeSearch(query, options)   // FloBikes site-specific search
peacockSearch(query, options)   // Peacock site-specific search
hboSearch(query, options)       // HBO Max site-specific search
```

## Data Structure

### race-data.json Schema:
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

## User Experience

### Modern Card-Based Design:
- Color-coded platform badges (YouTube red, FloBikes green, TBD gray)
- Professional card layout with gradient backgrounds and hover animations
- Content organization by type (Live Events, Full Race, Extended Highlights, Highlights)
- Channel transparency with verified badges for official sources
- Mobile responsive grid design with embedded CSS for complete self-contained files

### Single-Click Access:
- Click race card → immediate video player
- No authentication prompts or confirmations
- Links work with user's existing platform sessions
- Graceful handling when sessions expire

## Success Metrics

### Primary Objectives:
1. **Race Content Accuracy**: High-quality actual race footage found
2. **Zero Preview Content**: No analysis/speculation mixed in
3. **Link Reliability**: Direct access to video players
4. **Fast Discovery**: Efficient Claude working sessions

### Content Quality Standards:
- Full race recordings: 3-5 hour complete coverage
- Extended highlights: 30+ minutes of race action
- Regular highlights: 10-30 minutes of key moments
- All links bypass spoiler pages and go directly to players

## Working Session Examples

### Multi-Event Discovery:
```
User: "Find all available Tour de France 2025 stage recordings"

Claude Process:
1. Generate search terms for TdF stages
2. Search FloBikes, YouTube, Peacock for full recordings
3. Verify candidates contain actual stage footage (not previews)
4. Add verified recordings to race-data.json
5. Update HTML with new stage content

Response: "Found 12 TdF stage recordings - 8 full races, 4 extended highlights"
```

### Platform-Specific Discovery:
```
User: "Check YouTube for UCI World Championships highlights"

Claude Process:
1. Use youtubeSearch() with UCI Worlds terms
2. Filter for highlight content vs preview content
3. Scrape promising videos to verify they show race action
4. Add verified highlights to data
5. Update presentation

Response: "Found 5 UCI Worlds highlights - 2 extended, 3 regular length"
```

## Implementation Phases

### Phase 1: Core Discovery (Week 1)
- Set up platform-specific search functions
- Implement content verification logic
- Create basic race data structure
- Generate initial HTML presentation

### Phase 2: Multi-Platform (Week 2)
- Add YouTube, Peacock, HBO Max discovery
- Enhance content filtering for race footage
- Improve HTML design and responsiveness
- Add content categorization

### Phase 3: Polish (Week 3)
- Optimize search term generation
- Enhance content verification accuracy
- Add link validation and error handling
- Final presentation improvements

## Technical Requirements

### Library Functions:
- Platform-specific search: youtubeSearch(), flobikeSearch(), etc.
- Content scraping: scrapeContent() for verification
- Data management: createRaceEntry() for structured data
- HTML generation: generate-page.js for presentation

### File Structure:
- `lib/firecrawl-utils.js` - Core discovery functions
- `data/race-data.json` - Race content database
- `generate-page.js` - HTML presentation generator
- `index.html` - Generated presentation file

### Performance Targets:
- Discovery sessions: 2-5 minutes for comprehensive search
- HTML file size: <8KB including embedded CSS
- Load time: <1 second on modern devices
- Link success rate: 95%+ direct video access

---

**Document Status**: Implementation Ready
**Next Steps**: Begin Claude working sessions for race content discovery