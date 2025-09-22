# Firecrawl Utils Library

Reusable functions for Claude Code to perform safe, two-stage content discovery with Firecrawl API.

## Core Functions

### `searchContent(query, options)`
Stage 1: Find candidate URLs
```javascript
const candidates = await searchContent('UCI World Championships 2025', {
  limit: 5,
  sources: [{ type: 'web' }]
});
```

### `scrapeContent(url, options)`
Stage 2: Read actual page content
```javascript
const content = await scrapeContent(url, {
  formats: ['markdown'],
  onlyMainContent: true
});
```

### `searchAndScrape(query, options)`
Complete two-stage process
```javascript
const results = await searchAndScrape('UCI Worlds Rwanda cycling', {
  searchLimit: 5,
  delay: 1000
});
```


## Typical Claude Usage Pattern

```javascript
import { searchAndScrape, createRaceEntry } from './lib/firecrawl-utils.js';

// Discovery session
const results = await searchAndScrape('UCI World Championships 2025 Rwanda');

// Analyze each result with Claude intelligence
const verifiedContent = [];
for (const result of results) {
  // Claude applies LLM intelligence to determine spoiler safety
  const content = result.content.markdown;
  const isActuallySafe = /* Claude's intelligent analysis of the content */;

  if (isActuallySafe) {
    const raceEntry = createRaceEntry(result, {
      type: 'preview', // Claude determines this
      name: 'UCI Worlds Preview', // Claude creates better title
      description: 'Spoiler-free preview...' // Claude writes description
    });
    verifiedContent.push(raceEntry);
  }
}

// Update data files with verified content
```

## Key Features

- **Two-stage process**: Search → Scrape → Analyze
- **Batch processing**: Handle multiple URLs efficiently
- **Error handling**: Graceful failures with retry logic
- **Platform detection**: Automatic platform identification
- **Rate limiting**: Built-in delays between requests

## Design Philosophy

The library provides **building blocks** for Claude to use flexibly:

- **Search** functions find candidates
- **Scrape** functions get full content
- **Helper** functions handle common tasks

Claude should always apply LLM intelligence to analyze scraped content for spoiler detection, where context and nuance matter more than keyword matching.

## Example: Complete Discovery Session

```javascript
// User: "Find new UCI World Championships content"

import { searchAndScrape, createRaceEntry } from './lib/firecrawl-utils.js';
import fs from 'fs';

// Stage 1 & 2: Search and scrape
const results = await searchAndScrape('UCI World Championships 2025 Rwanda', {
  searchLimit: 8,
  delay: 1500
});

console.log(`Found ${results.length} candidates for analysis`);

// Stage 3: Claude applies intelligence
const verifiedRaces = [];
for (const result of results) {
  const content = result.content.markdown;

  // Claude reads and analyzes the actual content for spoiler safety
  const containsResults = /* Claude's intelligent analysis */;
  const isPreviewContent = /* Claude's intelligent analysis */;

  if (!containsResults && isPreviewContent) {
    const raceEntry = createRaceEntry(result, {
      type: 'preview',
      name: 'UCI World Championships 2025 Preview',
      description: 'Expert analysis and predictions for the Rwanda World Championships'
    });
    verifiedRaces.push(raceEntry);
  }
}

// Stage 4: Update data files
const raceData = JSON.parse(fs.readFileSync('./data/race-data.json', 'utf8'));
raceData.races.push(...verifiedRaces);
raceData.lastUpdated = new Date().toISOString();
fs.writeFileSync('./data/race-data.json', JSON.stringify(raceData, null, 2));

console.log(`Added ${verifiedRaces.length} verified spoiler-free races`);
```