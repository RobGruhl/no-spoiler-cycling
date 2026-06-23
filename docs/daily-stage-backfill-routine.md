# Daily results routine (runbook)

This is the **authoritative, self-contained** runbook for the scheduled cloud
routine *"daily stage-results backfill."* It runs unattended in a fresh GitHub
checkout and **commits straight to `main`**, so it must depend on **nothing
outside this repo** — every command and schema it needs is inlined below. (The
local `/backfill-stage-results` slash command points here too.)

**What it covers each day** — a rolling window of **the last 2 days + today**
(UTC), for both stage-race stages AND one-day races:

- **Fill gaps** — any tracked race (men's road, 4–5★, cyclocross excluded) whose
  stage or race date falls in the window and has no results JSON yet — a per-stage
  result, a one-day race overview, or a stage race's overview hub.
- **Refresh thin/provisional** — re-research an *existing* in-window result only
  if it's a stub (thin) or was written same-day (re-verified once, the day after,
  when sources have settled). It does **not** blindly re-research correct pages.

Including "today" is safe: the routine runs at **19:23 UTC** (evening in Europe),
so the day's racing is finished and indexed; anything not yet final is skipped by
the Phase 2 guard and picked up tomorrow (the window self-heals a missed day).

> The cloud checkout does **not** contain `.claude/commands/*` (gitignored) or
> `~/Projects/hello-perplexity` (out of repo). Do **not** reference them. Use the
> in-repo wrappers `lib/perplexity-utils.js` and `lib/firecrawl-utils.js` only.

## Hard guardrails (non-negotiable)

1. **Write only under `data/results/`** (+ the generated HTML under `results/`
   and `race-details/`, and `results/_assets/manifest.json`). **Never edit
   `data/race-data.json`** or any calendar page by hand. The only calendar-side
   change allowed is what `generate-race-details.js` emits automatically — the
   forward "View Results" link.
   - **Why this is the real spoiler containment (architectural, not a test).**
     Every spoiler-safe calendar generator reads `data/results/` only via
     `fs.existsSync` (a presence check) — it never inlines any podium / winner /
     tldr / narrative text into a calendar page. So the *worst* a run can do to
     the spoiler-safe side is add a "View Results → spoilers" link pointing away
     to the gated page. Honour rule 1 and result text cannot cross over.
2. **Regression gate is a hard stop (NOT a results-spoiler gate).** Before
   committing, `npm test` must report **0 fail** and
   `node scripts/test-results-completeness.js` must report **0 errors**.
   - ⚠️ Be clear what these catch: `npm test` reads only `data/race-data.json`
     (which you never edit), so it catches *calendar* breakage, not a spoiler in
     a results JSON — it cannot inspect what you wrote. Completeness catches
     genuine regressions (JSON-without-HTML, manifest drift, missing forward
     link). Neither verifies result *correctness* — that rests on the Phase 2c
     cross-check. Treat these as "don't break the site," and rely on rule 1 for
     spoiler safety.
3. **In-repo libs only** (see note above).
4. **Requires `PERPLEXITY_API_KEY` + `FIRECRAWL_API_KEY`** in the environment.
   Phase 0 checks both up front; if either is missing, post the Slack failure
   line and exit — do not loop.
5. **Never write speculative results.** If a stage finished < ~2h ago and no
   per-stage results page is indexed yet, skip it; tomorrow's run gets it. Quote
   ≥2 distinct-domain sources in `sources[]` for every podium you publish.
6. **The Slack report is SPOILER-FREE — this is non-negotiable.** Rob reads
   `#no-spoiler-cycling` and must NOT be spoiled. Report only **which** races/
   stages were updated (by name or id) and the cost. **NEVER** put a winner,
   podium, finishing position, time, gap, jersey/GC, or any narrative/result
   detail in a Slack message. The `scripts/cost-ledger.js report` output is
   already safe (it knows only ids + counts) — post it as-is and do **not**
   append a results summary, "✅ Pogačar won…" line, or any outcome text.

## Phase 0 — Setup + find the work

**Preflight BEFORE spending any money on research** — a missing key or missing
git push credential should fail on day 1, not after a full paid research run
whose output then can't be published:

