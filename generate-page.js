#!/usr/bin/env node

// Generate modern, clean HTML page from race data
import fs from 'fs';

function loadRaceData() {
  const data = fs.readFileSync('./data/race-data.json', 'utf8');
  return JSON.parse(data);
}

function generateHTML(raceData) {
  const { event, races, lastUpdated } = raceData;
  const updateDate = new Date(lastUpdated).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  // Group races by type
  const racesByType = {
    'full-race': [],
    'extended-highlights': [],
    'highlights': [],
    'live': []
  };

  races.forEach(race => {
    const type = race.type || 'highlights';
    if (racesByType[type]) {
      racesByType[type].push(race);
    } else {
      racesByType.highlights.push(race);
    }
  });

  // Generate race cards
  const generateRaceCard = (race) => {
    const platformColors = {
      'YouTube': '#FF0000',
      'FloBikes': '#00A651',
      'TBD': '#6B7280',
      'Peacock': '#000000',
      'HBO Max': '#8B5CF6',
      'UCI.org': '#0066CC',
      'GCN+': '#FF6B00'
    };

    const platformColor = platformColors[race.platform] || '#6B7280';

    // Format race date for display (avoiding timezone issues)
    const formatRaceDate = (raceDate, raceDay) => {
      if (!raceDate) return '';
      // Parse ISO date string directly to avoid timezone offset issues
      const [year, month, day] = raceDate.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${raceDay}, ${months[month - 1]} ${day}`;
    };

    const raceDateDisplay = formatRaceDate(race.raceDate, race.raceDay);
    
    const typeLabels = {
      'full-race': 'FULL RACE',
      'extended-highlights': 'EXTENDED',
      'highlights': 'HIGHLIGHTS',
      'live': 'LIVE NOW'
    };

    const typeLabel = typeLabels[race.type] || 'VIDEO';
    const typeClass = race.type === 'live' ? 'type-live' : 'type-standard';

    // Create a spoiler-free description if not provided
    const description = race.description || 
      `Watch the ${race.type === 'full-race' ? 'complete coverage' : 'race highlights'} from this exciting cycling event. Click to watch directly on ${race.platform}.`;

    // Build platform display text
    let platformDisplay = race.platform;
    if (race.platform === 'YouTube' && race.channel) {
      platformDisplay = `YouTube • ${race.channel}`;
      // Add verified checkmark for official channels
      if (race.verified) {
        platformDisplay += ' ✓';
      }
    }

    // Determine if this is a TBD/future event
    const isTBD = race.url === 'TBD' || race.platform === 'TBD';
    const cardClass = isTBD ? 'race-card tbd' : 'race-card';
    const ctaText = isTBD ? 'Coming Soon' : 'Watch Now →';

    // For TBD cards, make them non-clickable divs
    if (isTBD) {
      return `
      <div class="${cardClass}">
        <div class="race-header">
          <span class="race-type ${typeClass}">${typeLabel}</span>
          ${raceDateDisplay ? `<span class="race-date">📅 ${raceDateDisplay}</span>` : ''}
        </div>
        <h3 class="race-title">${race.name}</h3>
        <p class="race-description">${description}</p>
        <div class="race-footer">
          <span class="platform-badge" style="background-color: ${platformColor}">
            ${platformDisplay}
          </span>
          <span class="watch-cta">${ctaText}</span>
        </div>
      </div>`;
    }

    return `
    <a href="${race.url}" target="_blank" rel="noopener" class="${cardClass}">
      <div class="race-header">
        <span class="race-type ${typeClass}">${typeLabel}</span>
        <div class="race-meta">
          ${raceDateDisplay ? `<span class="race-date">📅 ${raceDateDisplay}</span>` : ''}
          ${race.duration ? `<span class="race-duration">⏱ ${race.duration}</span>` : ''}
        </div>
      </div>
      <h3 class="race-title">${race.name}</h3>
      <p class="race-description">${description}</p>
      <div class="race-footer">
        <span class="platform-badge" style="background-color: ${platformColor}">
          ${platformDisplay}
        </span>
        <span class="watch-cta">${ctaText}</span>
      </div>
    </a>`;
  };

  // Generate sections for each race type
  const generateSection = (title, races, icon) => {
    if (races.length === 0) return '';
    
    return `
    <section class="race-section">
      <h2 class="section-title">${icon} ${title} <span class="count">${races.length}</span></h2>
      <div class="race-grid">
        ${races.map(race => generateRaceCard(race)).join('')}
      </div>
    </section>`;
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Spoiler-free cycling coverage of ${event.name} - watch races without results">
  <title>🚴 Non-Spoiler Cycling | ${event.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: start;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 20px;
    }

    .site-title {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea, #764ba2);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .last-updated {
      background: #f3f4f6;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.875rem;
      color: #4b5563;
    }

    .event-info {
      background: #f9fafb;
      padding: 20px;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }

    .event-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 8px;
    }

    .event-details {
      color: #6b7280;
      font-size: 0.95rem;
    }

    .spoiler-warning {
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      margin-top: 20px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Race Sections */
    .race-section {
      margin-bottom: 40px;
    }

    .section-title {
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .count {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Race Grid */
    .race-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 20px;
    }

    /* Race Cards */
    .race-card {
      background: white;
      border-radius: 16px;
      padding: 20px;
      text-decoration: none;
      color: inherit;
      transition: all 0.3s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      display: flex;
      flex-direction: column;
      position: relative;
      overflow: hidden;
    }

    .race-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.15);
    }

    .race-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #667eea, #764ba2);
      transform: scaleX(0);
      transition: transform 0.3s ease;
    }

    .race-card:hover::before {
      transform: scaleX(1);
    }

    .race-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .race-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
    }

    .race-type {
      font-size: 0.75rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.5px;
      background: #e5e7eb;
      color: #4b5563;
    }

    .type-live {
      background: #ef4444;
      color: white;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .race-duration, .race-date {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
    }

    .race-date {
      color: #8b5cf6;
    }

    .race-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 12px;
      line-height: 1.4;
    }

    .race-description {
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.5;
      margin-bottom: 16px;
      flex-grow: 1;
    }

    .race-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
    }

    .platform-badge {
      color: white;
      font-size: 0.75rem;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .watch-cta {
      color: #667eea;
      font-weight: 600;
      font-size: 0.875rem;
    }

    /* TBD/Future Events Styling */
    .race-card.tbd {
      opacity: 0.7;
      pointer-events: none;
      cursor: default;
    }

    .race-card.tbd:hover {
      transform: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
    }

    .race-card.tbd .watch-cta {
      color: #9ca3af;
    }

    /* Info Box */
    .info-box {
      background: rgba(255,255,255,0.98);
      border-radius: 20px;
      padding: 30px;
      margin-top: 40px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .info-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 16px;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .info-item {
      padding: 16px;
      background: #f9fafb;
      border-radius: 12px;
      border: 1px solid #e5e7eb;
    }

    .info-item-title {
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
      font-size: 0.95rem;
    }

    .info-item-content {
      color: #6b7280;
      font-size: 0.875rem;
      line-height: 1.4;
    }

    /* Footer */
    .footer {
      text-align: center;
      color: rgba(255,255,255,0.9);
      padding: 40px 0 20px;
      font-size: 0.875rem;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .site-title {
        font-size: 1.75rem;
      }

      .race-grid {
        grid-template-columns: 1fr;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .header {
        padding: 20px;
      }

      body {
        padding: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header class="header">
      <div class="header-top">
        <h1 class="site-title">🚴 Non-Spoiler Cycling</h1>
        <div class="last-updated">Updated: ${updateDate}</div>
      </div>
      
      <div class="event-info">
        <div class="event-name">${event.name}</div>
        <div class="event-details">📍 ${event.location} • ${event.year}</div>
      </div>

      <div class="spoiler-warning">
        <span>✓</span>
        <span>100% Spoiler-Free: All content verified to contain only race footage - no results, no outcomes, no speculation</span>
      </div>
    </header>

    <!-- Main Content -->
    <main>
      ${generateSection('Live Events', racesByType.live, '🔴')}
      ${generateSection('Full Race Recordings', racesByType['full-race'], '🎬')}
      ${generateSection('Extended Highlights', racesByType['extended-highlights'], '📺')}
      ${generateSection('Race Highlights', racesByType.highlights, '⚡')}
    </main>

    <!-- Info Box -->
    <div class="info-box">
      <h2 class="info-title">📖 About This Page</h2>
      <div class="info-grid">
        <div class="info-item">
          <div class="info-item-title">What You'll Find</div>
          <div class="info-item-content">
            Direct links to actual race footage only. No previews, predictions, or post-race analysis. Click any card to watch immediately.
          </div>
        </div>
        <div class="info-item">
          <div class="info-item-title">Content Sources</div>
          <div class="info-item-content">
            YouTube (free highlights), FloBikes (premium full races), Peacock (NBC coverage), TBD (To Be Determined platform)
          </div>
        </div>
        <div class="info-item">
          <div class="info-item-title">How It Works</div>
          <div class="info-item-content">
            Content discovered via Claude Code sessions using the Firecrawl API. Every link manually verified to be spoiler-free race footage.
          </div>
        </div>
        <div class="info-item">
          <div class="info-item-title">Platform Access</div>
          <div class="info-item-content">
            Some platforms require subscriptions. Links open directly to video players when you're logged in to those services.
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <p>Non-Spoiler Cycling • Powered by Claude Code + Firecrawl API</p>
      <p style="margin-top: 8px; opacity: 0.8;">Watch the races. Skip the spoilers.</p>
    </footer>
  </div>
</body>
</html>`;
}

// Generate the page
const raceData = loadRaceData();
const html = generateHTML(raceData);
fs.writeFileSync('index.html', html);

console.log(`✅ Generated modern index.html with ${raceData.races.length} races`);
console.log(`📍 Event: ${raceData.event.name} in ${raceData.event.location}`);
console.log(`📊 Breakdown:`);

// Show race type breakdown
const typeCount = {};
const platformCount = {};
const channelCount = {};

raceData.races.forEach(race => {
  const type = race.type || 'unknown';
  typeCount[type] = (typeCount[type] || 0) + 1;
  
  const platform = race.platform || 'unknown';
  platformCount[platform] = (platformCount[platform] || 0) + 1;
  
  if (race.channel) {
    channelCount[race.channel] = (channelCount[race.channel] || 0) + 1;
  }
});

console.log(`\n   By Type:`);
Object.entries(typeCount).forEach(([type, count]) => {
  console.log(`   • ${type}: ${count}`);
});

console.log(`\n   By Platform:`);
Object.entries(platformCount).forEach(([platform, count]) => {
  console.log(`   • ${platform}: ${count}`);
});

if (Object.keys(channelCount).length > 0) {
  console.log(`\n   YouTube Channels:`);
  Object.entries(channelCount).forEach(([channel, count]) => {
    console.log(`   • ${channel}: ${count} videos`);
  });
}