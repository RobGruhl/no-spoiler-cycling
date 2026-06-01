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
| `lib/perplexity-utils.js` | Race research (Perplexity API — in-repo wrapper) | `searchRaceDetailsSafe`, `searchStagePreviewSafe`, `searchRaceBroadcast`, `searchGrandTourStages`, `searchClassicRace`, `searchRaceMultiLanguage` |
| `~/Projects/hello-perplexity/lib/perplexity.js` | **Canonical Perplexity client** (search/synthesis/deep research) | `search`, `chat`, `deepResearch`, `reason` |
| `lib/youtube-utils.js` | Tiered YouTube discovery | `discoverYouTubeContent`, `searchYouTubeChannel` |

**Perplexity tips**: Functions often return `answer: null` - extract from `results[].snippet`. Run raceDetails and broadcast searches in parallel. Verify AI-synthesized answers against multiple sources.

**Missing information → research, don't guess.** When the curated data is silent on something it *should* cover (a team that started a race but has no `teamStories[]` chapter, a rider with no performance entry, a contested result), treat it as a **gap to fill**, not proof of absence. Use the canonical client at `~/Projects/hello-perplexity/lib/perplexity.js` — `chat()`/`deepResearch()` for synthesis, `search()` for raw cited results — run with the key loaded (`node --env-file=~/Projects/hello-perplexity/.env -e "import('/Users/robgruhl/Projects/hello-perplexity/lib/perplexity.js').then(...)"`). Then write an honest entry from what you find, or omit only once you've *confirmed* absence (e.g. "did not start"). Never fabricate to fill a gap. See `/race-rider-team-results → Coverage-gap recognition`.

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
npm test                            # Fast quality suite — all 340 races (~2s)
npm run test:strict                 # Strict: warnings promoted to failures
npm run test:race -- RACE_ID        # Single race (full report)
npm run test:smoke                  # Post-build: every race produced an HTML page
npm run test:links                  # Slow: Playwright + Firecrawl link audit
npm run test:ci                     # What CI runs: quick + build:all + smoke
```

Direct script invocations (more flags) still work:
```bash
node scripts/test-race-quality.js --race RACE_ID --check-links
node scripts/test-race-quality.js --from 2026-01-01 --to 2026-02-28 --compact
node scripts/test-race-quality.js --all --only spoilers     # one section
```

Sections: `schema`, `crossrefs`, `invariants`, `spoilers`, `data`, `details`, `broadcast`, `links`. `--strict` promotes selected warnings (empty `stages[]`, missing `spoilerSafe`, spoiler-keyword hits, root URLs in broadcast) to failures.

**QA loop**: Discover content → update data → `npm test` → fix issues → `npm run build:all` → `npm run test:smoke`.

### Continuous Integration
- `.github/workflows/ci.yml` — runs on every push/PR: `npm test` + `npm run build:all` + `npm run test:smoke`. Non-strict; data-quality warnings don't block merges.
- `.github/workflows/nightly-links.yml` — daily 11:00 UTC + `workflow_dispatch`: runs `npm run test:strict` plus Playwright link audits against future races. Strict failures and unreachable URLs surface in the job summary; they don't block merges (they're reports).

The wiped-startlist regression test reads `HEAD~1:data/race-data.json` via `git show` so it requires `fetch-depth: 2` in the workflow checkout.

## Results subsystem

A separate set of **spoiler-gated** pages under `/results/` for post-race analysis: podiums, narratives, GC impact, per-rider performances, team storylines. Opposite contract from the calendar — these pages deliberately contain spoilers, gated by a client-side interstitial.

**Data layout:**
- `data/results/races/<race-id>.json` — race overviews (one-day races, stage-race hubs)
- `data/results/stages/<race-id>-stage-N.json` — per-stage results
- `data/results/riders/<slug>.json` — per-rider seasonArc paragraph (the rider page also auto-pulls riderPerformances from race/stage JSONs)

**Generators:**
```bash
node generate-results.js --race RACE_ID         # race overview HTML
node generate-stage-results.js --race RACE_ID   # all stages for a race
node generate-rider-season.js --rider SLUG      # rider season page
node generate-rider-season.js --all
```

**Skills:**
- `/race-rider-team-results` — full methodology: Perplexity → Firecrawl deep-scrape → JSON write → HTML generate. Use this when populating any new result.
- `/backfill-rider-seasonarcs` — one iteration of the backfill loop. Driven by `/loop /backfill-rider-seasonarcs`. Processes ~5 riders per iteration; idempotent.

**Quality gate:** `node scripts/test-results-completeness.js [--strict] [--verbose] [--json]`. Checks: race + stage coverage, rider seasonArc presence, team narrative coverage, **forward cross-links** (calendar → results), **photo presence + top-crop CSS**, manifest consistency. Wired into CI as a non-strict step; `--strict` runs nightly as a report.

**Forward-link invariants:** every past stage / race / rider with results data has a "View Results" link in its spoiler-safe calendar page (red link styled as `var(--signal)` with a small "spoilers" subscript). The completeness test errors out if any are missing.

**Photo rule:** rider photos use `object-position: top center` so head-shots aren't cropped to torsos. Procyclingstats only hosts 160×240 thumbnails — that's the working ceiling. See `scripts/fetch-rider-photos.js`.

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
