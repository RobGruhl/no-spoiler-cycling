#!/usr/bin/env node

/**
 * Generate Rider Details Page
 *
 * Creates HTML pages for individual riders showing:
 * - Rider photo, name, team, nationality, ranking
 * - Specialty badges (climber, sprinter, etc.)
 * - 2026 Race Program with links to race detail pages
 * - "Not yet announced" state for riders without program
 *
 * Spoiler-safe: Only shows announced future races, no results
 */

import fs from 'fs';
import path from 'path';

// ============================================
// ICON MAPPINGS
// ============================================

const specialtyConfig = {
  'climber': { icon: '⛰️', label: 'Climber', color: '#dc2626' },
  'sprinter': { icon: '⚡', label: 'Sprinter', color: '#16a34a' },
  'puncheur': { icon: '💪', label: 'Puncheur', color: '#ea580c' },
  'gc-contender': { icon: '🎯', label: 'GC Contender', color: '#7c3aed' },
  'time-trialist': { icon: '⏱️', label: 'Time Trialist', color: '#0891b2' },
  'one-day': { icon: '🏆', label: 'Classics', color: '#ca8a04' },
  'rouleur': { icon: '🚴', label: 'Rouleur', color: '#64748b' }
};

const nationalityFlags = {
  'SL': '🇸🇮', 'SI': '🇸🇮',  // Slovenia
  'DE': '🇩🇪',  // Germany
  'DK': '🇩🇰',  // Denmark
  'BE': '🇧🇪',  // Belgium
  'NL': '🇳🇱',  // Netherlands
  'FR': '🇫🇷',  // France
  'IT': '🇮🇹',  // Italy
  'ES': '🇪🇸',  // Spain
  'GB': '🇬🇧', 'UK': '🇬🇧',  // Great Britain
  'US': '🇺🇸',  // United States
  'AU': '🇦🇺',  // Australia
  'CO': '🇨🇴',  // Colombia
  'PO': '🇵🇹', 'PT': '🇵🇹',  // Portugal
  'ME': '🇲🇽', 'MX': '🇲🇽',  // Mexico
  'AT': '🇦🇹',  // Austria
  'NO': '🇳🇴',  // Norway
  'PL': '🇵🇱',  // Poland
  'CH': '🇨🇭',  // Switzerland
  'IE': '🇮🇪',  // Ireland
  'CA': '🇨🇦',  // Canada
  'XX': '🏳️'   // Unknown
};

// ============================================
// HTML GENERATION
// ============================================

