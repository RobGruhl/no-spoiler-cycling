---
description: Complete race data update for a month - video links for past races, broadcast for future
argument-hint: <month> [--year YYYY] [--min-stars N] [--geos US,UK,CA] [--dry-run]
---

# Full Update Command

Batch update all races for a given month:
- **Past races**: Find video links (FloBikes, YouTube) with spoiler analysis
- **Future races**: Add broadcast info for specified geos
- **All races**: Verify data integrity, regenerate pages

## Arguments
- `$ARGUMENTS`: First argument is month name or number (e.g., "march", "3", "march-april")
- `--year YYYY`: Year (default: current year)
- `--min-stars N`: Only process races with N+ stars (default: 1 = all)
- `--geos US,UK,CA`: Geographic regions for broadcast (default: US,UK,CA)
- `--dry-run`: Preview changes without writing

## Workflow

### Phase 0: Rider Population (Fast, Automated)

Run rider scripts first — they're fast and produce immediate visible results:

```bash
# Men's riders → men's races
node populate-race-riders.js

# Women's riders → women's races
node scripts/populate-riders-women.js
```

If women's slug mapping issues appear (e.g., "race X not found"), update `RACE_SLUG_MAPPING` in `scripts/populate-riders-women.js` before re-running.

### Phase 1: Find Target Races

Analyze the arguments and find target races:

```bash
node -e "
const data = require('./data/race-data.json');
const today = new Date();
const args = '$ARGUMENTS';

// Parse month from args (handle 'march', '3', 'march-april')
const monthArg = (args.split(' ')[0] || '').toLowerCase();
const monthMap = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11,
                  january:0,february:1,march:2,april:3,june:5,july:6,august:7,september:8,october:9,november:10,december:11};
const startMonth = monthMap[monthArg.slice(0,3)] !== undefined ? monthMap[monthArg.slice(0,3)] : parseInt(monthArg)-1;
const endMonthMatch = monthArg.match(/-(\w+)$/);
const endMonth = endMonthMatch ? (monthMap[endMonthMatch[1].slice(0,3)] !== undefined ? monthMap[endMonthMatch[1].slice(0,3)] : startMonth) : startMonth;

const yearMatch = args.match(/--year\s+(\d{4})/);
const year = yearMatch ? parseInt(yearMatch[1]) : today.getFullYear();

const minStarsMatch = args.match(/--min-stars\s+(\d)/);
const minStars = minStarsMatch ? parseInt(minStarsMatch[1]) : 1;

const races = data.races.filter(r => {
  const d = new Date(r.raceDate);
  const m = d.getMonth();
  return d.getFullYear() === year && m >= startMonth && m <= endMonth && (r.rating || 0) >= minStars;
});

const past = races.filter(r => new Date(r.raceDate) < today);
const future = races.filter(r => new Date(r.raceDate) >= today);

console.log(JSON.stringify({
  period: { startMonth, endMonth, year, minStars },
  summary: {
    totalRaces: races.length,
    past: past.length,
    future: future.length,
    pastNeedingUrls: past.filter(r => !r.url || r.url === 'TBD').length,
    futureNeedingBroadcast: future.filter(r => !r.broadcast).length
  },
  pastRaces: past.map(r => ({
    id: r.id, name: r.name, raceDate: r.raceDate, rating: r.rating,
    hasUrl: r.url && r.url !== 'TBD', hasBroadcast: !!r.broadcast,
    isStageRace: r.stages && r.stages.length > 0
  })),
  futureRaces: future.map(r => ({
    id: r.id, name: r.name, raceDate: r.raceDate, rating: r.rating,
    hasUrl: r.url && r.url !== 'TBD', hasBroadcast: !!r.broadcast
  }))
}, null, 2));
"
```

### Phase 2: Process Past Races (Video Links)

**Priority ordering**: Process 3-5 star races first, then 1-2 star. Group similar races together (e.g., all Challenge Mallorca stages, all Tour Down Under stages) for efficient batch searching.

For each past race missing URL:

#### 2a. FloBikes Search
```bash
node -e "
import { flobikeSearch } from './lib/firecrawl-utils.js';
flobikeSearch('RACE_NAME YEAR').then(r => console.log(JSON.stringify(r, null, 2)));
"
```

#### 2b. YouTube Discovery
```bash
node -e "
import { discoverYouTubeContent } from './lib/youtube-utils.js';
discoverYouTubeContent('RACE_NAME', YEAR).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

#### 2c. YouTube Spoiler Analysis
For promising YouTube videos, use the youtube-cycling-analyzer agent:
- Check title for spoiler language
- Analyze first 30 seconds of transcript
- Verify winner reveal timing (should be near end)

Only add videos that pass spoiler analysis.

#### 2d. Stage Race URLs
For stage races, search and update each stage:
```bash
node -e "
import { flobikeSearch } from './lib/firecrawl-utils.js';
flobikeSearch('RACE_NAME Stage N YEAR').then(r => console.log(JSON.stringify(r, null, 2)));
"
```

### Phase 3: FloBikes Deep Link Discovery

After initial video link population, upgrade root FloBikes URLs to deep links:

```bash
# Find races with root FloBikes URLs
node -e "
const data = require('./data/race-data.json');
data.races.filter(r => {
  const isRoot = r.url === 'https://www.flobikes.com' || (r.broadcast?.geos?.US?.primary?.url === 'https://www.flobikes.com');
  return isRoot && r.platform === 'FloBikes';
}).forEach(r => console.log(r.id, r.name));
"
```

Search FloBikes for the specific event page:
```bash
node -e "
import { flobikeSearch } from './lib/firecrawl-utils.js';
flobikeSearch('RACE_NAME YEAR site:flobikes.com').then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Deep links look like: `https://www.flobikes.com/events/12345-race-name-2026`

