# Daily calendar-footage routine (runbook)

Authoritative, self-contained runbook for the scheduled cloud routine
*"daily calendar-footage backfill."* It runs unattended in a fresh GitHub checkout
and **commits straight to `main`**, so it depends on **nothing outside this repo**.
(The local `/backfill-calendar-footage` slash command points here too.)

It is the **spoiler-FREE-calendar sibling** of `docs/daily-stage-backfill-routine.md`
(which does the spoiler *results* pages). Each day it finds recently-finished
races/stages that still lack watchable footage and attaches a **spoiler-safe**
YouTube highlight to the calendar (`data/race-data.json`): flips `platform` from
`"TBD"` to `"YouTube"`, sets the per-stage / race `url`, and writes a fixed
viewing note.

## ⚠️ The spoiler model here is the OPPOSITE of the results routine — read this

The results routine is **architecturally** safe: calendar generators only
`fs.existsSync` results JSON, never inline result text, so the worst a bad run does
is add a "View Results" link. **This routine has no such safety net.** It writes a
video URL directly onto the spoiler-free calendar, and:

- **`npm test` cannot tell a spoiler video from a safe one** — a URL is opaque, and
  the video's title isn't stored in a scanned field. So the regression gate does
  **not** catch a spoiler *video*. It only catches spoiler *text* you write into a
  scanned field (see the watchNotes lesson below).
- **Therefore VETTING is the only gate**, enforced mechanically by
  `scripts/set-race-footage.js` (below). Be conservative: **when in doubt, skip.**
  A missing highlight is fine; a leaked result on the spoiler-free calendar is the
  worst possible failure of this project.

### Two hard lessons baked into the tooling (do not relearn them)

1. **Gate the REAL title, never a reported one.** An LLM summarizing a candidate
   will "clean" a title in its report ("EXECUTED TO PERFECTION! | Stage 1" →
   "Stage 1 Highlights"). If you vet the reported string you vet the wrong thing.
   `set-race-footage.js` fetches each video's title from YouTube **oEmbed**
   (title + author only, no description → no spoiler exposure) and gates *that*.
   oEmbed also 404s on removed/private videos → they're rejected (free liveness
   check).
2. **Free-text you write is scanned too — use the fixed watchNote template, never
   quote a spoiler.** A run once wrote a watchNote *warning* about a spoiler
   re-upload and quoted the winner's name in the warning — a self-inflicted leak.
   `npm test`'s spoiler scanner caught it. Do **not** hand-write per-race notes.
   Use the exact templates in Phase 3.

## Hard guardrails (non-negotiable)

1. **Write only footage fields of `data/race-data.json`** (`platform`, `url`,
   per-stage `url`/`platform`, `raceDetails.spoilerSafe`, `raceDetails.watchNotes`)
   — and only via `scripts/set-race-footage.js`. Never hand-edit the file; never
   touch results JSON, `lib/`, `scripts/`, `.github/`, or `package.json`.
2. **Trusted channels only.** Attach a video only if its oEmbed `author_name` is an
   official broadcaster / organizer channel: FloBikes, UCI / UCIcycling,
   GCN Racing, TNT Sports Cycling, Eurosport, NBC Sports, the ASO "Tour de France"
   / "Tour de Suisse" official channel, the race organizer's own channel, or a
   national FTA broadcaster (SBS, France Télévisions/France 3, etc.). A random
   re-uploader is an automatic skip even with a clean title.
3. **Neutral title only** — the mechanical gate (`titleLeaksResult`) hard-rejects a
   title with a winner/result word or verb. But it can't catch a **name-only**
   spoiler ("Pogačar's masterclass"), so *also* apply judgment: reject any title
   that names a rider in a result context, "how X won", finish-line interviews,
   "behind the scenes", GC-recap, or podium/jersey/standings language. Prefer
   plain "Stage N Highlights" / route-descriptor / "Final KM's" uploads.
4. **Requires `FIRECRAWL_API_KEY`** (discovery). Phase 0 checks it; if missing, post
   the Slack failure line and exit — do not loop. (No Perplexity needed here.)