function generateRiderDetailsHTML(rider, raceData = null) {
  const flag = nationalityFlags[rider.nationalityCode] || nationalityFlags['XX'];
  const hasProgram = rider.raceProgram?.status === 'announced' && rider.raceProgram?.races?.length > 0;

  // Format date for display
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Format age from DOB
  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(rider.dateOfBirth);

  // Generate specialty badges
  const generateSpecialtiesHTML = () => {
    if (!rider.specialties || rider.specialties.length === 0) return '';

    return rider.specialties.map(spec => {
      const config = specialtyConfig[spec] || { icon: '🚴', label: spec, color: '#6b7280' };
      return `<span class="specialty-badge" style="--badge-color: ${config.color}">${config.icon} ${config.label}</span>`;
    }).join('');
  };

  // Build race map for linking
  const raceMap = new Map();
  if (raceData?.races) {
    for (const race of raceData.races) {
      // Map by slug variations
      const slug = race.id.replace(/-2026$/, '').toLowerCase();
      raceMap.set(slug, race);

      // Also try the race name simplified
      const simpleName = race.name.toLowerCase()
        .replace(/\s*2026\s*/g, '')
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
      raceMap.set(simpleName, race);
    }
  }

  // Generate race program HTML
  const generateProgramHTML = () => {
    if (!hasProgram) {
      return `
        <section class="program-section empty-program">
          <h2 class="section-title">📅 2026 Race Program</h2>
          <div class="empty-state">
            <span class="empty-icon">🤷</span>
            <p class="empty-text">Race program not yet announced</p>
            <p class="empty-subtext">Check back later for updates</p>
          </div>
        </section>
      `;
    }

    const racesHTML = rider.raceProgram.races.map(race => {
      // Try to find matching race in race-data.json
      const matchedRace = raceMap.get(race.raceSlug);
      const hasDetailPage = matchedRace && (matchedRace.raceDetails || matchedRace.stages);
      const detailLink = hasDetailPage ? `../race-details/${matchedRace.id}.html` : null;

      const raceClass = race.raceClass || '';
      const isGrandTour = ['Tour de France', 'Giro d\'Italia', 'La Vuelta Ciclista a España'].some(gt => race.raceName.includes(gt));
      const isMonument = ['Milano-Sanremo', 'Ronde van Vlaanderen', 'Paris-Roubaix', 'Liège-Bastogne-Liège', 'Il Lombardia'].some(m => race.raceName.includes(m));

      let raceTypeClass = '';
      if (isGrandTour) raceTypeClass = 'grand-tour';
      else if (isMonument) raceTypeClass = 'monument';
      else if (raceClass.includes('1.UWT')) raceTypeClass = 'world-tour';

      const raceContent = `
        <div class="race-date">${formatDate(race.raceDate)}</div>
        <div class="race-info">
          <span class="race-name">${race.raceName}</span>
          ${raceClass ? `<span class="race-class">${raceClass}</span>` : ''}
        </div>
        ${isGrandTour ? '<span class="race-badge gt">Grand Tour</span>' : ''}
        ${isMonument ? '<span class="race-badge monument">Monument</span>' : ''}
      `;

      if (detailLink) {
        return `<a href="${detailLink}" class="race-item ${raceTypeClass}">${raceContent}</a>`;
      }
      return `<div class="race-item ${raceTypeClass}">${raceContent}</div>`;
    }).join('');

    return `
      <section class="program-section">
        <h2 class="section-title">📅 2026 Race Program</h2>
        <div class="race-program">
          ${racesHTML}
        </div>
        <p class="program-meta">${rider.raceProgram.races.length} races announced</p>
      </section>
    `;
  };

  // Photo URL handling
  const photoSrc = rider.photoUrl?.startsWith('riders/')
    ? `../${rider.photoUrl}`
    : rider.photoUrl || '../riders/photos/placeholder.jpg';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${rider.name} - 2026 race program and profile">
  <title>${rider.name} | No Spoiler Cycling</title>
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
      max-width: 800px;
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

    /* Rider Header Card */
    .rider-header {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      display: flex;
      gap: 24px;
      align-items: flex-start;
    }

    .rider-photo {
      width: 120px;
      height: 150px;
      border-radius: 12px;
      object-fit: cover;
      background: #e5e7eb;
      flex-shrink: 0;
    }

    .rider-info {
      flex: 1;
    }

    .rider-rank {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: white;
      font-weight: 700;
      font-size: 1rem;
      border-radius: 50%;
      margin-bottom: 8px;
    }

    .rider-name {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #1e3a5f, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.2;
      margin-bottom: 8px;
    }

    .rider-team {
      font-size: 1.1rem;
      color: #4b5563;
      margin-bottom: 8px;
    }

    .rider-meta {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      color: #6b7280;
      font-size: 0.9rem;
      margin-bottom: 16px;
    }

    .rider-meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .rider-flag {
      font-size: 1.5rem;
    }

    .specialties {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .specialty-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: color-mix(in srgb, var(--badge-color) 15%, white);
      border: 1px solid color-mix(in srgb, var(--badge-color) 30%, white);
      color: var(--badge-color);
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 600;
    }

    /* Program Section */
    .program-section {
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
    }

    .race-program {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .race-item {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 14px 16px;
      background: #f9fafb;
      border-radius: 10px;
      border-left: 4px solid #e5e7eb;
      transition: all 0.2s;
      text-decoration: none;
      color: inherit;
    }

    a.race-item:hover {
      background: #f3f4f6;
      transform: translateX(4px);
    }

    .race-item.grand-tour {
      border-left-color: #7c3aed;
      background: linear-gradient(90deg, rgba(124, 58, 237, 0.08), transparent);
    }

    .race-item.monument {
      border-left-color: #dc2626;
      background: linear-gradient(90deg, rgba(220, 38, 38, 0.08), transparent);
    }

    .race-item.world-tour {
      border-left-color: #0891b2;
    }

    .race-date {
      min-width: 60px;
      font-weight: 600;
      color: #6b7280;
      font-size: 0.9rem;
    }

    .race-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .race-name {
      font-weight: 600;
      color: #1f2937;
    }

    .race-class {
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .race-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .race-badge.gt {
      background: #ede9fe;
      color: #7c3aed;
    }

    .race-badge.monument {
      background: #fee2e2;
      color: #dc2626;
    }

    .program-meta {
      margin-top: 16px;
      text-align: center;
      color: #9ca3af;
      font-size: 0.85rem;
    }

    /* Empty State */
    .empty-program .empty-state {
      text-align: center;
      padding: 32px;
    }

    .empty-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 12px;
    }

    .empty-text {
      font-size: 1.1rem;
      color: #6b7280;
      margin-bottom: 4px;
    }

    .empty-subtext {
      font-size: 0.9rem;
      color: #9ca3af;
    }

    /* Stats Section */
    .stats-section {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 16px;
    }

    .stat-item {
      text-align: center;
      padding: 12px;
      background: #f9fafb;
      border-radius: 10px;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: #1e3a5f;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #6b7280;
      text-transform: uppercase;
    }

    /* External Link */
    .external-link {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: #f9fafb;
      color: #4b5563;
      text-decoration: none;
      border-radius: 10px;
      font-size: 0.9rem;
      transition: all 0.2s;
      margin-top: 16px;
    }

    .external-link:hover {
      background: #f3f4f6;
      color: #1e3a5f;
    }

    /* Footer */
    .footer {
      text-align: center;
      color: rgba(255,255,255,0.6);
      padding: 30px 0;
      font-size: 0.85rem;
    }

    .footer a {
      color: rgba(255,255,255,0.8);
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    /* Responsive */
    @media (max-width: 640px) {
      .rider-header {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }

      .rider-name {
        font-size: 1.5rem;
      }

      .rider-meta {
        justify-content: center;
      }

      .specialties {
        justify-content: center;
      }

      .race-item {
        flex-wrap: wrap;
      }

      .race-badge {
        margin-left: auto;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="../riders.html" class="back-button">← Back to Riders</a>

    <div class="rider-header">
      <img src="${photoSrc}" alt="${rider.name}" class="rider-photo" onerror="this.style.display='none'">
      <div class="rider-info">
        ${rider.ranking ? `<div class="rider-rank">#${rider.ranking}</div>` : ''}
        <h1 class="rider-name">${rider.name}</h1>
        <p class="rider-team">${rider.team}</p>
        <div class="rider-meta">
          <span class="rider-meta-item">
            <span class="rider-flag">${flag}</span>
            ${rider.nationality}
          </span>
          ${age ? `<span class="rider-meta-item">🎂 ${age} years</span>` : ''}
          ${rider.points ? `<span class="rider-meta-item">📊 ${rider.points.toLocaleString()} pts</span>` : ''}
        </div>
        <div class="specialties">
          ${generateSpecialtiesHTML()}
        </div>
      </div>
    </div>

    ${generateProgramHTML()}

    ${(rider.weight || rider.height) ? `
    <div class="stats-section">
      <h2 class="section-title">📊 Physical Stats</h2>
      <div class="stats-grid">
        ${rider.weight ? `
          <div class="stat-item">
            <div class="stat-value">${rider.weight}</div>
            <div class="stat-label">kg</div>
          </div>
        ` : ''}
        ${rider.height ? `
          <div class="stat-item">
            <div class="stat-value">${rider.height}</div>
            <div class="stat-label">m</div>
          </div>
        ` : ''}
        ${rider.weight && rider.height ? `
          <div class="stat-item">
            <div class="stat-value">${(rider.weight / (rider.height * rider.height)).toFixed(1)}</div>
            <div class="stat-label">BMI</div>
          </div>
        ` : ''}
      </div>
      ${rider.pcsUrl ? `
        <a href="${rider.pcsUrl}" target="_blank" rel="noopener" class="external-link">
          View full profile on ProCyclingStats →
        </a>
      ` : ''}
    </div>
    ` : ''}

    <footer class="footer">
      <p>No Spoiler Cycling | Rider profiles are spoiler-safe</p>
      ${rider.raceProgram?.lastFetched ? `<p>Program last updated: ${new Date(rider.raceProgram.lastFetched).toLocaleDateString()}</p>` : ''}
      <p><a href="../index.html">Calendar</a> · <a href="../riders.html">Riders</a> · <a href="../about.html">About</a></p>
    </footer>
  </div>
</body>
</html>`;
}

// ============================================
// FILE GENERATION
// ============================================

function generateRiderDetailsPage(rider, raceData, outputDir = './riders') {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `${rider.slug}.html`;
  const filepath = path.join(outputDir, filename);

  const html = generateRiderDetailsHTML(rider, raceData);
  fs.writeFileSync(filepath, html);

  console.log(`✅ Generated: ${filepath}`);
  return filepath;
}

function generateAllRiderDetailsPages(
  ridersDataPath = './data/riders.json',
  raceDataPath = './data/race-data.json',
  outputDir = './riders'
) {
  const ridersData = JSON.parse(fs.readFileSync(ridersDataPath, 'utf8'));

  let raceData = null;
  try {
    raceData = JSON.parse(fs.readFileSync(raceDataPath, 'utf8'));
  } catch {
    console.warn('⚠️ Could not load race-data.json, race links will be disabled');
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let generated = 0;

  for (const rider of ridersData.riders) {
    generateRiderDetailsPage(rider, raceData, outputDir);
    generated++;
  }

  console.log(`\n📊 Generated ${generated} rider detail pages`);
  return generated;
}

// ============================================
// CLI INTERFACE
// ============================================

const args = process.argv.slice(2);

if (args.includes('--all')) {
  generateAllRiderDetailsPages();
} else if (args.includes('--rider') && args.length >= 2) {
  const riderSlug = args[args.indexOf('--rider') + 1];
  const ridersData = JSON.parse(fs.readFileSync('./data/riders.json', 'utf8'));
  const rider = ridersData.riders.find(r => r.slug === riderSlug);

  if (rider) {
    let raceData = null;
    try {
      raceData = JSON.parse(fs.readFileSync('./data/race-data.json', 'utf8'));
    } catch {}
    generateRiderDetailsPage(rider, raceData);
  } else {
    console.error(`❌ Rider not found: ${riderSlug}`);
    process.exit(1);
  }
} else if (args.includes('--help')) {
  console.log(`
Rider Details Page Generator

Usage:
  node generate-rider-details.js --all              Generate pages for all riders
  node generate-rider-details.js --rider <slug>     Generate page for specific rider
  node generate-rider-details.js --help             Show this help

Output: ./riders/<rider-slug>.html
`);
} else {
  console.log('No arguments provided. Use --help for usage information.');
}

export {
  generateRiderDetailsHTML,
  generateRiderDetailsPage,
  generateAllRiderDetailsPages
};
