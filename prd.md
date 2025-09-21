# Non-Spoiler Sports v2 - Product Requirements Document

**Version**: 2.0 MVP (Working Session Architecture)
**Date**: September 21, 2025
**Status**: Implementation Ready

## Executive Summary

Non-Spoiler Sports v2 MVP is a working session-driven cycling video discovery system where Claude Code handles all content discovery during live sessions with users, interpreting raw content and updating simple data files. The system delivers spoiler-free cycling content through a beautiful, static HTML presentation layer that requires no complex authentication or API calls.

## Core Vision

**"Working Sessions. Static Results. No Spoilers."**

Users work with Claude Code to discover cycling content during live sessions. Claude handles all the complex API work, interprets content intelligently, and generates updated static files. Users receive a self-contained HTML file that works perfectly offline with direct video links.

## Working Session Architecture

### Discovery & Presentation Separation
```
Working Session (Claude Code + User):
├── User: "Find new Tour de France content"
├── Claude: Firecrawl API calls with credential handling
├── Claude: LLM interpretation and spoiler filtering
├── Claude: Update race-metadata.json with discoveries
└── Claude: Regenerate index.html with latest content

User Experience:
└── Receives updated HTML file with latest racing content
    ├── Direct video links (click → immediate play)
    ├── Steephill.tv-inspired design
    ├── Offline capable
    └── No authentication needed
```

**Core Benefits**:
- **No browser authentication complexity**: Claude handles all API work during sessions
- **No rate limiting for users**: API calls happen during Claude sessions only
- **Fast, reliable HTML**: Static presentation with embedded styles
- **Offline capable**: Works without internet once generated
- **Simple distribution**: Just send updated HTML file to users

## Technology Stack

### Primary Tool: Firecrawl API
- **Session-based discovery**: Claude makes API calls during working sessions
- API key available in `.env` as `FIRECRAWL_API_KEY`
- Returns clean markdown/JSON for Claude to interpret
- Handles platform authentication via provided credentials
- Built-in stealth mode for challenging platforms

### Intelligence Layer: Claude Code LLM
- **Content interpretation**: Understand cycling context, race types, video metadata
- **Spoiler detection**: Intelligently filter result-revealing content
- **Race classification**: Categorize Grand Tours, Classics, Stage Races automatically
- **Description generation**: Create engaging spoiler-free summaries
- **Data structuring**: Maintain clean, structured race metadata

### Static Presentation Layer
- **Self-contained HTML**: All CSS and minimal JavaScript embedded
- **No external dependencies**: Completely portable and offline-capable
- **Direct video links**: Bypass platform homepages and result pages
- **Mobile responsive**: Works perfectly on all devices
- **Fast loading**: No API calls or complex authentication flows

## Platform Integration Strategy

### Working Session Discovery Flow
```
1. User Request: "Discover new cycling content from FloBikes"
2. Claude Authentication: Use credentials from .env for Firecrawl API
3. Raw Content Fetching: Firecrawl returns platform content as markdown/JSON
4. LLM Interpretation: Claude processes content for race information
5. Spoiler Filtering: Remove any result-revealing content
6. Data Update: Add new races to race-metadata.json
7. HTML Generation: Regenerate index.html with updated content
8. Delivery: Provide user with updated HTML file
```

### Platform-Specific Implementation

**FloBikes (Claude Session)**:
```
User: "Check FloBikes for new races"
Claude Process:
1. Firecrawl API call with FLOBIKES credentials
2. Scrape /events/ pages for cycling content
3. Extract video metadata and direct URLs
4. Generate spoiler-free descriptions
5. Update data files and regenerate HTML
```

**YouTube (Claude Session)**:
```
User: "Find new cycling videos on YouTube"
Claude Process:
1. Firecrawl API call to official channels (GCN, UCI, FloSports)
2. Parse channel content for cycling videos
3. Filter out reaction content and spoilers
4. Extract direct YouTube URLs and metadata
5. Update presentation with new content
```

**NBC Peacock (Claude Session)**:
```
User: "Discover Peacock cycling content"
Claude Process:
1. Firecrawl API call with PEACOCK credentials
2. Navigate sports sections for cycling content
3. Generate deep links bypassing homepage
4. Create platform-appropriate metadata
5. Update static presentation
```

**HBO Max (Claude Session)**:
```
User: "Find cycling documentaries on HBO Max"
Claude Process:
1. Firecrawl API call with HBOMAX credentials
2. Discover cycling documentaries and live events
3. Categorize content types appropriately
4. Generate spoiler-free documentary descriptions
5. Update presentation layer
```

## Data Structure