5. **Regression gate is a hard stop.** Before committing, `npm test` must report
   **0 fail**. It catches calendar breakage *and* any spoiler text that reached a
   scanned field (e.g. a watchNote) — but NOT a spoiler video (guardrail 3 is your
   only defense there).
6. **The Slack report is SPOILER-FREE.** Name only *which* races/stages got footage
   + the cost. Never a winner/podium/position/time/GC/jersey/narrative. A skip
   reason must be generic ("no spoiler-safe official upload found", "titles
   ambiguous") — never a result.

## Phase 0 — Preflight + find the work

```bash
node -e "process.exit(process.env.FIRECRAWL_API_KEY ? 0 : 1)" \
  || { echo "PREFLIGHT_FAIL: missing FIRECRAWL_API_KEY"; exit 1; }   # → Phase 6 failure line

# set-race-footage.js vets the REAL video title via youtube.com/oembed, so the run
# host must be able to reach www.youtube.com. In the cloud env this means
# www.youtube.com is in the network allowlist. If it is NOT, oEmbed fails, the write
# tool refuses every video, and the run is a silent no-op — so fail loudly instead:
node -e "fetch('https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=jNQXAC9IVRw&format=json',{signal:AbortSignal.timeout(15000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" \
  || { echo "PREFLIGHT_FAIL: cannot reach www.youtube.com (oEmbed) — add it to the env network allowlist"; exit 1; }   # → Phase 6 failure line
npm ci
git config user.name  "no-spoiler-cycling footage"
git config user.email "noreply@anthropic.com"
git push --dry-run origin main \
  || { echo "PREFLIGHT_FAIL: cannot push to main (auth)"; exit 1; }  # → Phase 6, do NOT retry other creds

: > /tmp/nsc-cost.jsonl
node scripts/calendar-footage-worklist.js --window 4 --min-rating 3 --json > /tmp/footage-worklist.json
cat /tmp/footage-worklist.json
```

Work-list shape: `{ window:{from,to}, minRating, counts:{gaps}, gaps:[{kind:'race'|'stage', id, raceId?, stage?, name, gender, rating, date}] }`.
If `counts.gaps === 0`: skip to **Phase 6**, post the 0-item summary. Done.

## Phase 1 — Pick the slice

`MAX_PER_RUN = 8` gaps, oldest date first, **grouping stages of the same race
together** (they share one discovery pass). If the list exceeds the ceiling,
process the first 8 and note the dropped count in Slack. A stage that finished
< ~2h ago may not be indexed yet — skip it, next run gets it (the window
self-heals). Group a race's per-stage gaps + its whole-race gap into one unit.

## Phase 2 — Discover + STRICTLY vet (per race)

Prefix every Firecrawl command with `NSC_COST_LEDGER=/tmp/nsc-cost.jsonl`.

**2a. Discover** official-channel candidates:
```bash
NSC_COST_LEDGER=/tmp/nsc-cost.jsonl node -e "
import('./lib/youtube-utils.js').then(m =>
  m.discoverYouTubeContent('<Race Name>', 2026, { maxResults: 12 })
    .then(r => console.log(JSON.stringify(r.official.concat(r.trusted||[]), null, 0))))"
```
If thin, add targeted per-stage searches: `m.discoverYouTubeContent` again, or
`import('./lib/firecrawl-utils.js').then(m => m.youtubeSearch('<Race> 2026 Stage N highlights'))`.

**2b. Vet + select** (apply guardrails 2 + 3 above):
- Disambiguate men's vs women's editions by title/route/distance — they run the
  same week and cross-pollute search results.
- One-day race: pick ONE result-neutral official race-highlight → the race `url`.
- Stage race: map each in-window stage to its neutral official "Stage N" highlight;
  set the race `url` to the stage-1 video. Omit any stage you can't fill safely.
- Reject spoiler-titled, wrong-edition, interview, behind-the-scenes, and
  re-uploader videos. **When unsure, skip the item** and note it for Slack.

## Phase 3 — Write via the enforcing tool (never hand-edit)

Build a payload per race and pipe it through `set-race-footage.js`, which re-fetches
each video's REAL oEmbed title and **hard-refuses** any that trips the spoiler gate
or is unavailable. If it refuses, drop that entry and re-run — do **not** work
around it.

```bash
cat > /tmp/footage.json <<'JSON'
{
  "raceLevelUrl": "https://www.youtube.com/watch?v=…",
  "raceLevelTitle": "… (advisory only; the tool vets the REAL oEmbed title) …",
  "spoilerSafe": true,
  "watchNote": "<EXACT template below — do not improvise>",
  "stages": [ { "stageNumber": 1, "url": "https://www.youtube.com/watch?v=…", "title": "…" } ]
}
JSON
node scripts/set-race-footage.js --id <race-id> --file /tmp/footage.json
```

**watchNote — use verbatim, never hand-write (guardrail lesson 2):**
- Stage race: `Spoiler-safe stage highlights on YouTube — watch the linked videos directly and in stage order. Disable autoplay and avoid the sidebar, comments, and video descriptions, which can reveal results.`
- One-day race: `Spoiler-safe race highlights on YouTube — watch the linked video directly. Disable autoplay and avoid the sidebar, comments, and video description, which can reveal results.`

## Phase 4 — Rebuild + regression gate (hard stop)

```bash
npm run build:all           # calendar + detail pages (idempotent; only changed races diff)
npm test                    # MUST be 0 fail — catches calendar breakage + spoiler TEXT leaks
npm run test:smoke          # every race still renders
```
Any `fail`: revert and stop —
`git checkout -- . && git clean -fd race-details results riders riders-women index.html`
— then Phase 6 with a failure line. **Do not commit.**

## Phase 5 — Commit precise + push to `main`

The generators stamp a day-granular build date, so on a day the site wasn't already
rebuilt, `build:all` shows ~1000 changed files. **Stage only the races you touched**
(their `race-details/<id>*.html` incl. stage pages, `data/race-data.json`, and
`index.html`).

```bash
RACE_IDS="tour-de-suisse-2026 tour-of-slovenia-2026"     # races you filled this run
git add data/race-data.json index.html
for id in $RACE_IDS; do git add "race-details/$id.html" race-details/$id-stage-*.html 2>/dev/null; done

# Guard — allowlist: every staged path must be calendar footage. Abort otherwise.
BAD=$(git diff --cached --name-only | grep -vE '^(data/race-data\.json$|index\.html$|race-details/)' || true)
[ -n "$BAD" ] && { echo "ABORT: staged outside footage allowlist:"; echo "$BAD"; git reset; exit 1; }
N=$(git diff --cached --name-only | wc -l)
echo "staged ($N):"; git diff --cached --name-only
[ "$N" -gt 120 ] && { echo "ABORT: staging too broad ($N) — build churn swept in"; git reset; exit 1; }

[ "$N" -gt 0 ] && git commit -m "footage: daily window update ($RACE_IDS)

Auto-generated by the daily calendar-footage routine. Spoiler-safe official
highlights only; each video's real oEmbed title was vetted by set-race-footage.js.
<note any skipped items + generic reason>"
[ "$N" -gt 0 ] && git push origin main
```
If `git push` fails for auth, note it in Slack and stop — do not retry other creds.

## Phase 6 — Slack cost report (SPOILER-FREE)

```bash
IDS="$(echo $RACE_IDS | xargs | tr ' ' ',')"
node scripts/cost-ledger.js report --stages <N> --stage-ids "$IDS" \
  --model claude-sonnet-4-6 --ledger /tmp/nsc-cost.jsonl --date "$(date -u +%F)"
```
Post that exact text to `#no-spoiler-cycling` (`C0BBV37T43H`) via `slack_send_message`,
then append any skipped items with a **generic** reason. Always post — even a 0-item
day. On failure: `⚠️ daily calendar-footage routine failed: <one-line reason>`.
🚫 Never put a winner/podium/position/time/GC/jersey/narrative in Slack.

## Idempotency & cadence

The work-list is recomputed live each run, so filled races drop out. Expect a few
items on days after racing (a Grand Tour stage or two + a one-day race), 0 on quiet
days. During a Grand Tour the routine picks up each stage the day after it runs.
The large historical TBD backlog is intentionally **out of scope** (window-bounded)
— backfill it with a separate one-off pass, not this routine.