Update with the deep link:
```bash
node scripts/update-race.js --id RACE_ID --set 'url=https://www.flobikes.com/events/...'
```

### Phase 4: Process Future Races (Broadcast)

For each future race missing broadcast:

```bash
node -e "
import { searchRaceBroadcastMultiGeo } from './lib/perplexity-utils.js';
searchRaceBroadcastMultiGeo('RACE_NAME', YEAR, ['US', 'UK', 'CA']).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

Build broadcast object from results and update:
```bash
node scripts/update-race.js --id RACE_ID --file /tmp/broadcast.json
```

### Phase 5: Batch by Region (Efficiency)

Group research queries by region to reduce API calls:

**Broadcast Templates by Organizer:**

| Organizer | US Broadcaster | UK Broadcaster | CA Broadcaster |
|-----------|----------------|----------------|----------------|
| ASO (TdF, Paris-Roubaix, LBL) | Peacock | TNT Sports / Discovery+ | FloBikes |
| RCS (Giro, Milan-Sanremo) | HBO Max | TNT Sports / Discovery+ | FloBikes |
| Flanders Classics (Ronde, G-W) | FloBikes | TNT Sports / Discovery+ | FloBikes |
| Other Belgian | FloBikes | TNT Sports / Discovery+ | FloBikes |
| French regional | HBO Max | TNT Sports / Discovery+ | FloBikes |
| Italian regional | HBO Max | TNT Sports / Discovery+ | FloBikes |

**Standard Broadcast JSON Templates:**

```bash
# Belgian/FloBikes template
cat > /tmp/broadcast-belgian.json << 'EOF'
{
  "broadcast": {
    "lastUpdated": "2026-01-29T00:00:00Z",
    "geos": {
      "US": {
        "primary": { "broadcaster": "FloBikes", "type": "streaming", "subscription": true, "url": "https://www.flobikes.com", "coverage": "live" },
        "alternatives": [{ "broadcaster": "GCN Racing YouTube", "type": "free", "url": "https://www.youtube.com/@GCNRacing", "coverage": "highlights" }]
      },
      "UK": {
        "primary": { "broadcaster": "TNT Sports / Discovery+", "type": "streaming", "subscription": true, "url": "https://www.discoveryplus.com", "coverage": "live" }
      },
      "CA": {
        "primary": { "broadcaster": "FloBikes", "type": "streaming", "subscription": true, "url": "https://www.flobikes.com", "coverage": "live" }
      }
    }
  }
}
EOF

# ASO/Peacock template
cat > /tmp/broadcast-aso.json << 'EOF'
{
  "broadcast": {
    "lastUpdated": "2026-01-29T00:00:00Z",
    "geos": {
      "US": {
        "primary": { "broadcaster": "Peacock", "type": "streaming", "subscription": true, "url": "https://www.peacocktv.com", "coverage": "live" },
        "alternatives": [{ "broadcaster": "NBC Sports YouTube", "type": "free", "url": "https://www.youtube.com/@NBCSports", "coverage": "highlights" }]
      },
      "UK": {
        "primary": { "broadcaster": "TNT Sports / Discovery+", "type": "streaming", "subscription": true, "url": "https://www.discoveryplus.com", "coverage": "live" }
      },
      "CA": {
        "primary": { "broadcaster": "FloBikes", "type": "streaming", "subscription": true, "url": "https://www.flobikes.com", "coverage": "live" }
      }
    }
  }
}
EOF

# RCS/HBO Max template
cat > /tmp/broadcast-rcs.json << 'EOF'
{
  "broadcast": {
    "lastUpdated": "2026-01-29T00:00:00Z",
    "geos": {
      "US": {
        "primary": { "broadcaster": "HBO Max", "type": "streaming", "subscription": true, "url": "https://www.max.com", "coverage": "live" }
      },
      "UK": {
        "primary": { "broadcaster": "TNT Sports / Discovery+", "type": "streaming", "subscription": true, "url": "https://www.discoveryplus.com", "coverage": "live" }
      },
      "CA": {
        "primary": { "broadcaster": "FloBikes", "type": "streaming", "subscription": true, "url": "https://www.flobikes.com", "coverage": "live" }
      }
    }
  }
}
EOF
```

### Phase 6: Race Details (Parallel with Video Discovery)

For races missing `raceDetails`:

```bash
node -e "
import { searchRaceDetailsSafe } from './lib/perplexity-utils.js';
searchRaceDetailsSafe('RACE_NAME', 'RACE_DATE', YEAR).then(r => console.log(JSON.stringify(r, null, 2)));
"
```

This runs well in parallel with video discovery since it uses a different API.

### Phase 7: Quality Check

Run the quality test suite to find remaining issues:

```bash
# Test all races in the target month
node scripts/test-race-quality.js --from YYYY-MM-01 --to YYYY-MM-31 --compact

