#!/usr/bin/env node
/**
 * Add women's races from 2026 UCI calendar to race-data.json
 * - Parses women's races from embedded calendar data
 * - Assigns appropriate star ratings
 * - Adds gender: "women" or "mixed" to entries
 *
 * Data source: git commit 2dc637f^:2026-calendar.md
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/race-data.json');

// ============================================
// WOMEN'S RACE KNOWLEDGE BASE
// ============================================

// Women's Grand Tours (5 stars)
const WOMEN_GRAND_TOURS = [
  "giro d'italia women",
  "tour de france femmes"
];

// Women's Monuments (5 stars)
const WOMEN_MONUMENTS = [
  'strade bianche women',
  'strade bianche (women)',
  'milano-sanremo donne',
  'ronde van vlaanderen women',
  'ronde van vlaanderen (women)',
  'paris-roubaix women',
  'paris-roubaix (women)',
  'la flèche wallonne women',
  'la flèche wallonne (women)',
  'la fleche wallonne women',
  'liège-bastogne-liège women',
  'liège-bastogne-liège (women)',
  'liege-bastogne-liege women'
];

// World Championship events
const WC_EVENTS = [
  "women's road race",
  "women's tt",
  "world championships: women"
];

// ============================================
// RATING LOGIC
// ============================================

function normalizeRaceName(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/['']/g, "'");
}

function assignRating(race) {
  const nameLower = normalizeRaceName(race.name);
  const category = race.category || '';

  // 5 stars: Grand Tours, Monuments, WC Road Race
  if (WOMEN_GRAND_TOURS.some(gt => nameLower.includes(normalizeRaceName(gt)))) {
    return 5;
  }
  if (WOMEN_MONUMENTS.some(m => nameLower.includes(normalizeRaceName(m)))) {
    return 5;
  }
  if (nameLower.includes("women's road race") && (category === 'WC' || nameLower.includes('world championship'))) {
    return 5;
  }

  // 4 stars: World Tour races, WC TT
  if (category === '2.WWT') return 4;
  if (category === '1.WWT') return 4;
  if (category === 'WC' && nameLower.includes('women')) return 4;

  // 3 stars: Pro Series
  if (category === '2.Pro') return 3;
  if (category === '1.Pro') return 3;

  // 2 stars: Continental stage races
  if (category === '2.1') return 2;

  // 1 star: Everything else
  return 1;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function slugify(name) {
  return name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[àáâãäå]/g, 'a')
    .replace(/[èéêë]/g, 'e')
    .replace(/[ìíîï]/g, 'i')
    .replace(/[òóôõö]/g, 'o')
    .replace(/[ùúûü]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[ç]/g, 'c')
    .replace(/['']/g, '')
    .replace(/[()]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-2026';
}

function getDayOfWeek(dateStr) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const date = new Date(dateStr + 'T12:00:00Z');
  return days[date.getUTCDay()];
}

function getRaceFormat(race) {
  // Check if it's a stage race (has end date different from start)
  if (race.end && race.end !== race.start) {
    const startDate = new Date(race.start);
    const endDate = new Date(race.end);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    if (days > 1) return 'stage-race';
  }

  // Check category for stage race indicators
  if (race.category && race.category.startsWith('2.')) {
    return 'stage-race';
  }

  return 'one-day';
}

// ============================================
// WOMEN'S RACES DATA (from 2026-calendar.md)
// ============================================

const WOMEN_RACES_RAW = [
  // Grand Tours
  { name: "Giro d'Italia Women", start: "2026-05-30", end: "2026-06-08", location: "Italy", category: "2.WWT" },
  { name: "Tour de France Femmes", start: "2026-08-01", end: "2026-08-10", location: "France", category: "2.WWT" },

  // World Tour Stage Races (2.WWT)
  { name: "UAE Tour Women", start: "2026-02-05", end: "2026-02-09", location: "United Arab Emirates", category: "2.WWT" },
  { name: "Vuelta España Femenina", start: "2026-05-03", end: "2026-05-11", location: "Spain", category: "2.WWT" },
  { name: "Itzulia Women", start: "2026-05-15", end: "2026-05-18", location: "Spain", category: "2.WWT" },
  { name: "Vuelta a Burgos Feminas", start: "2026-05-21", end: "2026-05-25", location: "Spain", category: "2.WWT" },
  { name: "Tour de Suisse Women", start: "2026-06-17", end: "2026-06-22", location: "Switzerland", category: "2.WWT" },
  { name: "Tour of Britain Women", start: "2026-08-19", end: "2026-08-24", location: "United Kingdom", category: "2.WWT" },
  { name: "Tour de Romandie Féminin", start: "2026-09-04", end: "2026-09-07", location: "Switzerland", category: "2.WWT" },
  { name: "Tour of Chongming Island", start: "2026-10-13", end: "2026-10-16", location: "China", category: "2.WWT" },

  // World Tour One-Day (1.WWT) - Monuments and major races
  { name: "Cadel Evans Great Ocean Road Race (Women)", start: "2026-01-31", end: "2026-01-31", location: "Australia", category: "1.WWT" },
  { name: "Omloop Nieuwsblad Women", start: "2026-02-26", end: "2026-02-26", location: "Belgium", category: "1.WWT" },
  { name: "Strade Bianche (Women)", start: "2026-03-07", end: "2026-03-07", location: "Italy", category: "1.WWT" },
  { name: "Milano-Sanremo Donne", start: "2026-03-21", end: "2026-03-21", location: "Italy", category: "1.WWT" },
  { name: "Ronde Van Brugge (Women)", start: "2026-03-26", end: "2026-03-26", location: "Belgium", category: "1.WWT" },
  { name: "Gent-Wevelgem (Women)", start: "2026-03-29", end: "2026-03-29", location: "Belgium", category: "1.WWT" },
  { name: "Dwars Door Vlaanderen (Women)", start: "2026-04-01", end: "2026-04-01", location: "Belgium", category: "1.WWT" },
  { name: "Ronde Van Vlaanderen (Women)", start: "2026-04-05", end: "2026-04-05", location: "Belgium", category: "1.WWT" },
  { name: "Paris-Roubaix (Women)", start: "2026-04-12", end: "2026-04-12", location: "France", category: "1.WWT" },
  { name: "Amstel Gold Race (Women)", start: "2026-04-19", end: "2026-04-19", location: "Netherlands", category: "1.WWT" },
  { name: "La Flèche Wallonne (Women)", start: "2026-04-22", end: "2026-04-22", location: "Belgium", category: "1.WWT" },
  { name: "Liège-Bastogne-Liège (Women)", start: "2026-04-26", end: "2026-04-26", location: "Belgium", category: "1.WWT" },
  { name: "Copenhagen Sprint Women", start: "2026-06-13", end: "2026-06-13", location: "Denmark", category: "1.WWT" },
  { name: "Classic Lorient Agglomération", start: "2026-09-05", end: "2026-09-05", location: "France", category: "1.WWT" },
  { name: "Tour of Guangxi (Women)", start: "2026-10-18", end: "2026-10-18", location: "China", category: "1.WWT" },

  // Pro Series Stage Races (2.Pro)
  { name: "Tour Down Under Women's Race", start: "2026-01-21", end: "2026-01-22", location: "Australia", category: "1.Pro" },
  { name: "Setmana Volta Femenina Comunitat Valenciana", start: "2026-02-12", end: "2026-02-16", location: "Spain", category: "2.Pro" },
  { name: "Tour Féminin International des Pyrénées", start: "2026-06-12", end: "2026-06-15", location: "France", category: "2.Pro" },
  { name: "Baloise Ladies Tour", start: "2026-07-15", end: "2026-07-20", location: "Belgium", category: "2.1" },
  { name: "Tour de Pologne Women", start: "2026-08-14", end: "2026-08-17", location: "Poland", category: "2.Pro" },

  // Pro Series One-Day (1.Pro)
  { name: "Surf Coast Classic Women", start: "2026-01-28", end: "2026-01-28", location: "Australia", category: "1.Pro" },
  { name: "Vuelta CV Feminas", start: "2026-02-08", end: "2026-02-08", location: "Spain", category: "1.Pro" },
  { name: "Navarra Women's Classic", start: "2026-05-12", end: "2026-05-12", location: "Spain", category: "1.Pro" },
  { name: "Antwerp Port Epic Ladies", start: "2026-05-24", end: "2026-05-24", location: "Belgium", category: "1.Pro" },
  { name: "Women Cycling Day", start: "2026-06-21", end: "2026-06-21", location: "Germany", category: "1.Pro" },
  { name: "La Choralis Fourmies Féminine", start: "2026-09-13", end: "2026-09-13", location: "France", category: "1.Pro" },
  { name: "Women's Cycling GP Stuttgart", start: "2026-09-13", end: "2026-09-13", location: "Germany", category: "1.Pro" },
  { name: "Giro dell'Emilia Donne", start: "2026-10-03", end: "2026-10-03", location: "Italy", category: "1.Pro" },

  // Continental Stage Races (2.1)
  { name: "Vuelta a Extremadura Femenina", start: "2026-03-06", end: "2026-03-09", location: "Spain", category: "2.1" },
  { name: "Princess Maha Chakri Sirindhorn's Cup Women's Tour of Thailand", start: "2026-03-31", end: "2026-04-03", location: "Thailand", category: "2.1" },
  { name: "Bretagne Ladies Tour", start: "2026-05-28", end: "2026-06-01", location: "France", category: "2.1" },
  { name: "Vuelta a Catalunya Femenina", start: "2026-06-19", end: "2026-06-22", location: "Spain", category: "2.1" },
  { name: "Maryland Cycling Classic Women", start: "2026-09-05", end: "2026-09-08", location: "United States", category: "2.1" },
  { name: "Boucles Drôme Ardèche Femmes", start: "2026-09-12", end: "2026-09-14", location: "France", category: "2.1" },

  // Continental One-Day (1.1)
  { name: "Trofeo Palma Feminina", start: "2026-01-25", end: "2026-01-25", location: "Spain", category: "1.1" },
  { name: "Pionera Race", start: "2026-02-01", end: "2026-02-01", location: "Spain", category: "1.1" },
  { name: "Le Samyn des Dames", start: "2026-03-02", end: "2026-03-02", location: "Belgium", category: "1.1" },
  { name: "Région Pays de la Loire Tour Féminin", start: "2026-04-08", end: "2026-04-09", location: "France", category: "1.1" },
  { name: "GP Féminin de Chambéry", start: "2026-04-19", end: "2026-04-19", location: "France", category: "1.1" },
  { name: "Omloop Van Borsele Women", start: "2026-04-25", end: "2026-04-25", location: "Belgium", category: "1.1" },
  { name: "GP della Liberazione Donne", start: "2026-04-26", end: "2026-04-26", location: "Italy", category: "1.1" },
  { name: "Festival Elsy Jacobs", start: "2026-05-02", end: "2026-05-04", location: "Luxembourg", category: "1.1" },
  { name: "La Classique Morbihan", start: "2026-05-08", end: "2026-05-08", location: "France", category: "1.1" },
  { name: "GP du Morbihan Femmes", start: "2026-05-09", end: "2026-05-09", location: "France", category: "1.1" },
  { name: "Trofee Maarten Wynants", start: "2026-05-10", end: "2026-05-10", location: "Belgium", category: "1.1" },
  { name: "Omloop Der Kempen Ladies", start: "2026-05-16", end: "2026-05-16", location: "Belgium", category: "1.1" },
  { name: "Emakumeen Saria", start: "2026-05-19", end: "2026-05-19", location: "Spain", category: "1.1" },
  { name: "GP Criquelion", start: "2026-05-24", end: "2026-05-24", location: "Belgium", category: "1.1" },
  { name: "GP Ciudad de Eibar", start: "2026-05-31", end: "2026-05-31", location: "Spain", category: "1.1" },
  { name: "Flanders Diamond Tour", start: "2026-06-14", end: "2026-06-14", location: "Belgium", category: "1.1" },
  { name: "La Périgord Ladies", start: "2026-07-18", end: "2026-07-18", location: "France", category: "1.1" },
  { name: "GP Yvonne Reynders", start: "2026-08-15", end: "2026-08-15", location: "Belgium", category: "1.1" },
  { name: "Egmont Cycling Race Women", start: "2026-08-18", end: "2026-08-18", location: "Belgium", category: "1.1" },
  { name: "Kreiz Breizh Féminin", start: "2026-08-27", end: "2026-08-27", location: "France", category: "1.1" },
  { name: "Tout Commence En Finistère Ladies Classic", start: "2026-09-05", end: "2026-09-05", location: "France", category: "1.1" },
  { name: "Pointe du Raz Ladies Classic", start: "2026-09-06", end: "2026-09-06", location: "France", category: "1.1" },
  { name: "Chrono Féminin du Gatineau", start: "2026-09-16", end: "2026-09-16", location: "Canada", category: "1.1" },
  { name: "GP de Wallonie Dames", start: "2026-09-16", end: "2026-09-16", location: "Belgium", category: "1.1" },
  { name: "Tour du Gatineau", start: "2026-09-17", end: "2026-09-17", location: "Canada", category: "1.1" },
  { name: "Veneto Women", start: "2026-10-14", end: "2026-10-14", location: "Italy", category: "1.1" },
];

// ============================================
// MAIN EXECUTION
// ============================================

console.log('Loading race data...');
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

// Create a Set of existing race IDs to avoid duplicates
const existingIds = new Set(data.races.map(r => r.id));
const existingNames = new Set(data.races.map(r => r.name.toLowerCase()));

let addedCount = 0;
let skippedCount = 0;

// Process women's races
WOMEN_RACES_RAW.forEach(race => {
  const id = slugify(race.name);
  const nameLower = race.name.toLowerCase();

  // Skip if already exists
  if (existingIds.has(id) || existingNames.has(nameLower)) {
    console.log(`  Skipping (exists): ${race.name}`);
    skippedCount++;
    return;
  }

  const raceFormat = getRaceFormat(race);
  const rating = assignRating(race);

  const newRace = {
    id,
    name: race.name,
    description: `${race.category} women's cycling race in ${race.location}`,
    platform: 'TBD',
    url: 'TBD',
    type: 'full-race',
    raceDate: race.start,
    ...(race.end !== race.start && { endDate: race.end }),
    raceDay: getDayOfWeek(race.start),
    location: race.location,
    category: race.category,
    rating,
    raceFormat,
    gender: 'women',
    discoveredAt: new Date().toISOString()
  };

  data.races.push(newRace);
  existingIds.add(id);
  existingNames.add(nameLower);
  addedCount++;
  console.log(`  Added: ${race.name} (${rating}★, ${raceFormat})`);
});

// Sort all races by date
data.races.sort((a, b) => a.raceDate.localeCompare(b.raceDate));

// Update lastUpdated
data.lastUpdated = new Date().toISOString();

// Save
writeFileSync(dataPath, JSON.stringify(data, null, 2));

// Count by gender
const menCount = data.races.filter(r => r.gender === 'men').length;
const womenCount = data.races.filter(r => r.gender === 'women').length;
const mixedCount = data.races.filter(r => r.gender === 'mixed').length;

console.log('\n========================================');
console.log(`Women's races added: ${addedCount}`);
console.log(`Skipped (duplicates): ${skippedCount}`);
console.log('');
console.log('Race counts by gender:');
console.log(`  Men's: ${menCount}`);
console.log(`  Women's: ${womenCount}`);
console.log(`  Mixed: ${mixedCount}`);
console.log(`  Total: ${data.races.length}`);
console.log('========================================');
console.log('Done!');
