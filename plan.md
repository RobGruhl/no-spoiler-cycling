# Race Icons & Stage Architecture Plan

## Overview

Add visual race profile icons to the cycling calendar with filtering capabilities. Design the schema and UI architecture to support future stage-level granularity while shipping incrementally with emoji icons first.

---

## Phase 1: Icon Foundation (Emoji + Filters) ✅ COMPLETE

**Goal:** Visual race type indicators with filtering. Ship fast with emoji, swap for custom icons later.

### 1.1 Schema Changes (`race-data.json`) ✅

Added fields to each race entry:

```json
{
  "id": "paris-roubaix-2026",
  "name": "Paris-Roubaix 2026",
  "raceFormat": "one-day",
  "terrain": ["cobbles", "flat"],
  "distance": 257,
  "prestige": ["monument"],
  "category": "1.UWT",
  "rating": 5,
  "raceDate": "2026-04-12"
}
```

**Field definitions:**

| Field | Type | Values |
|-------|------|--------|
| `raceFormat` | string | `one-day`, `stage-race`, `itt`, `ttt` |
| `terrain` | string[] | `flat`, `hilly`, `mountain`, `cobbles`, `gravel`, `itt`, `circuit` |
| `distance` | number | Total race distance in km |
| `prestige` | string[] | `grand-tour`, `monument`, `world-championship` |

### 1.2 Emoji Icon Mapping ✅

```javascript
const formatIcons = {
  'one-day': '🏁',
  'stage-race': '📅',
  'itt': '⏱️',
  'ttt': '👥'
};

const terrainIcons = {
  'flat': '➡️',
  'hilly': '〰️',
  'mountain': '⛰️',
  'cobbles': '🪨',
  'gravel': '🟤',
  'itt': '⏱️',
  'circuit': '🔄'
};

const prestigeIcons = {
  'grand-tour': '🏆',
  'monument': '🗿',
  'world-championship': '🌍'
};
```

### 1.3 UI Changes ✅

**Race card header:**
```
[★★★★★] 📅🏆➡️〰️⛰️⏱️ [Tour de France] [2.UWT]
```

**Filter chips (above star filters):**
```
Format:   [🏁 One-Day 148] [📅 Stage Race 74] [⏱️ ITT 2] [👥 TTT 1]
Terrain:  [⛰️ Mountain 27] [〰️ Hilly 122] [➡️ Flat 141] [🪨 Cobbles 13] ...
Prestige: [🏆 Grand Tours 3] [🗿 Monuments 5] [🌍 Worlds 3]
```

- Chip-style toggle buttons
- Multiple selections allowed (OR logic within category)
- AND logic across categories
- **Dynamic counts**: Show intersection counts ("of visible races, how many have this attribute")
- Chips with 0 matches dim to 40% opacity

### 1.4 Data Population ✅

- 225 races tagged with all fields
- Stage races (Grand Tours, etc.) have full terrain profiles: `["flat", "hilly", "mountain", "itt"]`
- Tagging script: `scripts/tag-races.js`

### 1.5 Files Modified ✅

- `data/race-data.json` — All 225 races tagged
- `generate-page.js` — Icon rendering + filter UI + dynamic count logic
- `scripts/tag-races.js` — Reusable tagging script
- `index.html` — Regenerated output

---

## Phase 2: Stage Architecture (Schema + UI Patterns)

**Goal:** Lay groundwork for stage-level data without expanding all races yet.

### 2.1 Extended Schema for Stages

```json
{
  "id": "tour-de-france-2026",
  "name": "Tour de France 2026",
  "raceFormat": "stage-race",
  "stages": [
    {
      "stageNumber": 1,
      "name": "Stage 1: Lille to Roubaix",
      "stageType": "flat",
      "terrain": ["cobbles"],
      "distance": 185,
      "date": "2026-07-04",
      "platform": "YouTube",
      "url": "https://...",
      "description": "Opening stage with pavé sectors in the finale"
    }
  ]
}
```

**Stage-specific fields:**

| Field | Type | Description |
|-------|------|-------------|
| `stageNumber` | number | Stage order (0 = prologue) |
| `stageType` | string | `prologue`, `flat`, `hilly`, `mountain`, `itt`, `ttt`, `rest-day` |
| `terrain` | string[] | Same tags as race-level |
| `distance` | number | Stage distance in km |
| `date` | string | Stage date (ISO) |
| `platform` | string | Where to watch |
| `url` | string | Direct link or "TBD" |
| `description` | string | Spoiler-free stage context |

