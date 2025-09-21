# Non-Spoiler Sports v2 - Product Requirements Document

**Version**: 2.0
**Date**: September 21, 2025
**Status**: Planning Phase

## Executive Summary

Non-Spoiler Sports v2 is a radical simplification of our cycling video discovery system, distilled to its essential components: AI-powered content curation, multi-platform authentication, and zero-spoiler video access. The system consists of exactly three files that work together to provide seamless, spoiler-free cycling content discovery.

## Core Vision

**"Click. Watch. No Spoilers."**

Users should be able to click any race and immediately watch it without ever seeing results, thumbnails with winners, or any spoiler content. The system handles all complexity behind the scenes through Claude Code AI automation.

## System Architecture

### Three-File Architecture

```
non-spoiler-sports-v2/
├── CLAUDE_INSTRUCTIONS.md    # AI Task Guide
├── race-metadata.json        # Content Database
└── index.html               # User Interface
```

## File Specifications

### 1. CLAUDE_INSTRUCTIONS.md - AI Task Guide

**Purpose**: Comprehensive instructions for Claude Code AI on how to discover, authenticate, and maintain cycling content across all platforms.

**Key Responsibilities:**
- **Content Discovery**: Use Firecrawl API (primary), Playwright CLI (verification), direct web scraping (fallback) to find new cycling videos
- **Authentication Management**: Handle login flows for NBC Peacock, FloBikes, HBO Max, YouTube using appropriate tools
- **Spoiler Prevention**: Ensure all operations maintain spoiler-free guarantee through headless operation
- **Metadata Maintenance**: Update race-metadata.json with newly discovered content and verified links
- **Quality Assurance**: Verify all links lead directly to video players, not spoiler-containing result pages

**Technology Stack Usage:**

*Primary Discovery - Firecrawl API:*
- Direct API calls using FIRECRAWL_API_KEY for authenticated content scraping
- Extract clean Markdown without visual spoilers through API responses
- Handle authenticated sessions for FloBikes, Peacock, HBO Max via API parameters
- Parse video metadata (titles, durations, IDs) from structured JSON responses
- Generate spoiler-free descriptions for metadata database

*Verification - Playwright CLI:*
- Execute headless browser sessions via command line or Node.js scripts
- Verify authentication flows work correctly through programmatic browser control
- Ensure direct video access bypasses spoiler-containing pages
- Cross-platform compatibility testing (Chromium, Firefox, WebKit)
- Session isolation through separate browser contexts

*Fallback - Direct Web Scraping:*
- Use Node.js libraries (axios, cheerio) when Firecrawl API hits rate limits
- Handle JavaScript-heavy pages with headless Chrome via Playwright
- Provide secondary content discovery capabilities through custom scraping logic
- Full control over scraping policies and spoiler prevention measures

**Platform-Specific Discovery Protocols:**

*FloBikes (Primary: Firecrawl API, Verification: Playwright CLI):*
- Use credentials from environment variables with Firecrawl API for authenticated scraping
- Target event pages like `/events/14300386-2025-uci-road-world-championships`
- Extract video IDs and construct direct URLs with `playing=` parameters
- Verify links with Playwright CLI scripts to ensure spoiler-free video player access

*NBC Peacock (Primary: Playwright CLI + Firecrawl API):*
- Use Playwright scripts for initial subscription authentication flow
- Use Firecrawl API for content extraction from sports sections once authenticated
- Generate deep links to cycling content within Peacock interface
- Verify links bypass homepage recommendations and spoiler content

*HBO Max (Primary: Firecrawl API, Verification: Playwright CLI):*
- Use Firecrawl API to scrape sports documentaries and live event sections
- Categorize content: full events vs documentaries vs analysis pieces
- Use Playwright scripts to verify authentication flows and link accessibility
- Ensure content is cycling-specific and maintains spoiler-free access

*YouTube (Primary: Firecrawl API, No authentication required):*
- Target official channels: GCN, UCI, FloSports, WorldCyclingCentre
- Extract metadata without thumbnail exposure to maintain spoiler safety
- Filter content to avoid reaction videos and spoiler-heavy analysis
- Use standard YouTube URLs with verified spoiler-safe access patterns

**Operational Guidelines:**
- **Spoiler Safety**: Always operate headlessly, never expose visual content during discovery
- **Link Verification**: Test all discovered links ensure they bypass spoiler pages completely
- **Content Categorization**: Classify as full-race, highlights, analysis, documentary for proper metadata
- **Authentication Separation**: Maintain clear separation between discovery auth and user auth
- **Racing Calendar Integration**: Schedule discovery based on race calendar for optimal content capture
- **Quality Assurance**: Regular verification of existing links to ensure continued spoiler-free access

