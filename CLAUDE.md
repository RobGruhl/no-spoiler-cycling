**Mission**: Find cycling race footage across platforms while maintaining absolute spoiler safety. Curate spoiler-free content into `race-data.json` and generate static HTML pages.

## Working Session Flow

1. Generate search terms for each platform
2. Search YouTube, FloBikes, Peacock using `lib/firecrawl-utils.js`
3. Analyze results - identify actual race footage vs previews/analysis
4. Filter out spoiler content using natural language understanding
5. Update `race-data.json` via scripts (never edit directly)
6. Regenerate HTML: `npm run build`

## Tools Reference

All tools are called via `node -e "import { fn } from './lib/...'; fn(...).then(...)"`. See JSDoc in each file for full API details.

| Library | Purpose | Key Functions |
|---------|---------|---------------|
| `lib/firecrawl-utils.js` | Web discovery (Firecrawl API) | `youtubeSearch`, `flobikeSearch`, `peacockSearch`, `scrapeContent`, `searchContent` |
| `lib/perplexity-utils.js` | Race research (Perplexity API) | `searchRaceDetailsSafe`, `searchStagePreviewSafe`, `searchRaceBroadcast`, `searchGrandTourStages`, `searchClassicRace`, `searchRaceMultiLanguage` |
| `lib/youtube-utils.js` | Tiered YouTube discovery | `discoverYouTubeContent`, `searchYouTubeChannel` |

**Perplexity tips**: Functions often return `answer: null` - extract from `results[].snippet`. Run raceDetails and broadcast searches in parallel. Verify AI-synthesized answers against multiple sources.

**Broadcast discovery**: `data/broadcasters.json` has geo + YouTube channel mappings. YouTube is a primary source - licensed broadcasters often have channels with extended highlights.

### Platform Credentials (.env)
`FIRECRAWL_API_KEY`, `PERPLEXITY_API_KEY`, `FLOBIKES_EMAIL`/`PASSWORD`, `PEACOCK_EMAIL`/`PASSWORD`

## Content Rules

### Include (priority order):
1. Live events → Full race recordings → Extended highlights → Regular highlights

### Exclude:
- Results, winner names, podium positions, standings
- Post-race analysis, interviews, predictions

### Spoiler-Safe Highlights vs Spoiler Highlights

**Safe**: Race shown chronologically, winner revealed only at natural finish, neutral title ("Stage 5 Highlights"), commentary doesn't reveal outcome.

**Unsafe**: Winner announced early, title reveals outcome ("How X Won"), post-race interviews, results graphics, past-tense commentary revealing outcome.

**Decision rule**: Winner revealed only in last 10% + clean title = safe. Winner revealed early or spoiler title = exclude.

### Platform Warnings
YouTube sidebar, autoplay, and comments often contain spoilers. For safe YouTube content, note: "Disable autoplay, avoid sidebar recommendations."

### Spoiler Safety for Race Details (Past Races)
The `searchRaceDetailsSafe` function auto-filters by date - for past races it sets `endDate` to race date so only pre-race content returns. Safe: course descriptions, sector details, climb gradients, pre-race favorites, historical context. Dangerous: anything mentioning winners, podiums, or results.

**Auto-blocked domains**: wikipedia.org, sporza.be, nos.nl (often contain results).

For non-English searches, verify date-filtering works and review for result leakage.

## Data Schema Reference

### Terrain Icons (must use exact values)

| Value | Icon | Value | Icon |
|-------|------|-------|------|
| `flat` | ➡️ | `summit-finish` | 🔝 |
| `hilly` | 〰️ | `crosswind-risk` | 💨 |
| `mountain` | ⛰️ | `circuit` | 🔄 |
| `cobbles` | 🪨 | `itt` | ⏱️ |
| `gravel` | 🟤 | | |

### Stage Types

| Type | Icon | Color | Type | Icon | Color |
|------|------|-------|------|------|-------|
| `flat` | ➡️ | Blue | `itt` | ⏱️ | Purple |
| `hilly` | 〰️ | Orange | `ttt` | 👥 | Purple |
| `mountain` | ⛰️ | Red | `rest-day` | 😴 | Gray |