### 2.2 Two-Level UI Architecture

**30,000ft View (Current Calendar):**
- Shows race events as cards (current behavior)
- Stage races show as single collapsed card
- Badge shows stage count: `[21 stages]`
- Click to expand → Stage Detail View

**Stage Detail View (New):**
- Dedicated view for a single stage race
- **Grid card layout** (same as main calendar, consistent UI)
- Each stage card shows:
  - Stage number + name
  - Type icon (🏔️ ➡️ ⏱️)
  - Distance bar (normalized visual)
  - Platform + watch status
  - Date

**Navigation:**
- Calendar → Click stage race → Stage view
- Stage view → Back button → Calendar
- URL structure: `index.html` vs `index.html#tour-de-france-2026`

### 2.3 Distance Visualization

**Normalized distance bar on each card:**

```
Stage 1 ████████░░░░░░░░░░░░ 185km (flat)
Stage 7 ██████████████░░░░░░ 220km (mountain)
Stage 14 ████░░░░░░░░░░░░░░░░ 62km (ITT)
```

- Max width = longest stage in that race (or fixed 250km cap)
- Bar width = (stage distance / max) * 100%
- Color = terrain type (blue=flat, orange=hilly, red=mountain, purple=TT)
- Shows km value as text

---

## Phase 3: Stage Data Population

**Goal:** Populate stage details for major races.

### 3.1 Priority Order

1. **Grand Tours** (63 stages total)
   - Tour de France 2026 (21)
   - Giro d'Italia 2026 (21)
   - Vuelta a España 2026 (21)

2. **Major Stage Races** (~15-20 each)
   - Paris-Nice
   - Tirreno-Adriatico
   - Tour de Suisse
   - Critérium du Dauphiné
   - Volta a Catalunya

3. **Remaining 2.x races** (as routes announced)

### 3.2 Workflow

1. User provides race name or URL to route announcement
2. Claude extracts stage profiles
3. Populates `stages[]` array with all fields
4. Generates updated HTML

---

## Phase 4: Custom Icons (Future)

**Goal:** Replace emoji with custom-designed SVG icons.

### 4.1 Icon Requirements

- **Format:** SVG, 24×24 viewBox
- **Style:** Monoline, 2px stroke, rounded caps
- **Color:** `currentColor` (inherits from parent)
- **Accessibility:** `<title>` element, `role="img"`, `aria-label`

### 4.2 Icon Set (12 total)

**Format (4):**
- One-day race (single loop with finish flag)
- Stage race (multi-tick route line)
- ITT (clock + solo rider)
- TTT (clock + three riders)

**Terrain (5):**
- Flat (horizontal line with speed marks)
- Hilly (rounded bumps)
- Mountain (sharp peaks)
- Cobbles (stone pattern)
- Summit finish (peak with flag)

**Prestige (3):**
- Grand Tour (trophy)
- Monument (classical column)
- World Championship (globe with stripes)

### 4.3 Icon Generation Options

- **Text-to-image AI:** Generate concepts, trace to SVG
- **Manual design:** Figma/Illustrator with icon grid
- **Icon libraries:** Adapt from Lucide/Heroicons if close matches exist

---

## Phase 5: Stretch Goals

- 🗡️ Magic sword icon for legendary performances
- 🐴 Pony mode (animated mascot follows cursor)
- Breakaway success probability meter
- Integration with live race tracking APIs

---

## Implementation Order

| Phase | Deliverable | Status |
|-------|-------------|--------|
| 1.1 | Schema fields added | ✅ Done |
| 1.2 | Emoji icons defined | ✅ Done |
| 1.3 | Filter UI + logic | ✅ Done |
| 1.4 | Tag all 225 races | ✅ Done |
| 2.1 | Stages schema | Pending |
| 2.2 | Two-level UI | Pending |
| 2.3 | Distance bars | Pending |
| 3.x | Populate stage data | Ongoing |
| 4.x | Custom SVG icons | Future |

---

## Critical Files

- `data/race-data.json` — All schema changes
- `generate-page.js` — Icon display, filters, stage views, distance bars
- `scripts/tag-races.js` — Race tagging script
- `index.html` — Generated output

---

## Hosting

GitHub Pages compatible:
- Static HTML, self-contained (CSS/JS inline)
- No server-side code required
- Hash-based routing for stage views works on static hosting