### 2. race-metadata.json - Content Database

**Purpose**: Structured repository of all discovered cycling content across platforms, organized for instant access and spoiler-free presentation.

**Data Structure:**
```json
{
  "lastUpdated": "ISO_DATE",
  "platforms": {
    "flobikes": { "authenticated": true, "lastCheck": "ISO_DATE" },
    "peacock": { "authenticated": false, "lastCheck": "ISO_DATE" },
    "hbomax": { "authenticated": false, "lastCheck": "ISO_DATE" },
    "youtube": { "authenticated": "N/A", "lastCheck": "ISO_DATE" }
  },
  "races": {
    "race-id": {
      "id": "race-id",
      "name": "Display Name",
      "series": "Grand Tour | Classic | Stage Race | World Championships",
      "year": "2025",
      "location": "Country/Region",
      "status": "live | completed | upcoming",
      "spoilerSafeDescription": "Neutral description without results",
      "platforms": ["flobikes", "peacock"],
      "primaryVideo": {
        "title": "Spoiler-free title",
        "url": "Direct video URL",
        "platform": "flobikes",
        "duration": "3:47:30",
        "type": "full-race | highlights | analysis",
        "requiresAuth": true,
        "discovered": "ISO_DATE"
      },
      "alternativeVideos": [
        {
          "title": "Alternative spoiler-free title",
          "url": "Direct video URL",
          "platform": "youtube",
          "duration": "5:23",
          "type": "highlights",
          "requiresAuth": false,
          "discovered": "ISO_DATE"
        }
      ],
      "dashboardDisplay": {
        "backgroundColor": "#FFD816",
        "textColor": "black",
        "priority": 1
      }
    }
  }
}
```

**Content Categories:**
- **Grand Tours**: Tour de France, Giro d'Italia, Vuelta a España
- **Classics**: Paris-Roubaix, Tour of Flanders, Milan-San Remo, etc.
- **Stage Races**: Tour Down Under, Paris-Nice, Tirreno-Adriatico, etc.
- **World Championships**: UCI Road, Cyclocross, Track, BMX
- **Documentaries**: Historical content, rider profiles

### 3. index.html - User Interface

**Purpose**: Single-page, self-contained HTML dashboard that renders all available cycling content in a spoiler-free, visually appealing format inspired by steephill.tv.

**Key Features:**
- **Zero Dependencies**: No frameworks, no external CSS/JS, completely self-contained
- **Steephill.tv-Inspired Design**: Colorful race boxes, clear categorization
- **Responsive Layout**: Works on desktop, tablet, mobile
- **Direct Video Links**: Every click goes straight to video player
- **Platform Indicators**: Show which platform hosts each video
- **Status Indicators**: Live, completed, upcoming races clearly marked

**Layout Sections:**
1. **Header**: Logo, tagline, spoiler-free guarantee
2. **Live/Current Section**: Currently happening races (pulsing indicators)
3. **Grand Tours Section**: Major stage races with distinctive styling
4. **Classics Section**: Monument races and major one-day events
5. **Recent Additions**: Latest discovered content
6. **Coming Soon**: Upcoming races with date information

**Interaction Design:**
- **Single Click Access**: No dialogs, no confirmations, direct video access
- **Platform Authentication Handling**: Graceful handling of authentication redirects
- **Fallback Content**: Multiple video options per race when available
- **Error Handling**: Silent failures with console logging only

## Authentication Strategy

### Challenge: Multi-Platform Authentication

**Problem**: Users need to be authenticated on multiple platforms for seamless video access, but we can't store user credentials for all platforms.

**Solution - Hybrid Approach**:

1. **AI Handles Discovery Authentication**: Claude Code uses provided credentials for content discovery and link verification
2. **User Handles Playback Authentication**: When users click links, they authenticate directly with the platform
3. **Smart Link Routing**: Direct users to platform-specific login pages before video playback
4. **Session Aware**: Detect when users are already authenticated and route accordingly

### Platform-Specific Authentication

**FloBikes**:
- **Discovery**: Claude Code uses credentials from environment variables
- **User Access**: Direct links require user's own FloBikes subscription
- **Link Format**: `https://www.flobikes.com/events/[EVENT]/videos?playing=[VIDEO_ID]`

**NBC Peacock**:
- **Discovery**: Claude Code uses subscription authentication for content discovery
- **User Access**: Links include authentication check and redirect to login if needed
- **Link Format**: Direct deep links to cycling content within Peacock interface