### Gender Values
`men` (default), `women` (WWT, women's editions), `mixed` (e.g., Mixed Relay TTT). Scripts auto-detect from category codes and name patterns.

### Key Race Fields
- `platform`: "YouTube", "FloBikes", "Peacock", or "TBD" for future events
- `gender`, `terrain` (array), `topRiders` (array), `broadcast` (object), `stages` (array)
- Races with `broadcast.geos` populated are NOT marked "TBD" even without video URLs

### TBD Standards
- `platform: "TBD"`, `url: "TBD"` for future/undiscovered content
- No date references in descriptions (shown via raceDate/raceDay)
- Always include raceDate and raceDay for chronological ordering

### Broadcast Schema
```
broadcast.geos.<GEO>.primary = { broadcaster, broadcasterId, type, url, coverage, subscription, notes }
broadcast.geos.<GEO>.alternatives = [{ broadcaster, type, url, coverage, subscription }]
broadcast.youtubeChannels = [{ channel, handle, contentType }]
```

### Stages Schema
```
stages[] = { stageNumber, name, stageType, terrain[], distance, date, platform, url, description, stageDetails }
```

### Race Details Schema

**Stage races need BOTH** `raceDetails` (race-level) AND `stages[].stageDetails` (per-stage). One-day races need only `raceDetails`.

#### Field Responsibility Matrix
| Field | Race-Level (stage races) | Stage-Level | One-Day |
|-------|-------------------------|-------------|---------|
| courseSummary | Overall race format | Stage route | Full race route |
| keyClimbs | GC-decisive only + stage # | All climbs this stage | All climbs |
| keySectors | Rarely used | If cobbles/gravel | All sectors |
| favorites | gcContenders, stageHunters | Not used | Rider types (sprinters, puncheurs, etc.) |
| narratives | GC battles, rivalries | Not used | Race storylines |
| historicalContext | Race history | Not used | Race history |
| watchNotes | Race-level viewing guide | Stage-level viewing | Race viewing guide |
| gcDynamics | How GC unfolds | Not used | Not used |

**keySectors fields**: name, kmFromFinish, length, surface (cobbles/gravel/dirt), difficulty (1-5), description
**keyClimbs fields**: name, category (HC/1/2/3/4), length, avgGradient, maxGradient, kmFromFinish, summit, notes

### Top Riders Schema
```json
{ "id": "slug", "name": "LAST First", "team": "...", "ranking": 1, "nationality": "...", "nationalityCode": "XX", "specialties": ["climber", "gc-contender"] }
```

## Data Management

**CRITICAL**: Never edit `race-data.json` directly. Always use scripts. The file exceeds Claude's read limit (~72K tokens).

### Scripts (see `--help` or script headers for full usage)
```bash
node scripts/add-race.js --file /tmp/new-race.json [--dry-run]     # Add new race
node scripts/update-race.js --id RACE_ID --file /tmp/updates.json  # Update race (deep merges topRiders, broadcast, raceDetails)
node scripts/update-race.js --id RACE_ID --set 'field=value'       # Quick field update
```

**Reading data**: Use `node -e "const d=require('./data/race-data.json'); ..."` or Grep.

**Other scripts**: `scripts/add-gender-field.js`, `scripts/add-women-races.js`, `scripts/tag-races.js`

### Stage Race Checklist
- [ ] Race-level `raceDetails` (GC context, favorites, narratives)
- [ ] `stages[]` array with stageNumber, name, stageType, terrain, distance, date
- [ ] Per-stage `stageDetails` inside each stage
- [ ] `broadcast` info
- [ ] Generate: `node generate-race-details.js --stages <race-id>`

## Build & Quality

```bash
npm run build                       # Calendar page
npm run build:all                   # All pages (calendar + riders + details)
node generate-race-details.js --all # Race detail pages
node generate-race-details.js --race RACE_ID  # Single race
```

### Quality Checks
```bash
node scripts/test-race-quality.js --race RACE_ID                          # Single race
node scripts/test-race-quality.js --from 2026-01-01 --to 2026-02-28 --compact  # Date range
node scripts/test-race-quality.js --all --compact                         # All races
node scripts/test-race-quality.js --race RACE_ID --check-links            # With Playwright link checks
```

**QA loop**: Discover content → update data → run quality check → fix issues → retest → `npm run build`

## Batch Update Strategy

For large updates (20+ races), use 3 parallel agents:

| Agent | Role | API |
|-------|------|-----|
| video-high | Video discovery for 3-5★ races | Firecrawl |
| video-low | Video discovery for 1-2★ races | Firecrawl |
| details-researcher | Race details + broadcast | Perplexity |

**Priority**: 3-5★ races first. Group similar races (all stages together). FloBikes first (most comprehensive).

**FloBikes deep links**: Search `site:flobikes.com` for event pages. Deep links: `flobikes.com/events/12345-...`. Don't settle for root URLs.

**Acceptable root URLs** (login-gated, no public deep links): discoveryplus.com, 7plus.com.au, max.com, peacocktv.com

## Rider Population

```bash
node populate-race-riders.js           # Men's riders → men's races
node scripts/populate-riders-women.js  # Women's riders → women's races
```

Data: `data/riders.json` (men), `data/riders-women.json` (women). Run early in update sessions.

### Women's Rider Slug Mappings
When adding women's races, if PCS slug differs from race-data.json ID, update `RACE_SLUG_MAPPING` in `scripts/populate-riders-women.js`. Current mappings:
```
giro-d-italia-women → giro-ditalia-women, paris-roubaix-we → paris-roubaix-women,
ronde-van-vlaanderen-we → ronde-van-vlaanderen-women, santos-women-s-tour → women-tour-down-under,
strade-bianche-donne → strade-bianche-women, amstel-gold-race-we → amstel-gold-race-women,
la-fleche-wallonne-feminine → la-fleche-wallonne-women, liege-bastogne-liege-femmes → liege-bastogne-liege-women,
trofeo-palma-femina → trofeo-palma-feminina
```

### Riders Pages Build
```bash
npm run build:riders              # Men's index
npm run build:riders-women        # Women's index
npm run build:rider-details       # Men's detail pages
npm run build:rider-details-women # Women's detail pages
```
