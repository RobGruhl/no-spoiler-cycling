---
description: Update race data (broadcast, URLs, details) for a specific race
argument-hint: <race-name-or-id> [--broadcast] [--url] [--details] [--stages] [--all] [--dry-run]
---

# Update Race Command

Automatically update race data for a specified race. Finds missing/outdated fields and populates them.

## Arguments Received
- Full arguments: `$ARGUMENTS` (e.g., "tour-down-under stage 3 --broadcast")
- Parse the arguments to extract:
  - Race identifier (everything before flags, e.g., "tour-down-under stage 3")
  - Flags: `--broadcast`, `--url`, `--details`, `--stages`, `--all`, `--dry-run`

**Default behavior (no flags):** Automatically detect and update all missing fields.

**Stage-specific updates:** If arguments include "stage N", update only that stage's URL.

## Workflow

### Step 1: Parse Arguments and Find Race

Parse `$ARGUMENTS` to extract:
1. Race identifier (words before any `--` flags)
2. Optional stage number (if "stage N" appears)
3. Flags (--broadcast, --url, --details, --stages, --all, --dry-run)

Example parsing:
- "tour-down-under stage 3" → race="tour-down-under", stageNum=3
- "paris-roubaix --broadcast" → race="paris-roubaix", flags=[broadcast]
- "giro 2026 --all" → race="giro 2026", flags=[all]

```bash
node -e "
const data = require('./data/race-data.json');
// Extract race query from arguments (remove flags and 'stage N')
const args = '$ARGUMENTS';
const stageMatch = args.match(/stage\s+(\d+)/i);
const stageNum = stageMatch ? parseInt(stageMatch[1]) : null;
const query = args.replace(/--\w+/g, '').replace(/stage\s+\d+/gi, '').trim().toLowerCase();

const race = data.races.find(r =>
  r.id === query ||
  r.id.includes(query) ||
  r.name.toLowerCase().includes(query)
);
if (race) {
  const hasUrl = race.url && race.url !== 'TBD';
  const hasBroadcast = !!race.broadcast?.geos;
  const hasDetails = !!race.raceDetails;
  const isStageRace = race.stages?.length > 0;
  const stagesWithUrls = isStageRace ? race.stages.filter(s => s.url && s.url !== 'TBD').length : 0;
  const year = new Date(race.raceDate).getFullYear();

  console.log(JSON.stringify({
    id: race.id,
    name: race.name,
    raceDate: race.raceDate,
    gender: race.gender,
    year,
    isStageRace,
    targetStage: stageNum,
    missing: {
      url: !hasUrl && !isStageRace,
      broadcast: !hasBroadcast,
      details: !hasDetails,
      stageUrls: isStageRace ? race.stages.length - stagesWithUrls : 0
    }
  }, null, 2));
} else {
  console.log('NOT_FOUND');
  data.races
    .filter(r => r.id.includes(query.split('-')[0]) || r.name.toLowerCase().includes(query.split(' ')[0].toLowerCase()))
    .slice(0, 8)
    .forEach(r => console.log('  ' + r.id));
}
"
```

If NOT_FOUND, show similar race IDs and stop.

### Step 2: Determine Update Scope

Based on flags or auto-detect:
- If `--all` or no flags: update everything that's missing
- If specific flags: only update those fields
- Skip fields that are already populated (unless explicitly requested)

### Step 3: Update Broadcast (if needed)

```bash
node -e "
import { searchRaceBroadcastMultiGeo } from './lib/perplexity-utils.js';
searchRaceBroadcastMultiGeo('RACE_NAME', YEAR, ['US', 'CA', 'UK']).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Parse the results. Look for broadcaster names and URLs in the answer/snippets. Build broadcast object:

```bash
cat << 'EOF' > /tmp/broadcast-update.json
{
  "broadcast": {
    "lastUpdated": "2026-01-23T00:00:00Z",
    "geos": {
      "US": {
        "primary": {
          "broadcaster": "FloBikes",
          "broadcasterId": "flobikes",
          "type": "streaming",
          "url": "https://www.flobikes.com",
          "coverage": "live",
          "subscription": true
        }
      }
    }
  }
}
EOF
node scripts/update-race.js --id RACE_ID --file /tmp/broadcast-update.json
```

### Step 4: Update Race Details (if needed)

```bash
node -e "
import { searchRaceDetailsSafe } from './lib/perplexity-utils.js';
searchRaceDetailsSafe('RACE_NAME', 'RACE_DATE', YEAR).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Extract from results and build raceDetails:
- `courseSummary` from preview answer/snippets
- `keySectors` / `keyClimbs` from sectors answer/snippets
- `favorites` from favorites answer/snippets
- `narratives` from narratives answer/snippets

```bash
cat << 'EOF' > /tmp/details-update.json
{
  "raceDetails": {
    "lastFetched": "2026-01-23T00:00:00Z",
    "spoilerSafe": true,
    "courseSummary": "...",
    "keyClimbs": [],
    "keySectors": [],
    "favorites": {},
    "narratives": []
  }
}
EOF
node scripts/update-race.js --id RACE_ID --file /tmp/details-update.json
```

### Step 5: Update URL (if needed, non-stage races)

Search for race video:
```bash
node -e "
import { flobikeSearch, youtubeSearch } from './lib/firecrawl-utils.js';
Promise.all([
  flobikeSearch('RACE_NAME YEAR'),
  youtubeSearch('RACE_NAME YEAR full race replay')
]).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

For YouTube results, analyze with youtube-cycling-analyzer agent to verify spoiler safety.

Apply URL:
```bash
node scripts/update-race.js --id RACE_ID --set 'platform=FloBikes' --set 'url=https://...'
```

### Step 6: Update Stage URLs (if needed, stage races)

For each stage missing a URL, search:
```bash
node -e "
import { flobikeSearch, youtubeSearch } from './lib/firecrawl-utils.js';
flobikeSearch('RACE_NAME Stage N YEAR').then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Update each stage directly:
```bash
node -e "
import { readFileSync, writeFileSync } from 'fs';
const data = JSON.parse(readFileSync('./data/race-data.json', 'utf-8'));
const race = data.races.find(r => r.id === 'RACE_ID');
const stage = race.stages.find(s => s.stageNumber === N);
stage.platform = 'FloBikes';
stage.url = 'https://...';
data.lastUpdated = new Date().toISOString();
writeFileSync('./data/race-data.json', JSON.stringify(data, null, 2));
console.log('Updated Stage N');
"
```

### Step 7: Regenerate Pages

```bash
npm run build
```

If raceDetails was updated:
```bash
node generate-race-details.js --race RACE_ID
```

If stage race:
```bash
node generate-race-details.js --stages RACE_ID
```

### Step 8: Report Results

Output a summary:

```markdown
## Updated: [Race Name]

| Field | Action |
|-------|--------|
| Broadcast | Added US (FloBikes), UK (Eurosport), CA (FloBikes) |
| Race Details | Added course summary, 3 key climbs, favorites |
| URL | Set to FloBikes |
| Stage URLs | Updated 4 of 6 stages |

**Files regenerated:** index.html, race-details/race-id.html
```

## Execution Notes

- Run searches in parallel where possible (broadcast + details can run together)
- For YouTube videos, always use youtube-cycling-analyzer agent to verify spoiler safety
- If a search returns no usable results, note it and continue with other fields
- The update-race.js script safely merges data (won't overwrite existing topRiders, etc.)
- For `--dry-run`, show what would be updated but don't write files