**HBO Max**:
- **Discovery**: Claude Code navigates sports content programmatically
- **User Access**: Standard HBO Max authentication flow
- **Link Format**: Direct links to cycling documentaries and events

**YouTube**:
- **Discovery**: No authentication required, use official channel scraping
- **User Access**: No authentication required for public content
- **Link Format**: Standard YouTube video URLs

### Spoiler Prevention During Authentication

**Critical Requirements**:
1. **Authentication pages must not show recent activity or recommendations**
2. **Login redirects must go directly to video content, not platform homepages**
3. **Failed authentication must not expose spoiler content**
4. **Platform authentication flows must be tested to ensure spoiler safety**

## Technical Implementation

### Recommended Technology Stack

#### **Primary Tool: Firecrawl API**
**Direct API integration for spoiler-free content discovery:**
- **API-based extraction**: Direct calls using FIRECRAWL_API_KEY for clean Markdown output
- **Robust authentication**: API parameters handle login flows for FloBikes, Peacock, HBO Max
- **Structured JSON responses**: Perfect for parsing video metadata from streaming platforms
- **Rate limiting compliance**: API respects platform policies with proper throttling
- **Reliable service**: Hosted API ensures consistent performance with error handling

#### **Secondary Tool: Playwright CLI/Scripts**
**For authentication verification and testing:**
- **Command line execution**: Direct CLI commands and Node.js scripts for browser automation
- **Headless operation**: Maintains spoiler-free guarantee during verification
- **Multi-platform support**: Handles different streaming platform login flows programmatically
- **Link verification**: Automated testing that discovered video links actually work
- **Cross-browser compatibility**: Supports Chromium, Firefox, WebKit engines

#### **Tertiary Tool: Direct Web Scraping**
**For backup and fallback scenarios:**
- **Node.js libraries**: Use axios, cheerio, puppeteer when Firecrawl API hits limits
- **Custom JavaScript execution**: Handle dynamic content with full control over execution
- **Self-hosted approach**: Complete control over scraping behavior and spoiler prevention
- **Flexible implementation**: Custom logic for platform-specific requirements

### Content Discovery Workflow

**Three-tiered approach for maximum reliability and spoiler safety:**

```
1. Firecrawl API Primary Discovery:
   └── API calls to scrape platform event pages → Parse JSON responses → Generate spoiler-free descriptions

2. Playwright CLI Verification:
   └── Execute headless browser scripts → Verify direct links → Ensure spoiler-free access

3. Direct Scraping Fallback:
   └── Custom Node.js scraping logic → Handle JavaScript-heavy pages → Backup content extraction
```

### Platform-Specific Implementation

#### **FloBikes Discovery Protocol:**
1. **Firecrawl API**: Make authenticated API calls to scrape event pages (e.g., `/events/14300386-2025-uci-road-world-championships`)
2. **Extract metadata**: Parse video IDs, durations, titles from JSON API responses
3. **Generate direct URLs**: Construct `playing=` parameter links for spoiler-free access
4. **Playwright CLI verification**: Execute scripts to test links lead directly to video players

#### **NBC Peacock Discovery Protocol:**
1. **Playwright CLI authentication**: Run headless browser scripts for subscription login flow
2. **Firecrawl API content extraction**: Use API to scrape cycling content from sports sections
3. **Deep link generation**: Create direct links to cycling content within Peacock interface
4. **Spoiler verification**: Ensure links bypass homepage and recommendations

#### **HBO Max Discovery Protocol:**
1. **Firecrawl API sports scraping**: Use API to extract cycling documentaries and live event metadata
2. **Content categorization**: Identify full events vs documentaries vs analysis
3. **Playwright CLI testing**: Execute scripts to verify authentication flows and link accessibility
4. **Quality assurance**: Ensure content is cycling-specific and spoiler-free

#### **YouTube Discovery Protocol:**
1. **Firecrawl API channel scraping**: Use API to target official channels (GCN, UCI, FloSports, etc.)
2. **Metadata extraction**: Parse video titles, durations, descriptions from API responses
3. **Content filtering**: Avoid spoiler-heavy content and reaction videos
4. **Direct linking**: Standard YouTube URLs with spoiler-safe access patterns

### Scheduled Discovery Operations

**Automated content discovery based on racing calendar:**

1. **Pre-race discovery** (24-48 hours before): Search for preview content and live stream links
2. **Live race monitoring** (during events): Discover live streams and real-time content
3. **Post-race discovery** (2-6 hours after): Find full race replays and highlight packages
4. **Weekly maintenance**: Comprehensive scan for missed content and link verification

