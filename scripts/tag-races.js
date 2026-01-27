#!/usr/bin/env node
/**
 * Tag races with format, terrain, distance, and prestige fields
 * Uses cycling knowledge to classify races appropriately
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/race-data.json');

// Load race data
const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

// ============================================
// RACE CLASSIFICATION KNOWLEDGE BASE
// ============================================

// Grand Tours (Men's)
const GRAND_TOURS = [
  'tour de france',
  'giro d\'italia',
  'vuelta a españa',
  'vuelta a espana'
];

// Women's Grand Tours
const WOMEN_GRAND_TOURS = [
  'tour de france femmes',
  "giro d'italia women"
];

// The 5 Monuments (Men's)
const MONUMENTS = [
  'milano-sanremo',
  'ronde van vlaanderen',
  'paris-roubaix',
  'liège-bastogne-liège',
  'liege-bastogne-liege',
  'il lombardia'
];

// Women's Monuments (matching men's but with women's editions)
const WOMEN_MONUMENTS = [
  'milano-sanremo donne',
  'ronde van vlaanderen (women)',
  'ronde van vlaanderen women',
  'paris-roubaix (women)',
  'paris-roubaix women',
  'liège-bastogne-liège (women)',
  'liège-bastogne-liège women',
  'liege-bastogne-liege women',
  'la flèche wallonne (women)',
  'la flèche wallonne women',
  'la fleche wallonne women',
  'strade bianche (women)',
  'strade bianche women'
];

// Cobblestone races (pavé) - includes both men's and women's editions
const COBBLES_RACES = [
  'paris-roubaix',
  'ronde van vlaanderen',
  'e3 saxo classic',
  'gent-wevelgem',
  'dwars door vlaanderen',
  'kuurne-brussels-kuurne',
  'omloop het nieuwsblad',
  'omloop nieuwsblad',
  'le samyn',
  'nokere koerse',
  'noekere koerse',
  'gp jean-pierre monseré',
  'scheldeprijs',
  'ronde van brugge',
  'antwerp port epic'
];

// Gravel/white roads races
const GRAVEL_RACES = [
  'strade bianche'
];

// Mountain/climbing focused races
const MOUNTAIN_RACES = [
  'il lombardia',
  'liège-bastogne-liège',
  'liege-bastogne-liege',
  'la flèche wallonne',
  'la fleche wallonne',
  'amstel gold race',
  'tour of the alps',
  'tour de suisse',
  'tour de romandie',
  'critérium du dauphiné',
  'criterium du dauphine',
  'giro dell\'appennino',
  'giro dell\'emilia',
  'tre valle varesine',
  'gran piemonte',
  'gp de wallonie',
  'mercan\'tour classic',
  'tour de l\'ain',
  'tour auvergne-rhône-alpes'
];

// Hilly/rolling races
const HILLY_RACES = [
  'brabantse pijl',
  'famenne ardenne classic',
  'circuit de wallonie',
  'gp criquelion',
  'brussels cycling classic',
  'baloise belgium tour',
  'binche-chimay-binche',
  'coppa bernocchi',
  'coppa agostoni',
  'trofeo laigueglia',
  'gp du morbihan',
  'tro-bro léon',
  'tour de wallonie',
  'heistse pijl',
  'gooikske pijl',
  'dwars door het hageland',
  'omloop van het hageland'
];

// Flat/sprinter races
const FLAT_RACES = [
  'milano-sanremo', // Mostly flat with final climb
  'eschborn-frankfurt',
  'paris-tours',
  'adac cyclassics',
  'bretagne classic',
  'gp de québec',
  'gp de montréal',
  'donostia san sebastian klasikoa',
  'classica dunkerque',
  'veenendaal-veenendaal',
  'copenhagen sprint',
  'cadel evans great ocean road race'
];

// Circuit races
const CIRCUIT_RACES = [
  'rund um köln',
  'sparkassen münsterland giro',
  'utsunomiya japan cup'
];

// Time trials (men's and women's)
const TIME_TRIAL_RACES = [
  'chrono des nations',
  'chrono féminin',
  'world championships: men\'s tt',
  'world championships: women\'s tt',
  'world championships: mixed relay tt'
];

// Cyclocross races
const CYCLOCROSS_RACES = [
  'cyclocross world cup',
  'cyclocross world championships',
  'cx world cup',
  'cx world championships'
];

// Cyclocross categories
const CYCLOCROSS_CATEGORIES = ['CX.WC', 'CX.WCh'];

// Typical race distances (km)
const RACE_DISTANCES = {
  // Grand Tours (total km)
  'tour de france': 3400,
  'giro d\'italia': 3400,
  'vuelta a españa': 3300,
  // Monuments
  'milano-sanremo': 293,
  'ronde van vlaanderen': 270,
  'paris-roubaix': 257,
  'liège-bastogne-liège': 258,
  'il lombardia': 252,
  // Major one-days
  'strade bianche': 184,
  'e3 saxo classic': 204,
  'gent-wevelgem': 260,
  'dwars door vlaanderen': 183,
  'amstel gold race': 254,
  'la flèche wallonne': 202,
  'eschborn-frankfurt': 183,
  'bretagne classic': 254,
  'gp de québec': 201,
  'gp de montréal': 221,
  'paris-tours': 213,
  // Defaults by category
  'default_1.1': 180,
  'default_1.Pro': 200,
  'default_1.UWT': 220,
  'default_2.1': 800,
  'default_2.Pro': 1000,
  'default_2.UWT': 1200,
  'default_WC_rr': 270,
  'default_WC_tt': 45
};

// ============================================
// TAGGING FUNCTIONS
// ============================================

function normalizeRaceName(name) {
  return name.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/['']/g, '\'');
}

function getDiscipline(race) {
  const category = race.category;
  const nameLower = normalizeRaceName(race.name);

  // Cyclocross - check category first
  if (CYCLOCROSS_CATEGORIES.includes(category)) {
    return 'cyclocross';
  }

  // Check race name for cyclocross keywords
  if (CYCLOCROSS_RACES.some(cx => nameLower.includes(normalizeRaceName(cx)))) {
    return 'cyclocross';
  }

  // Default to road
  return 'road';
}

function getRaceFormat(race) {
  const category = race.category;
  const nameLower = normalizeRaceName(race.name);

  // Time trials
  if (TIME_TRIAL_RACES.some(tt => nameLower.includes(normalizeRaceName(tt)))) {
    return nameLower.includes('mixed relay') ? 'ttt' : 'itt';
  }

  // Cyclocross races are one-day events
  if (getDiscipline(race) === 'cyclocross') {
    return 'one-day';
  }

  // Stage races (2.x categories)
  if (category.startsWith('2.')) {
    return 'stage-race';
  }

  // WC Road Race is one-day
  if (category === 'WC' && nameLower.includes('road race')) {
    return 'one-day';
  }

  // One-day races (1.x categories)
  return 'one-day';
}

function getPrestige(race) {
  const nameLower = normalizeRaceName(race.name);
  const prestige = [];

  // Grand Tours (Men's)
  if (GRAND_TOURS.some(gt => nameLower.includes(normalizeRaceName(gt)))) {
    prestige.push('grand-tour');
  }

  // Women's Grand Tours
  if (WOMEN_GRAND_TOURS.some(gt => nameLower.includes(normalizeRaceName(gt)))) {
    prestige.push('grand-tour');
  }

  // Monuments (Men's)
  if (MONUMENTS.some(m => nameLower.includes(normalizeRaceName(m)))) {
    prestige.push('monument');
  }

  // Women's Monuments
  if (WOMEN_MONUMENTS.some(m => nameLower.includes(normalizeRaceName(m)))) {
    prestige.push('monument');
  }

  // World Championships
  if (race.category === 'WC') {
    prestige.push('world-championship');
  }

  return prestige.length > 0 ? prestige : null;
}

// Major stage races get full terrain profiles
const STAGE_RACE_TERRAINS = {
  // Grand Tours - have everything
  'tour de france': ['flat', 'hilly', 'mountain', 'itt'],
  'giro d\'italia': ['flat', 'hilly', 'mountain', 'itt'],
  'vuelta a españa': ['flat', 'hilly', 'mountain', 'itt'],
  'vuelta a espana': ['flat', 'hilly', 'mountain', 'itt'],

  // Major week-long stage races
  'paris-nice': ['flat', 'hilly', 'mountain', 'itt'],
  'tirreno-adriatico': ['flat', 'hilly', 'mountain', 'itt'],
  'tour de romandie': ['hilly', 'mountain', 'itt'],
  'tour de suisse': ['hilly', 'mountain', 'itt'],
  'critérium du dauphiné': ['hilly', 'mountain', 'itt'],
  'criterium du dauphine': ['hilly', 'mountain', 'itt'],
  'itzulia basque country': ['hilly', 'mountain'],
  'volta a catalunya': ['hilly', 'mountain'],
  'tour of the alps': ['mountain', 'itt'],

  // Other notable stage races
  'tour down under': ['flat', 'hilly'],
  'uae tour': ['flat', 'hilly', 'mountain', 'itt'],
  'volta ao algarve': ['flat', 'hilly', 'itt'],
  'tour de pologne': ['flat', 'hilly', 'mountain'],
  'renewi tour': ['flat', 'hilly', 'itt'],
  'deutschland tour': ['flat', 'hilly', 'mountain'],
  'tour of britain': ['flat', 'hilly'],
  'vuelta a burgos': ['hilly', 'mountain'],
  'arctic race of norway': ['hilly', 'mountain'],
  'tour de hongrie': ['flat', 'hilly'],
  'baloise belgium tour': ['flat', 'hilly', 'itt'],
  'tour of slovenia': ['hilly', 'mountain'],
  'tour of turkey': ['flat', 'hilly', 'mountain'],
  'tour of türkiye': ['flat', 'hilly', 'mountain'],

  // Women's Stage Races
  'tour de france femmes': ['flat', 'hilly', 'mountain'],
  "giro d'italia women": ['flat', 'hilly', 'mountain'],
  'tour de suisse women': ['hilly', 'mountain'],
  'tour de romandie féminin': ['hilly', 'mountain'],
  'vuelta españa femenina': ['hilly', 'mountain'],
  'vuelta a burgos feminas': ['hilly', 'mountain'],
  'itzulia women': ['hilly', 'mountain'],
  'tour of britain women': ['flat', 'hilly'],
  'tour down under women': ['flat', 'hilly'],
  'uae tour women': ['flat', 'hilly'],
  'baloise ladies tour': ['flat', 'hilly']
};

function getTerrain(race) {
  const nameLower = normalizeRaceName(race.name);
  const terrain = [];

  // Cyclocross races have cyclocross terrain
  if (getDiscipline(race) === 'cyclocross') {
    return ['cyclocross'];
  }

  // Check for stage race terrain profiles first
  for (const [raceName, terrains] of Object.entries(STAGE_RACE_TERRAINS)) {
    if (nameLower.includes(normalizeRaceName(raceName))) {
      return terrains;
    }
  }

  // Check each terrain type for one-day races
  if (COBBLES_RACES.some(r => nameLower.includes(normalizeRaceName(r)))) {
    terrain.push('cobbles');
  }

  if (GRAVEL_RACES.some(r => nameLower.includes(normalizeRaceName(r)))) {
    terrain.push('gravel');
  }

  if (MOUNTAIN_RACES.some(r => nameLower.includes(normalizeRaceName(r)))) {
    terrain.push('mountain');
  }

  if (HILLY_RACES.some(r => nameLower.includes(normalizeRaceName(r)))) {
    terrain.push('hilly');
  }

  if (FLAT_RACES.some(r => nameLower.includes(normalizeRaceName(r)))) {
    terrain.push('flat');
  }

  if (CIRCUIT_RACES.some(r => nameLower.includes(normalizeRaceName(r)))) {
    terrain.push('circuit');
  }

  // Default terrain for stage races not in our list
  if (race.category.startsWith('2.')) {
    // Stage races default to hilly + flat
    return ['flat', 'hilly'];
  }

  // Default terrain based on category if nothing matched
  if (terrain.length === 0) {
    // Most Belgian/Dutch 1.1 races are hilly
    if (race.location === 'Belgium' || race.location === 'Netherlands') {
      return ['hilly'];
    }
    // Italian races often hilly
    if (race.location === 'Italy') {
      return ['hilly'];
    }
    // Default to flat for unknown
    return ['flat'];
  }

  return terrain;
}

function getDistance(race) {
  const nameLower = normalizeRaceName(race.name);
  const category = race.category;

  // Check specific race distances
  for (const [raceName, distance] of Object.entries(RACE_DISTANCES)) {
    if (!raceName.startsWith('default_') && nameLower.includes(normalizeRaceName(raceName))) {
      return distance;
    }
  }

  // Default by category
  if (category === 'WC') {
    return nameLower.includes('tt') ? RACE_DISTANCES['default_WC_tt'] : RACE_DISTANCES['default_WC_rr'];
  }

  const defaultKey = `default_${category}`;
  return RACE_DISTANCES[defaultKey] || 200;
}

// ============================================
// MAIN PROCESSING
// ============================================

console.log('Tagging races with format, terrain, distance, prestige, and discipline...\n');

let stats = {
  formats: { 'one-day': 0, 'stage-race': 0, 'itt': 0, 'ttt': 0 },
  prestige: { 'grand-tour': 0, 'monument': 0, 'world-championship': 0 },
  terrain: { cobbles: 0, gravel: 0, mountain: 0, hilly: 0, flat: 0, circuit: 0, cyclocross: 0 },
  discipline: { 'road': 0, 'cyclocross': 0 }
};

data.races = data.races.map(race => {
  const discipline = getDiscipline(race);
  const raceFormat = getRaceFormat(race);
  const prestige = getPrestige(race);
  const terrain = getTerrain(race);
  const distance = getDistance(race);

  // Update stats
  stats.discipline[discipline]++;
  stats.formats[raceFormat]++;
  if (prestige) prestige.forEach(p => stats.prestige[p]++);
  terrain.forEach(t => {
    if (stats.terrain[t] !== undefined) stats.terrain[t]++;
  });

  return {
    ...race,
    discipline,
    raceFormat,
    terrain,
    distance,
    ...(prestige && { prestige })
  };
});

// Update lastUpdated
data.lastUpdated = new Date().toISOString();

// Write back
writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log('Done! Statistics:\n');
console.log('Discipline:', stats.discipline);
console.log('Formats:', stats.formats);
console.log('Prestige:', stats.prestige);
console.log('Terrain:', stats.terrain);
console.log('\nTotal races tagged:', data.races.length);
