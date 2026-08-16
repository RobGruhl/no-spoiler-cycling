# Probe suite — no-spoiler-cycling agent-readiness (created 2026-08-16)

This is the regression test for rot in agent-facing assets (CLAUDE.md, README dev section, script
headers, docs/ runbooks). To re-run: copy the repo to a scratch dir, remove CLAUDE.md / AGENTS.md /
.claude / .agents / .codex (commit the deletions so git status is clean), then run each probe as a
fresh headless session (`claude -p "<prompt>"`) in that copy and score against the ground truths
below. Re-derive the whole suite from a fresh stumble log by 2027-02-16 or on the next model
generation, whichever comes first.

Each probe: prompt given to a cold agent, the ground truth, and the stumble signature to watch
for. Scoring: PASS (right answer, direct route), COSTLY (right answer after significant wandering
or git archaeology), FAIL (wrong/guessed). 2026-08-16 cold baseline: 16 PASS / 1 COSTLY (P14) /
1 FAIL (P17) — see the proposal's stumble log.

## P1 (execute) — update a race field
Prompt: "Set the race with id `tour-of-britain-men-2026` to platform YouTube with url https://www.youtube.com/@tourofbritain. Actually make the change to the data."
GT: `node scripts/update-race.js --id tour-of-britain-men-2026 --set 'platform=YouTube' --set 'url=...'` (or --file). Never edit data/race-data.json directly (1.9MB; exceeds read limit).
Stumble: tries to Read/Edit race-data.json directly.

## P2 — run one race's tests
Prompt: "What is the exact command to run the quality tests for only the race amstel-gold-race-2026?"
GT: `npm run test:race -- amstel-gold-race-2026` or `node scripts/test-race-quality.js --race amstel-gold-race-2026`.

## P3 — generated vs source
Prompt: "There's a typo visible on race-details/tour-de-france-2026.html. Describe exactly how to fix it correctly."
GT: page is generated. Fix source data (race-data.json via scripts/update-race.js) or the generator, then `node generate-race-details.js --race tour-de-france-2026`. Never hand-edit the HTML.
Stumble: edits the HTML file.

## P4 — schema vocabulary
Prompt: "What are the valid `terrain` values for a race in this project's data, and what renders on the calendar page for `summit-finish`?"
GT: TERRAIN_ENUM in lib/race-schema.js — flat, hilly, mountain, itt, ttt, circuit, cobbles, gravel, cyclocross, crosswind-risk, summit-finish. Calendar renders the text code "SUM" (generate-page.js terrMap; the v2 design dropped emoji icons). CLAUDE.md's old emoji tables were stale and were removed.

## P5 — footage review gate
Prompt: "A YouTube highlight URL was added to a race in data/race-data.json but no link renders on the calendar page after rebuild. Why, and what makes it render?"
GT: fail-closed footage-review gate — entry needs review.status 'approved' (lib/footage-review.js); review via scripts/review-footage.js.

## P6 (describe) — add footage correctly
Prompt: "You verified a spoiler-safe YouTube highlight for a race. Describe the exact sanctioned way to add it to the data, and why that path exists. Do not execute."
GT: scripts/set-race-footage.js --id --file/--json; fetches REAL oEmbed title and gates it against lib/spoiler-scanner.js titleLeaksResult; caller titles untrusted.
NOTE: partially contaminated — session memory hints at set-race-footage.js.

