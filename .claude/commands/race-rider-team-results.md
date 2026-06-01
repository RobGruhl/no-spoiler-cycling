---
description: Research and populate post-race results (race overview, stage results, rider season, team narratives) using Perplexity + Firecrawl, with HTML generation and completeness checks.
argument-hint: --race RACE_ID [--stage N] | --rider RIDER_ID | --all-finished
---

# Race / Rider / Team Results Population

This skill captures the methodology for the **results subsystem** — the `/results/` set of post-race pages with podiums, narratives, GC impact, per-rider performances, and team storylines. It lives behind a spoiler interstitial; this is where results are SUPPOSED to live, separate from the spoiler-safe calendar.

## When to use

- A stage of a Grand Tour or week-long stage race just finished — populate its stage result.
- A 4–5★ one-day race just finished — populate the race overview.
- A new rider needs a season page, or an existing rider's seasonArc needs a fresh stage.
- After several races, refresh team-narrative coverage (see "Team narratives" below — teams don't have their own JSON files; coverage comes from references in race/stage files).

## Data + script map

| What | JSON path | Generator | HTML output |
| --- | --- | --- | --- |
| Race overview (stage race hub or one-day) | `data/results/races/<race-id>.json` | `node generate-results.js --race <race-id>` (or `--all`) | `results/race/<race-id>.html` |
| Stage result | `data/results/stages/<race-id>-stage-N.json` | `node generate-stage-results.js --race <race-id>` (or `--all`) | `results/race/<race-id>-stage-N.html` |
| Rider season | `data/results/riders/<rider-slug>.json` | `node generate-rider-season.js --rider <slug>` (or `--all`) | `results/rider/<slug>.html` |
| Outsiders (tracked-but-not-in-riders.json) | `data/outsiders.json` (single file with `riders[]`) | — | — |
| Completeness audit | — | `node scripts/test-results-completeness.js [--strict] [--verbose]` | terminal |

**Important**: never edit `race-data.json` directly for results work — that file is the spoiler-safe calendar. Results are a separate data set.

## Research workflow

### Step 1 — Perplexity discovery (find authoritative live reports)

> **Canonical Perplexity client.** The distilled, reusable client lives at
> `~/Projects/hello-perplexity/lib/perplexity.js` — `search()` (flat-rate raw results + citations),
> `chat()` (synthesised answer, `sonar-pro`), `deepResearch()` (exhaustive, ~6 min), `reason()`
> (chain-of-thought). It supports `allowDomains`/`blockDomains`, `recency`, and `startDate`/`endDate`.
> Reach for it whenever you hit **missing information** — a result you can't confirm, a team/rider not
> in the curated data, a contested fact. Run it with the key loaded, e.g.
> `node --env-file=~/Projects/hello-perplexity/.env -e "import('/Users/robgruhl/Projects/hello-perplexity/lib/perplexity.js').then(async ({chat}) => { const r = await chat('…'); console.log(r.answer, r.citations); })"`.
> `lib/perplexity-utils.js → perplexitySearch` below is this project's thin in-repo wrapper over the same
> Search API; either works, but prefer the canonical client for synthesis (`chat`/`deepResearch`).

Use `lib/perplexity-utils.js → perplexitySearch` for a direct query. Don't use `searchRaceDetailsSafe` — that's date-filtered for the spoiler-safe calendar; for results work we WANT post-race coverage.

```bash
node -e "
import('./lib/perplexity-utils.js').then(async m => {
  const r = await m.perplexitySearch(
    'Giro d\'Italia 2026 Stage 7 Blockhaus result winner podium May 15 2026',
    { recencyFilter: 'week', maxResults: 5 }
  );
  console.log('answer:', r.answer || '(none)');
  (r.results || []).forEach((x, i) => {
    console.log(i+1, '-', x.title);
    console.log('   url:', x.url);
    console.log('   snippet:', (x.snippet || '').slice(0, 220));
  });
});
"
```

**Recency filter**: `'day'` for stages that finished today, `'week'` for older stages, `'month'` for older races. Past Grand Tour results stay indexed forever; only adjust recencyFilter if results aren't surfacing.

**`answer` is often null.** Perplexity prefers to populate `results[].snippet`. Read snippets — they routinely contain the winner, podium, and a one-line GC summary.

**Trustworthy result sources** (in approximate order):
1. **cyclingstage.com** — has a `/giro-2026-results/stage-N-italy-results-2026/` page per stage with podium + GC table + race report. Always cite the per-stage URL, never the root `/giro-2026-results/`.
2. **cyclinguptodate.com** — long-form race report with detailed narrative.
3. **cyclingnews.com** — live report URLs (`/pro-cycling/live/...`); occasionally the live blog stays up post-race and is good narrative.
4. **giroditalia.it / letour.fr / lavuelta.es** — official race sites for stage profiles, jersey wearers, and the standings widget. Less useful for narrative.
5. **procyclingstats.com** — the canonical results database. Use for podium positions 6–10 and GC tables. Slow to update on stage day, so it may lag the morning-after; reliable by the next afternoon.

**Avoid** as primary results sources: wikipedia.org, sporza.be, nos.nl, twitter.com/x.com aggregators. They have results but also pull from other sources that may be wrong.

### Step 2 — Firecrawl deep scrape (extract the narrative)

Perplexity snippets give you the headline result. For the full race report (attack at what km, who chased, what the GC group did, abandons, etc.), scrape the live report from cyclingstage or cyclinguptodate:

```bash
node -e "
import('./lib/firecrawl-utils.js').then(async m => {
  const r = await m.scrapeContent(
    'https://www.cyclingstage.com/giro-2026-results/stage-8-italy-results-2026/',
    { formats: ['markdown'] }
  );
  console.log((r.markdown || r.content || '').slice(0, 6000));
});
"
```

Parse the report into your JSON sections:
- **podium**: positions + names + teams + gaps (use the explicit results table in the article).
- **narrative.body**: 2–4 paragraphs covering early break → mid-race → decisive move → finish.
- **gcImpact**: standings *after* this stage. Always include the leader's name and the gaps to the next 5–7 GC contenders.
- **riderPerformances**: only for tracked riders (see `data/riders.json` + `data/outsiders.json`) — with role (`leader` / `stage-hunter` / `domestique`), position, gap, narrative (3–6 sentences), keyMoments[].
- **incidents**: crashes, mechanicals, abandons. Reference `riderId` if a tracked rider was involved.
- **sources**: per-article URL + publication + title + lang (`en`, `it`, `fr`, etc.).

### Step 3 — Sanity-check against multiple sources

This is the critical step that the prior speculative methodology missed. The pre-existing Giro 2026 Stage 7 results file claimed Vingegaard took pink at Blockhaus — but every source (cyclinguptodate, cyclingstage, giroditalia.it jersey list, the GC table) shows Eulálio retained the maglia rosa because his Stage 6 breakaway cushion was too big to overturn in one summit finish.

**Cross-check rule**: before writing `gcImpact`, find at least two sources that explicitly state the post-stage GC leader. If they disagree, pause and re-read — the disagreement often means you've read a mid-stage report and a final-stage report and conflated them. **Never** infer "X won, so X must lead the GC" — that's the trap.

Other rules:
- If a stage is mid-race or just finished within the hour, Perplexity may surface preview/mid-race content. Wait until at least one cyclingstage.com per-stage results page exists, then proceed.
- Distance and elevation: get them from the official race site, not from your own arithmetic on the route. They're often slightly different from pre-race publications.
- Times: stage time = position-1 time from the published table; gaps are relative to it. Don't compute "+0:32" yourself — cite what the table shows.

## Output JSON schemas

### Stage result — `data/results/stages/<race-id>-stage-N.json`

```jsonc
{
  "raceId": "giro-d-italia-2026",
  "stageNumber": 7,
  "stageName": "Formia → Blockhaus",
  "stageDate": "2026-05-15",
  "stageType": "mountain",            // matches race-data.json stage type
  "researchedAt": "2026-05-17T05:30:00Z",
  "tldr": "1–3 sentences. Winner + key GC change + setup for next stage.",
  "podium": [
    { "position": 1, "name": "Jonas Vingegaard", "team": "Team Visma | Lease a Bike", "time": "6h 09m 15s" },
    { "position": 2, "name": "Felix Gall", "team": "Decathlon CMA CGM", "gap": "+0:13" },
    { "position": 3, "name": "Jai Hindley", "team": "Red Bull - BORA - hansgrohe", "gap": "+1:02" },
    // Position 4-5 if a tracked rider is in the top 5; otherwise stop at 3.
    { "position": 4, "riderId": "giulio-pellizzari", "name": "Giulio Pellizzari", "team": "Red Bull - BORA - hansgrohe", "gap": "+1:05" }
  ],
  "narrative": {
    "headline": "Punchy one-liner that hints at outcome without spoiling the rest of the race.",
    "body": "2–4 paragraphs of chronological narrative. Mention km-to-go markers for key moves. End with the post-stage GC consequence in one sentence."
  },
  "gcImpact": {
    "headline": "Post-stage GC framing in one phrase.",
    "body": "Concrete: who's in pink/yellow/red, gaps to the next ~5–7 GC contenders. Be explicit about *retains* vs *takes* the leader's jersey."
  },
  "riderPerformances": [
    {
      "riderId": "giulio-pellizzari", "name": "Giulio Pellizzari", "team": "Red Bull - BORA - hansgrohe",
      "role": "leader",                // leader | stage-hunter | domestique | helper
      "position": 4, "gap": "+1:05",
      "narrative": "3–6 sentences. Specific km markers, what they did at decisive moments, what it means for their season arc.",
      "keyMoments": [
        { "km": 7, "what": "Followed Vingegaard's attack — only rider initially able to" }
      ],
      "incident": null
    }
  ],
  "incidents": { /* optional: { crashes: [], abandons: [{ riderId, reason }] } */ },
  "quotes": [],                        // optional rider/DS post-stage quotes
  "sources": [
    { "url": "https://www.cyclingstage.com/giro-2026-results/stage-8-italy-results-2026/",
      "publication": "Cycling Stage", "title": "...", "lang": "en" }
  ]
}
```

### Race overview — `data/results/races/<race-id>.json`

Two shapes:

**Finished race** (one-day, or stage race after Stage final):
```jsonc
{
  "raceId": "paris-roubaix-2026", "raceName": "Paris-Roubaix", "raceDate": "2026-04-12",
  "researchedAt": "...",
  "inProgress": false,
  "tldr": "...",
  "podium": [ /* final GC podium for stage races, race podium for one-days */ ],
  "narrative": {
    "headline": "...",
    "openingMoves": "Week 1 / first 80 km.",
    "raceUnfolds": "Week 2 / mid-race.",
    "decision": "Where + when the race was decided.",
    "finale": "The final kilometres, podium time gaps."
  },
  "decisiveMoments": [ { "kmFromFinish": 35, "location": "Trouée d'Arenberg", "headline": "...", "description": "..." } ],
  "teamStories": [
    {
      "team": "Visma | Lease a Bike",          // canonical name — see "Team-name consistency" below
      "verdict": "Maglia rosa + five stages",   // short pill headline (≤6 words)
      "verdictClass": "win",                    // "win" | "neutral" | "loss" — drives the pill colour + "marked wins" count
      "narrative": "How this race fit into their season — strategy, who they backed, what worked, what didn't.",
      "riderIds": ["jonas-vingegaard", "wout-van-aert"]  // tracked riders who actually rode (links to season pages; unknown riders degrade to plain text)
    }
  ],
  // ⚠️ The narrative key is "narrative", NOT "story". generate-results.js / generate-teams.js read t.narrative;
  //    a "story" key renders an EMPTY paragraph. verdict/verdictClass/riderIds are optional but expected.
  "riderPerformances": [ /* per-tracked-rider, same shape as in stages */ ],
  "incidents": {},
  "aftermath": {
    "headline": "Race in context — what it means for the next month.",
    "quotes": [ { "rider": "...", "team": "...", "quote": "..." } ],
    "body": "1–3 paragraphs."
  },
  "sources": [ ... ]
}
```

**Stage race still in progress** (Giro/Tour/Vuelta during their actual May/July/September window):
```jsonc
{
  "raceId": "giro-d-italia-2026", "raceName": "Giro d'Italia", "raceDate": "2026-05-08",
  "researchedAt": "...",
  "inProgress": true,           // <-- relaxes podium/narrative requirements in the completeness test
  "tldr": "Hub-page summary. Current GC leader, key story so far, link to per-stage pages.",
  "podium": [ { "position": 1, "riderId": null, "name": "GC in progress", "team": "—", "gap": "race not yet over" } ],
  "narrative": { /* openingMoves / raceUnfolds populated; decision/finale can be partial */ },
  "decisiveMoments": [ /* incidents that have happened so far — crashes, key climbs, jersey changes */ ],
  "teamStories": [], "riderPerformances": [], "incidents": {},
  "aftermath": { "headline": "Mid-race summary", "quotes": [], "body": "Where the race stands as of <date>." },
  "sources": [ ... ]
}
```

After the race finishes, flip `inProgress: false` and rewrite the narrative + populate teamStories + final podium.

### Rider season — `data/results/riders/<rider-slug>.json`

Slug must match `id` in `data/riders.json` or `data/outsiders.json`. The page is auto-assembled from `riderPerformances` across all race/stage files — this file only stores the **seasonArc** narrative:

```jsonc
{
  "riderId": "giulio-pellizzari",
  "year": 2026,
  "lastUpdated": "2026-05-16T23:30:00Z",
  "seasonArc": "One long paragraph. The season-shape story: what races they targeted, where they peaked, what their headline result was, where they go next. 4–8 sentences. Mention specific races + finishing positions inline."
}
```

To refresh after a new stage:
1. Add a `riderPerformances[]` entry for that rider in the stage JSON (see schema above).
2. Re-read their `seasonArc` and decide if it needs updating — if the new performance is a meaningful inflection (career first podium, GC top-5 in a Grand Tour, a setback like an abandon), rewrite it. If it's an incremental top-10, leave the arc alone.
3. Run `node generate-rider-season.js --rider <slug>`.

### Outsiders (`data/outsiders.json`)

Riders the project tracks who aren't in the main `data/riders.json` roster. Single JSON file with `{ riders: [{ id, name, team, nationality, nationalityCode, photoUrl, ... }] }`. Both `riders.json` and `outsiders.json` are loaded by the generators; `riderId` references in stage/race files can point to either.

Add a new outsider when:
- They've earned 1–2 standout performances we'll keep referencing (eg. Pellizzari's Tirreno week, Brennan's spring sprints).
- They're not yet a UCI-WorldTour top-50 talent but the project's narrative wants to track them.

## Team narratives

Teams don't have their own JSON files. Team coverage is **inferred** by the completeness test from references in race/stage files:
- `riderPerformances[].team` and `podium[].team` strings
- `teamStories[]` arrays in race overviews
- The team-name substring matching in `scripts/test-results-completeness.js → PRINCIPAL_TEAMS`

To improve a team's coverage:
1. Look at the test output (`node scripts/test-results-completeness.js --strict --verbose`) for thin-coverage warnings.
2. Find a recent race result file and add a `teamStories[]` entry with the team's narrative for that race.
3. Or add a `riderPerformances[]` entry naming a domestique whose role illuminates the team's strategy.

Avoid: team narratives that just summarise GC standings. Team narratives should be **strategic** — what they tried to do, who they backed, what worked, what didn't.

### Coverage-gap recognition (don't leave teams blank, don't fabricate)

The teams page (`results/teams.html`, built by `generate-teams.js`) shows one card per team aggregating its `teamStories[]` across every race. After populating a Grand Tour, **every squad that started is a candidate for a chapter** — but the curated race JSON usually only names the teams that won stages or made the podium. That absence is a *data gap*, not evidence a team skipped the race.

**Recognise the gap explicitly:** list the race's start-list teams, diff against the teams that already have a `teamStories[]` entry. For each missing team, you have incomplete information — so **research it** (see below) before deciding. The two failure modes to avoid:
- Leaving a team that rode with no chapter → "all teams up to date" silently false.
- Inventing a result for a team you didn't verify → fabrication.

**Fill the gap with Perplexity** — use the canonical client (see "Canonical Perplexity client" near the top of this skill):
```js
// ~/Projects/hello-perplexity/lib/perplexity.js
import('/Users/robgruhl/Projects/hello-perplexity/lib/perplexity.js').then(async ({ chat }) => {
  const r = await chat(
    "At the 2026 Giro d'Italia, did <Team> start, and what was their best result " +
    "(stage win, GC placing, jersey, or team-classification position)? If they did not start, say so.",
    { model: 'sonar-pro', maxTokens: 500 });
  console.log(r.answer); console.log(r.citations);
});
```
Run it from a dir whose `.env` has `PERPLEXITY_API_KEY` (e.g. `node --env-file=~/Projects/hello-perplexity/.env -e '...'`).
Then write an **honest** chapter: a real result → `verdictClass: "win"`; rode without a notable result → a one-to-two-sentence `"neutral"` chapter ("anonymous Giro, best result 10th in the team classification"); confirmed did-not-start → omit. Reconcile against the curated race data — keep facts consistent (same overall winner, etc.).

### Team-name consistency (so the teams page groups correctly)

`generate-teams.js` groups appearances by a normalised `teamKey` (strips the filler word "Team", drops sponsor suffixes after `|` / `-` / `/`). Use **one canonical name per team across all races** anyway — writing "Team Visma | Lease a Bike" in one race and "Visma | Lease a Bike" in another nearly split Visma into two cards (the normaliser now catches it, but don't rely on it). Match the name already used in `data/riders.json`'s `team` field.

## Generation + verification loop

After each results-file update:

```bash
# 1. Regenerate the relevant HTML
node generate-stage-results.js --race <race-id>          # all stages for that race
node generate-results.js --race <race-id>                 # race overview
node generate-rider-season.js --rider <slug>              # rider page

# 2. Verify completeness
node scripts/test-results-completeness.js                # summary
node scripts/test-results-completeness.js --strict --verbose   # if you want details

# 3. Spot-check the HTML in a browser if the change was substantive
# (results pages live at results/race/<id>.html and results/race/<id>-stage-N.html)
```

The completeness test ignores cyclocross races and treats Grand Tours currently in progress (race date + 23 days from raceDate covers it) as having relaxed overview requirements.

## Daily flow — last-completed-stage pattern

For an in-progress stage race (Giro in May, Tour in July, Vuelta in Aug–Sep), the daily pattern is:

1. **Identify yesterday's stage**: `node -e "const d=require('./data/race-data.json'); const r=d.races.find(x=>x.id==='giro-d-italia-2026'); console.log(r.stages.filter(s=>s.date===new Date(Date.now()-86400000).toISOString().slice(0,10)));"`
2. **Perplexity discovery** with `recencyFilter: 'day'` for that stage's winner + GC.
3. **Firecrawl scrape** the cyclingstage.com per-stage URL.
4. **Write `data/results/stages/<race-id>-stage-N.json`** following the schema above. Cross-check GC leader against 2+ sources.
5. **Refresh tracked-rider performances** for that stage — Pellizzari, Milan, Ganna, etc., as applicable.
6. **If the stage changed the race**: update the race overview's `narrative.raceUnfolds` and `decisiveMoments[]`.
7. **For each tracked rider whose seasonArc shifted**: rewrite that rider's `seasonArc`.
8. `node generate-stage-results.js --race <race-id>` + `node generate-results.js --race <race-id>` + `node generate-rider-season.js --all` (cheap, just rerenders HTML).
9. `node scripts/test-results-completeness.js` — verify no new errors.

## Calendar-side cross-links

The calendar-side (spoiler-safe) pages link forward to their results-side counterparts when both:
- the relevant date has passed (stage / race only), and
- the corresponding results JSON exists on disk.

When you create a new stage/race/rider result, you don't need to touch the calendar-side generators — the existing helpers re-evaluate on every build:

| Generator | Helper | Forward link target |
| --- | --- | --- |
| `generate-race-details.js → renderStage()` | `hasStageResults(raceId, n)` + `isPastDate(stage.date)` | `../results/race/<race-id>-stage-N.html` |
| `generate-race-details.js → renderOneDay/renderStageRace()` | `hasRaceResults(raceId)` + `isPastDate(race.raceDate)` | `../results/race/<race-id>.html` |
| `generate-race-details.js → renderStageRace()` stage rows | per-stage `hasStageResults()` | inline `R` badge linking to stage results |
| `generate-rider-details.js` | `hasRiderResults(slug)` (checks HTML on disk) | `../results/rider/<slug>.html` |

The link styling uses `var(--signal)` (red) with a small "spoilers" subscript so users know what they're clicking into.

**The completeness test enforces these invariants** — see `scripts/test-results-completeness.js → checkCrossLinks()`. If you add a new result file and forget to regenerate the calendar HTML, the test errors out.

After updating any results data file, also regenerate the calendar-side pages so the link materialises:
```bash
node generate-race-details.js --stages <race-id>   # for stage races
node generate-race-details.js --race <race-id>     # for one-day
node generate-rider-details.js --all               # men + outsiders
node generate-rider-details.js --all --gender women
```

## Backfill workflow

When the completeness test reports riders with `riderPerformances[]` but no `data/results/riders/<slug>.json` — that's seasonArc backfill work. The mechanism is `/loop /backfill-rider-seasonarcs`:

```text
/loop /backfill-rider-seasonarcs
```

Each iteration processes up to 5 riders and commits as `Loop iter N: <slug-list> seasonArcs`. The loop terminates when the missing list is empty.

Full per-iteration recipe is in `.claude/commands/backfill-rider-seasonarcs.md`. Priority order is documented there too — GC headliners first (Pogacar, Vingegaard, Almeida, Evenepoel, Roglič, Pidcock, Gall, Onley, Ayuso, Carapaz), then sprinters & classics, then climbers, then outsiders.

**Idempotency**: re-running on a slice that was already committed is a no-op because Phase 0 reads `hasJson` from the completeness JSON.

**Failure handling**: per-rider failures don't fail the iteration. After two consecutive iterations with the same rider failing, reduce `MAX_PER_ITER` to 2 via `/loop /backfill-rider-seasonarcs --max 2`.

## Photos

Rider photos come from procyclingstats via `scripts/fetch-rider-photos.js`:

```bash
node scripts/fetch-rider-photos.js                  # all rosters
node scripts/fetch-rider-photos.js --outsiders      # neo-pros, the gap-fillers
node scripts/fetch-rider-photos.js --rider <slug>   # one rider, any roster
node scripts/fetch-rider-photos.js --force          # re-download
```

Photos land in `riders/photos/<slug>.jpg`. The script writes the local path back to the roster's `photoUrl` field, plus opportunistically backfills dateOfBirth, height, weight, nationality.

**Known limitation — PCS only hosts 160×240 thumbnails.** Probed alternate URL patterns (`/images/large/`, `/images/orig/`, `-large.jpg`, `-hd.jpg`) — all 302 redirect. The `/images/riders/<2>/<2>/<slug>-<year>.jpg` form IS the high-res form they serve. The top-crop CSS (`object-position: top center`) does the heavier lifting for visual quality.

**Top-crop CSS** (`generate-riders-index.js` and `generate-rider-details.js`):
```css
.rc-photo img      { object-fit: cover; object-position: top center; ... }
.hero .photo img   { object-fit: cover; object-position: top center; ... }
```

The completeness test asserts the top-crop rule is in the generated HTML — see `checkPhotos()`.

**Perplexity fallback (manual)**: for outsiders whose PCS profile lacks a photo (rare), search Perplexity for `'<name> cycling photo headshot'` and pick a non-licensed alternative. Don't automate — the false-positive rate is too high for an unattended path.

## Teams

**Shipped.** `generate-teams.js` builds `results/teams.html` — a single spoiler-gated, gender-filtered
(Men / Women) page that aggregates every race's `teamStories[]` into one card per team, sorted by
appearance count. Each card links to the race results pages and to the riders' season pages. It's wired
into the main nav site-wide as "04 — Teams (spoilers)" and into `build:all` / `build:teams`. There is no
separate per-team JSON or `lib/team-utils.js`; coverage is still derived entirely from `teamStories[]`
references in race overviews (see "Team narratives → Coverage-gap recognition" above for filling gaps).

Build it: `node generate-teams.js` (or `npm run build:teams`). It groups by a normalised `teamKey`, so
keep team names consistent (see "Team-name consistency" above).

The `PRINCIPAL_TEAMS` list in `scripts/test-results-completeness.js:69` is the source of truth for the
completeness test's team-coverage check. Substring matching by the first token (e.g. `'UAE'` matches
`'UAE Team Emirates - XRG'`, `'Visma'` matches `'Visma | Lease a Bike'`). That check only verifies the
principal squads appear *somewhere*; it does NOT verify per-race completeness, so use the coverage-gap
recognition step after each Grand Tour to catch teams that started but have no chapter.

## Spoiler-safety contract for the results subsystem

The results subsystem **deliberately contains spoilers**. It's gated by a client-side interstitial (`<gate>` element in each rendered page) that asks the user to confirm before revealing content. This is the opposite contract from the spoiler-safe calendar at `/`.

Don't add spoiler interstitials to the calendar pages, and don't try to make results pages "spoiler-safe" — they're designed for users who have already seen the race and want analysis.

## Cross-references to other skills

- **`/update-race`** — the spoiler-safe calendar's per-race update (broadcast, video URLs, topRiders).
- **`/full-update`** — month-wide calendar refresh (video links + broadcast).
- **`/pre-race`** — gather pre-race coverage for upcoming races (favorites, narratives, broadcast). Uses `searchRaceDetailsSafe`, *not* the results methodology.
- **`/quality-check`** — calendar-data quality. The results subsystem has its own completeness test (`scripts/test-results-completeness.js`).

## Known gotchas

- The pre-existing Loop-iter-generated results for Giro Stage 7 + 8 (commits `9c67dc0`, `d77008a`) were partially speculative — they had the right winner but wrong jersey holder. The fix lives in commit `bc6c849`. Lesson: cross-check GC against 2+ sources before declaring a leader change.
- Stage results pages have very steep researchedAt timestamps — they're often written within an hour of the stage finishing. Don't trust a `researchedAt` near (or after) the stage's actual finish time as a signal of accuracy.
- `perplexitySearch` returns `answer: null` more often than not for recent races. Always read `results[].snippet`.
- Source URLs should be the **per-article URL**, not the publication's root. `https://www.cyclingnews.com/` as a source is a code smell — it means the researcher didn't follow through to the specific article.
- Be careful with `--all` regenerators when the data still has known-incorrect entries. They'll happily bake the errors into HTML.