### race-metadata.json
```json
{
  "lastUpdated": "2025-09-21T15:30:00Z",
  "discoverySession": {
    "sessionId": "claude-session-uuid",
    "platforms": ["flobikes", "youtube", "peacock", "hbomax"],
    "racesFound": 15,
    "racesAdded": 12,
    "spoilerIncidents": 0
  },
  "races": {
    "tour-de-france-2025-stage-12": {
      "name": "Tour de France 2025 - Stage 12",
      "series": "grand-tour",
      "year": 2025,
      "stage": {
        "number": 12,
        "type": "mountain",
        "terrain": "Alpine climbing with summit finish at Alpe d'Huez"
      },
      "video": {
        "platform": "flobikes",
        "url": "https://flobikes.com/events/123/videos?playing=456",
        "type": "full-race",
        "duration": "4:23:15",
        "quality": "HD",
        "language": "en"
      },
      "description": "Epic mountain stage through the French Alps featuring multiple categorized climbs and the legendary Alpe d'Huez summit finish",
      "category": "grand-tour",
      "significance": "Monument climb with Tour de France history",
      "discoveredAt": "2025-09-21T15:25:00Z",
      "spoilerSafe": true,
      "verified": true
    }
  }
}
```

### index.html Features
- **Steephill.tv-inspired design**: Color-coded race categories (yellow Grand Tours, orange Classics)
- **Embedded styling**: Complete CSS embedded for self-contained file
- **Static race display**: Renders content from embedded JSON data
- **Direct video links**: Click race card → immediate video player access
- **Mobile responsive**: Grid layout adapts to all screen sizes
- **Offline functionality**: Works without internet connection
- **Fast loading**: No external API calls or dependencies

## Content Discovery & Intelligence

### Claude Code LLM Responsibilities
- **Raw Content Interpretation**: Parse Firecrawl markdown/JSON responses intelligently
- **Spoiler Safety**: Identify and exclude race results, winner names, podium positions
- **Race Context Understanding**: Extract significance, terrain, racing context
- **Video Type Classification**: Distinguish full races, highlights, analysis, documentaries
- **Platform-Specific Handling**: Adapt to each platform's content structure
- **Quality Assessment**: Evaluate content relevance and accuracy
- **Link Validation**: Ensure URLs lead directly to video players

### Working Session Examples

**Content Discovery Session**:
```
User: "Find all new cycling content from this week"

Claude Response:
"I'll check all platforms for new cycling content..."

[Claude executes Firecrawl API calls]
[Claude interprets content with LLM intelligence]
[Claude filters for spoiler safety]
[Claude updates race-metadata.json]
[Claude regenerates index.html]

"Discovery complete! Found 8 new races:
- Tour de France Stage 15 (FloBikes) - Mountain stage
- Giro d'Italia Highlights (YouTube) - Stage recap
- Paris-Roubaix Documentary (HBO Max) - Historical content
- World Championships Coverage (Peacock) - Live event

Updated index.html ready with latest spoiler-free content."
```

**Spoiler Safety Audit**:
```
User: "Check all current content for spoiler safety"

Claude Response:
"Reviewing race-metadata.json for potential spoiler content..."

[Claude analyzes all descriptions and metadata]
[Claude identifies any result-revealing language]
[Claude updates problematic content]
[Claude regenerates HTML with safer descriptions]

"Spoiler safety audit complete. Updated 3 race descriptions to remove winner references. All content now verified spoiler-free."
```

## User Experience Design

### Steephill.tv-Inspired Interface
- **Color-coded categories**:
  - 🟡 Grand Tours (yellow background)
  - 🟠 Classics (orange background)
  - 🔵 Stage Races (blue background)
  - 🟢 World Championships (green background)
- **Clean layout**: No advertising clutter or distracting elements
- **Race cards**: Attractive cards with race info and direct video access
- **Platform badges**: Clear indicators for FloBikes, Peacock, YouTube, HBO Max
- **Responsive grid**: Adapts to desktop, tablet, and mobile screens

### Single-Click Video Access
- **No confirmations**: Click race → immediately watch
- **No authentication prompts**: Links work with user's existing platform sessions
- **No loading screens**: Static content enables instant response
- **Graceful fallbacks**: Multiple video sources when available

### Mobile-First Design
```css
/* Embedded responsive CSS example */
.race-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.race-card {
  background: var(--category-color);
  border-radius: 12px;
  padding: 1.5rem;
  transition: transform 0.2s ease;
  cursor: pointer;
}

.race-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}
```

## Authentication Strategy

### Simplified Session Management
1. **Discovery Authentication** (Claude only):
   - Claude uses provided platform credentials during working sessions
   - No user authentication complexity
   - All API work happens server-side during sessions

2. **Video Access** (User experience):
   - Direct video links work with user's existing platform sessions
   - Users log into platforms normally in their browsers
   - No separate authentication flow needed
   - Graceful handling when sessions expire

3. **No Browser-Based API Calls**:
   - HTML file contains no authentication logic
   - No API keys exposed to users
   - No rate limiting concerns for end users
   - Complete separation of discovery and presentation

## Implementation Plan

### Phase 1: Basic Working Sessions (Week 1)
**User Requests to Claude**:
- "Set up FloBikes content discovery"
- "Create initial race metadata structure"
- "Generate first HTML presentation file"
- "Test spoiler detection with sample content"

