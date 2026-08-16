<!-- Rewritten 2026-08-16 from a probe audit (see docs/agent-probes.md). Expiry: re-derive from a
     fresh probe run by 2027-02-16 or on the next model generation, whichever comes first.
     Budget: 100 lines. Adding a line means evicting one. -->

**Mission**: a spoiler-free cycling calendar (main site) plus a spoiler-gated results subsystem
(`/results/`). Static site: curated JSON → node generators → HTML. Architecture and commands are in
`README.md`; workflow recipes are the `.claude/commands/` skills; this file holds only what code,
docs, and git history cannot tell you.

## Hard rules

- Never edit `data/race-data.json` by hand (1.9MB — it exceeds your file-read limit; read it with
  `node -e` or Grep). Write via `scripts/update-race.js` / `scripts/add-race.js`. Footage URLs go
  ONLY through `scripts/set-race-footage.js`, which vets the video's real oEmbed title and writes
  the review record the render gate requires. Script headers document usage.
- Everything under `race-details/`, `results/`, `riders/`, `riders-women/`, plus `index.html`,
  `riders.html`, `riders-women.html` is GENERATED. Fix the data or the generator, rebuild — never
  the HTML. (`about.html`, `privacy.html`, `site-info.html` are hand-maintained.)
- Spoiler-safety canon: `no-spoiler-youtube-explainer.md` (verdict ladder — winner revealed only at
  the natural finish) plus the guardrails in `docs/daily-calendar-footage-routine.md`. When in
  doubt, skip: a missing highlight is a non-event; a leaked result is the project's worst failure.
- Gap ≠ absence: curated data that is silent where it should speak (a started team with no
  `teamStories` chapter, a rider with no performance entry) is a research gap, not proof of
  absence. Research it and write an honest entry, or omit only after confirming (e.g. DNS). Never
  fabricate. Procedure: `/race-rider-team-results` skill, "Coverage-gap recognition".

## Commands

- Build: `npm run build:all` (calendar system) + `npm run build:results` (results system —
  `build:all` does NOT cover it). Verify: `npm run test:smoke` + `npm run test:results`.
- Test: `npm test` (all races + footage-review leak check, ~2s); one race:
  `npm run test:race -- RACE_ID`; CI runs `npm run test:ci`.
- Schema enums (terrain, stage types, gender) live in `lib/race-schema.js` — read them there. The
  icon tables formerly in this file had drifted from the shipped v2 design (pages render text codes
  like `SUM`, not emoji) and were deleted.

## Cross-repo and environment facts (not discoverable from this repo)

- Deep research in LOCAL sessions: the canonical Perplexity client
  `~/Projects/hello-perplexity/lib/perplexity.js` (`search`, `chat`, `deepResearch`, `reason`),
  run with `node --env-file=~/Projects/hello-perplexity/.env`. The in-repo
  `lib/perplexity-utils.js` wraps only the /search endpoint (no synthesis models). Cloud checkouts
  have no `hello-perplexity` — there, use the in-repo wrapper only.
- `.github/scripts/check-paths.mjs` is a COPY; canon is
  `~/Projects/cycling-agent/scripts/check-paths.mjs` (tested there). Change canon first, then
  re-copy. Synced 2026-08-16; no automated drift check exists, so re-sync by hand.
- Two claude.ai cloud routines commit straight to main daily: results backfill (19:23 UTC, author
  "no-spoiler-cycling backfill") and calendar footage (08:23 UTC, author "no-spoiler-cycling
  footage"). Runbooks and versioned trigger prompts: `docs/daily-*-routine.md`,
  `docs/*-trigger-prompt.md`. Expect their commits when diffing recent history, and fetch before
  pushing.

## Data curation standards (editorial; not derivable from code)

- Stage races need BOTH race-level `raceDetails` (GC context, favorites, narratives, gcDynamics)
  AND per-stage `stages[].stageDetails` (route, climbs, stage-level watchNotes). One-day races
  need only `raceDetails`. Race-level `keyClimbs` = GC-decisive only, tagged with stage number;
  stage-level lists all climbs for that stage.
- Future/undiscovered content: `platform: "TBD"`, `url: "TBD"`; always include `raceDate` +
  `raceDay`; no date text in descriptions. A race with `broadcast.geos` populated is not "TBD"
  even without video URLs.
- Broadcast links must be deep links; the acceptable login-gated root-URL exceptions are encoded
  in `lib/url-validator.js`.

## Mid-migration state (2026-08-16 — delete these lines when resolved)

- `.github/workflows/{path-guard,auto-merge}.yml` are committed but the GitHub-side setup (branch
  protection requiring the checks, `AGENT_BOT_LOGIN` repo variable) is unverified from the repo;
  the daily routines still push straight to main relying on their own inline guards.
- Rider photos were removed 2026-07 pending licensing (`scripts/fetch-rider-photos.js` header).
  Initials placeholders are intentional; do not re-fetch ProCyclingStats photos.
- Race-level `url` on calendar races is written but currently rendered by no generator; the
  approved-footage render path is per-stage. Don't assume setting it produces a visible link.
