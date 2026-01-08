#!/usr/bin/env node

/**
 * Generate Riders Index Page
 *
 * Creates riders.html showing a grid of top ranked riders with:
 * - Rider cards with photos, names, teams
 * - Ranking badges
 * - Specialty tags
 * - Program status indicators
 * - Links to individual rider pages
 */

import fs from 'fs';

// ============================================
// ICON MAPPINGS
// ============================================

const specialtyConfig = {
  'climber': { icon: '⛰️', label: 'Climber', color: '#dc2626' },
  'sprinter': { icon: '⚡', label: 'Sprinter', color: '#16a34a' },
  'puncheur': { icon: '💪', label: 'Puncheur', color: '#ea580c' },
  'gc-contender': { icon: '🎯', label: 'GC', color: '#7c3aed' },
  'time-trialist': { icon: '⏱️', label: 'TT', color: '#0891b2' },
  'one-day': { icon: '🏆', label: 'Classics', color: '#ca8a04' },
  'rouleur': { icon: '🚴', label: 'Rouleur', color: '#64748b' }
};

const nationalityFlags = {
  'SL': '🇸🇮', 'SI': '🇸🇮',
  'DE': '🇩🇪',
  'DK': '🇩🇰',
  'BE': '🇧🇪',
  'NL': '🇳🇱', 'NE': '🇳🇱',
  'FR': '🇫🇷',
  'IT': '🇮🇹',
  'ES': '🇪🇸',
  'GB': '🇬🇧', 'UK': '🇬🇧',
  'US': '🇺🇸',
  'AU': '🇦🇺',
  'CO': '🇨🇴',
  'PO': '🇵🇹', 'PT': '🇵🇹',
  'ME': '🇲🇽', 'MX': '🇲🇽',
  'AT': '🇦🇹',
  'NO': '🇳🇴',
  'PL': '🇵🇱',
  'CH': '🇨🇭', 'SW': '🇨🇭',
  'IE': '🇮🇪',
  'CA': '🇨🇦',
  'NZ': '🇳🇿',
  'CZ': '🇨🇿',
  'XX': '🏳️'
};

// ============================================
// HTML GENERATION
// ============================================

