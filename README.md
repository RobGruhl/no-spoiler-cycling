# No Spoiler Cycling

A spoiler-free cycling race calendar for fans who want to watch races without knowing the results.

**[View the Calendar](https://robgruhl.github.io/no-spoiler-cycling/)** · **[About](https://robgruhl.github.io/no-spoiler-cycling/about.html)**

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

The site uses a UCI Roadbook aesthetic — paper/ink tones, Inter Tight + JetBrains Mono, and the UCI rainbow (blue/red/black/yellow/green) as a structural accent. All pages share `shared.css`.

## For Developers

Static site: vanilla HTML/CSS/JS, generated from `data/race-data.json`. No backend, no database, deployed on GitHub Pages.

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