## P7 — CI path guard
Prompt: "Per this repo's CI, which file paths may an automated agent PR modify, and what happens if a PR touches lib/?"
GT: path-guard.yml runs .github/scripts/check-paths.mjs on ALL PRs. Allow: data/results/{races,stages,riders}/*.json, results/race|rider/*.html, results/_assets/*, index.html, riders(-women).html, riders/*, riders-women/*, race-details/*.html. lib/ is denied → guard fails → blocks auto-merge (required check).

## P8 (describe) — add stage results
Prompt: "Describe where the data goes and which commands generate and verify the pages, if you were adding results for a past stage race stage (e.g. tour-de-suisse-2026 stage 3). Do not execute."
GT: data/results/stages/tour-de-suisse-2026-stage-3.json; `node generate-stage-results.js --race tour-de-suisse-2026`; verify with `node scripts/test-results-completeness.js` (npm run test:results).

## P9 — forward-link invariant
Prompt: "When a past race/stage has results data, what must be true on its spoiler-safe calendar page, and what enforces it?"
GT: a "View Results" forward link (spoiler-gated) must exist; scripts/test-results-completeness.js errors if missing.

## P10 — rider photos (negative knowledge)
Prompt: "Rider pages show placeholder blocks instead of photos. Should you populate photos, and how would you?"
GT: NO — photos (from procyclingstats) were deliberately removed in a legal risk-reduction pass (commit 3720b4df). scripts/fetch-rider-photos.js is a leftover; do not re-add PCS photos.
Stumble: recommends running fetch-rider-photos.js.

## P11 — watchability flames
Prompt: "How are the 🔥 watchability ratings produced, and how would you score a newly finished race?"
GT: LLM-judged (parallel Opus judgements, rubric in docs/watchability-rubric-prompt.md); data/results/watchability.json + watchability-notes.json; scripts/score-watchability-worklist.js → judge → score-watchability-merge.js; flames render only for 4 (🔥) and 5 (🔥🔥). docs/WATCHABILITY.md.

## P12 — credentials
Prompt: "Which API keys / credentials does this repo's tooling expect, and where do they live?"
GT: .env — FIRECRAWL_API_KEY, PERPLEXITY_API_KEY, FLOBIKES_EMAIL/PASSWORD, PEACOCK_EMAIL/PASSWORD.

## P13 — spoiler-safe editorial rule
Prompt: "What is this project's decision rule for whether a highlights video is spoiler-safe enough to link from the calendar?"
GT: chronological race, winner revealed only at the natural finish, neutral result-free title (mechanically gated by lib/spoiler-scanner.js titleLeaksResult on the real oEmbed title), official/trusted channel, no results graphics or post-race interviews; when in doubt, skip. Canon: no-spoiler-youtube-explainer.md verdict ladder + docs/daily-calendar-footage-routine.md guardrails. (Known split-brain at audit time: explainer said natural finish ≈ last 5%, old CLAUDE.md said last 10% — one number should win.)

## P14 — gap vs absence (editorial epistemics)
Prompt: "In data/results, a race JSON has teamStories for some teams but not one team that started the race. Does that mean the team had no story worth telling? What should an agent do?"
GT: no — treat as a coverage gap: research (Perplexity/Firecrawl) and write an honest entry, or omit only after confirming absence. Never fabricate.

## P15 — daily routines
Prompt: "Automated commits land on main daily from 'no-spoiler-cycling backfill' and 'no-spoiler-cycling footage'. What are these, when do they run, and what do they touch?"
GT: two claude.ai cloud routines — stage-results backfill (19:23 UTC; data/results/** + results HTML) and calendar-footage (08:23 UTC; race-data.json footage via set-race-footage.js + rebuilt pages). Runbooks in docs/daily-*-routine.md.

## P16 — full rebuild + verify
Prompt: "What commands regenerate every page of the site and verify nothing is missing?"
GT: `npm run build:all` (+ `npm run build:results` for results pages) then `npm run test:smoke`; `npm run test:ci` chains quick tests + build + smoke + results-completeness.

## P17 — cross-repo: canonical Perplexity client
Prompt: "For deep research on a race (multi-source synthesis), what Perplexity tooling should you use and how do you run it with an API key?"
GT (cross-repo): canonical client ~/Projects/hello-perplexity/lib/perplexity.js (search/chat/deepResearch/reason), run with `node --env-file=~/Projects/hello-perplexity/.env`. In-repo lib/perplexity-utils.js is a search wrapper; repo .env also has PERPLEXITY_API_KEY. Naked repo cannot yield the canonical-client answer.

## P18 — check-paths canonical home
Prompt: "You need to change the CI path allowlist for agent PRs. Where do you make the change?"
GT: canonical version lives in the sibling cycling-agent repo (per header comment in .github/scripts/check-paths.mjs); the in-repo file is a copy to keep in sync. Change canon first, then copy. No drift check exists today.
