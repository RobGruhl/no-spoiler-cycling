---
description: Gather comprehensive pre-race coverage (previews, favorites, narratives, broadcast) for an upcoming race
argument-hint: <race-id> [--no-update] [--stages] [--generate] [--dry-run] [--skip-yt-analysis]
---

# Pre-Race Research Command

Gather comprehensive pre-race coverage for the specified race and auto-update race-data.json.

## Arguments Received
- Race identifier: `$1` (race ID or partial match, e.g., `tour-down-under-2026`)
- Additional flags in `$ARGUMENTS`: `--no-update`, `--stages`, `--generate`, `--dry-run`, `--skip-yt-analysis`

## Your Workflow

### Phase 1: Parse Arguments and Find Race

Parse the flags from `$ARGUMENTS`:
- `--no-update`: Research only, don't modify race-data.json
- `--stages`: Also fetch per-stage details (for stage races)
- `--generate`: Run generate-race-details.js after updating
- `--dry-run`: Preview updates without writing
- `--skip-yt-analysis`: Skip YouTube video spoiler analysis

Find the race in race-data.json:
```bash
node -e "
const data = require('./data/race-data.json');
const raceId = '$1';
const race = data.races.find(r => r.id === raceId || r.id.includes(raceId) || r.name.toLowerCase().includes(raceId.toLowerCase()));
if (race) {
  console.log(JSON.stringify({
    id: race.id,
    name: race.name,
    raceDate: race.raceDate,
    gender: race.gender,
    hasStages: !!race.stages,
    stageCount: race.stages?.length || 0,
    hasRaceDetails: !!race.raceDetails,
    hasBroadcast: !!race.broadcast
  }, null, 2));
} else {
  console.log('NOT_FOUND');
  data.races.filter(r => r.id.includes(raceId.split('-')[0])).slice(0, 5).forEach(r => console.log('  -', r.id));
}
"
```

If NOT_FOUND, show the similar races and ask the user which one they meant.

### Phase 2: Perplexity Research

Run searches using the race name and date found in Phase 1.

#### 2a. Comprehensive Race Details (Spoiler-Safe)
```bash
node -e "
import { searchRaceDetailsSafe } from './lib/perplexity-utils.js';
searchRaceDetailsSafe('RACE_NAME', 'RACE_DATE', YEAR).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

This returns: preview, sectors, favorites, narratives (all spoiler-safe).

#### 2b. Broadcast Information
```bash
node -e "
import { searchRaceBroadcastMultiGeo } from './lib/perplexity-utils.js';
searchRaceBroadcastMultiGeo('RACE_NAME', YEAR, ['US', 'CA', 'UK']).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

#### 2c. Stage Details (only if --stages flag AND race has stages)
For stage races, also search per-stage info using tour code:
```bash
node -e "
import { searchStagePreviewSafe } from './lib/perplexity-utils.js';
searchStagePreviewSafe('TOUR_CODE', STAGE_NUMBER, 'STAGE_DATE', YEAR).then(r => console.log(r.answer));
"
```

Tour codes: `tdf` (Tour de France), `giro` (Giro d'Italia), `vuelta` (Vuelta a Espana), `tdu` (Tour Down Under), etc.

### Phase 3: YouTube Discovery

#### 3a. Tiered YouTube Discovery
```bash
node -e "
import { discoverYouTubeContent } from './lib/youtube-utils.js';
discoverYouTubeContent('RACE_NAME', YEAR).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

#### 3b. Preview-Specific Searches
```bash
node -e "
import { youtubeSearch } from './lib/firecrawl-utils.js';
youtubeSearch('RACE_NAME YEAR preview').then(r => console.log(JSON.stringify(r, null, 2)));
"
```

#### 3c. Video Analysis (skip if --skip-yt-analysis)
For each promising video, spawn the youtube-cycling-analyzer agent:
```
Use Task tool with subagent_type=youtube-cycling-analyzer
Prompt: Analyze this YouTube video for spoiler safety and extract metadata: VIDEO_URL
```

Only include videos that pass spoiler safety analysis.

### Phase 4: Assemble Data

Build the update JSON from gathered data:

```json
{
  "raceDetails": {
    "lastFetched": "ISO-timestamp",
    "spoilerSafe": true,
    "courseSummary": "From preview.answer or preview.results snippets",
    "keySectors": [...],
    "keyClimbs": [...],
    "favorites": {
      "gcContenders": [],
      "sprinters": [],
      "puncheurs": [],
      "climbers": []
    },
    "narratives": [],
    "historicalContext": "",
    "watchNotes": ""
  },
  "broadcast": {
    "lastUpdated": "ISO-timestamp",
    "geos": {
      "US": { "primary": {...} },
      "UK": { "primary": {...} },
      "CA": { "primary": {...} }
    },
    "youtubeChannels": []
  }
}
```

### Phase 5: Update race-data.json

Unless `--no-update` flag is present:

1. Write assembled data to temp file:
```bash
cat << 'EOF' > /tmp/race-update.json
{ ... assembled data ... }
EOF
```

2. Run update script:
```bash
# For --dry-run: preview changes
node scripts/update-race.js --id RACE_ID --file /tmp/race-update.json --dry-run

# For actual update (no --dry-run flag):
node scripts/update-race.js --id RACE_ID --file /tmp/race-update.json
```

### Phase 6: Generate Page (if --generate)

```bash
node generate-race-details.js --race RACE_ID
```

For stage races with --stages:
```bash
node generate-race-details.js --stages RACE_ID
```

## Output Format

Present results as a formatted summary:

```markdown
## Pre-Race Research: [Race Name]

### Course Preview
[Summary from preview research]

### Key Sectors/Climbs
| Name | Km from Finish | Gradient | Notes |
|------|----------------|----------|-------|

### Pre-Race Favorites
- **GC Contenders**: [names]
- **Sprinters**: [names]
- **Puncheurs**: [names]
- **Climbers**: [names]

### Narratives to Watch
1. [Storyline]
2. [Storyline]

### Broadcast Info
| Region | Platform | Coverage | Subscription |
|--------|----------|----------|--------------|

### YouTube Preview Videos Found
- [Title](URL) - Channel

### Actions Taken
- raceDetails: [Updated/Skipped]
- broadcast: [Updated/Skipped]
- Page generated: [Yes/No/Skipped]
```

## Error Handling

- **Race not found**: Show similar IDs, ask user to clarify
- **Past race**: Note spoiler protection is active (searches auto-filtered to pre-race content)
- **API failures**: Continue with partial results, report warnings
- **Empty results**: Note which fields couldn't be populated

## Notes

- Perplexity often returns `answer: null` - extract from `results[].snippet` fields
- Run 1-2 weeks before race for best startlist/favorites data
- The update-race.js script preserves existing data (merges, doesn't overwrite)
- YouTube discovery prioritizes official channels over unknown sources
