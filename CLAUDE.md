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
├── Data layer updates (race-metadata.json)
└── Static presentation updates (index.html)

User Experience:
└── Receives updated HTML file with latest racing content
```

## Core Workflow

### 1. Discovery Sessions (Claude Code + User)
- **User Request**: "Discover new cycling content from FloBikes"
- **Claude Action**: Use Firecrawl API with provided credentials
- **Claude Processing**: Interpret raw content using LLM intelligence
- **Claude Output**: Update race-metadata.json with new discoveries
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
- **Content interpretation**: Parse Firecrawl responses using natural language understanding
- **Spoiler detection**: Intelligently identify and filter result-revealing content
- **Race classification**: Categorize as Grand Tour, Classic, Stage Race, World Championships
- **Metadata extraction**: Pull titles, durations, platform info, video types
- **Description generation**: Create engaging spoiler-free summaries
- **Data structuring**: Update race-metadata.json with discovered content

### Platform Credentials
Authentication credentials for Claude's content discovery stored in `.env`:
- `FLOBIKES_EMAIL` and `FLOBIKES_PASSWORD`
- `PEACOCK_EMAIL` and `PEACOCK_PASSWORD`
- `HBOMAX_EMAIL` and `HBOMAX_PASSWORD`

## Core Principles

### Spoiler Prevention (Critical)
- **Claude-powered detection**: Use LLM intelligence to identify spoiler content
- Never expose race results, winner names, or podium positions
- Avoid thumbnails or images that might show race outcomes
- Focus on race context and significance, not outcomes
- If uncertain about spoiler safety, exclude content rather than risk exposure

### Working Session Content Discovery
1. **User Request**: Ask Claude to discover content from specific platforms
2. **Firecrawl Execution**: Claude makes authenticated API calls
3. **LLM Interpretation**: Claude processes raw content for race information
4. **Spoiler Filtering**: Intelligent removal of result-revealing content
5. **Data Updates**: Claude updates race-metadata.json with new findings
6. **HTML Generation**: Claude regenerates index.html with updated content

## Data Structure

### race-metadata.json Schema
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
- **Static content**: Displays races from race-metadata.json data
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
6. Update race-metadata.json with new races
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
User: "Find new cycling races from all platforms"

Claude Response:
"I'll discover content from FloBikes, YouTube, Peacock, and HBO Max using Firecrawl API..."

[Claude uses Firecrawl API calls]
[Claude interprets content with LLM]
[Claude updates race-metadata.json]
[Claude regenerates index.html]

"Discovery complete! Found 8 new races:
- Tour de France Stage 15 (FloBikes)
- Giro d'Italia Highlights (YouTube)
- Paris-Roubaix Documentary (HBO Max)
- World Championships Coverage (Peacock)
- [etc...]

Updated index.html ready for use with latest content."
```

### Spoiler Safety Validation
```
User: "Check if any current content has spoiler risks"

Claude Response:
"Reviewing all content in race-metadata.json for spoiler safety..."

[Claude analyzes descriptions and metadata]
[Claude checks for result-revealing language]
[Claude updates any problematic content]

"Spoiler safety audit complete. Removed 2 race descriptions that mentioned podium positions. All content now verified spoiler-free."
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