### Authentication Strategy Integration

**Hybrid authentication approach using recommended tech stack:**

#### **Discovery Authentication (Claude Code)**:
- **Firecrawl API with credentials**: Use API authentication parameters for content discovery
- **Session management**: Maintain authenticated sessions through API calls
- **Multi-platform rotation**: Handle different platform authentication via API configuration
- **Rate limiting compliance**: Respect platform policies through API throttling

#### **User Authentication (End Users)**:
- **Direct platform routing**: Links route users to platform-specific authentication
- **Session detection**: Detect existing user authentication and bypass login when possible
- **Graceful fallbacks**: Handle authentication failures without spoiler exposure
- **Smart redirects**: Direct users to video content after successful platform login

### Quality Assurance

**Link Verification Process**:
1. **Headless Testing**: Verify all links work without browser interaction
2. **Authentication Simulation**: Test login flows for each platform
3. **Spoiler Checking**: Ensure no result content is visible during link verification
4. **Multiple Device Testing**: Verify links work on desktop, mobile, and smart TV apps

### Error Handling

**Graceful Degradation**:
- If primary video link fails, automatically try alternative platforms
- If no videos available, show "Coming Soon" with race date
- If authentication fails, provide clear instructions for platform-specific login
- All errors logged to console, no user-facing error messages

## Success Metrics

### Primary Objectives

1. **Zero Spoiler Incidents**: No race results ever shown to users
2. **Single-Click Access**: Users can watch any available race in one click
3. **Multi-Platform Coverage**: Content available from FloBikes, Peacock, HBO Max, YouTube
4. **Automated Maintenance**: Claude Code discovers and catalogs new content automatically

### Key Performance Indicators

- **Content Freshness**: New videos discovered within 24 hours of availability
- **Link Reliability**: 99%+ success rate for video link access
- **Authentication Success**: Smooth platform login flows with minimal friction
- **User Satisfaction**: No manual content discovery required by users

## Implementation Timeline

### Phase 1: Core Infrastructure (Week 1)
- Create CLAUDE_INSTRUCTIONS.md with detailed AI guidelines
- Design race-metadata.json schema and initial data structure
- Build single-page HTML dashboard with steephill.tv-inspired design

### Phase 2: Multi-Platform Integration (Week 2)
- Implement FloBikes content discovery and authentication
- Add NBC Peacock content discovery pipeline
- Integrate YouTube official channel scraping
- Begin HBO Max content cataloging

### Phase 3: Authentication & Polish (Week 3)
- Refine authentication flows for seamless user experience
- Implement comprehensive link verification system
- Add error handling and graceful degradation
- Performance optimization and mobile responsiveness

### Phase 4: Automation & Maintenance (Week 4)
- Automated content discovery scheduling
- Quality assurance and testing protocols
- Documentation and maintenance procedures
- Launch preparation and user acceptance testing

## Risk Mitigation

### Spoiler Prevention Risks

**Risk**: Authentication flows might expose spoiler content
**Mitigation**: Extensive testing of all platform login flows, direct link verification

**Risk**: Platform interface changes could break spoiler protection
**Mitigation**: Regular automated testing, fallback to alternative platforms

### Technical Risks

**Risk**: Platform authentication could be unreliable
**Mitigation**: Multiple platform support for same content, graceful degradation

**Risk**: Content discovery automation could fail
**Mitigation**: Manual fallback procedures, regular monitoring and alerts

### Operational Risks

**Risk**: Racing calendar changes could cause missed content
**Mitigation**: Flexible discovery scheduling, comprehensive sports calendar integration

## Future Enhancements

### Post-Launch Improvements

1. **Smart TV App Integration**: Direct casting to Roku, Apple TV, Chromecast
2. **Notification System**: Alerts for new race content availability
3. **Personalization**: User preferences for race types and platforms
4. **Social Features**: Spoiler-free race discussion and sharing
5. **International Expansion**: Additional platforms like GCN+, Eurosport Player

## Conclusion

Non-Spoiler Sports v2 represents a focused, user-centric approach to spoiler-free cycling content discovery. By distilling the system to three essential files and leveraging Claude Code AI for automated maintenance, we create a sustainable, reliable platform that serves cycling fans' need for immediate, spoiler-free race access across multiple streaming platforms.

The system's success depends on robust authentication handling, comprehensive spoiler prevention, and seamless user experience. With proper implementation, this platform can become the definitive destination for spoiler-free cycling content discovery.

---

**Document Status**: Complete
**Next Steps**: Begin Phase 1 implementation with file creation and initial system setup