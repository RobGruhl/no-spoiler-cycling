#!/usr/bin/env node
/**
 * Add 2026 Tour de France stages to race-data.json
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../data/race-data.json');

const data = JSON.parse(readFileSync(dataPath, 'utf-8'));

// Find Tour de France
const tdfIndex = data.races.findIndex(r => r.name === 'Tour de France');
if (tdfIndex === -1) {
  console.error('Tour de France not found!');
  process.exit(1);
}

// 2026 Tour de France stages
const stages = [
  {
    stageNumber: 1,
    name: "Stage 1: Barcelona → Barcelona",
    stageType: "ttt",
    terrain: ["circuit"],
    distance: 19.7,
    date: "2026-07-04",
    platform: "TBD",
    url: "TBD",
    description: "Team time trial with two climbs of Montjuïc; technical city-center course"
  },
  {
    stageNumber: 2,
    name: "Stage 2: Tarragona → Barcelona",
    stageType: "hilly",
    terrain: ["hilly", "summit-finish"],
    distance: 180,
    date: "2026-07-05",
    platform: "TBD",
    url: "TBD",
    description: "Repeated short climb to Montjuïc Castle (1.6 km at up to 13%), punchy circuit-style finish"
  },
  {
    stageNumber: 3,
    name: "Stage 3: Granollers → Les Angles",
    stageType: "mountain",
    terrain: ["mountain", "summit-finish"],
    distance: 196,
    date: "2026-07-06",
    platform: "TBD",
    url: "TBD",
    description: "First summit finish at high Pyrenean ski station Les Angles"
  },
  {
    stageNumber: 4,
    name: "Stage 4: Carcassonne → Foix",
    stageType: "hilly",
    terrain: ["hilly"],
    distance: 182,
    date: "2026-07-07",
    platform: "TBD",
    url: "TBD",
    description: "Hilly transition stage through the Pyrenean foothills"
  },
  {
    stageNumber: 5,
    name: "Stage 5: Lannemezan → Pau",
    stageType: "flat",
    terrain: ["flat"],
    distance: 158,
    date: "2026-07-08",
    platform: "TBD",
    url: "TBD",
    description: "Flat sprinters' stage"
  },
  {
    stageNumber: 6,
    name: "Stage 6: Pau → Gavarnie-Gèdre",
    stageType: "mountain",
    terrain: ["mountain", "summit-finish"],
    distance: 186,
    date: "2026-07-09",
    platform: "TBD",
    url: "TBD",
    description: "Classic Pyrenean giants: Col d'Aspin and Col du Tourmalet before summit finish at Gavarnie-Gèdre"
  },
  {
    stageNumber: 7,
    name: "Stage 7: Hagetmau → Bordeaux",
    stageType: "flat",
    terrain: ["flat"],
    distance: 175,
    date: "2026-07-10",
    platform: "TBD",
    url: "TBD",
    description: "Flat sprinters' stage through the Landes forest"
  },
  {
    stageNumber: 8,
    name: "Stage 8: Périgueux → Bergerac",
    stageType: "flat",
    terrain: ["flat"],
    distance: 182,
    date: "2026-07-11",
    platform: "TBD",
    url: "TBD",
    description: "Flat sprinters' stage in the Dordogne"
  },
  {
    stageNumber: 9,
    name: "Stage 9: Malemort → Ussel",
    stageType: "hilly",
    terrain: ["hilly"],
    distance: 185,
    date: "2026-07-12",
    platform: "TBD",
    url: "TBD",
    description: "Hilly breakaway terrain in the Corrèze"
  },
  {
    stageNumber: 0,
    name: "Rest Day 1: Cantal",
    stageType: "rest-day",
    terrain: [],
    distance: 0,
    date: "2026-07-13",
    platform: null,
    url: null,
    description: "First rest day in the Cantal region"
  },
  {
    stageNumber: 10,
    name: "Stage 10: Aurillac → Le Lioran",
    stageType: "mountain",
    terrain: ["mountain", "summit-finish"],
    distance: 167,
    date: "2026-07-14",
    platform: "TBD",
    url: "TBD",
    description: "Bastille Day mountain stage in the Massif Central with summit finish at Le Lioran"
  },
  {
    stageNumber: 11,
    name: "Stage 11: Vichy → Nevers",
    stageType: "flat",
    terrain: ["flat"],
    distance: 161,
    date: "2026-07-15",
    platform: "TBD",
    url: "TBD",
    description: "Flat transition stage"
  },
  {
    stageNumber: 12,
    name: "Stage 12: Magny-Cours → Chalon-sur-Saône",
    stageType: "flat",
    terrain: ["flat"],
    distance: 181,
    date: "2026-07-16",
    platform: "TBD",
    url: "TBD",
    description: "Flat stage starting from the Magny-Cours racing circuit"
  },
  {
    stageNumber: 13,
    name: "Stage 13: Dole → Belfort",
    stageType: "hilly",
    terrain: ["hilly"],
    distance: 205,
    date: "2026-07-17",
    platform: "TBD",
    url: "TBD",
    description: "Long hilly stage through the Jura foothills"
  },
  {
    stageNumber: 14,
    name: "Stage 14: Mulhouse → Le Markstein",
    stageType: "mountain",
    terrain: ["mountain", "summit-finish"],
    distance: 155,
    date: "2026-07-18",
    platform: "TBD",
    url: "TBD",
    description: "Vosges mountain stage: Grand Ballon, Col du Page, Ballon d'Alsace, Col du Haag"
  },
  {
    stageNumber: 15,
    name: "Stage 15: Champagnole → Plateau de Solaison",
    stageType: "mountain",
    terrain: ["mountain", "summit-finish"],
    distance: 184,
    date: "2026-07-19",
    platform: "TBD",
    url: "TBD",
    description: "Very steep summit finish at Plateau de Solaison; includes Le Salève at ~11% avg over 4.7 km"
  },
  {
    stageNumber: 0,
    name: "Rest Day 2: Haute-Savoie",
    stageType: "rest-day",
    terrain: [],
    distance: 0,
    date: "2026-07-20",
    platform: null,
    url: null,
    description: "Second rest day before the Alpine finale"
  },
  {
    stageNumber: 16,
    name: "Stage 16: Évian-les-Bains → Thonon-les-Bains",
    stageType: "itt",
    terrain: ["itt"],
    distance: 26,
    date: "2026-07-21",
    platform: "TBD",
    url: "TBD",
    description: "Individual time trial along Lake Geneva"
  },
  {
    stageNumber: 17,
    name: "Stage 17: Chambéry → Voiron",
    stageType: "flat",
    terrain: ["flat"],
    distance: 175,
    date: "2026-07-22",
    platform: "TBD",
    url: "TBD",
    description: "Flat transition stage before the Alpine finale"
  },
  {
    stageNumber: 18,
    name: "Stage 18: Voiron → Orcières-Merlette",
    stageType: "mountain",
    terrain: ["mountain", "summit-finish"],
    distance: 185,
    date: "2026-07-23",
    platform: "TBD",
    url: "TBD",
    description: "Mountain stage with summit finish at the ski station Orcières-Merlette"
  },
  {
    stageNumber: 19,
    name: "Stage 19: Gap → Alpe d'Huez",
    stageType: "mountain",
    terrain: ["mountain", "summit-finish"],
    distance: 128,
    date: "2026-07-24",
    platform: "TBD",
    url: "TBD",
    description: "Short but brutal mountain stage finishing atop the legendary Alpe d'Huez"
  },
  {
    stageNumber: 20,
    name: "Stage 20: Le Bourg-d'Oisans → Alpe d'Huez",
    stageType: "mountain",
    terrain: ["mountain", "summit-finish"],
    distance: 171,
    date: "2026-07-25",
    platform: "TBD",
    url: "TBD",
    description: "Queen stage: Col de la Croix de Fer, Col du Télégraphe, Col du Galibier (roof of the Tour), Col de Sarenne, Alpe d'Huez. ~5,600m elevation gain"
  },
  {
    stageNumber: 21,
    name: "Stage 21: Thoiry → Paris",
    stageType: "flat",
    terrain: ["flat", "circuit"],
    distance: 130,
    date: "2026-07-26",
    platform: "TBD",
    url: "TBD",
    description: "Ceremonial finale with multiple ascents of Rue Lepic/Montmartre before Champs-Élysées sprint"
  }
];

// Update Tour de France entry
data.races[tdfIndex] = {
  ...data.races[tdfIndex],
  distance: 3333,  // Official total
  endDate: "2026-07-26",
  terrain: ["flat", "hilly", "mountain", "itt", "ttt", "summit-finish"],
  stages: stages
};

// Update lastUpdated
data.lastUpdated = new Date().toISOString();

writeFileSync(dataPath, JSON.stringify(data, null, 2));

console.log(`Added ${stages.length} stages to Tour de France 2026`);
console.log(`  - Racing stages: ${stages.filter(s => s.stageNumber > 0).length}`);
console.log(`  - Rest days: ${stages.filter(s => s.stageType === 'rest-day').length}`);
console.log(`  - Mountain stages: ${stages.filter(s => s.stageType === 'mountain').length}`);
console.log(`  - Flat stages: ${stages.filter(s => s.stageType === 'flat').length}`);
console.log(`  - Hilly stages: ${stages.filter(s => s.stageType === 'hilly').length}`);
console.log(`  - Time trials: ${stages.filter(s => s.stageType === 'itt' || s.stageType === 'ttt').length}`);
