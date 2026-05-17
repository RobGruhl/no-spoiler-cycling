---
description: One loop iteration — backfill seasonArc files for tracked riders who have at least one riderPerformance reference but no data/results/riders/<slug>.json yet. Idempotent.
argument-hint: [--max N] [--dry-run]
---

# Backfill rider seasonArc files (loop iteration)

This skill is designed to be driven by `/loop /backfill-rider-seasonarcs` — each invocation processes a small slice, commits, and exits. The loop terminates when the completeness test reports zero missing seasonArc files.

## Arguments

- `--max N` — override default slice size (`MAX_PER_ITER = 5`). Smaller after a failure.
- `--dry-run` — list what *would* be processed without writing or committing.

## Phase 0 — Find the work

Run the completeness test in JSON mode and identify riders who have performances but no seasonArc JSON file:

```bash
node scripts/test-results-completeness.js --json > /tmp/comp.json

node -e "
const d = require('/tmp/comp.json');
const missing = d.sections.riders.details.filter(r => !r.hasJson);
console.log(JSON.stringify(missing.map(r => ({ id: r.riderId, name: r.name })), null, 2));
" > /tmp/missing.json
```

If `/tmp/missing.json` is `[]` — exit cleanly with a one-line "no work" report. The loop will terminate naturally.

## Phase 1 — Pick the slice

Take the first `MAX_PER_ITER = 5` riders from `/tmp/missing.json`. Order is determined by the completeness test, which sorts riderIds alphabetically; reorder by priority if you want headline GC riders first:

**Priority tiers** (process tier 1 first, then 2, then 3):

1. **GC headliners**: `tadej-pogacar`, `jonas-vingegaard`, `joao-almeida`, `remco-evenepoel`, `primoz-roglic`, `tom-pidcock`, `felix-gall`, `oscar-onley`, `juan-ayuso`, `richard-carapaz`.
2. **Sprinters & classics**: `paul-magnier`, `tim-merlier`, `jordi-meeus`, `michael-matthews`, `biniam-girmay`, `egan-bernal`, `olav-kooij`, `tobias-lund-andresen`.
3. **Climbers / supporting GC**: `giulio-ciccone`, `christian-scaroni`, `ben-healy`, `florian-lipowitz`, `michael-storer`, `mattias-skjelmose`, `pello-bilbao`, `lorenzo-fortunato`, `lenny-martinez`, `kevin-vauquelin`, `romain-gregoire`, `jhonatan-narvaez`, `corbin-strong`, `jan-christen`, `adam-yates`, `neilson-powless`, `brandon-mcnulty`, `thymen-arensman`, `paul-jeanniere`.
4. **Outsiders**: `paul-seixas`, `jarno-widar`, `antonio-tiberi`, `matthew-riccitello`, `pablo-torres`, `leo-bisiaux` and the rest of `data/outsiders.json`.

Skip any rider not in the missing list. If after applying the priority filter the slice is empty, fall back to the first `MAX_PER_ITER` riders from the raw missing list.

## Phase 2 — Research each rider

For each rider in the slice, in order:

### 2a. Pull existing performances

```bash
grep -l '"riderId": "<slug>"' data/results/races/*.json data/results/stages/*.json 2>/dev/null
```

Read each match. Collect: races/stages where the rider featured, their `position`, `role`, `narrative`, and `gap`. These are the source-of-truth for the seasonArc.

### 2b. Perplexity research (gap-fill)

For the rider's broader 2026 context — wins not in our data yet, target races, injury/illness status — run:

```bash
node -e "
import('./lib/perplexity-utils.js').then(async m => {
  const r = await m.perplexitySearch('<rider name> 2026 season results highlights cycling target races', { recencyFilter: 'month', maxResults: 6 });
  console.log('answer:', (r.answer || '').slice(0, 800));
  (r.results || []).slice(0, 5).forEach((x, i) => {
    console.log(i+1, '-', x.title);
    console.log('   url:', x.url);
    console.log('   snippet:', (x.snippet || '').slice(0, 240));
  });
});
"
```

Read snippets carefully — `answer` is often null. Cross-check at least two sources before stating a wins / podium count. Trust cyclingstage.com, cyclinguptodate.com, cyclingnews.com.

### 2c. Write the seasonArc JSON

```bash
cat > /tmp/seasonarc-<slug>.json << 'EOF'
{
  "riderId": "<slug>",
  "year": 2026,
  "lastUpdated": "<UTC timestamp>",
  "seasonArc": "<4-8 sentence paragraph. Inline race names + finishing positions. The shape of the season: which races targeted, where peaked, headline result, where they go next. Don't invent results — only state what the existing riderPerformances + Perplexity-verified facts support.>"
}
EOF
```

Write to `data/results/riders/<slug>.json` (just `cp`, the schema is one paragraph).

### 2d. Optional: healthStatus

If the rider is currently injured/ill and the Perplexity research confirms it, add `healthStatus` per the schema documented in `.claude/commands/race-rider-team-results.md`. Otherwise omit the field entirely.

### 2e. Generate HTML

```bash
node generate-rider-season.js --rider <slug>
```

## Phase 3 — Commit the slice

Stage the new JSONs + the regenerated HTML, then commit as `Loop iter N: <slug-list>` to match the project's existing convention:

```bash
git add data/results/riders/<slug>.json results/rider/<slug>.html ...
git commit -m "Loop iter N: <slug-1> <slug-2> ... seasonArcs"
```

Use the next sequential N — look at recent commits via `git log --oneline | grep "Loop iter" | head -3` and increment.

## Phase 4 — Exit

Print a one-line summary to stdout:

```
result: Backfilled N seasonArcs (<slug-list>). M remaining.
```

That's the loop's signal to continue (or terminate when M=0).

## Idempotency

The skill must be safe to run multiple times. Re-running on a slice that was already committed should detect the existing JSON files and skip — the Phase 0 check naturally enforces this since `hasJson: true` riders are filtered out.

## Failure handling

If any step fails for a rider in the slice:
- Skip that rider; don't fail the whole iteration.
- Note in the commit message: `Loop iter N: <succeeded-list> seasonArcs (skipped: <slug-with-reason>)`.
- After two consecutive iterations with the same rider failing, reduce `MAX_PER_ITER` to 2 in the next invocation via `/loop /backfill-rider-seasonarcs --max 2` and surface the issue.

Common failure modes:
- **Perplexity 429 / rate-limit**: wait and retry next iteration.
- **No riderPerformances found** (rider in performingRiders set but grep returns empty): the test's set-building logic is using `findRider()` against `riders.json` + `outsiders.json`; the rider may have been removed from a roster. Investigate or skip permanently.
- **JSON malformed**: `git diff` the JSON before committing; node will reject malformed JSON when running the generator.

## When NOT to run this

- The rider has NO riderPerformances yet — the seasonArc has nothing to say. Wait for their first race result before writing one.
- The user is mid-edit on `data/results/riders/<slug>.json` — running the loop would overwrite. Check `git status` first.

## Cross-references

- `.claude/commands/race-rider-team-results.md` — full schema + research methodology for stage / race / rider / team results.
- `scripts/test-results-completeness.js` — the source-of-truth for "is this rider missing a seasonArc?"
- `generate-rider-season.js` — the HTML renderer; reads `data/riders.json` + `data/outsiders.json` + `data/results/riders/<slug>.json` + every `data/results/{races,stages}/*.json` for that rider's performances.