### Phase 2: Multi-Platform Discovery (Week 2)
**User Requests to Claude**:
- "Add YouTube cycling channel discovery"
- "Integrate Peacock sports content discovery"
- "Include HBO Max cycling documentaries"
- "Enhance HTML design with race categorization"

### Phase 3: Enhanced Intelligence (Week 3)
**User Requests to Claude**:
- "Improve spoiler detection accuracy"
- "Add race significance and context analysis"
- "Enhance mobile responsiveness"
- "Add content freshness tracking"

### Phase 4: Polish & Optimization (Week 4)
**User Requests to Claude**:
- "Optimize HTML file size and performance"
- "Add comprehensive error handling"
- "Validate all video links for functionality"
- "Create final production-ready presentation"

## Working Session Interaction Patterns

### Regular Content Updates
```
User: "Update all cycling content for the weekend"
Claude: [Discovers from all platforms, updates data, regenerates HTML]

User: "Focus on Tour de France updates only"
Claude: [Targeted discovery for Grand Tour content]

User: "Find any new cycling documentaries"
Claude: [Searches HBO Max and other platforms for documentary content]
```

### Content Management
```
User: "Remove any races older than 30 days"
Claude: [Cleans old content from metadata and regenerates HTML]

User: "Verify all video links are still working"
Claude: [Tests links using Firecrawl, updates broken ones]

User: "Add more context to race descriptions"
Claude: [Enhances descriptions while maintaining spoiler safety]
```

### Quality Assurance
```
User: "Audit everything for spoiler safety"
Claude: [Reviews all content, removes any risky material]

User: "Check if any new platforms have cycling content"
Claude: [Explores additional platforms for content discovery]

User: "Optimize the HTML for mobile viewing"
Claude: [Updates CSS and layout for better mobile experience]
```

## Success Metrics

### Primary Objectives
1. **Zero Spoiler Incidents**: No race results ever shown to users
2. **Working Session Efficiency**: Claude discovers content quickly and accurately
3. **Static File Performance**: HTML loads fast and works offline
4. **User Simplicity**: No authentication or technical complexity for end users

### Key Performance Indicators
- **Discovery Accuracy**: High-quality race content found during sessions
- **Spoiler Safety**: 100% spoiler-free content presentation
- **Link Reliability**: 99%+ success rate for direct video access
- **File Performance**: <5KB HTML file size, <1 second load time

## Technical Specifications

### File Requirements
- **HTML File Size**: Target 5-8KB including embedded CSS and minimal JavaScript
- **Data File Size**: race-metadata.json optimized for essential information only
- **Performance**: Works on 3G connections, loads instantly on modern devices
- **Compatibility**: Supports all modern browsers without external dependencies

### Content Standards
- **Spoiler Safety**: Zero tolerance for race results or winner information
- **Link Quality**: All video links must bypass result/spoiler pages
- **Description Quality**: Engaging, contextual descriptions without outcomes
- **Metadata Accuracy**: Correct race categorization and platform information

## Risk Mitigation

### Spoiler Prevention
- **Claude Intelligence**: LLM-based detection superior to keyword filtering
- **Multiple Validation**: Content checked during discovery and presentation generation
- **Safe Defaults**: Exclude uncertain content rather than risk spoilers
- **Regular Audits**: User can request spoiler safety reviews anytime

### Technical Reliability
- **Session-Based Work**: No user-facing API failures or rate limits
- **Static Presentation**: HTML works regardless of platform availability
- **Offline Capability**: Users can access content without internet
- **Simple Distribution**: Easy to share and backup HTML files

### Platform Changes
- **Claude Adaptability**: LLM interpretation adapts to layout changes better than rigid selectors
- **Multi-Platform Redundancy**: Content available from multiple sources
- **Working Session Flexibility**: Easy to test and adapt during live sessions

## Future Enhancements

### Advanced Working Sessions
- **Scheduled Discovery**: "Set up weekly content discovery sessions"
- **Intelligent Scheduling**: "Discover content based on cycling calendar"
- **Automated Quality Checks**: "Weekly spoiler safety audits"

### Enhanced Static Features
- **Progressive Web App**: Add service worker for notifications and caching
- **Advanced Filtering**: Client-side race filtering and search functionality
- **Personalization**: User preference handling in static presentation

### Multi-Sport Expansion
- **Other Sports**: Extend to Formula 1, tennis, other spoiler-sensitive sports
- **Sport-Specific Intelligence**: Adapt Claude's interpretation for different sports
- **Unified Presentation**: Combined sports presentation in single HTML file

## Conclusion

The working session architecture provides the perfect balance of powerful AI-driven content discovery with simple, reliable user experience. By having Claude Code handle all complex API work during live sessions and generating static presentation files, we eliminate authentication complexity, API rate limiting, and technical barriers while maintaining the highest standards of spoiler prevention.

Users receive updated HTML files that work instantly, offline, and without any technical setup - just click and watch cycling content safely.

---

**Document Status**: Implementation Ready
**Next Steps**: Begin working sessions with Claude for initial FloBikes content discovery