```bash
# 1. API keys present? (guardrail 4)
node -e "process.exit(process.env.PERPLEXITY_API_KEY && process.env.FIRECRAWL_API_KEY ? 0 : 1)" \
  || { echo "PREFLIGHT_FAIL: missing PERPLEXITY_API_KEY / FIRECRAWL_API_KEY"; \
       # → go straight to Phase 6 and post: "⚠️ daily stage backfill failed: missing API keys"
       exit 1; }

npm ci                                   # install deps in the fresh checkout

# 2. Can we actually push to main? If not, don't pay for research we can't publish.
git config user.name  "no-spoiler-cycling backfill"
git config user.email "noreply@anthropic.com"
git push --dry-run origin main \
  || { echo "PREFLIGHT_FAIL: no git push credential for origin/main"; \
       # → Phase 6: post "⚠️ daily stage backfill failed: cannot push to main (auth)"; do NOT retry with other creds
       exit 1; }
```

The cost ledger uses a **fixed literal path** (`/tmp/nsc-cost.jsonl`) everywhere —
`export NSC_COST_LEDGER=...` does NOT survive into the separate `node -e` shells
the research steps run in (each Bash call is a fresh shell), so an exported var
would leave the ledger empty and the cost report would lie "$0". Truncate it once
here and pass the literal path inline in Phase 2 and Phase 6.

```bash
: > /tmp/nsc-cost.jsonl                   # fresh cost ledger for this run

# The work-list for the last-2-days+today window: gaps (missing race/stage
# results) and refreshes (in-window thin/stub or day-after-provisional entries).
node scripts/results-worklist.js --window 2 --json > /tmp/worklist.json || \
  { echo "WORKLIST_FAIL"; exit 1; }   # → Phase 6 posts a failure line
cat /tmp/worklist.json
```

`/tmp/worklist.json` shape: `{ window:{from,to}, counts:{gaps,refreshes},
gaps:[{kind:'race'|'stage', id, raceId?, stage?, date}],
refreshes:[{kind, id, date, reason}] }`.

If `counts.gaps === 0 && counts.refreshes === 0`: skip to **Phase 6** and post the
Slack summary with 0 items (a clean no-op still reports — silence is a failure
signal). Done.

## Phase 1 — Pick the slice

`MAX_PER_RUN = 6`. Process **gaps first** (publishing missing results matters more
than refreshing existing ones), then refreshes, oldest date first, up to the
ceiling. Group items of the same race together — they share GC context and source
pages. If the work-list exceeds the ceiling, process the first 6 and **note the
dropped count in the Slack report** (no silent truncation — the rest are caught on
the next run, still inside the window).

## Phase 2 — Research each item (stage, race, or refresh)

Each work-list item is a `stage` or a `race` (one-day result, or a stage race's
overview hub), and is either a **gap** (write new) or a **refresh** (re-research
and overwrite an existing JSON). The research steps (2a–2c) are identical for all;
2d/2e differ by `kind`; refreshes are covered in 2f.

### 2a. Perplexity discovery (in-repo wrapper)

**Prefix EVERY research command** (`2a` and `2b`, and any ad-hoc query you add)
with `NSC_COST_LEDGER=/tmp/nsc-cost.jsonl` so the call is counted for the cost
report — the var must be on the same command, not exported in a prior step.

```bash
NSC_COST_LEDGER=/tmp/nsc-cost.jsonl node -e "
import('./lib/perplexity-utils.js').then(async m => {
  const r = await m.perplexitySearch('<Race> 2026 Stage <N> result winner podium GC <date>', { recencyFilter: 'week', maxResults: 6 });
  console.log('answer:', r.answer || '(none)');
  (r.results||[]).forEach((x,i)=>{console.log(i+1,x.title);console.log('  ',x.url);console.log('  ',(x.snippet||'').slice(0,240));});
});
"
```

`answer` is usually null — read `results[].snippet`. **Source hierarchy** (prefer
in this order, always cite the per-article URL, never a site root):
cyclingstage.com (per-stage results page) → cyclinguptodate.com → cyclingnews.com
→ official race site → procyclingstats.com. **Avoid as primary:** wikipedia,
sporza, nos, X/Twitter aggregators.

### 2b. Firecrawl deep-scrape the narrative

```bash
NSC_COST_LEDGER=/tmp/nsc-cost.jsonl node -e "
import('./lib/firecrawl-utils.js').then(async m => {
  const r = await m.scrapeContent('<cyclingstage per-stage results URL>', { formats: ['markdown'] });
  console.log((r.markdown || r.content || '').slice(0, 6000));
});
"
```

### 2c. Cross-check before writing (critical)