# Or test specific race
node scripts/test-race-quality.js --race RACE_ID
```

Fix issues found (common ones):
- **Root URLs**: Upgrade to deep links (FloBikes event pages, YouTube video links)
- **Missing raceDetails**: Run searchRaceDetailsSafe
- **Missing broadcast**: Apply template from Phase 5
- **Missing terrain/rating**: Use `node scripts/tag-races.js`

Re-run quality check after fixes to verify.

### Phase 8: URL Verification

Verify URLs are reachable with HTTP HEAD checks:

```bash
node -e "
const data = require('./data/race-data.json');
const races = data.races.filter(r => {
  const d = new Date(r.raceDate);
  return d.getMonth() >= START_MONTH && d.getMonth() <= END_MONTH && d.getFullYear() === YEAR;
});
const urls = races.filter(r => r.url && r.url !== 'TBD').map(r => ({ id: r.id, url: r.url }));

(async () => {
  for (const { id, url } of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (!res.ok) console.log('FAIL', res.status, id, url);
    } catch (e) {
      console.log('ERROR', id, url, e.message);
    }
  }
  console.log('Done - checked', urls.length, 'URLs');
})();
"
```

**Note**: Streaming platform root URLs (discoveryplus.com, 7plus.com.au, max.com) are acceptable when the platform is login-gated and no deep link exists. These will return 200 even though they're root URLs.

### Phase 9: Update & Build

1. Apply all updates via scripts
2. Run `npm run build`
3. Run `node generate-race-details.js --all`

### Phase 10: Report

Output summary:

```markdown
## Full Update: [Month] [Year]

### Summary
| Category | Count | Updated |
|----------|-------|---------|
| Past races | X | Y URLs added |
| Future races | X | Y broadcasts added |
| Stage races | X | Y stage URLs |
| Race details | X | Y details added |

### Past Races Updated
| Race | Platform | URL Status |
|------|----------|------------|

### Future Races Updated
| Race | Broadcast Geos |
|------|----------------|

### Quality Check Results
| Check | Pass | Fail |
|-------|------|------|
| URLs reachable | X | Y |
| Deep links (not root) | X | Y |
| Race details populated | X | Y |
| Broadcast populated | X | Y |

### Races with No Coverage Found
- [list of races where no broadcast/video was found]

### Files Regenerated
- index.html
- race-details/*.html (X pages)
```

## Team-Based Parallel Execution

For large batch updates (20+ races), use a team of 3 parallel agents for maximum throughput:

### Team Setup
```
Create team with 3 agents:
1. "video-high" (general-purpose) - Video discovery for 3-5★ races
2. "video-low" (general-purpose) - Video discovery for 1-2★ races
3. "details-researcher" (general-purpose) - Race details + broadcast for all races
```

### Agent Task Assignment

**video-high agent:**
- Search FloBikes and YouTube for high-priority races first
- Run youtube-cycling-analyzer on YouTube candidates
- Update race URLs via update-race.js
- After high-priority, help with remaining races

**video-low agent:**
- Search FloBikes and YouTube for lower-priority races
- Many 1-2★ races may not have dedicated coverage — mark as noted
- Focus on FloBikes (most comprehensive for smaller races)

**details-researcher agent:**
- Run searchRaceDetailsSafe for all races missing raceDetails
- Run broadcast research for races missing broadcast
- Can run in parallel with video agents since it uses Perplexity API

### Coordination
- Share a task list with race IDs and status (pending/done/no-coverage)
- Agents claim races from the list to avoid duplicate work
- Team lead monitors progress and handles FloBikes deep link upgrades

## Tips & Proven Practices

- **Process high-star races first** (4-5★ before 1-2★) — users care most about these
- **Group similar races** (all Challenge Mallorca stages, all Tour Down Under stages) for efficient batch searching
- **FloBikes is the primary source** for most races — search there first
- **Streaming platform root URLs are acceptable** when login-gated (discoveryplus.com, 7plus.com.au, max.com) — no deep link exists behind the login wall
- **YouTube analysis is required** for ALL YouTube links (non-negotiable spoiler safety)
- **Quality test → fix → retest loop** catches issues systematically
- **HTTP HEAD checks** are a lightweight way to verify URLs when Playwright isn't available
- **Parallelize independent searches** where possible (FloBikes + YouTube, details + broadcast)
- **Always use update-race.js script** — never edit race-data.json directly
- For 1-star races with no coverage, it's OK to leave platform as "TBD"

## Example Usage

```bash
# Update all March races
/full-update march

# Update April-May races, 3+ stars only
/full-update april-may --min-stars 3

# Preview February updates without writing
/full-update february --dry-run

# Update specific year
/full-update january --year 2027
```
