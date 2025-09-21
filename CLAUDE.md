# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Non-Spoiler Sports v2 is a cycling video discovery system designed to provide spoiler-free access to cycling content across multiple platforms (FloBikes, NBC Peacock, HBO Max, YouTube). The system uses AI-powered content curation to discover and catalog cycling videos while maintaining strict spoiler prevention.

## Three-File Architecture

The project is built around a minimalist three-file structure:

```
├── CLAUDE_INSTRUCTIONS.md    # AI Task Guide (to be created)
├── race-metadata.json        # Content Database (to be created)
└── index.html               # User Interface (to be created)
```

## Key Technologies and Tools

### Primary Content Discovery Stack
- **Firecrawl API**: Primary tool for authenticated content scraping across platforms
  - API key available in `.env` as `FIRECRAWL_API_KEY`
  - Used for spoiler-free content discovery with structured JSON responses
- **Playwright CLI/Browser Automation**: For authentication verification and link testing
  - Documentation available in `playwright_docs.md/` directory

### Platform Credentials
Authentication credentials for content discovery are stored in `.env`:
- `FLOBIKES_EMAIL` and `FLOBIKES_PASSWORD`
- `PEACOCK_EMAIL` and `PEACOCK_PASSWORD`
- `HBOMAX_EMAIL` and `HBOMAX_PASSWORD`

## Core Principles

### Spoiler Prevention
- **Critical**: All content discovery and link verification must be done headlessly
- Never expose race results, thumbnails with winners, or spoiler content
- All authentication flows must be tested to ensure spoiler safety
- Links must route directly to video players, bypassing result pages

### Content Discovery Workflow
1. **Firecrawl API Primary Discovery**: Authenticated API calls to platform event pages
2. **Playwright CLI Verification**: Headless browser scripts to verify direct video links
3. **Graceful Failure**: If both tools fail, politely inform user that content is temporarily unavailable

## Platform-Specific Implementation

### FloBikes
- Target event pages like `/events/14300386-2025-uci-road-world-championships`
- Extract video IDs and construct direct URLs with `playing=` parameters
- Use Firecrawl API with credentials for authenticated scraping

### NBC Peacock
- Requires subscription authentication flow via Playwright
- Target cycling content within sports sections
- Generate deep links that bypass homepage recommendations

### HBO Max
- Focus on sports documentaries and live event sections
- Categorize content: full events vs documentaries vs analysis
- Ensure cycling-specific content filtering

### YouTube
- Target official channels: GCN, UCI, FloSports, WorldCyclingCentre
- No authentication required for public content
- Filter to avoid reaction videos and spoiler-heavy analysis

## Data Structure

### race-metadata.json Schema
The content database follows this structure:
- `platforms`: Authentication status and last check times
- `races`: Nested object with race metadata including:
  - Basic info (name, series, year, location, status)
  - `spoilerSafeDescription`: Result-free descriptions
  - `primaryVideo` and `alternativeVideos`: Direct video links
  - `dashboardDisplay`: UI styling information

## Development Approach

### Authentication Strategy
- **Discovery Authentication**: Claude Code uses provided credentials
- **User Authentication**: End users authenticate directly with platforms
- **Session Separation**: Clear separation between AI discovery auth and user auth

### Quality Assurance
- Verify all links lead directly to video players
- Test authentication flows for spoiler safety
- Regular automated testing and link verification
- Multiple platform support for content redundancy
- Graceful degradation when content discovery fails

## Reference Materials

- **Project Requirements**: See `prd.md` for comprehensive specifications
- **Steephill.tv Inspiration**: Example page in `steephill_example_page/` directory
- **Firecrawl Documentation**: Available in `firecrawl-docs/` directory
- **Playwright Documentation**: Available in `playwright_docs.md/` directory

## Future Implementation

The system is currently in planning phase. Implementation will follow the three-file architecture with emphasis on:
1. Automated content discovery scheduling
2. Multi-platform authentication handling
3. Comprehensive spoiler prevention measures
4. Single-click video access for users