Find **two sources** that explicitly state the post-stage GC leader before
writing `gcImpact`. **Never** infer "won the stage ⇒ leads GC." If sources
disagree you've probably conflated a mid-stage and a final report — re-read.

### 2d. Write `data/results/stages/<race-id>-stage-N.json`

`stageType` must match the stage's type in `race-data.json`. `riderPerformances`
only for tracked riders (`data/riders.json` + `data/outsiders.json`). Schema:

```jsonc
{
  "raceId": "<race-id>",
  "stageNumber": 5,
  "stageName": "Town A → Town B",
  "stageDate": "2026-06-21",
  "stageType": "mountain",
  "researchedAt": "<ISO timestamp>",
  "tldr": "1–3 sentences: winner + key GC change + setup for next stage.",
  "podium": [
    { "position": 1, "name": "First Last", "team": "Canonical Team", "time": "4h 12m 33s" },
    { "position": 2, "name": "First Last", "team": "...", "gap": "+0:14" },
    { "position": 3, "name": "First Last", "team": "...", "gap": "+0:31" }
    // add positions 4–5 only if a tracked rider is there (include "riderId")
  ],
  "narrative": {
    "headline": "Punchy one-liner.",
    "body": "2–4 chronological paragraphs with km-to-go markers. End with the post-stage GC consequence."
  },
  "gcImpact": {
    "headline": "Post-stage GC in a phrase.",
    "body": "Who leads (explicit retains vs takes), gaps to the next ~5–7 GC riders."
  },
  "riderPerformances": [
    {
      "riderId": "<slug>", "name": "First Last", "team": "...",
      "role": "leader",            // leader | stage-hunter | domestique | helper
      "position": 4, "gap": "+1:05",
      "narrative": "3–6 sentences: km markers, decisive moments, season-arc meaning.",
      "keyMoments": [ { "km": 7, "what": "Followed the first attack" } ],
      "incident": null
    }
  ],
  "incidents": {},               // optional { crashes:[], abandons:[{riderId,reason}] }
  "quotes": [],
  "sources": [ { "url": "https://www.cyclingstage.com/...stage-N...", "publication": "Cycling Stage", "title": "...", "lang": "en" } ]
}
```

Refresh a tracked rider's `data/results/riders/<slug>.json` `seasonArc` only if
this stage is a genuine inflection (career-first GT podium, GC top-5, abandon);
otherwise leave it.

### 2e. Write `data/results/races/<race-id>.json` (kind: `race`)

For a **one-day race** or a **stage race's overview hub**. Full schema +
`teamStories[]` / `decisiveMoments[]` / `aftermath` detail is in
`.claude/commands/race-rider-team-results.md` *when run locally* — but in the
cloud follow this inlined shape (the `narrative` key is `narrative`, never
`story`; `verdictClass` is `win`|`neutral`|`loss`):

```jsonc
{
  "raceId": "<race-id>", "raceName": "<name>", "raceDate": "2026-06-21",
  "researchedAt": "<ISO timestamp>",
  "inProgress": false,              // true for an ONGOING stage race → relaxes podium/narrative
  "tldr": "1–3 sentences: winner + headline.",
  "podium": [ { "position": 1, "name": "First Last", "team": "Canonical Team" },
              { "position": 2, "name": "...", "team": "...", "gap": "+0:14" },
              { "position": 3, "name": "...", "team": "...", "gap": "+0:31" } ],
  "narrative": { "headline": "...", "openingMoves": "...", "raceUnfolds": "...", "decision": "...", "finale": "..." },
  "decisiveMoments": [ { "kmFromFinish": 35, "location": "...", "headline": "...", "description": "..." } ],
  "teamStories": [ { "team": "Canonical Team", "verdict": "≤6-word pill", "verdictClass": "win", "narrative": "strategy, who they backed, what worked", "riderIds": ["<slug>"] } ],
  "riderPerformances": [ /* same shape as the stage schema, tracked riders only */ ],
  "incidents": {}, "aftermath": { "headline": "...", "quotes": [], "body": "..." },
  "sources": [ { "url": "https://www.cyclingstage.com/...", "publication": "...", "title": "...", "lang": "en" } ]
}
```

For an **ongoing** stage race's hub, set `inProgress: true`, a `podium` placeholder,
and populated `narrative.openingMoves`/`raceUnfolds` + `decisiveMoments` so far.

### 2f. Refreshes (re-research an existing entry)

