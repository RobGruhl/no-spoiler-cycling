# Watchability — spoiler-safe "is this worth watching?" rating

A 1–5 🔥 **Drama Index** that helps a viewer decide whether to watch a stage or
one-day race **without revealing who won or the final standings**. Derived from
the spoiler-side results JSON; intended to surface on the spoiler-**safe** calendar.

## The core idea

Drama is about the **manner of victory + novelty**, not how close the line was.
A superstar winning a routine bunch sprint is dull; the *same rider* raiding solo
from 100 km — or a breakaway of unknowns holding off the peloton — is must-watch.
So the engine classifies **how** the race was won (an archetype → base excitement)
and then applies modifiers.

## Scoring

`score = archetypeBase + modifiers`, clamped 0–100. Flames = `round(score / 20)`.

**Archetype base** (manner of victory, detected from tldr/narrative + gaps):

| Archetype | Base | Why |
|---|---|---|
| Long-range solo (≥50 km / 25 km / <25 km) | 84 / 76 / 66 | the rarest spectacle |
| Breakaway held off the bunch (nail-biter catch) | 76 | underdog tension to the line |
| Breakaway stayed away | 70 | |
| Solo to the line (caught-to-the-line / comfortable) | 74 / 60 | |
| Small-group / two-up showdown | 66 | |
| Reduced bunch sprint (crash/selection-thinned) | 58 | |
| Uphill sprint finale | 52 | |
| Bunch sprint | 40 | routine unless something else happens |
| Time trial / prologue | 42 | low-drama watch unless wafer-thin |

**Modifiers:**

| Modifier | Δ | Notes |
|---|---|---|
| Novelty / upset (un-notable winner, surprise, maiden Monument) | **+15** | *blended only — never shown alone* |
| Beloved / emotional win (dedication, tribute, fairy-tale, "finally") | **+8** | *blended only* — "everyone loved that they got it" |
| Long-range move (winning move went from far out) | +8 | the "from 100 km is fun" principle; skipped for long-solo (already in base) |
| Expected favourite in a routine sprint/short solo | −8 | |
| Photo finish (same time, sprint/2-up) | +8 | |
| Ultra-close (≤3 s, non-solo) | +5 | |
| Chaos (crashes + weather) | up to +10 | |
| Comeback from crash/mechanical | +5 | |
| GC carnage (stage races) | +8 | |
| Hard parcours (cobbles/gravel/walls), one-day | +4 | |
| Processional / uneventful | −12 | |

Archetype detection checks two-up / duel **before** solo (a 60 km duel is the story
even if the winner "rode away" at the end). "Worth watching" attaches to each
**watchable unit**: a one-day race, or an individual stage — never a stage-race average.

## Spoiler safety (the whole point)

Three tiers of output, by how much they reveal:

- **Tier 0 — always safe:** the 🔥 score + a generic blurb ("Unmissable — clear
  your schedule" … "One for completists"). A number can't name a winner, and a high
  score is **ambiguous by design** (audacious ride? upset? crash? photo finish?), so
  it never fingers a rider.
- **Tier 1 — opt-in flavour tags:** outcome-agnostic race-**shape** descriptors
  ("Long-range racing", "A breakaway day", "Sprint finale", "Foul-weather chaos",
  "GC shake-up", "Decided in the final metres"). They describe *how it unfolded*,
  never *who* prevailed. Ship these behind a toggle for people who want a hint.
- **Never exposed alone:** the **upset/novelty** modifier — surfacing it would imply
  the favourite lost. It only feeds the blended aggregate.

What a viewer would never learn from the rating: the winner, the podium, the GC,
any rider name, or which team won.

## Usage

```bash
node scripts/test-watchability.js            # curated diverse sample + card previews
node scripts/test-watchability.js --all      # score every results JSON
node scripts/test-watchability.js data/results/races/<id>.json
```

```js
import { scoreResult } from './lib/watchability.js';
const r = scoreResult(resultsJson);     // { score, flames, blurb, archetype, tags, modifiers }
```

## Validation (2026 season sample)

| Race | 🔥 | Why it lands there |
|---|---|---|
| Paris-Roubaix Femmes (career-best upset, 2-up velodrome) | 5 | upset + nail-biter Monument |
| GP de Denain (audacious solo held off the bunch by metres) | 5 | breakaway nail-biter |
| Auvergne–Rhône-Alpes st.6 (echelons, GC blown apart) | 5 | chaos + GC carnage |
| Tour de Suisse st.1 (Pogačar 71 km solo) | 4 | star + audacious manner, *despite* a 2-min gap |
| Scheldeprijs (crash-strewn reduced sprint, expected winner) | 3 | livened by carnage |
| Koksijde Classic (routine flat bunch sprint) | 2 | expected sprinter, nothing unusual |
| Tour de Suisse st.4 (ITT) | 2 | low-drama watch |
| Surf Coast Classic (cancelled) | — | nothing to watch |

Across all 282 result files: 2× 1🔥, 58× 2🔥, 116× 3🔥, 86× 4🔥, 24× 5🔥.

## Possible next steps

- Surface a 🔥 badge on the spoiler-safe calendar cards + race-detail hero (Tier 0),
  with Tier-1 tags behind a "hint" toggle.
- Optional prestige tiebreaker (Monument/GT nudge) if Monuments should edge minor
  races at equal drama.
- Precompute scores into the results manifest at build time so the calendar pages
  stay static.
