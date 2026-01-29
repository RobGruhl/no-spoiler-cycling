# How No-Spoiler Cycling Finds YouTube Highlights Safely

This document explains how the system discovers YouTube cycling race content while protecting users from spoilers.

## The Problem

Cycling fans often can't watch races live due to time zones or schedules. When searching for highlights later, they face a minefield:

- YouTube titles like "POGACAR WINS IN STUNNING FASHION" spoil results immediately
- Sidebar recommendations show spoiler thumbnails
- Many "highlights" packages announce the winner in the first 30 seconds
- News-style coverage leads with results

The system solves this by curating only **spoiler-safe** content where viewers can experience the race drama naturally.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     CONTENT DISCOVERY FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   1. TIERED CHANNEL SEARCH                                       │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Tier 1: Official Channels (UCI, GCN, Tour de France)    │  │
│   │  Tier 2: Trusted Channels (Lanterne Rouge, VeloNews)     │  │
│   │  Tier 3: Broad YouTube Search (fallback only)            │  │
│   └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│   2. CANDIDATE VIDEO COLLECTION                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Search results from each tier                            │  │
│   │  URLs, titles, channels, durations                        │  │
│   └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│   3. SPOILER ANALYSIS (youtube-cycling-analyzer agent)          │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  • Scrape video metadata and transcript                   │  │
│   │  • Analyze WHEN winner is revealed                        │  │
│   │  • Determine if viewable portion is substantial           │  │
│   │  • Output: SAFE / USABLE / RISKY / UNSAFE                 │  │
│   └──────────────────────────────────────────────────────────┘  │
│                              ↓                                   │
│   4. CURATED CONTENT → race-data.json                           │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Only SAFE/USABLE content added                           │  │
│   │  Includes viewing notes and warnings                      │  │
│   └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Tiered Channel Discovery

The system doesn't blindly search YouTube. It uses a **tiered strategy** that prioritizes trusted sources.

### Tier 1: Official Channels (Highest Trust)

These are rights holders and race organizers who produce professional coverage:

| Channel | Handle | Content Types | Coverage |
|---------|--------|---------------|----------|
| UCI | @UCIcycling | Full races, highlights | World Championships, World Cup |
| GCN Racing | @GCNRacing | Race coverage, highlights | Grand Tours, Monuments |
| Tour de France | @tourdefrance | Stage summaries | TdF, TdF Femmes |
| Eurosport | @eurosportcycling | Extended highlights | European races |
| FloBikes | @flobikes | Highlights, clips | World Tour, US racing |

**Why official channels first?** They have broadcast rights, so their content is legitimate. They also tend to use neutral titles ("Stage 5 Highlights" not "X WINS Stage 5").

### Tier 2: Trusted Third-Party Channels

If official channels don't have enough content, the system checks trusted independent creators:

| Channel | Specialty | Spoiler Risk |
|---------|-----------|--------------|
| Lanterne Rouge | Extended Grand Tour highlights | Low |
| Cyclingnews | Race highlights and news | Medium |
| VeloNews | American cycling coverage | Medium |

These channels are **manually vetted** over time and promoted from "emerging" to "trusted" based on their track record.

### Tier 3: Broad Search (Fallback Only)

Only used when Tiers 1-2 yield insufficient results. The system constructs targeted queries:

```
site:youtube.com Paris-Roubaix 2026 extended highlights
site:youtube.com Paris-Roubaix 2026 full race
site:youtube.com Paris-Roubaix 2026 highlights
```

Results from unknown channels are flagged for extra scrutiny.

### Year Fallback

