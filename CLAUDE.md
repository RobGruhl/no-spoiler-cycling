# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Non-Spoiler Sports v2 MVP is a working session-driven cycling video discovery system. Claude Code handles all content discovery during live sessions with the user, interpreting raw content and updating a simple data layer. The system delivers spoiler-free cycling content through a beautiful, static HTML presentation layer.

## Working Session Architecture

The project uses a clean separation between discovery and presentation:

```
Working Session (Claude Code + User):
├── Firecrawl API calls for content discovery
├── LLM interpretation and spoiler filtering
├── Data layer updates (race-data.json)
└── Static presentation updates (index.html)

User Experience:
└── Receives updated HTML file with latest racing content
```

## Core Workflow

### 1. Discovery Sessions (Claude Code + User)
- **User Request**: "Discover new cycling content from FloBikes"
- **Claude Action**: Use Firecrawl API with provided credentials
- **Claude Processing**: Interpret raw content using LLM intelligence
- **Claude Output**: Update race-data.json with new discoveries
- **Final Step**: Regenerate index.html with updated content

### 2. User Experience (Static Files)
- **Simple HTML file**: Displays race content with steephill.tv-inspired design
- **Direct video links**: Click race → immediately watch (no authentication needed in browser)
- **Offline capable**: Works without internet once generated
- **Fast loading**: No API calls or complex JavaScript

## Key Technologies and Responsibilities

### Primary Tool: Firecrawl API
- **Raw content fetching**: API calls during Claude Code working sessions
- API key available in `.env` as `FIRECRAWL_API_KEY`
- Returns clean markdown/JSON for Claude to interpret
- Handles authentication via provided credentials
- Built-in stealth mode for anti-bot protection

### Intelligence Layer: Claude Code LLM
- **Two-Stage Content Discovery**:
  1. **Search**: Use Firecrawl `/search` to find candidate URLs
  2. **Scrape & Analyze**: Use Firecrawl `/scrape` to read full content and verify spoiler safety
- **Content interpretation**: Parse Firecrawl responses using natural language understanding
- **Spoiler detection**: Intelligently identify and filter result-revealing content by reading actual page content
- **Race classification**: Categorize as Grand Tour, Classic, Stage Race, World Championships
- **Metadata extraction**: Pull titles, durations, platform info, video types
- **Description generation**: Create engaging spoiler-free summaries
- **Data structuring**: Update race-data.json with discovered content

**CRITICAL**: Never add content to race-data.json based solely on search results. Always use Claude's intelligence to analyze content and verify spoiler safety before adding to data file.

### Platform Credentials
Authentication credentials for Claude's content discovery stored in `.env`:
- `FLOBIKES_EMAIL` and `FLOBIKES_PASSWORD`
- `PEACOCK_EMAIL` and `PEACOCK_PASSWORD`
- `HBOMAX_EMAIL` and `HBOMAX_PASSWORD`

## Core Principles

### Content Focus (Critical)
- **Race Content Only**: Focus exclusively on live events, full race recordings, extended highlights, or regular highlights
- **Priority Order**:
  1. Live events (currently in progress)
  2. Full race recordings (complete coverage)
  3. Extended highlights (30+ minutes)
  4. Regular highlights (shorter versions)
- **Exclude**: Preview content, analysis, speculation, pre-race shows, post-race interviews
- **Goal**: Direct links to actual race footage for immediate viewing

### Working Session Content Discovery
1. **Generate Search Terms**: Claude creates multiple intelligent search queries optimized for each platform
2. **Platform-Specific Search**: Use platform-specific search functions (youtubeSearch, flobikeSearch, etc.)
3. **Candidate Analysis**: Claude analyzes search results to identify actual race content (not previews/analysis)
4. **Content Scraping**: Scrape most promising candidates to verify they contain race footage
5. **Content Verification**: Confirm scraped content matches criteria (live/recorded races or highlights)
6. **Data Updates**: Add verified race content directly to race-data.json
7. **HTML Generation**: Run generate-page.js to update the presentation

## Data Structure

