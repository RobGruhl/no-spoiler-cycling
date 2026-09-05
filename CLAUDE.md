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

- Deep research in LOCAL sessions: the Perplexity client is the Toolbelt tool
  `~/Toolbelt/tools/perplexity` (read its `CLAUDE.md` first; run
  `node --env-file=.env ~/Toolbelt/tools/perplexity/pplx.mjs search "<query>"` from the repo root
  so it picks up `PERPLEXITY_API_KEY` from this repo's `.env`). `~/Projects/hello-perplexity` no
  longer exists (removed by 2026-09-04). The in-repo `lib/perplexity-utils.js` wraps only the
  /search endpoint; `lib/firecrawl-utils.js` scrapes (both read `.env` via `node --env-file=.env`).
  Cloud checkouts have no Toolbelt — there, use the in-repo wrappers only.
- `.github/scripts/check-paths.mjs` is a COPY; canon is
  `~/Projects/cycling-agent/scripts/check-paths.mjs` (tested there). Change canon first, then
  re-copy. Synced 2026-08-16; no automated drift check exists, so re-sync by hand.
- Two claude.ai cloud routines commit straight to main daily: results backfill (19:23 UTC, author
  "no-spoiler-cycling backfill") and calendar footage (08:23 UTC, author "no-spoiler-cycling
  footage"). Runbooks and versioned trigger prompts: `docs/daily-*-routine.md`,
  `docs/*-trigger-prompt.md`. Expect their commits when diffing recent history, and fetch before
  pushing.
- Metrics (since 2026-08-20): nospoilercycling.com is proxied through Cloudflare (Rob's account,
  zone `51c5d807aa6566c53c738c13fb69572b`; SSL Full-strict; DNS edits now happen in the
  Cloudflare dash, NOT Porkbun — Porkbun only holds the registration). Page views/visits are
  counted at the edge, zero scripts on the site (privacy.html discloses this — keep it in sync).
  Dashboard: https://robgruhl.github.io/apollo-telemetry/nsc.html, regenerated 4×/hour by
  `~/Projects/apollo-telemetry` (`scripts/refresh.py`, day-series history in
  `data/nsc-history.json`). Caveat: Porkbun's MX email-forwarding records were carried over, but
  Porkbun forwarding may require their nameservers — if `@nospoilercycling.com` mail matters,
  verify it or switch to Cloudflare Email Routing.

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
- A FloBikes event page is NOT evidence of US rights — FloSports publishes "Watch X on FloBikes"
  pages for races where it holds Canada-only rights, and how-to-watch articles syndicate the
  claim (Renewi Tour 2026 shipped wrong this way; many 2026 races moved US-side to HBO Max).
  Verify geo carriers against broadcaster-independent listings (coursedujour.com day pages) and
  record verified facts in `data/broadcast-rights.json` (enforced by `npm run test:rights`).

## Mid-migration state (2026-08-16 — delete these lines when resolved)

- `.github/workflows/{path-guard,auto-merge}.yml` are committed but the GitHub-side setup (branch
  protection requiring the checks, `AGENT_BOT_LOGIN` repo variable) is unverified from the repo;
  the daily routines still push straight to main relying on their own inline guards.
- Rider photos were removed 2026-07 pending licensing (`scripts/fetch-rider-photos.js` header).
  Initials placeholders are intentional; do not re-fetch ProCyclingStats photos.
- Race-level `url` on calendar races is written but currently rendered by no generator; the
  approved-footage render path is per-stage. Don't assume setting it produces a visible link.
