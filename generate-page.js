#!/usr/bin/env node

// Generate modern, clean HTML page from race data with star filtering
import fs from 'fs';

function loadRaceData() {
  const data = fs.readFileSync('./data/race-data.json', 'utf8');
  return JSON.parse(data);
}

function generateStars(rating) {
  const filled = '★'.repeat(rating);
  const empty = '☆'.repeat(5 - rating);
  return `<span class="stars">${filled}${empty}</span>`;
}

function generateHTML(raceData) {
  const { event, races, lastUpdated } = raceData;
  const updateDate = new Date(lastUpdated).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  // Sort races by date
  const sortedRaces = [...races].sort((a, b) => a.raceDate.localeCompare(b.raceDate));

  // Group races by month
  const racesByMonth = {};
  sortedRaces.forEach(race => {
    const [year, month] = race.raceDate.split('-');
    const monthKey = `${year}-${month}`;
    if (!racesByMonth[monthKey]) {
      racesByMonth[monthKey] = [];
    }
    racesByMonth[monthKey].push(race);
  });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];

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
    const rating = race.rating || 1;

    // Format race date for display
    const formatRaceDate = (raceDate, raceDay, endDate) => {
      if (!raceDate) return '';
      const [year, month, day] = raceDate.split('-').map(Number);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      if (endDate && endDate !== raceDate) {
        const [, endMonth, endDay] = endDate.split('-').map(Number);
        if (month === endMonth) {
          return `${months[month - 1]} ${day}-${endDay}`;
        }
        return `${months[month - 1]} ${day} - ${months[endMonth - 1]} ${endDay}`;
      }
      return `${raceDay}, ${months[month - 1]} ${day}`;
    };

    const raceDateDisplay = formatRaceDate(race.raceDate, race.raceDay, race.endDate);
    const description = race.description || `${race.category} cycling race`;

    // Category badge color
    const categoryColors = {
      '2.UWT': '#6366f1',
      '1.UWT': '#8b5cf6',
      '2.Pro': '#3b82f6',
      '1.Pro': '#0ea5e9',
      '2.1': '#14b8a6',
      '1.1': '#6b7280',
      'WC': '#f59e0b'
    };
    const categoryColor = categoryColors[race.category] || '#6b7280';

    // Determine if this is a TBD/future event
    const isTBD = race.url === 'TBD' || race.platform === 'TBD';

    return `
    <div class="race-card ${isTBD ? 'tbd' : ''}" data-rating="${rating}">
      <div class="race-header">
        <div class="rating-stars" title="${rating} star${rating !== 1 ? 's' : ''}">${generateStars(rating)}</div>
        <span class="category-badge" style="background-color: ${categoryColor}">${race.category}</span>
      </div>
      <h3 class="race-title">${race.name}</h3>
      <div class="race-meta">
        <span class="race-date">📅 ${raceDateDisplay}</span>
        <span class="race-location">📍 ${race.location}</span>
      </div>
      <div class="race-footer">
        <span class="platform-badge" style="background-color: ${platformColor}">
          ${race.platform}
        </span>
        ${isTBD ? '<span class="status-tbd">Awaiting Coverage</span>' : '<span class="status-ready">Watch Now →</span>'}
      </div>
    </div>`;
  };

  // Generate month sections
  const generateMonthSection = (monthKey, races) => {
    const [year, month] = monthKey.split('-');
    const monthName = monthNames[parseInt(month) - 1];

    return `
    <section class="month-section" data-month="${monthKey}">
      <h2 class="month-title">${monthName} ${year} <span class="month-count">${races.length}</span></h2>
      <div class="race-grid">
        ${races.map(race => generateRaceCard(race)).join('')}
      </div>
    </section>`;
  };

  // Rating distribution for stats
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  races.forEach(r => ratingCounts[r.rating || 1]++);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="2026 UCI Pro Cycling Calendar - ${races.length} races with interest ratings">
  <title>🚴 2026 Pro Cycling Calendar</title>
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
      max-width: 1400px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 20px;
      padding: 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 20px;
    }

    .site-title {
      font-size: 2.5rem;
      font-weight: 800;
      background: linear-gradient(135deg, #1e3a5f, #3b82f6);
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
      border-left: 4px solid #3b82f6;
      margin-bottom: 20px;
    }

    .event-name {
      font-size: 1.25rem;
      font-weight: 700;
      color: #111827;
    }

    .event-stats {
      color: #6b7280;
      font-size: 0.9rem;
      margin-top: 8px;
    }

    /* Star Filter */
    .filter-section {
      background: #f0f9ff;
      padding: 20px;
      border-radius: 12px;
      border: 1px solid #bae6fd;
    }

    .filter-label {
      font-weight: 600;
      color: #0369a1;
      margin-bottom: 12px;
      display: block;
    }

    .star-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .star-filter-btn {
      padding: 10px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      background: white;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .star-filter-btn:hover {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    .star-filter-btn.active {
      border-color: #3b82f6;
      background: #3b82f6;
      color: white;
    }

    .star-filter-btn .stars {
      color: #fbbf24;
    }

    .star-filter-btn.active .stars {
      color: #fef3c7;
    }

    .filter-count {
      font-size: 0.75rem;
      opacity: 0.7;
    }

    .visible-count {
      margin-top: 12px;
      font-size: 0.9rem;
      color: #6b7280;
    }

    /* Month Sections */
    .month-section {
      margin-bottom: 40px;
    }

    .month-section.hidden {
      display: none;
    }

    .month-title {
      color: white;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .month-count {
      background: rgba(255,255,255,0.2);
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    /* Race Grid */
    .race-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    /* Race Cards */
    .race-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      display: flex;
      flex-direction: column;
      border-left: 4px solid #3b82f6;
    }

    .race-card.hidden {
      display: none;
    }

    .race-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }

    .race-card.tbd {
      opacity: 0.7;
      border-left-color: #9ca3af;
    }

    .race-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .rating-stars {
      font-size: 1rem;
    }

    .stars {
      color: #fbbf24;
      letter-spacing: 1px;
    }

    .category-badge {
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 4px 8px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .race-title {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 8px;
      line-height: 1.3;
    }

    .race-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 0.8rem;
      color: #6b7280;
    }

    .race-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid #e5e7eb;
      margin-top: auto;
    }

    .platform-badge {
      color: white;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
    }

    .status-tbd {
      color: #9ca3af;
      font-size: 0.8rem;
      font-style: italic;
    }

    .status-ready {
      color: #10b981;
      font-weight: 600;
      font-size: 0.8rem;
    }

    /* Legend */
    .legend {
      background: rgba(255,255,255,0.98);
      border-radius: 16px;
      padding: 24px;
      margin-top: 40px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .legend-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #111827;
      margin-bottom: 16px;
    }

    .legend-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .legend-stars {
      font-size: 0.9rem;
    }

    .legend-text {
      font-size: 0.85rem;
      color: #374151;
    }

    /* Footer */
    .footer {
      text-align: center;
      color: rgba(255,255,255,0.8);
      padding: 40px 0 20px;
      font-size: 0.875rem;
    }

    /* Mobile */
    @media (max-width: 768px) {
      .site-title {
        font-size: 1.75rem;
      }

      .race-grid {
        grid-template-columns: 1fr;
      }

      .star-filters {
        justify-content: center;
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
        <h1 class="site-title">🚴 2026 Pro Cycling Calendar</h1>
        <div class="last-updated">Updated: ${updateDate}</div>
      </div>

      <div class="event-info">
        <div class="event-name">${event.name}</div>
        <div class="event-stats">
          ${races.length} races •
          ⭐⭐⭐⭐⭐ ${ratingCounts[5]} •
          ⭐⭐⭐⭐ ${ratingCounts[4]} •
          ⭐⭐⭐ ${ratingCounts[3]} •
          ⭐⭐ ${ratingCounts[2]} •
          ⭐ ${ratingCounts[1]}
        </div>
      </div>

      <div class="filter-section">
        <label class="filter-label">Filter by Interest Rating:</label>
        <div class="star-filters">
          <button class="star-filter-btn active" data-min="1" onclick="filterByStars(1)">
            <span>All Races</span>
            <span class="filter-count">(${races.length})</span>
          </button>
          <button class="star-filter-btn" data-min="2" onclick="filterByStars(2)">
            <span class="stars">★★</span><span>+</span>
            <span class="filter-count">(${ratingCounts[2] + ratingCounts[3] + ratingCounts[4] + ratingCounts[5]})</span>
          </button>
          <button class="star-filter-btn" data-min="3" onclick="filterByStars(3)">
            <span class="stars">★★★</span><span>+</span>
            <span class="filter-count">(${ratingCounts[3] + ratingCounts[4] + ratingCounts[5]})</span>
          </button>
          <button class="star-filter-btn" data-min="4" onclick="filterByStars(4)">
            <span class="stars">★★★★</span><span>+</span>
            <span class="filter-count">(${ratingCounts[4] + ratingCounts[5]})</span>
          </button>
          <button class="star-filter-btn" data-min="5" onclick="filterByStars(5)">
            <span class="stars">★★★★★</span>
            <span class="filter-count">(${ratingCounts[5]})</span>
          </button>
        </div>
        <div class="visible-count">Showing <span id="visible-count">${races.length}</span> of ${races.length} races</div>
      </div>
    </header>

    <!-- Main Content -->
    <main>
      ${Object.entries(racesByMonth).map(([monthKey, monthRaces]) =>
        generateMonthSection(monthKey, monthRaces)
      ).join('')}
    </main>

    <!-- Legend -->
    <div class="legend">
      <h2 class="legend-title">⭐ Rating Guide</h2>
      <div class="legend-grid">
        <div class="legend-item">
          <span class="legend-stars stars">★★★★★</span>
          <span class="legend-text">Can't miss - Grand Tours, Monuments, WC Road</span>
        </div>
        <div class="legend-item">
          <span class="legend-stars stars">★★★★☆</span>
          <span class="legend-text">Major events - World Tour races</span>
        </div>
        <div class="legend-item">
          <span class="legend-stars stars">★★★☆☆</span>
          <span class="legend-text">Good racing - Pro Series</span>
        </div>
        <div class="legend-item">
          <span class="legend-stars stars">★★☆☆☆</span>
          <span class="legend-text">Nice to catch - Continental stage</span>
        </div>
        <div class="legend-item">
          <span class="legend-stars stars">★☆☆☆☆</span>
          <span class="legend-text">Completionist - Minor one-days</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <p>2026 Pro Cycling Calendar • Powered by Claude Code</p>
    </footer>
  </div>

  <script>
    function filterByStars(minRating) {
      let visibleCount = 0;

      // Update button states
      document.querySelectorAll('.star-filter-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.min) === minRating);
      });

      // Filter cards
      document.querySelectorAll('.race-card').forEach(card => {
        const rating = parseInt(card.dataset.rating);
        const visible = rating >= minRating;
        card.classList.toggle('hidden', !visible);
        if (visible) visibleCount++;
      });

      // Update month sections (hide if no visible cards)
      document.querySelectorAll('.month-section').forEach(section => {
        const visibleCards = section.querySelectorAll('.race-card:not(.hidden)').length;
        section.classList.toggle('hidden', visibleCards === 0);

        // Update month count
        const countEl = section.querySelector('.month-count');
        if (countEl) countEl.textContent = visibleCards;
      });

      // Update total count
      document.getElementById('visible-count').textContent = visibleCount;
    }
  </script>
</body>
</html>`;
}

// Generate the page
const raceData = loadRaceData();
const html = generateHTML(raceData);
fs.writeFileSync('index.html', html);

console.log(`✅ Generated calendar page with ${raceData.races.length} races`);
console.log(`📍 Event: ${raceData.event.name}`);

// Show rating breakdown
const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
raceData.races.forEach(race => {
  ratingCounts[race.rating || 1]++;
});

console.log(`\n📊 Rating breakdown:`);
console.log(`   ⭐⭐⭐⭐⭐ (5): ${ratingCounts[5]} races`);
console.log(`   ⭐⭐⭐⭐ (4): ${ratingCounts[4]} races`);
console.log(`   ⭐⭐⭐ (3): ${ratingCounts[3]} races`);
console.log(`   ⭐⭐ (2): ${ratingCounts[2]} races`);
console.log(`   ⭐ (1): ${ratingCounts[1]} races`);