If no 2026 content exists (race hasn't happened yet), the system automatically tries 2025 to identify which channels typically cover that race.

---

## Step 2: Spoiler Analysis Deep Dive

Finding a video is only half the battle. The **youtube-cycling-analyzer** agent then evaluates each candidate for spoiler safety.

### What Gets Analyzed

The agent scrapes each video URL to extract:

1. **Title** - Does it reveal the winner?
2. **Description** - Contains result text?
3. **Transcript** - When is the winner first mentioned?
4. **Duration** - Enough content to be worthwhile?
5. **Channel** - Known trusted source?

### The Key Insight: WHEN Not WHETHER

Race footage naturally contains results—someone wins at the end. That's fine.

The critical question is: **When does the viewer learn who won?**

| Pattern | Example | Verdict |
|---------|---------|---------|
| Winner at finish line (last 5%) | "AND POGACAR CROSSES THE LINE!" at 44:30 of 45:00 | **SAFE** |
| Winner mentioned mid-video | "After his winning attack at km 200..." at 20:00 | **RISKY** |
| Winner in first 30 seconds | "Today we're looking at how Pogacar won" | **UNSAFE** |
| Winner in title | "Pogacar DOMINATES at Tour de France" | **UNSAFE** |

### Spoiler Safety Levels

| Level | Meaning | Action |
|-------|---------|--------|
| **SAFE** | No spoilers, or only at natural finish | Include in race-data.json |
| **USABLE** | Substantial spoiler-free portion with clear boundary | Include with stop-time note |
| **RISKY** | Spoilers scattered throughout | Exclude |
| **UNSAFE** | Results-focused or early reveal | Exclude |

### Content Type Validation

Not everything is race footage. The agent distinguishes:

- **Full Race**: Complete coverage (include, spoilers expected at end)
- **Highlights**: Race action compilation (analyze spoiler timing)
- **Extended Highlights**: 30+ minute packages (same as highlights)
- **Analysis/Preview**: NOT race footage (exclude)
- **Post-race interviews**: Results discussion (exclude)

---

## Step 3: Example Walkthrough

Let's trace a real discovery session for **Paris-Roubaix 2026**.

### 3.1 Initiating Discovery

```bash
node -e "import { discoverYouTubeContent } from './lib/youtube-utils.js';
discoverYouTubeContent('Paris-Roubaix', 2026).then(r => console.log(JSON.stringify(r, null, 2)))"
```

### 3.2 Tier 1 Searches Execute

```
🎯 YouTube Discovery: Paris-Roubaix 2026
──────────────────────────────────────────────────────

📺 Tier 1: Searching official channels...
   📺 Searching UCI: "Paris-Roubaix 2026"
   📺 Searching GCN Racing: "Paris-Roubaix 2026"
   📺 Searching FloBikes: "Paris-Roubaix 2026"
   Found 4 official channel results
```

### 3.3 Sample Results Returned

```json
{
  "official": [
    {
      "url": "https://youtube.com/watch?v=abc123",
      "title": "Paris-Roubaix 2026 | Full Race Highlights",
      "description": "Relive all the action from the Hell of the North",
      "sourceChannel": "gcnracing",
      "sourceTier": "official"
    },
    {
      "url": "https://youtube.com/watch?v=def456",
      "title": "Paris-Roubaix 2026 Extended Highlights | 45 Minutes",
      "description": "Extended race coverage featuring all the key sectors",
      "sourceChannel": "eurosportcycling",
      "sourceTier": "official"
    }
  ]
}
```

### 3.4 Spawning the Analyzer Agent

For each candidate URL, Claude spawns the `youtube-cycling-analyzer` agent:

```
Task: Analyze https://youtube.com/watch?v=abc123 for spoiler safety
Agent: youtube-cycling-analyzer
```

### 3.5 Agent Scrapes Video Content

The agent executes:

```bash
node -e "import { scrapeContent } from './lib/firecrawl-utils.js';
scrapeContent('https://youtube.com/watch?v=abc123').then(r => console.log(JSON.stringify(r, null, 2)))"
```

Returns transcript and metadata:

```json
{
  "title": "Paris-Roubaix 2026 | Full Race Highlights",
  "channel": "GCN Racing",
  "duration": "PT32M15S",
  "transcript": [
    {"time": "0:00", "text": "Welcome to Paris-Roubaix, the Queen of the Classics"},
    {"time": "2:30", "text": "The peloton enters the first cobbled sector..."},
    {"time": "15:45", "text": "Attacks on the Carrefour de l'Arbre!"},
    {"time": "28:00", "text": "Into the velodrome for the final sprint..."},
    {"time": "31:50", "text": "And VAN DER POEL takes it! What a race!"}
  ]
}
```

### 3.6 Agent Performs Spoiler Analysis

The agent examines the transcript timeline:

1. **Title check**: "Full Race Highlights" - neutral, no winner ✓
2. **First 30 seconds**: "Welcome to Paris-Roubaix..." - no results ✓
3. **Winner mention**: "VAN DER POEL takes it" at 31:50 of 32:15 (97% through)
4. **Pattern**: Winner revealed only at natural finish line moment

### 3.7 Agent Output

```json
{
  "contentValidation": {
    "isRaceFootage": true,
    "contentType": "highlights",
    "contentQuality": "HIGH",
    "agentAssessment": "Official GCN Racing highlights with full race action"
  },
  "spoilerAssessment": {
    "overallSafety": "SAFE",
    "spoilerPattern": "end-only",
    "usableContentPortion": "100%",
    "spoilerBoundary": "31:50",
    "viewerExperience": "Full chronological race experience, winner revealed at natural finish"
  },
  "extractedMetadata": {
    "title": "Paris-Roubaix 2026 | Full Race Highlights",
    "duration": "32:15",
    "channel": "GCN Racing",
    "channelTrustLevel": "official"
  },
  "recommendation": {
    "action": "INCLUDE",
    "confidence": "HIGH",
    "reasoning": "Official channel, neutral title, spoiler only at finish line",
    "userGuidance": "Disable autoplay, avoid sidebar recommendations"
  }
}
```

### 3.8 Content Added to race-data.json

```json
{
  "id": "paris-roubaix-2026-highlights",
  "name": "Paris-Roubaix 2026 | Full Race Highlights",
  "description": "32-minute highlights covering all cobbled sectors and the dramatic velodrome finish",
  "platform": "YouTube",
  "channel": "GCN Racing",
  "verified": true,
  "url": "https://youtube.com/watch?v=abc123",
  "type": "highlights",
  "duration": "32:15",
  "raceDate": "2026-04-12"
}
```

---

## The Channel Trust System

Channels are categorized and managed over time:

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHANNEL TRUST LIFECYCLE                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   UNKNOWN CHANNEL                                                │
│        │                                                         │
│        ▼                                                         │
│   ┌─────────────────────────────────────────┐                   │
│   │  Broad search discovers new channel     │                   │
│   │  with promising content                 │                   │
│   └─────────────────────────────────────────┘                   │
│        │                                                         │
│        ▼                                                         │
│   EMERGING CHANNEL                                               │
│        │                                                         │
│        │  Analyze 3-5 videos                                     │
│        │  ≥80% spoiler-safe rate?                                │
│        │                                                         │
│   ┌────┴────┐                                                    │
│   │         │                                                    │
│   ▼         ▼                                                    │
│  YES       NO                                                    │
│   │         │                                                    │
│   ▼         ▼                                                    │
│ TRUSTED   BLOCKED                                                │
│ CHANNEL   CHANNEL                                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Managing Channels

```javascript
// Add newly discovered channel for monitoring
addEmergingChannel('newcyclingchannel', 'New Cycling Channel', 'Found via Roubaix search');

// Promote after validation
promoteToTrusted('newcyclingchannel', {
  spoilerRisk: 'low',
  quality: 'high'
});

// Block spoiler-heavy channel
blockChannel('spoilerchannel', 'Titles consistently reveal winners');
```

---

## Platform Ecosystem Warnings

Even with spoiler-safe videos, YouTube itself poses risks:

| Risk | Mitigation |
|------|------------|
| Sidebar recommendations | User guidance: "Avoid sidebar" |
| Autoplay next video | User guidance: "Disable autoplay" |
| Comment section | Don't scroll to comments |
| Title of next video | Use direct link, don't browse |

These warnings are included in user-facing content.

---

## Summary: The Safety Pipeline

```
1. SEARCH STRATEGY
   ├─ Prioritize official channels (lowest risk)
   ├─ Fall back to trusted channels
   └─ Use broad search only when necessary

2. CONTENT VALIDATION
   ├─ Is this actually race footage?
   └─ Not analysis, preview, or post-race interview?

3. SPOILER TIMING ANALYSIS
   ├─ When is the winner first mentioned?
   ├─ Is it at the natural finish (SAFE)?
   └─ Or revealed early (UNSAFE)?

4. TITLE & METADATA CHECK
   ├─ Does title reveal winner?
   └─ Is channel trustworthy?

5. FINAL CURATION
   ├─ SAFE/USABLE → Include in race-data.json
   ├─ RISKY/UNSAFE → Exclude
   └─ Add viewing guidance notes
```

---

## Key Principles

1. **Timing over presence**: Race footage contains winners. The question is WHEN viewers learn, not WHETHER.

2. **Trust but verify**: Official channels are preferred, but every video is still analyzed.

3. **Conservative inclusion**: When in doubt, exclude. False negatives (missing a good video) are better than false positives (spoiling a race).

4. **Viewer experience focus**: The north star is always: "Can a spoiler-averse fan enjoy this content?"

5. **Continuous learning**: The channel trust system evolves as new sources are discovered and validated.
