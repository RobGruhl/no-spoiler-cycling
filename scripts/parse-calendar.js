#!/usr/bin/env node

/**
 * Parse 2026-calendar.md and convert to race-data.json
 * - Filters out women's races
 * - Assigns 1-5 star ratings
 */

import fs from 'fs';

const CALENDAR_PATH = './2026-calendar.md';
const OUTPUT_PATH = './data/race-data.json';

// Women's race detection patterns
const WOMEN_PATTERNS = [
  /women/i,
  /femmes/i,
  /ladies/i,
  /dames/i,
  /femenina/i,
  /feminin/i,
  /\bWWT\b/,
  /1\.WWT/,
  /2\.WWT/
];

function isWomensRace(name, category) {
  const text = `${name} ${category}`;
  return WOMEN_PATTERNS.some(pattern => pattern.test(text));
}

// Special races that get 5 stars
const GRAND_TOURS = ['Giro d\'Italia', 'Tour de France', 'Vuelta a España'];
const MONUMENTS = [
  'Milano-Sanremo',
  'Ronde Van Vlaanderen',
  'Paris-Roubaix',
  'Liège-Bastogne-Liège',
  'Il Lombardia'
];

function assignRating(name, category) {
  // 5 stars: Grand Tours, Monuments, WC Men's Road Race
  if (GRAND_TOURS.some(gt => name.includes(gt))) return 5;
  if (MONUMENTS.some(m => name.includes(m))) return 5;
  if (name.includes("Men's Road Race") && category === 'WC') return 5;

  // 4 stars: World Tour races + World Championships
  if (category === '2.UWT') return 4;
  if (category === '1.UWT') return 4;
  if (category === 'WC') return 4;

  // 3 stars: Pro Series
  if (category === '2.Pro') return 3;
  if (category === '1.Pro') return 3;

  // 2 stars: Continental stage races
  if (category === '2.1') return 2;

  // 1 star: Everything else (1.1)
  return 1;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-2026';
}

function getDayOfWeek(dateStr) {
  const date = new Date(dateStr + 'T12:00:00Z');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getUTCDay()];
}

function parseTableRow(row) {
  // Split by | and clean up
  const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);
  if (cells.length < 4) return null;

  // Format: | Race | Start | End | Location | Category |
  const [name, start, end, location, category] = cells;

  // Skip header row
  if (name === 'Race' || name.includes('---')) return null;

  return { name, start, end, location, category: category || '' };
}

function parseCalendar() {
  const content = fs.readFileSync(CALENDAR_PATH, 'utf8');
  const lines = content.split('\n');

  const races = [];
  let inFullCalendar = false;
  let inTable = false;

  for (const line of lines) {
    // Start parsing after "## Full Calendar" section
    if (line.includes('## Full Calendar')) {
      inFullCalendar = true;
      continue;
    }

    // Stop at next section or end
    if (inFullCalendar && line.startsWith('## ') && !line.includes('Full Calendar')) {
      break;
    }

    // Also capture Grand Tours, World Championships, Monuments sections
    if (line.includes('## Grand Tours') || line.includes('## World Championships') || line.includes('## Monuments')) {
      inTable = true;
      continue;
    }

    if (!inFullCalendar && !inTable) continue;

    // Skip non-table lines
    if (!line.startsWith('|')) {
      if (inTable && line.trim() === '') inTable = false;
      continue;
    }

    const parsed = parseTableRow(line);
    if (!parsed) continue;

    // Skip women's races
    if (isWomensRace(parsed.name, parsed.category)) {
      continue;
    }

    const rating = assignRating(parsed.name, parsed.category);

    races.push({
      id: slugify(parsed.name),
      name: parsed.name,
      description: `${parsed.category} cycling race in ${parsed.location}`,
      platform: 'TBD',
      url: 'TBD',
      type: 'full-race',
      raceDate: parsed.start,
      endDate: parsed.end !== parsed.start ? parsed.end : undefined,
      raceDay: getDayOfWeek(parsed.start),
      location: parsed.location,
      category: parsed.category,
      rating: rating,
      discoveredAt: new Date().toISOString()
    });
  }

  // Remove endDate if same as start
  races.forEach(race => {
    if (race.endDate === race.raceDate) {
      delete race.endDate;
    }
  });

  return races;
}

// Main execution
const races = parseCalendar();

// Sort by date
races.sort((a, b) => a.raceDate.localeCompare(b.raceDate));

const raceData = {
  lastUpdated: new Date().toISOString(),
  event: {
    name: "UCI Men's Elite Cycling Calendar 2026",
    location: 'Worldwide',
    year: 2026
  },
  races: races
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(raceData, null, 2));

// Stats
const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
races.forEach(r => ratingCounts[r.rating]++);

console.log(`✅ Parsed ${races.length} men's races`);
console.log(`\n📊 Rating breakdown:`);
console.log(`   ⭐⭐⭐⭐⭐ (5): ${ratingCounts[5]} races`);
console.log(`   ⭐⭐⭐⭐ (4): ${ratingCounts[4]} races`);
console.log(`   ⭐⭐⭐ (3): ${ratingCounts[3]} races`);
console.log(`   ⭐⭐ (2): ${ratingCounts[2]} races`);
console.log(`   ⭐ (1): ${ratingCounts[1]} races`);
console.log(`\n📁 Output: ${OUTPUT_PATH}`);
