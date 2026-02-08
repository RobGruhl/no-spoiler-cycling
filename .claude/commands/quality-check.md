---
description: Run quality checks on race data - URL validation, broadcast audits, data completeness
argument-hint: [<race-id-or-date-range>] [--check-links] [--fix] [--compact]
---

# Quality Check Command

Validate race data quality and identify issues to fix. Wraps `test-race-quality.js` with additional URL verification and actionable fix suggestions.

## Arguments
- `$ARGUMENTS`: Race ID, date range, or flags
  - Single race: `paris-roubaix-2026`
  - Date range: `--from 2026-01-01 --to 2026-02-28`
  - All races: `--all`
- `--check-links`: Also verify URLs are reachable via HTTP HEAD
- `--fix`: Attempt to fix common issues automatically
- `--compact`: One-line-per-race summary
- `--only <category>`: Only check one category (data, details, broadcast, links)

## Workflow

### Step 1: Run Quality Test Suite

```bash
# Parse arguments and run appropriate test
node scripts/test-race-quality.js $ARGUMENTS
```

Common invocations:
```bash
# Check a specific race (detailed)
node scripts/test-race-quality.js --race RACE_ID

# Check a date range (compact summary)
node scripts/test-race-quality.js --from 2026-01-01 --to 2026-02-28 --compact

# Check all races
node scripts/test-race-quality.js --all --compact

# Check only broadcast quality
node scripts/test-race-quality.js --race RACE_ID --only broadcast
```

### Step 2: URL HTTP Verification

If `--check-links` is specified (or always for targeted checks), verify URLs are reachable:

```bash
node -e "
const data = require('./data/race-data.json');
// Adjust filter based on arguments
const races = data.races.filter(r => /* date range or specific race */);
const urls = [];

// Collect all URLs: race URLs, stage URLs, broadcast URLs
races.forEach(r => {
  if (r.url && r.url !== 'TBD') urls.push({ id: r.id, type: 'race', url: r.url });
  if (r.stages) r.stages.forEach(s => {
    if (s.url && s.url !== 'TBD') urls.push({ id: r.id, type: 'stage-' + s.stageNumber, url: s.url });
  });
  if (r.broadcast?.geos) Object.entries(r.broadcast.geos).forEach(([geo, info]) => {
    if (info.primary?.url) urls.push({ id: r.id, type: 'broadcast-' + geo, url: info.primary.url });
  });
});

(async () => {
  const results = { ok: 0, fail: 0, error: 0 };
  for (const { id, type, url } of urls) {
    try {
      const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      if (res.ok) { results.ok++; }
      else { results.fail++; console.log('FAIL', res.status, id, type, url); }
    } catch (e) {
      results.error++; console.log('ERROR', id, type, url, e.message);
    }
  }
  console.log('URL Check:', results.ok, 'OK,', results.fail, 'failed,', results.error, 'errors');
})();
"
```

### Step 3: Broadcast Deep Link Audit

Check for root URLs that should be deep links:

```bash
node -e "
const data = require('./data/race-data.json');
const rootPatterns = [
  /^https?:\/\/(www\.)?flobikes\.com\/?$/,
  /^https?:\/\/(www\.)?youtube\.com\/?$/,
];
// Login-gated platforms where root URLs are acceptable:
// discoveryplus.com, 7plus.com.au, max.com, peacocktv.com

const issues = [];
data.races.forEach(r => {
  // Check race URL
  if (r.url && rootPatterns.some(p => p.test(r.url))) {
    issues.push({ id: r.id, field: 'url', url: r.url });
  }
  // Check broadcast URLs
  if (r.broadcast?.geos) {
    Object.entries(r.broadcast.geos).forEach(([geo, info]) => {
      if (info.primary?.url && rootPatterns.some(p => p.test(info.primary.url))) {
        issues.push({ id: r.id, field: 'broadcast.' + geo, url: info.primary.url });
      }
    });
  }
});

if (issues.length) {
  console.log('Root URL Issues (' + issues.length + '):');
  issues.forEach(i => console.log(' ', i.id, i.field, i.url));
} else {
  console.log('No root URL issues found');
}
"
```

### Step 4: Data Completeness Summary

```bash
node -e "
const data = require('./data/race-data.json');
// Adjust filter based on arguments
const races = data.races;

const stats = {
  total: races.length,
  withUrl: races.filter(r => r.url && r.url !== 'TBD').length,
  withBroadcast: races.filter(r => r.broadcast?.geos).length,
  withDetails: races.filter(r => r.raceDetails).length,
  withRiders: races.filter(r => r.topRiders?.length > 0).length,
  withTerrain: races.filter(r => r.terrain?.length > 0).length,
  withRating: races.filter(r => r.rating > 0).length,
  stageRaces: races.filter(r => r.stages?.length > 0).length,
  stageUrlsFilled: 0,
  stageTotalCount: 0
};

races.filter(r => r.stages?.length > 0).forEach(r => {
  stats.stageTotalCount += r.stages.length;
  stats.stageUrlsFilled += r.stages.filter(s => s.url && s.url !== 'TBD').length;
});

console.log('Data Completeness:');
console.log('  URLs:', stats.withUrl + '/' + stats.total);
console.log('  Broadcast:', stats.withBroadcast + '/' + stats.total);
console.log('  Race Details:', stats.withDetails + '/' + stats.total);
console.log('  Top Riders:', stats.withRiders + '/' + stats.total);
console.log('  Terrain Tags:', stats.withTerrain + '/' + stats.total);
console.log('  Ratings:', stats.withRating + '/' + stats.total);
console.log('  Stage URLs:', stats.stageUrlsFilled + '/' + stats.stageTotalCount, '(across', stats.stageRaces, 'stage races)');
"
```

### Step 5: Fix Common Issues (if --fix)

If `--fix` flag is set, attempt automatic fixes:

1. **Missing terrain/rating**: Run `node scripts/tag-races.js`
2. **Missing riders**: Run `node populate-race-riders.js && node scripts/populate-riders-women.js`
3. **Root FloBikes URLs**: Search for deep links and update

After fixes, re-run the quality check to verify improvements.

### Step 6: Report

Output a summary table:

```markdown
## Quality Check Report

### Overall Score
| Category | Pass | Fail | Coverage |
|----------|------|------|----------|
| Data Completeness | X | Y | Z% |
| Race Details | X | Y | Z% |
| Broadcast Info | X | Y | Z% |
| URL Reachability | X | Y | Z% |
| Deep Links (not root) | X | Y | Z% |

### Issues Found
| Race | Issue | Severity | Suggested Fix |
|------|-------|----------|---------------|

### Acceptable Root URLs
These root URLs are intentional (login-gated platforms):
- discoveryplus.com, 7plus.com.au, max.com, peacocktv.com
```

## Example Usage

```bash
# Quick check on Jan/Feb races
/quality-check --from 2026-01-01 --to 2026-02-28 --compact

# Deep check with link verification
/quality-check paris-roubaix-2026 --check-links

# Check everything and auto-fix what's possible
/quality-check --all --fix

# Just check broadcast quality
/quality-check --all --only broadcast --compact
```