A refresh item already has a JSON on disk. Re-run 2a–2c, then **overwrite** the
file with the corrected/enriched content (bump `researchedAt`). Refreshes exist to
fix a *thin or same-day-provisional* page — so only overwrite when the new
research is at least as complete and you've re-confirmed the podium/GC against ≥2
sources. **If the new research is thinner or you can't reconfirm, leave the
existing file untouched** and note "refresh skipped (no improvement)" — never
regress a good page.

Repeat 2a–2f for each item in the slice. **An item that fails** (no sources,
ambiguous GC, scrape error, or a refresh with no improvement) → skip it, keep the
rest, note it in the commit body.

## Phase 3 — Rebuild

```bash
npm run build:results          # results HTML
npm run build:all              # calendar pages incl. forward "View Results" links
node -e "
const fs=require('fs');
const ls=d=>fs.readdirSync('data/results/'+d).filter(f=>f.endsWith('.json')).map(f=>f.replace(/\.json$/,'')).sort();
fs.writeFileSync('results/_assets/manifest.json', JSON.stringify({ lastUpdated:new Date().toISOString(), races:ls('races'), stages:ls('stages'), riders:ls('riders') }, null, 2)+'\n');
console.log('manifest rebuilt');
"
```

## Phase 4 — Spoiler gate (hard stop)

```bash
node scripts/test-results-completeness.js     # the stages you wrote flip to ✓; expect 0 errors
npm test                                       # spoiler-safe calendar suite — must be 0 fail
```

Any `fail` in `npm test`, or a completeness **error**: revert and stop —
```bash
git checkout -- . && git clean -fd data/results results race-details
```
then go to Phase 6 and post a failure summary. **Do not commit.**

## Phase 5 — Commit + push to `main`

⚠️ **Stage files precisely — do NOT `git add race-details` or `results` wholesale.**
The generators stamp a **day-granular build date** into every page, so a full
rebuild shows ~1000 changed files on any day the site wasn't already rebuilt
today. Committing that would bury the real change in daily churn. Stage only the
files tied to the race(s) you processed (this is exactly what the human results
commits do — ~5 calendar pages + the results files, not 1000).

```bash
git config user.name  "no-spoiler-cycling backfill"
git config user.email "noreply@anthropic.com"

# (These loops rely on bash word-splitting on spaces — the cloud env is bash. For a
#  local zsh run of /backfill-stage-results, run this block via `bash -c '...'`, or
#  list the paths explicitly — zsh does NOT split unquoted $VARs.)

# Set these to what you actually wrote/overwrote this run (gaps AND refreshes):
STAGE_IDS="tour-de-suisse-2026-stage-5"     # space-separated <race-id>-stage-N stage items
RACE_IDS="tour-de-suisse-2026"              # one-day races + stage-race hubs you touched,
                                            # PLUS the parent race id of any stage above
                                            # (so its calendar page's R-badges get staged)
ARC_SLUGS=""                                # rider slugs whose seasonArc JSON you rewrote (often none)
# PERF_SLUGS = EVERY riderId that appears in riderPerformances of the items above.
# Their results/rider/<slug>.html (generated by Phase 3's build:results) MUST be
# committed: for a first-time performer it is a NEW file, and CI runs build:all
# (NOT build:results), so it checks the COMMITTED page. Omit it and checkRiders()
# errors "rider HTML missing" → main goes red. Derive it from THIS RUN's JSONs only:
PERF_FILES=""
for id in $STAGE_IDS; do PERF_FILES="$PERF_FILES data/results/stages/$id.json"; done
for race in $RACE_IDS; do f="data/results/races/$race.json"; [ -f "$f" ] && PERF_FILES="$PERF_FILES $f"; done
PERF_SLUGS=$(node -e "
const fs=require('fs'); const s=new Set();
for (const f of process.argv.slice(1)) { try { const d=JSON.parse(fs.readFileSync(f,'utf8'));
  for (const p of (d.riderPerformances||[])) if (p.riderId) s.add(p.riderId); } catch {} }
console.log([...s].join(' '));
" $PERF_FILES)

for id in $STAGE_IDS; do
  git add "data/results/stages/$id.json" "results/race/$id.html" "race-details/$id.html" 2>/dev/null
done
for race in $RACE_IDS; do
  git add "data/results/races/$race.json" "results/race/$race.html" "race-details/$race.html" 2>/dev/null
done
for slug in $PERF_SLUGS; do
  git add "results/rider/$slug.html" 2>/dev/null    # REQUIRED — new performers' pages, or CI errors
done
for slug in $ARC_SLUGS; do
  # seasonArc rewrite → also stage the rider's CALENDAR page (gains/keeps the
  # forward "View season" link; otherwise it silently drifts).
  git add "data/results/riders/$slug.json" "riders/$slug.html" "riders-women/$slug.html" 2>/dev/null
done
git add results/_assets/manifest.json
# Only if you added/changed a teamStories[] entry this run:  git add results/teams.html

# Guard 1 — path allowlist (self-contained substitute for the PR-only path-guard,
# since this pushes straight to main). EVERY staged path must live in the results
# subsystem. If anything else is staged (race-data.json, lib/, scripts/, .github/,
# package.json, a stray build artifact), ABORT — never commit it to main.
BAD=$(git diff --cached --name-only | grep -vE '^(data/results/|results/|race-details/|riders/|riders-women/)' || true)
if [ -n "$BAD" ]; then echo "ABORT: staged path outside results subsystem:"; echo "$BAD"; git reset; exit 1; fi

# Guard 2 — churn: a run stages the item files (~3 each) + one results/rider page
# per performing rider + manifest — a few dozen files at most. A much larger set
# means an accidental wholesale `git add` swept in day-granular build churn
# (`git add results/` ≈ 94, `git add race-details` ≈ 807, `git add .` ≈ 1000+).
N=$(git diff --cached --name-only | wc -l)
echo "staged ($N):"; git diff --cached --name-only
if [ "$N" -gt 75 ]; then echo "ABORT: staging too broad ($N) — investigate"; git reset; exit 1; fi

# Guard 3 — did we actually publish? If work was due (gaps/refreshes > 0) but
# nothing is staged, this is a silent no-op masquerading as success — report it.
if [ "$N" -eq 0 ]; then echo "NOTHING_STAGED — report 0 in Slack, note why (all skipped?)"; fi

[ "$N" -gt 0 ] && git commit -m "results: daily window update ($STAGE_IDS $RACE_IDS)

Auto-generated by the daily results routine (gaps + thin/provisional refreshes).
<note any skipped items + reason>"
[ "$N" -gt 0 ] && git push origin main
```

