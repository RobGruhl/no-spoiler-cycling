# No Spoiler Cycling

A spoiler-free cycling race calendar for fans who want to watch races without knowing the results.

**[View the Calendar](https://robgruhl.github.io/no-spoiler-cycling/)**

## The Problem

Cycling fans who can't watch races live face a dilemma: finding race footage without accidentally seeing results. Sports news sites, YouTube thumbnails, and social media are landmines of spoilers. Even searching for "Tour de France Stage 15" might show "How Pogacar Won Stage 15" in the results.

## The Solution

This project provides a curated calendar of professional cycling races with direct links to spoiler-free content:

- **Full race replays** - Complete coverage from start to finish
- **Extended highlights** - Race summaries that reveal the winner only at the natural finish
- **Broadcast info** - Where to watch by region (FloBikes, GCN+, Eurosport, etc.)

All content is verified to be spoiler-safe before being added.

## Features

- **2026 UCI Calendar** - Grand Tours, Monuments, Classics, and more
- **Men's & Women's Races** - Full coverage of both calendars
- **Stage Race Support** - Individual stage links for multi-day races
- **Filtering** - By gender, format, terrain, prestige, and star rating
- **Top Riders** - See which ranked riders are confirmed for each race
- **Broadcast Guide** - Know where to watch before the race starts

## Content Sources

- FloBikes (North America)
- GCN+ / Discovery+
- Eurosport
- YouTube (official channels only)
- Peacock (US)

## For Developers

Built with vanilla HTML/CSS/JS. Race data stored in `data/race-data.json`.

```bash
# Regenerate calendar page
npm run build

# Generate race detail pages
node generate-race-details.js --all
```

## Contributing

Found a spoiler-safe race link? Want to add broadcast info for your region? Issues and PRs welcome.

## License

MIT
