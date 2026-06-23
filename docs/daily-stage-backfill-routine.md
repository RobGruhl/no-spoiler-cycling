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
   forward "View Results" link. This keeps the spoiler-safe calendar safe by
   construction.
2. **Spoiler gate is a hard stop.** Before committing, `npm test` must report
   **0 fail** and `node scripts/test-results-completeness.js` must report **0
   errors**. If either regresses, revert the slice and commit nothing.
3. **In-repo libs only** (see note above).
4. **Requires `PERPLEXITY_API_KEY` + `FIRECRAWL_API_KEY`** in the environment. If
   either is missing, post the Slack failure line and exit — do not loop.
5. **Never write speculative results.** If a stage finished < ~2h ago and no
   per-stage results page is indexed yet, skip it; tomorrow's run gets it.

## Phase 0 — Setup + find the work

```bash
export NSC_COST_LEDGER="${NSC_COST_LEDGER:-/tmp/nsc-cost.jsonl}"
: > "$NSC_COST_LEDGER"        # fresh ledger for this run
npm ci                         # install deps in the fresh checkout

node scripts/test-results-completeness.js --json > /tmp/comp.json
node -e "
const d = require('/tmp/comp.json');
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
stages. Done.

## Phase 1 — Pick the slice

`MAX_PER_ITER = 3`. Take the first 3 from `/tmp/missing-stages.json` (oldest gap
first). Group consecutive stages of the same race together — they share GC
context and source pages. Process them in order.

## Phase 2 — Research each stage

### 2a. Perplexity discovery (in-repo wrapper)

```bash
node -e "
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
node -e "
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

```bash
git config user.name  "no-spoiler-cycling backfill"
git config user.email "noreply@anthropic.com"
git add data/results results race-details
git commit -m "results: backfill <stage-ids> (daily routine)

Auto-generated by the daily stage-backfill routine.
<note any skipped stages + reason>"
git push origin main
```

If `git push` fails for auth reasons, do **not** retry with other credentials —
note it in the Slack report and stop.

## Phase 6 — Slack cost report

Generate the cost breakdown from the ledger, then post it to Slack channel
**`C0BBV37T43H`** (`#no-spoiler-cycling`):

```bash
node scripts/cost-ledger.js report \
  --stages <N> --stage-ids <comma,separated,ids> \
  --model claude-sonnet-4-6 --date "$(date -u +%F)"
```

Post that exact text to `C0BBV37T43H` via the Slack tool (`slack_send_message`).
Always post — even on a 0-stage day (a silent run is itself a failure signal).
On failure, post: `⚠️ daily stage backfill failed: <one-line reason>`.

## Idempotency & cadence

Re-running is safe: Phase 0 reads `hasJson` live, so already-published stages are
filtered out. A no-missing-stages run is a clean no-op that still reports to Slack.
Expect 0–2 new stages on a typical day during a Grand Tour, 0 most other days.