function generateRidersIndexHTML(riders, options = {}) {
  const {
    lastUpdated = null,
    pageTitle = 'Top Riders 2026',
    pageSubtitle = 'UCI ranking leaders and their announced race programs',
    riderPagesDir = 'riders',
    gender = 'men'
  } = options;

  const lastUpdatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  const generateRiderCard = (rider) => {
    const flag = nationalityFlags[rider.nationalityCode] || nationalityFlags['XX'];
    const hasProgram = rider.raceProgram?.status === 'announced' && rider.raceProgram?.races?.length > 0;
    const raceCount = rider.raceProgram?.races?.length || 0;
    const photoSrc = rider.photoUrl?.startsWith('riders/')
      ? rider.photoUrl
      : 'riders/photos/placeholder.jpg';

    // Top 2 specialties
    const topSpecialties = (rider.specialties || []).slice(0, 2).map(spec => {
      const config = specialtyConfig[spec] || { icon: '🚴', label: spec };
      return `<span class="specialty-tag">${config.icon}</span>`;
    }).join('');

    return `
      <a href="${riderPagesDir}/${rider.slug}.html" class="rider-card">
        <div class="rider-rank">#${rider.ranking}</div>
        <img src="${photoSrc}" alt="${rider.name}" class="rider-photo" loading="lazy" onerror="this.style.display='none'">
        <div class="rider-content">
          <div class="rider-flag">${flag}</div>
          <h3 class="rider-name">${rider.name}</h3>
          <p class="rider-team">${rider.team}</p>
          <div class="rider-footer">
            <div class="specialties">${topSpecialties}</div>
            <div class="program-status ${hasProgram ? 'has-program' : ''}">
              ${hasProgram ? `📅 ${raceCount}` : '—'}
            </div>
          </div>
        </div>
      </a>
    `;
  };

  const ridersHTML = riders.map(generateRiderCard).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${gender === 'women' ? 'Top 50 women cyclists' : 'Top 50 ranked professional cyclists'} - 2026 race programs and profiles">
  <title>${gender === 'women' ? 'Top Women Riders' : 'Top Riders'} | No Spoiler Cycling</title>
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
    }

    .container {
      max-width: 1200px;
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
      margin-bottom: 24px;
      transition: background 0.2s;
    }

    .back-button:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    /* Rider Nav */
    .rider-nav {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 24px;
    }

    .rider-nav-link {
      padding: 10px 24px;
      background: rgba(255, 255, 255, 0.1);
      color: rgba(255, 255, 255, 0.8);
      text-decoration: none;
      border-radius: 10px;
      font-weight: 600;
      transition: all 0.2s;
    }

    .rider-nav-link:hover {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .rider-nav-link.active {
      background: #3b82f6;
      color: white;
    }

    /* Last Updated */
    .last-updated {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.85rem;
      margin-top: 8px;
    }

    /* Header */
    .page-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .page-title {
      font-size: 2.5rem;
      font-weight: 800;
      color: white;
      margin-bottom: 8px;
    }

    .page-subtitle {
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.1rem;
    }

    /* Riders Grid */
    .riders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }

    .rider-card {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 16px;
      overflow: hidden;
      text-decoration: none;
      color: inherit;
      transition: all 0.3s ease;
      position: relative;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .rider-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.2);
    }

    .rider-rank {
      position: absolute;
      top: 12px;
      left: 12px;
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: white;
      font-weight: 700;
      font-size: 0.9rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }

    .rider-card:nth-child(1) .rider-rank {
      background: linear-gradient(135deg, #ffd700, #ffb800);
    }

    .rider-card:nth-child(2) .rider-rank {
      background: linear-gradient(135deg, #c0c0c0, #a8a8a8);
    }

    .rider-card:nth-child(3) .rider-rank {
      background: linear-gradient(135deg, #cd7f32, #b8722d);
    }

    .rider-photo {
      width: 100%;
      height: 180px;
      object-fit: cover;
      object-position: top;
      background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
    }

    .rider-content {
      padding: 16px;
      position: relative;
    }

    .rider-flag {
      position: absolute;
      top: -24px;
      right: 16px;
      font-size: 2rem;
      background: white;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .rider-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: #1e3a5f;
      margin-bottom: 4px;
      line-height: 1.3;
    }

    .rider-team {
      font-size: 0.85rem;
      color: #6b7280;
      margin-bottom: 12px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rider-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #f3f4f6;
    }

    .specialties {
      display: flex;
      gap: 4px;
    }

    .specialty-tag {
      font-size: 1.1rem;
    }

    .program-status {
      font-size: 0.8rem;
      color: #9ca3af;
      font-weight: 500;
    }

    .program-status.has-program {
      color: #10b981;
    }

    /* Stats Bar */
    .stats-bar {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px 24px;
      margin-bottom: 24px;
      display: flex;
      justify-content: center;
      gap: 32px;
      flex-wrap: wrap;
    }

    .stat {
      text-align: center;
    }

    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
    }

    .stat-label {
      font-size: 0.8rem;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
    }

    /* Footer */
    .footer {
      text-align: center;
      color: rgba(255,255,255,0.6);
      padding: 40px 0;
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
      .page-title {
        font-size: 1.75rem;
      }

      .riders-grid {
        grid-template-columns: 1fr;
      }

      .stats-bar {
        gap: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <a href="index.html" class="back-button">← Back to Calendar</a>

    <nav class="rider-nav">
      <a href="riders.html" class="rider-nav-link ${gender === 'men' ? 'active' : ''}">Men's Riders</a>
      <a href="riders-women.html" class="rider-nav-link ${gender === 'women' ? 'active' : ''}">Women's Riders</a>
    </nav>

    <div class="page-header">
      <h1 class="page-title">${gender === 'women' ? '🚴‍♀️' : '🚴'} ${pageTitle}</h1>
      <p class="page-subtitle">${pageSubtitle}</p>
      ${lastUpdatedStr ? `<p class="last-updated">Updated: ${lastUpdatedStr}</p>` : ''}
    </div>

    <div class="stats-bar">
      <div class="stat">
        <div class="stat-value">${riders.length}</div>
        <div class="stat-label">Riders</div>
      </div>
      <div class="stat">
        <div class="stat-value">${riders.filter(r => r.raceProgram?.status === 'announced').length}</div>
        <div class="stat-label">Programs Announced</div>
      </div>
      <div class="stat">
        <div class="stat-value">${new Set(riders.map(r => r.team)).size}</div>
        <div class="stat-label">Teams</div>
      </div>
      <div class="stat">
        <div class="stat-value">${new Set(riders.map(r => r.nationality)).size}</div>
        <div class="stat-label">Nationalities</div>
      </div>
    </div>

    <div class="riders-grid">
      ${ridersHTML}
    </div>

    <footer class="footer">
      <p>No Spoiler Cycling | Data from ProCyclingStats</p>
      <p><a href="index.html">Calendar</a> · <a href="about.html">About</a></p>
    </footer>
  </div>
</body>
</html>`;
}

// ============================================
// FILE GENERATION
// ============================================

function generateRidersIndexPage(ridersDataPath = './data/riders.json', outputPath = './riders.html', options = {}) {
  const ridersData = JSON.parse(fs.readFileSync(ridersDataPath, 'utf8'));

  const mergedOptions = {
    lastUpdated: ridersData.lastUpdated,
    ...options
  };

  const html = generateRidersIndexHTML(ridersData.riders, mergedOptions);
  fs.writeFileSync(outputPath, html);

  console.log(`✅ Generated: ${outputPath}`);
  console.log(`   ${ridersData.riders.length} riders`);
  if (ridersData.lastUpdated) {
    console.log(`   Last updated: ${new Date(ridersData.lastUpdated).toLocaleDateString()}`);
  }
  return outputPath;
}

// ============================================
// CLI
// ============================================

const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
Riders Index Page Generator

Usage:
  node generate-riders-index.js            Generate riders.html
  node generate-riders-index.js --help     Show this help

Output: ./riders.html
`);
} else {
  generateRidersIndexPage();
}

export { generateRidersIndexHTML, generateRidersIndexPage };
