# Daily stage-backfill routine (runbook)

This is the **authoritative, self-contained** runbook for the scheduled cloud
routine *"daily stage backfill."* It runs unattended in a fresh GitHub checkout
and **commits straight to `main`**, so it must depend on **nothing outside this
repo** — every command and schema it needs is inlined below. (The local
`/backfill-stage-results` slash command points here too.)

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

node scripts/test-results-completeness.js --json > /tmp/comp.json
node -e "
let d; try { d = require('/tmp/comp.json'); } catch (e) {
  console.error('GATE_CRASH: completeness --json produced no/!valid output:', e.message);
  process.exit(1);   // → Phase 6 posts a failure line; don't proceed blind
}
const missing = (d.sections.stages.details || [])
  .filter(s => !s.hasJson)
  .map(s => ({ raceId: s.raceId, raceName: s.raceName, stage: s.stageNumber, date: s.date }))
  .sort((a,b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));   // oldest gap first
require('fs').writeFileSync('/tmp/missing-stages.json', JSON.stringify(missing, null, 2));
console.log('missing stages:', missing.length);
console.log(JSON.stringify(missing.slice(0, 10), null, 2));
"
```

If `missing.length === 0`: skip to **Phase 6** and post the Slack summary with 0
stages (a clean no-op still reports — silence is itself a failure signal). Done.

## Phase 1 — Pick the slice

`MAX_PER_ITER = 3`. Take the first 3 from `/tmp/missing-stages.json` (oldest gap
first). Group consecutive stages of the same race together — they share GC
context and source pages. Process them in order.

## Phase 2 — Research each stage

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

Repeat 2a–2d for each stage in the slice. **A stage that fails** (no sources,
ambiguous GC, scrape error) → skip it, keep the rest, note it in the commit body.

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

# Set these to what you actually processed this run:
STAGE_IDS="tour-de-suisse-2026-stage-5"     # space-separated <race-id>-stage-N
RACE_IDS="tour-de-suisse-2026"              # space-separated distinct race ids
RIDER_SLUGS=""                              # any rider seasonArcs you rewrote (often none)

for id in $STAGE_IDS; do
  git add "data/results/stages/$id.json" "results/race/$id.html" "race-details/$id.html" 2>/dev/null
done
for race in $RACE_IDS; do
  git add "data/results/races/$race.json" "results/race/$race.html" "race-details/$race.html" 2>/dev/null
done
for slug in $RIDER_SLUGS; do
  # NEW rider arc → build:all also adds a forward link to the rider's CALENDAR
  # page, so stage that too or the link silently drifts (gate reads the rebuilt
  # working tree, not the index, so it won't catch the omission).
  git add "data/results/riders/$slug.json" "results/rider/$slug.html" \
          "riders/$slug.html" "riders-women/$slug.html" 2>/dev/null
done
git add results/_assets/manifest.json
# Only if you added/changed a teamStories[] entry this run:  git add results/teams.html

# Guard 1 — path allowlist (self-contained substitute for the PR-only path-guard,
# since this pushes straight to main). EVERY staged path must live in the results
# subsystem. If anything else is staged (race-data.json, lib/, scripts/, .github/,
# package.json, a stray build artifact), ABORT — never commit it to main.
BAD=$(git diff --cached --name-only | grep -vE '^(data/results/|results/|race-details/|riders/|riders-women/)' || true)
if [ -n "$BAD" ]; then echo "ABORT: staged path outside results subsystem:"; echo "$BAD"; git reset; exit 1; fi

# Guard 2 — churn: a 1–3 stage backfill stages well under ~15 files. A larger set
# means an accidental `git add .` swept in the ~1000-file day-granular build churn.
N=$(git diff --cached --name-only | wc -l)
echo "staged ($N):"; git diff --cached --name-only
if [ "$N" -gt 25 ]; then echo "ABORT: staging too broad ($N) — investigate"; git reset; exit 1; fi

# Guard 3 — did we actually publish? If stages were due (missing>0) but nothing is
# staged, this is a silent no-op masquerading as success — report it, don't fake it.
if [ "$N" -eq 0 ]; then echo "NOTHING_STAGED — report 0 published in Slack, note why (all skipped?)"; fi

[ "$N" -gt 0 ] && git commit -m "results: backfill $STAGE_IDS (daily routine)

Auto-generated by the daily stage-backfill routine.
<note any skipped stages + reason>"
[ "$N" -gt 0 ] && git push origin main
```

If `git push` fails for auth reasons, do **not** retry with other credentials —
note it in the Slack report and stop. (Leftover unstaged build churn is fine —
the ephemeral cloud checkout is discarded after the run.)

## Phase 6 — Slack cost report

Generate the cost breakdown from the ledger, then post it to Slack channel
**`C0BBV37T43H`** (`#no-spoiler-cycling`):

`--stage-ids` is **comma**-separated, but `$STAGE_IDS` above is space-separated —
convert it (otherwise the report shows one mangled id):

```bash
node scripts/cost-ledger.js report \
  --stages <N> --stage-ids "$(echo $STAGE_IDS | tr ' ' ',')" \
  --model claude-sonnet-4-6 --ledger /tmp/nsc-cost.jsonl --date "$(date -u +%F)"
```

(`--model` must match the model the routine actually runs on — `claude-sonnet-4-6`
in the trigger config. `--ledger` is the same literal path Phase 0/2 wrote to.)

Post that exact text to `C0BBV37T43H` via the Slack tool (`slack_send_message`).
Always post — even on a 0-stage day (a silent run is itself a failure signal).
On failure, post: `⚠️ daily stage backfill failed: <one-line reason>`.

## Idempotency & cadence

Re-running is safe: Phase 0 reads `hasJson` live, so already-published stages are
filtered out. A no-missing-stages run is a clean no-op that still reports to Slack.
Expect 0–2 new stages on a typical day during a Grand Tour, 0 most other days.
