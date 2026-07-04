# No Spoiler Cycling

A spoiler-free cycling race calendar for fans who want to watch races without knowing the results.

> **Unofficial fan project.** Not affiliated with, endorsed by, or connected to the UCI, race organizers, teams, riders, or broadcasters. Race names and trademarks belong to their respective owners and are used nominatively. See [`THIRD_PARTY_NOTICES.md`](./THIRD_PARTY_NOTICES.md).

**[View the Calendar](https://nospoilercycling.com/)** · **[About](https://nospoilercycling.com/about.html)**

## The Problem

Cycling fans who can't watch races live face a dilemma: finding race footage without accidentally seeing results. Sports news sites, YouTube thumbnails, and social media are landmines of spoilers. Even searching for "Tour de France Stage 15" might show "How Pogacar Won Stage 15" in the results.

## The Solution

A curated 2026 UCI calendar of 294 professional races with direct links to spoiler-safe content:

- **Full race replays** — complete coverage from start to finish
- **Safe highlights** — winner revealed only at the natural finish, neutral titles
- **Where-to-watch** — broadcaster deep links by region (FloBikes, Discovery+, Max, Peacock, SBS, 7plus, TNT Sports, national-broadcaster YouTube channels)

Every link is evaluated for spoiler safety before being added.

## Features

- **2026 UCI calendar** — 294 races: Grand Tours, Monuments, Classics, Worlds, Cyclocross
- **Men's & Women's** — full coverage of both calendars with dedicated rider indexes
- **Stage races** — per-stage detail pages with terrain, climbs, key sectors, GC context
- **Filtering** — by rating, discipline, gender, format, terrain, and prestige
- **Top riders** — ranked riders confirmed for each race, pulled from PCS
- **Broadcast guide** — region-by-region rights, primary + alternatives, subscription info

## Design

The site uses a roadbook-style aesthetic — paper/ink tones, a system font stack (sans + mono, no external web fonts), and a rainbow accent bar (blue/red/black/yellow/green). All pages share `shared.css`.

## How it's built

Two parallel page systems share the same project:

1. **The calendar** (the main site) is spoiler-safe. Race pages, stage detail sheets, rider pages, and broadcast info — all curated to never reveal results.
2. **The results subsystem** (under `/results/`) is spoiler-gated. Each race / stage / rider page lives behind a click-through interstitial; once dismissed it persists per-browser. This is where podiums, narratives, GC standings, per-rider performances, and team storylines live.

Both systems link to each other — the calendar page for a finished stage has a small "View Results →" link that lands on the gate; the results page for the same stage has a link back to the spoiler-safe view. The gate makes the boundary explicit: nothing accidentally leaks.

Data is curated, not scraped at request time. `data/race-data.json` is the spoiler-safe calendar source; `data/results/{races,stages,riders}/*.json` is the results-subsystem source. Generators turn JSON into HTML. See `CLAUDE.md` for the full architecture + skill recipes.

## For Developers

Static site: vanilla HTML/CSS/JS, generated from `data/race-data.json` and `data/results/*`. No backend, no database, deployed on GitHub Pages.

```bash
# Regenerate everything
npm run build:all

# Individual builds
npm run build                     # calendar
npm run build:riders              # men's riders index
npm run build:riders-women        # women's riders index
node generate-race-details.js --all   # per-race detail pages
```

**Never edit `race-data.json` by hand** — use the scripts:

```bash
node scripts/update-race.js --id RACE_ID --file /tmp/updates.json
node scripts/add-race.js --file /tmp/new-race.json
node scripts/test-race-quality.js --race RACE_ID
```

See [`CLAUDE.md`](./CLAUDE.md) for the full working-session flow, data schema, and content rules.

## Content Sources

- FloBikes (North America) · Discovery+ / TNT Sports (UK/EU) · Max · Peacock (US) · SBS / 7plus (AU)
- Official YouTube channels (national broadcasters + trusted highlight channels)

## Built With

Conversational AI-assisted curation via [Claude Code](https://claude.ai/download). See the [About page](./about.html) for how the pipeline works.

## Contributing

Found a spoiler-safe race link? Broadcast info for your region? Issues and PRs welcome.

## Licence

MIT