If `git push` fails for auth reasons, do **not** retry with other credentials —
note it in the Slack report and stop. (Leftover unstaged build churn is fine —
the ephemeral cloud checkout is discarded after the run.)

## Phase 6 — Slack cost report

Generate the cost breakdown from the ledger, then post it to Slack channel
**`C0BBV37T43H`** (`#no-spoiler-cycling`):

`--stages <N>` is the **total items** you committed this run (gaps + refreshes);
`--stage-ids` takes their ids. Convert the space-separated `$STAGE_IDS`/`$RACE_IDS`
to the comma-separated form the flag expects:

```bash
IDS="$(echo $STAGE_IDS $RACE_IDS | xargs | tr ' ' ',')"
node scripts/cost-ledger.js report \
  --stages <N> --stage-ids "$IDS" \
  --model claude-sonnet-4-6 --ledger /tmp/nsc-cost.jsonl --date "$(date -u +%F)"
```

(`--model` must match the model the routine actually runs on — `claude-sonnet-4-6`
in the trigger config. `--ledger` is the same literal path Phase 0/2 wrote to.)

Post that exact text to `C0BBV37T43H` via the Slack tool (`slack_send_message`),
then **append a line** for anything you didn't finish: items skipped (with reason)
and, if the work-list exceeded `MAX_PER_RUN`, `+K more in window, next run`.
Always post — even on a 0-item day (a silent run is itself a failure signal). On
failure, post: `⚠️ daily results routine failed: <one-line reason>`.

🚫 **SPOILER-FREE (guardrail 6):** the report names only **which** races/stages
were updated + the cost. The `cost-ledger.js report` output is already safe (ids
+ counts) — post it verbatim. Do **NOT** add any winner / podium / position /
time / gap / GC / narrative. A skip reason must be generic ("not yet indexed",
"sources disagreed") — never a result. If you're unsure whether a word is a
spoiler, leave it out.

## Idempotency & cadence

Re-running is safe: the work-list is recomputed live each run, so already-complete
gaps and already-refreshed entries drop out. A no-work run is a clean no-op that
still reports to Slack. Expect a handful of items on active racing days (a Grand
Tour stage + a one-day race or two, plus the prior day's same-day pages getting
their one settle-refresh), and 0 on quiet days.