### race-data.json Schema
```json
{
  "lastUpdated": "2025-09-21T15:30:00Z",
  "discoverySession": {
    "sessionId": "session-uuid",
    "platforms": ["flobikes", "youtube", "peacock"],
    "racesFound": 12,
    "racesAdded": 8
  },
  "races": {
    "race-unique-id": {
      "name": "Tour de France 2025 - Stage 12",
      "series": "grand-tour",
      "year": 2025,
      "stage": {
        "number": 12,
        "type": "mountain",
        "terrain": "Alpine climbing with summit finish"
      },
      "video": {
        "platform": "flobikes",
        "url": "https://flobikes.com/events/123/videos?playing=456",
        "type": "full-race",
        "duration": "4:23:15",
        "quality": "HD"
      },
      "description": "Epic mountain stage through the French Alps featuring multiple categorized climbs",
      "discoveredAt": "2025-09-21T15:25:00Z",
      "spoilerSafe": true
    }
  }
}
```

### index.html Features
- **Steephill.tv-inspired design**: Color-coded race categories, clean layout
- **Embedded CSS**: No external dependencies, complete self-contained file
- **Static content**: Displays races from race-data.json data
- **Direct links**: Click race → immediate video player access
- **Mobile responsive**: Works on all devices
- **Fast loading**: No JavaScript API calls or authentication

## Platform-Specific Discovery

### FloBikes Discovery (Claude Session)
```
User: "Discover new content from FloBikes"

Claude Process:
1. Use Firecrawl API with FLOBIKES credentials
2. Scrape event pages like /events/14300386-2025-uci-road-world-championships
3. Interpret event listings and extract video metadata
4. Generate direct URLs with playing= parameters
5. Create spoiler-free descriptions
6. Update race-data.json with new races
7. Regenerate index.html with updated content
```

### YouTube Discovery (Claude Session)
```
User: "Check YouTube for new cycling content"

Claude Process:
1. Use Firecrawl API on official channels (GCN, UCI, FloSports)
2. Parse channel content for cycling videos
3. Filter out reaction videos and spoiler content
4. Extract video metadata and direct YouTube URLs
5. Generate spoiler-free descriptions
6. Update data and regenerate HTML
```

### NBC Peacock Discovery (Claude Session)
```
User: "Find cycling content on Peacock"

Claude Process:
1. Use Firecrawl API with PEACOCK credentials
2. Access cycling sections within sports content
3. Identify cycling-specific videos vs other sports
4. Generate deep links bypassing homepage
5. Create appropriate metadata and descriptions
6. Update data files and HTML presentation
```

## Claude Code Working Session Examples

### Content Discovery Session
```
User: "Find UCI World Championships 2025 race recordings and highlights"

Claude Workflow:
1. Generate intelligent search terms:
   - "UCI World Championships 2025 Rwanda full race"
   - "UCI Road Worlds 2025 complete coverage"
   - "UCI World Championships 2025 extended highlights"
   - "Rwanda World Championships 2025 race recording"

2. Platform-specific searches:
   [Claude uses youtubeSearch, flobikeSearch, peacockSearch with each term]
   [Claude analyzes search results for: live races, recordings, extended highlights]

3. Scrape promising candidates:
   [Claude uses scrapeContent on most relevant URLs]
   [Claude analyzes content to confirm it's actual race footage/highlights]

4. Update data and generate page:
   [Claude adds verified race content to race-data.json]
   [Claude runs generate-page.js to update HTML]

Claude Response:
"Discovery complete! Found race content:
- UCI Worlds 2025 Men's Road Race - Full Recording (FloBikes) - 4:23:15
- UCI Worlds 2025 Women's Road Race - Extended Highlights (YouTube) - 45:12
- UCI Worlds 2025 Time Trial Coverage (Peacock) - 2:15:30

Updated index.html with 3 new race recordings. Check out the page!"
```

