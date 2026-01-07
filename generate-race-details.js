#!/usr/bin/env node

/**
 * Generate Race Details Page
 *
 * Creates an HTML page for a single race/stage with:
 * - Course profile and sector breakdown
 * - Pre-race favorites and contenders
 * - Historical context
 * - Race narratives and storylines
 *
 * CRITICAL: All content is spoiler-safe. For past races, only pre-race
 * content is displayed to avoid revealing results.
 */

import fs from 'fs';
import path from 'path';

// ============================================
// DATA STRUCTURE
// ============================================

/**
 * Race Details Schema
 *
 * This is the expected structure for raceDetails in race-data.json:
 *
 * {
 *   "raceDetails": {
 *     "lastFetched": "2026-01-07T00:00:00Z",
 *     "spoilerSafe": true,
 *     "courseSummary": "Course description...",
 *     "keySectors": [
 *       {
 *         "name": "Sector 15 - Carrefour de l'Arbre",
 *         "kmFromFinish": 18.5,
 *         "length": 2.1,
 *         "surface": "cobbles",
 *         "difficulty": 5,
 *         "description": "Five-star cobbled sector..."
 *       }
 *     ],
 *     "keyClimbs": [
 *       {
 *         "name": "Col du Galibier",
 *         "category": "HC",
 *         "length": 17.7,
 *         "avgGradient": "6.9%",
 *         "maxGradient": "12.1%",
 *         "kmFromFinish": 35,
 *         "summit": 2642
 *       }
 *     ],
 *     "favorites": {
 *       "climbers": ["Rider A", "Rider B"],
 *       "sprinters": ["Rider C"],
 *       "puncheurs": ["Rider D"],
 *       "allRounders": ["Rider E"],
 *       "gcContenders": ["Rider F"]
 *     },
 *     "narratives": [
 *       "Can Pogacar add another monument to his collection?",
 *       "Van Aert returns after injury - can he recapture winning form?"
 *     ],
 *     "historicalContext": "The race has been held since 1896...",
 *     "watchNotes": "Key moments to watch for during the race"
 *   }
 * }
 */

// ============================================
// ICON MAPPINGS
// ============================================

const surfaceIcons = {
  'cobbles': '🪨',
  'gravel': '🟤',
  'asphalt': '🛣️',
  'dirt': '🟫'
};

const categoryIcons = {
  'HC': '🔴',
  '1': '🟠',
  '2': '🟡',
  '3': '🟢',
  '4': '🔵'
};

const difficultyStars = (rating) => {
  const max = 5;
  const filled = '★'.repeat(Math.min(rating, max));
  const empty = '☆'.repeat(max - Math.min(rating, max));
  return filled + empty;
};

// ============================================
// HTML GENERATION
// ============================================