### Platform-Specific Race Discovery
```
User: "Find Tour de France 2025 stage recordings on FloBikes"

Claude Workflow:
1. Generate FloBikes-specific search terms:
   - "Tour de France 2025 stage full recording"
   - "TdF 2025 complete stage coverage"
   - "Tour de France 2025 full broadcast"

2. FloBikes search and analysis:
   [Claude uses flobikeSearch with intelligent terms]
   [Claude filters for full race recordings vs highlights vs analysis]

3. Content verification:
   [Claude scrapes candidate pages to confirm race duration and type]
   [Claude identifies full stage recordings (3-5 hours) vs shorter content]

Claude Response:
"Found 8 Tour de France stage recordings on FloBikes:
- Stage 12: Mountain Stage - Full Recording (4:23:15)
- Stage 15: Alpine Stage - Full Recording (5:12:30)
- Stage 18: Time Trial - Full Recording (2:45:18)
[Added all to race-data.json and updated HTML]"
```

### Platform-Specific Updates
```
User: "Update FloBikes content only"

Claude Response:
"Focusing on FloBikes platform discovery..."

[Claude uses Firecrawl with FloBikes credentials]
[Claude processes FloBikes-specific content]
[Claude updates only FloBikes races in data]

"FloBikes update complete. Found 3 new races, updated 2 existing entries. HTML regenerated with latest FloBikes content."
```

## File Generation and Updates

### Race Data Updates (race-metadata.json)
- Claude adds newly discovered races
- Updates existing race information when changed
- Maintains spoiler-free descriptions
- Tracks discovery sessions and timestamps
- Validates all content for spoiler safety

### HTML Presentation Updates (index.html)
- Claude regenerates complete HTML file with updated race data
- Maintains steephill.tv-inspired design and color coding
- Embeds all CSS and minimal JavaScript for a self-contained file
- Ensures all links are direct to video players
- Optimizes for mobile and desktop viewing

## Quality Assurance Process

### Content Validation
```
Claude Validation Checklist:
□ All race descriptions are spoiler-free
□ Video links bypass result/spoiler pages
□ Race categorization is accurate
□ Platform information is correct
□ Metadata is complete and structured
□ HTML renders correctly with new content
```

### Spoiler Safety Protocol
- Review all extracted content for race results
- Remove any winner names or podium positions
- Avoid outcome-indicating language
- Focus on race context and significance
- Exclude uncertain content rather than risk spoilers

## Implementation Workflow

### Phase 1: Basic Discovery
```
User Requests:
- "Set up basic FloBikes discovery"
- "Create initial race metadata structure"
- "Generate first HTML presentation"
```

### Phase 2: Multi-Platform
```
User Requests:
- "Add YouTube channel discovery"
- "Integrate Peacock cycling content"
- "Include HBO Max documentaries"
```

### Phase 3: Enhanced Features
```
User Requests:
- "Improve spoiler detection accuracy"
- "Enhance HTML design and responsiveness"
- "Add content categorization and filtering"
```

## User Interaction Patterns

### Regular Content Updates
```
User: "Update all cycling content"
Claude: [Discovers from all platforms, updates data, regenerates HTML]

User: "Check for Tour de France updates"
Claude: [Focused discovery on Grand Tour content]

User: "Find weekend race highlights"
Claude: [Discovers recent race highlights and analysis]
```

### Content Management
```
User: "Remove any spoiler content from current races"
Claude: [Reviews and cleans existing data]

User: "Verify all video links still work"
Claude: [Tests links and updates broken ones]

User: "Add more race context to descriptions"
Claude: [Enhances descriptions while maintaining spoiler safety]
```

## Future Enhancements

### Advanced Working Sessions
- **Scheduled Discovery**: "Set up weekly Tour de France content discovery"
- **Intelligent Scheduling**: "Discover content based on cycling calendar"
- **Quality Monitoring**: "Check and update all existing race links"

### Enhanced Static Features
- **Progressive Web App**: Add service worker for offline capability
- **Advanced Filtering**: Client-side race filtering and search
- **Push Notifications**: Notify users when new content is discovered

This working session architecture provides the perfect balance of powerful AI-driven content discovery with simple, reliable user experience through static files.