function generateRaceDetailsHTML(race, options = {}) {
  const {
    backLink = '../index.html',
    backText = 'Back to Calendar'
  } = options;

  const details = race.raceDetails || {};
  const hasDetails = Object.keys(details).length > 0;

  // Format race date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  // Check if race is in the past
  const isFinished = race.raceDate && new Date(race.raceDate) < new Date();

  // Generate sectors HTML
  const generateSectorsHTML = () => {
    if (!details.keySectors || details.keySectors.length === 0) return '';

    const sectorsHTML = details.keySectors.map(sector => `
      <div class="sector-card">
        <div class="sector-header">
          <span class="sector-icon">${surfaceIcons[sector.surface] || '📍'}</span>
          <span class="sector-name">${sector.name}</span>
          <span class="sector-difficulty" title="Difficulty">${difficultyStars(sector.difficulty || 3)}</span>
        </div>
        <div class="sector-stats">
          ${sector.length ? `<span class="stat">${sector.length} km</span>` : ''}
          ${sector.kmFromFinish ? `<span class="stat">${sector.kmFromFinish} km from finish</span>` : ''}
        </div>
        ${sector.description ? `<p class="sector-description">${sector.description}</p>` : ''}
      </div>
    `).join('');

    return `
      <section class="details-section">
        <h2 class="section-title">🪨 Key Sectors</h2>
        <div class="sectors-grid">
          ${sectorsHTML}
        </div>
      </section>
    `;
  };

  // Generate climbs HTML
  const generateClimbsHTML = () => {
    if (!details.keyClimbs || details.keyClimbs.length === 0) return '';

    const climbsHTML = details.keyClimbs.map(climb => `
      <div class="climb-card">
        <div class="climb-header">
          <span class="climb-category ${climb.category?.toLowerCase()}">${categoryIcons[climb.category] || '⛰️'} ${climb.category || ''}</span>
          <span class="climb-name">${climb.name}</span>
        </div>
        <div class="climb-stats">
          ${climb.length ? `<span class="stat"><strong>${climb.length}</strong> km</span>` : ''}
          ${climb.avgGradient ? `<span class="stat"><strong>${climb.avgGradient}</strong> avg</span>` : ''}
          ${climb.maxGradient ? `<span class="stat"><strong>${climb.maxGradient}</strong> max</span>` : ''}
          ${climb.summit ? `<span class="stat"><strong>${climb.summit}</strong>m summit</span>` : ''}
        </div>
        ${climb.kmFromFinish ? `<div class="climb-position">${climb.kmFromFinish} km from finish</div>` : ''}
      </div>
    `).join('');

    return `
      <section class="details-section">
        <h2 class="section-title">⛰️ Key Climbs</h2>
        <div class="climbs-list">
          ${climbsHTML}
        </div>
      </section>
    `;
  };

  // Generate favorites HTML
  const generateFavoritesHTML = () => {
    if (!details.favorites) return '';

    const categories = [
      { key: 'gcContenders', label: 'GC Contenders', icon: '🎯' },
      { key: 'climbers', label: 'Climbers', icon: '⛰️' },
      { key: 'sprinters', label: 'Sprinters', icon: '⚡' },
      { key: 'puncheurs', label: 'Puncheurs', icon: '💪' },
      { key: 'allRounders', label: 'All-Rounders', icon: '🔄' },
      { key: 'cobbleSpecialists', label: 'Cobble Specialists', icon: '🪨' }
    ];

    const favoritesHTML = categories
      .filter(cat => details.favorites[cat.key] && details.favorites[cat.key].length > 0)
      .map(cat => `
        <div class="favorites-category">
          <h3 class="category-label">${cat.icon} ${cat.label}</h3>
          <div class="riders-list">
            ${details.favorites[cat.key].map(rider => `<span class="rider-chip">${rider}</span>`).join('')}
          </div>
        </div>
      `).join('');

    if (!favoritesHTML) return '';

    return `
      <section class="details-section">
        <h2 class="section-title">🌟 Pre-Race Favorites</h2>
        <div class="favorites-grid">
          ${favoritesHTML}
        </div>
        ${isFinished ? '<p class="spoiler-notice">📺 These are pre-race predictions - no spoilers here!</p>' : ''}
      </section>
    `;
  };

  // Generate narratives HTML
  const generateNarrativesHTML = () => {
    if (!details.narratives || details.narratives.length === 0) return '';

    const narrativesHTML = details.narratives.map(narrative => `
      <li class="narrative-item">${narrative}</li>
    `).join('');

    return `
      <section class="details-section">
        <h2 class="section-title">📖 Storylines to Watch</h2>
        <ul class="narratives-list">
          ${narrativesHTML}
        </ul>
      </section>
    `;
  };

  // Generate historical context HTML
  const generateHistoryHTML = () => {
    if (!details.historicalContext) return '';

    return `
      <section class="details-section">
        <h2 class="section-title">📜 Historical Context</h2>
        <div class="history-content">
          <p>${details.historicalContext}</p>
        </div>
      </section>
    `;
  };

  // Generate watch notes HTML
  const generateWatchNotesHTML = () => {
    if (!details.watchNotes) return '';

    return `
      <section class="details-section watch-notes">
        <h2 class="section-title">👀 What to Watch For</h2>
        <div class="watch-content">
          <p>${details.watchNotes}</p>
        </div>
      </section>
    `;
  };

  // Main HTML template
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${race.name} - Spoiler-free race preview and details">
  <title>${race.name} | No Spoiler Cycling</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
      min-height: 100vh;
      padding: 20px;
      color: #1f2937;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
    }

    /* Back Button */
    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 500;
      margin-bottom: 20px;
      transition: background 0.2s;
    }

    .back-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Race Header */
    .race-header-card {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }

    .race-badges {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-category {
      background: #6366f1;
      color: white;
    }

    .badge-spoiler-safe {
      background: #10b981;
      color: white;
    }

    .badge-past {
      background: #f59e0b;
      color: white;
    }

    .race-title {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #1e3a5f, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 12px;
      line-height: 1.2;
    }

    .race-meta {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      color: #6b7280;
      font-size: 0.95rem;
    }

    .race-meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Course Summary */
    .course-summary {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .course-summary h2 {
      font-size: 1.25rem;
      color: #1e3a5f;
      margin-bottom: 12px;
    }

    .course-summary p {
      color: #374151;
      line-height: 1.7;
    }

    /* Details Sections */
    .details-section {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .section-title {
      font-size: 1.25rem;
      color: #1e3a5f;
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Sectors Grid */
    .sectors-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .sector-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 16px;
      border-left: 4px solid #8b5cf6;
    }

    .sector-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .sector-icon {
      font-size: 1.25rem;
    }

    .sector-name {
      font-weight: 600;
      color: #1f2937;
      flex: 1;
    }

    .sector-difficulty {
      color: #fbbf24;
      font-size: 0.85rem;
    }

    .sector-stats {
      display: flex;
      gap: 12px;
      margin-bottom: 8px;
      font-size: 0.85rem;
      color: #6b7280;
    }

    .sector-description {
      font-size: 0.875rem;
      color: #4b5563;
      line-height: 1.5;
    }

    /* Climbs List */
    .climbs-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .climb-card {
      background: #f9fafb;
      border-radius: 12px;
      padding: 16px;
      border-left: 4px solid #ef4444;
    }

    .climb-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .climb-category {
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
      background: #fef2f2;
      color: #dc2626;
    }

    .climb-category.hc { background: #fef2f2; color: #dc2626; }
    .climb-category.1 { background: #fff7ed; color: #ea580c; }
    .climb-category.2 { background: #fefce8; color: #ca8a04; }
    .climb-category.3 { background: #f0fdf4; color: #16a34a; }
    .climb-category.4 { background: #eff6ff; color: #2563eb; }

    .climb-name {
      font-weight: 600;
      color: #1f2937;
    }

    .climb-stats {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 0.875rem;
      color: #4b5563;
    }

    .climb-stats .stat strong {
      color: #1f2937;
    }

    .climb-position {
      margin-top: 8px;
      font-size: 0.8rem;
      color: #9ca3af;
    }

    /* Favorites Grid */
    .favorites-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .favorites-category {
      background: #f9fafb;
      border-radius: 12px;
      padding: 16px;
    }

    .category-label {
      font-size: 0.9rem;
      font-weight: 600;
      color: #374151;
      margin-bottom: 10px;
    }

    .riders-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .rider-chip {
      background: white;
      border: 1px solid #e5e7eb;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.8rem;
      color: #1f2937;
    }

    .spoiler-notice {
      margin-top: 16px;
      padding: 12px;
      background: #ecfdf5;
      border-radius: 8px;
      color: #059669;
      font-size: 0.875rem;
      text-align: center;
    }

    /* Narratives List */
    .narratives-list {
      list-style: none;
    }

    .narrative-item {
      padding: 12px 16px;
      background: #f9fafb;
      border-radius: 8px;
      margin-bottom: 8px;
      border-left: 3px solid #3b82f6;
      color: #374151;
      line-height: 1.5;
    }

    /* History Content */
    .history-content {
      background: #f9fafb;
      border-radius: 12px;
      padding: 20px;
      color: #374151;
      line-height: 1.7;
    }

    /* Watch Notes */
    .watch-notes {
      background: linear-gradient(135deg, #ecfdf5, #d1fae5);
      border: 2px solid #10b981;
    }

    .watch-content {
      color: #065f46;
      line-height: 1.7;
    }

    /* Empty State */
    .empty-state {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 16px;
      padding: 48px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .empty-state h2 {
      color: #6b7280;
      margin-bottom: 12px;
    }

    .empty-state p {
      color: #9ca3af;
    }

    /* Footer */
    .footer {
      text-align: center;
      color: rgba(255,255,255,0.6);
      padding: 30px 0;
      font-size: 0.85rem;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .race-title {
        font-size: 1.5rem;
      }

      .race-header-card {
        padding: 20px;
      }

      .sectors-grid,
      .favorites-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="${backLink}" class="back-button">← ${backText}</a>

    <div class="race-header-card">
      <div class="race-badges">
        ${race.category ? `<span class="badge badge-category">${race.category}</span>` : ''}
        ${details.spoilerSafe ? '<span class="badge badge-spoiler-safe">Spoiler Safe</span>' : ''}
        ${isFinished ? '<span class="badge badge-past">Race Finished</span>' : ''}
      </div>
      <h1 class="race-title">${race.name}</h1>
      <div class="race-meta">
        ${race.raceDate ? `<span class="race-meta-item">📅 ${formatDate(race.raceDate)}</span>` : ''}
        ${race.location ? `<span class="race-meta-item">📍 ${race.location}</span>` : ''}
        ${race.distance ? `<span class="race-meta-item">📏 ${race.distance} km</span>` : ''}
      </div>
    </div>

    ${details.courseSummary ? `
      <div class="course-summary">
        <h2>🗺️ Course Overview</h2>
        <p>${details.courseSummary}</p>
      </div>
    ` : ''}

    ${hasDetails ? `
      ${generateSectorsHTML()}
      ${generateClimbsHTML()}
      ${generateFavoritesHTML()}
      ${generateNarrativesHTML()}
      ${generateHistoryHTML()}
      ${generateWatchNotesHTML()}
    ` : `
      <div class="empty-state">
        <h2>📝 Details Coming Soon</h2>
        <p>Race details have not been fetched yet. Use the Perplexity search utilities to populate this page.</p>
      </div>
    `}

    <footer class="footer">
      <p>No Spoiler Cycling | Race details are spoiler-safe</p>
      ${details.lastFetched ? `<p>Last updated: ${new Date(details.lastFetched).toLocaleDateString()}</p>` : ''}
    </footer>
  </div>
</body>
</html>`;
}

// ============================================
// FILE GENERATION
// ============================================

/**
 * Generate race details page for a single race
 */
function generateRaceDetailsPage(race, outputDir = './race-details') {
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `${race.id}.html`;
  const filepath = path.join(outputDir, filename);

  const html = generateRaceDetailsHTML(race);
  fs.writeFileSync(filepath, html);

  console.log(`✅ Generated: ${filepath}`);
  return filepath;
}

/**
 * Generate race details pages for all races with details
 */
function generateAllRaceDetailsPages(raceDataPath = './data/race-data.json', outputDir = './race-details') {
  const data = JSON.parse(fs.readFileSync(raceDataPath, 'utf8'));

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let generated = 0;

  data.races.forEach(race => {
    if (race.raceDetails && Object.keys(race.raceDetails).length > 0) {
      generateRaceDetailsPage(race, outputDir);
      generated++;
    }
  });

  console.log(`\n📊 Generated ${generated} race detail pages`);
  return generated;
}

/**
 * Generate stage details page for a Grand Tour stage
 */
function generateStageDetailsPage(race, stageNumber, outputDir = './race-details') {
  if (!race.stages) {
    console.error(`❌ Race ${race.id} has no stages`);
    return null;
  }

  const stage = race.stages.find(s => s.stageNumber === stageNumber);
  if (!stage) {
    console.error(`❌ Stage ${stageNumber} not found in ${race.id}`);
    return null;
  }

  // Create stage as a "race" object for the template
  const stageAsRace = {
    id: `${race.id}-stage-${stageNumber}`,
    name: stage.name,
    raceDate: stage.date,
    location: race.location,
    distance: stage.distance,
    category: race.category,
    raceDetails: stage.stageDetails || {}
  };

  return generateRaceDetailsPage(stageAsRace, outputDir);
}

// ============================================
// CLI INTERFACE
// ============================================

const args = process.argv.slice(2);

if (args.includes('--all')) {
  // Generate all race details pages
  generateAllRaceDetailsPages();
} else if (args.includes('--race') && args.length >= 2) {
  // Generate single race details page
  const raceId = args[args.indexOf('--race') + 1];
  const data = JSON.parse(fs.readFileSync('./data/race-data.json', 'utf8'));
  const race = data.races.find(r => r.id === raceId);

  if (race) {
    generateRaceDetailsPage(race);
  } else {
    console.error(`❌ Race not found: ${raceId}`);
    process.exit(1);
  }
} else if (args.includes('--help')) {
  console.log(`
Race Details Page Generator

Usage:
  node generate-race-details.js --all           Generate pages for all races with details
  node generate-race-details.js --race <id>     Generate page for specific race
  node generate-race-details.js --help          Show this help

Output: ./race-details/<race-id>.html
`);
} else {
  console.log('No arguments provided. Use --help for usage information.');
}

// Export functions for use as module
export {
  generateRaceDetailsHTML,
  generateRaceDetailsPage,
  generateAllRaceDetailsPages,
  generateStageDetailsPage
};
