#!/usr/bin/env node

// Generate modern, clean HTML page from race data with star filtering
import fs from 'fs';
import { getInitials } from './lib/display-utils.js';

// ============================================
// ICON MAPPINGS
// ============================================

const formatIcons = {
  'one-day': '🏁',
  'stage-race': '📅',
  'itt': '⏱️',
  'ttt': '👥'
};

const terrainIcons = {
  'flat': '➡️',
  'hilly': '〰️',
  'mountain': '⛰️',
  'cobbles': '🪨',
  'gravel': '🟤',
  'summit-finish': '🔝',
  'crosswind-risk': '💨',
  'circuit': '🔄',
  'itt': '⏱️',
  'cyclocross': '🔄'
};

const disciplineIcons = {
  'road': '🚴',
  'cyclocross': '🌀'
};

const prestigeIcons = {
  'grand-tour': '🏆',
  'monument': '🗿',
  'world-championship': '🌍'
};

const genderIcons = {
  'men': '♂',
  'women': '♀',
  'mixed': '⚥'
};

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
    // Not TBD if we have broadcast info (even without direct video link)
    const hasBroadcast = race.broadcast && race.broadcast.geos && Object.keys(race.broadcast.geos).length > 0;
    const isTBD = !hasBroadcast && (race.url === 'TBD' || race.platform === 'TBD');

    // Generate icons
    const formatIcon = formatIcons[race.raceFormat] || '🏁';
    const terrainIconList = (race.terrain || []).map(t => terrainIcons[t] || '').filter(Boolean);
    const prestigeIconList = (race.prestige || []).map(p => prestigeIcons[p] || '').filter(Boolean);
    const allIcons = [...prestigeIconList, ...terrainIconList].join('');

    // Data attributes for filtering
    const hasStages = race.stages && race.stages.length > 0;
    const hasDetails = race.raceDetails && Object.keys(race.raceDetails).length > 0 && !hasStages;
    const stageCount = hasStages ? race.stages.filter(s => s.stageNumber > 0).length : 0;
    const topRiderCount = race.topRiders?.length || 0;
    const dataAttrs = [
      `data-rating="${rating}"`,
      `data-format="${race.raceFormat || 'one-day'}"`,
      `data-terrain="${(race.terrain || []).join(',')}"`,
      `data-prestige="${(race.prestige || []).join(',')}"`,
      `data-gender="${race.gender || 'men'}"`,
      `data-discipline="${race.discipline || 'road'}"`,
      `data-race-id="${race.id}"`,
      `data-top-riders="${topRiderCount}"`
    ].join(' ');

    // Stage badge for races with stage data
    const stageBadge = hasStages
      ? `<span class="stage-badge" title="Click to view stages">${stageCount} stages →</span>`
      : '';

    // Generate top riders section
    const generateRidersSection = (topRiders) => {
      if (!topRiders || topRiders.length === 0) return '';

      // Show up to 5 riders with photos/initials
      const displayRiders = topRiders.slice(0, 5);
      const moreCount = topRiders.length - 5;

      const riderAvatars = displayRiders.map(rider => {
        const initials = getInitials(rider.name);
        const rankBadge = rider.ranking <= 20 ? `<span class="rank-badge rank-${rider.ranking}">${rider.ranking}</span>` : '';
        return `<div class="rider-avatar" title="${rider.name} (#${rider.ranking}) - ${rider.team}">
          ${rankBadge}
          <span class="rider-initials">${initials}</span>
        </div>`;
      }).join('');

      const moreIndicator = moreCount > 0
        ? `<div class="rider-avatar more-riders">+${moreCount}</div>`
        : '';

      return `
      <div class="race-riders">
        <span class="riders-label">Top Riders:</span>
        <div class="rider-avatars">
          ${riderAvatars}
          ${moreIndicator}
        </div>
      </div>`;
    };

    const ridersSection = generateRidersSection(race.topRiders);

    return `
    <div class="race-card ${isTBD ? 'tbd' : ''} ${hasStages ? 'has-stages' : ''} ${hasDetails ? 'has-details' : ''}" ${dataAttrs}>
      <div class="race-header">
        <div class="rating-stars" title="${rating} star${rating !== 1 ? 's' : ''}">${generateStars(rating)}</div>
        <span class="race-icons" title="${race.raceFormat}${race.terrain ? ', ' + race.terrain.join(', ') : ''}">${formatIcon}${allIcons}</span>
        <span class="category-badge" style="background-color: ${categoryColor}">${race.category}</span>
      </div>
      <h3 class="race-title">${race.name}</h3>
      <div class="race-meta">
        <span class="race-date">📅 ${raceDateDisplay}</span>
        <span class="race-location">📍 ${race.location}</span>
      </div>
      ${ridersSection}
      <div class="race-footer">
        <span class="platform-badge" style="background-color: ${platformColor}">
          ${race.platform}
        </span>
        ${stageBadge}
        ${isTBD && !hasStages ? '<span class="status-tbd">Awaiting Coverage</span>' : ''}
        ${!isTBD && !hasStages && hasDetails ? '<span class="status-details">View Details →</span>' : ''}
        ${!isTBD && !hasStages && !hasDetails ? '<span class="status-ready">Watch Now →</span>' : ''}
      </div>
    </div>`;
  };

  // Generate stage card for stage detail view
  const generateStageCard = (stage, maxDistance, raceId, raceBroadcast) => {
    const stageTypeIcons = {
      'flat': '➡️',
      'hilly': '〰️',
      'mountain': '⛰️',
      'itt': '⏱️',
      'ttt': '👥',
      'rest-day': '😴',
      'prologue': '⏱️'
    };

    const stageTypeColors = {
      'flat': '#3b82f6',
      'hilly': '#f59e0b',
      'mountain': '#ef4444',
      'itt': '#8b5cf6',
      'ttt': '#8b5cf6',
      'rest-day': '#6b7280',
      'prologue': '#8b5cf6'
    };

    const icon = stageTypeIcons[stage.stageType] || '🚴';
    const color = stageTypeColors[stage.stageType] || '#6b7280';
    const isRestDay = stage.stageType === 'rest-day';
    // Not TBD if parent race has broadcast info
    const hasBroadcast = raceBroadcast && raceBroadcast.geos && Object.keys(raceBroadcast.geos).length > 0;
    const isTBD = !hasBroadcast && (stage.url === 'TBD' || stage.platform === 'TBD');
    const hasDetails = stage.stageDetails && Object.keys(stage.stageDetails).length > 0;
    const detailsUrl = hasDetails ? `race-details/${raceId}-stage-${stage.stageNumber}.html` : null;

    // Distance bar (normalized to max distance)
    const distancePercent = maxDistance > 0 ? (stage.distance / maxDistance) * 100 : 0;

    // Format date
    const stageDate = new Date(stage.date);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dateStr = `${dayNames[stageDate.getDay()]}, ${monthNames[stageDate.getMonth()]} ${stageDate.getDate()}`;

    // Terrain icons for stage
    const terrainIcons = (stage.terrain || []).map(t => {
      const icons = { 'summit-finish': '🔝', 'cobbles': '🪨', 'gravel': '🟤', 'circuit': '🔄' };
      return icons[t] || '';
    }).filter(Boolean).join('');

    const cardContent = `
      <div class="stage-header">
        <span class="stage-icon">${icon}</span>
        <span class="stage-type" style="color: ${color}">${stage.stageType.toUpperCase()}${terrainIcons ? ' ' + terrainIcons : ''}</span>
        <span class="stage-date">${dateStr}</span>
      </div>
      <h3 class="stage-title">${stage.name}</h3>
      ${!isRestDay ? `
      <div class="stage-distance">
        <div class="distance-bar-container">
          <div class="distance-bar" style="width: ${distancePercent}%; background-color: ${color}"></div>
        </div>
        <span class="distance-value">${stage.distance} km</span>
      </div>
      ` : ''}
      <p class="stage-description">${stage.description}</p>
      ${!isRestDay ? `
      <div class="stage-footer">
        <span class="platform-badge" style="background-color: ${stage.platform === 'TBD' ? '#6b7280' : '#FF0000'}">
          ${stage.platform || 'TBD'}
        </span>
        ${hasDetails ? '<span class="status-details">View Details →</span>' :
          (isTBD ? '<span class="status-tbd">Awaiting Coverage</span>' : '<span class="status-ready">Watch Now →</span>')}
      </div>
      ` : ''}`;

    // Wrap in link if details page exists OR if video URL available
    if (hasDetails && !isRestDay) {
      // Link to stage details page
      return `
    <a href="${detailsUrl}" class="stage-card-link">
      <div class="stage-card has-details ${isTBD ? 'tbd' : ''}" style="border-left-color: ${color}">
        ${cardContent}
      </div>
    </a>`;
    }

    if (!isRestDay && !isTBD && stage.url && stage.url !== 'TBD') {
      // Link directly to video URL (opens in new tab)
      return `
    <a href="${stage.url}" class="stage-card-link" target="_blank" rel="noopener">
      <div class="stage-card has-video" style="border-left-color: ${color}">
        ${cardContent}
      </div>
    </a>`;
    }

    return `
    <div class="stage-card ${isRestDay ? 'rest-day' : ''} ${isTBD && !isRestDay ? 'tbd' : ''}" style="border-left-color: ${color}">
      ${cardContent}
    </div>`;
  };

  // Generate stage detail view for a race
  const generateStageDetailView = (race) => {
    if (!race.stages || race.stages.length === 0) return '';

    const maxDistance = Math.max(...race.stages.map(s => s.distance || 0));
    const stageCount = race.stages.filter(s => s.stageNumber > 0).length;
    const restDays = race.stages.filter(s => s.stageType === 'rest-day').length;

    // Count stage types
    const typeCounts = {};
    race.stages.forEach(s => {
      if (s.stageType !== 'rest-day') {
        typeCounts[s.stageType] = (typeCounts[s.stageType] || 0) + 1;
      }
    });

    const typeStats = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type}`)
      .join(' • ');

    const hasRaceDetails = race.raceDetails && Object.keys(race.raceDetails).length > 0;
    const raceDetailsLink = hasRaceDetails
      ? `<a href="race-details/${race.id}.html" class="race-details-link">View Race Details →</a>`
      : '';

    return `
    <section class="stage-detail-view" id="stage-view-${race.id}" style="display: none;">
      <div class="stage-view-header">
        <div class="stage-view-nav">
          <button class="back-button" onclick="hideStageView()">← Back to Calendar</button>
          ${raceDetailsLink}
        </div>
        <div class="stage-view-info">
          <h1 class="stage-view-title">${race.name}</h1>
          <div class="stage-view-meta">
            ${stageCount} stages • ${restDays} rest days • ${race.distance} km total
          </div>
          <div class="stage-view-types">
            ${typeStats}
          </div>
        </div>
      </div>
      <div class="stage-grid">
        ${race.stages.map(stage => generateStageCard(stage, maxDistance, race.id, race.broadcast)).join('')}
      </div>
    </section>`;
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

  // Get all races with stages for stage detail views
  const racesWithStages = races.filter(r => r.stages && r.stages.length > 0);

  // Rating distribution for stats
  const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  races.forEach(r => ratingCounts[r.rating || 1]++);

  // Count races by format, terrain, prestige, gender, and discipline for filter chips
  const formatCounts = {};
  const terrainCounts = {};
  const prestigeCounts = {};
  const genderCounts = {};
  const disciplineCounts = {};

  races.forEach(r => {
    // Format counts
    const format = r.raceFormat || 'one-day';
    formatCounts[format] = (formatCounts[format] || 0) + 1;

    // Terrain counts
    (r.terrain || []).forEach(t => {
      terrainCounts[t] = (terrainCounts[t] || 0) + 1;
    });

    // Prestige counts
    (r.prestige || []).forEach(p => {
      prestigeCounts[p] = (prestigeCounts[p] || 0) + 1;
    });

    // Gender counts
    const gender = r.gender || 'men';
    genderCounts[gender] = (genderCounts[gender] || 0) + 1;

    // Discipline counts
    const discipline = r.discipline || 'road';
    disciplineCounts[discipline] = (disciplineCounts[discipline] || 0) + 1;
  });

  // Generate filter chips HTML
  const generateFormatChips = () => {
    const formats = [
      { key: 'one-day', label: 'One-Day' },
      { key: 'stage-race', label: 'Stage Race' },
      { key: 'itt', label: 'ITT' },
      { key: 'ttt', label: 'TTT' }
    ];
    return formats
      .filter(f => formatCounts[f.key])
      .map(f => `<button class="icon-filter-chip" data-filter-type="format" data-filter-value="${f.key}">
        <span class="chip-icon">${formatIcons[f.key]}</span>
        <span>${f.label}</span>
        <span class="chip-count">${formatCounts[f.key]}</span>
      </button>`).join('');
  };

  const generateTerrainChips = () => {
    const terrains = [
      { key: 'mountain', label: 'Mountain' },
      { key: 'hilly', label: 'Hilly' },
      { key: 'flat', label: 'Flat' },
      { key: 'cobbles', label: 'Cobbles' },
      { key: 'gravel', label: 'Gravel' },
      { key: 'itt', label: 'Time Trial' },
      { key: 'circuit', label: 'Circuit' }
    ];
    return terrains
      .filter(t => terrainCounts[t.key])
      .map(t => `<button class="icon-filter-chip" data-filter-type="terrain" data-filter-value="${t.key}">
        <span class="chip-icon">${terrainIcons[t.key]}</span>
        <span>${t.label}</span>
        <span class="chip-count">${terrainCounts[t.key]}</span>
      </button>`).join('');
  };

  const generatePrestigeChips = () => {
    const prestiges = [
      { key: 'grand-tour', label: 'Grand Tours' },
      { key: 'monument', label: 'Monuments' },
      { key: 'world-championship', label: 'Worlds' }
    ];
    return prestiges
      .filter(p => prestigeCounts[p.key])
      .map(p => `<button class="icon-filter-chip" data-filter-type="prestige" data-filter-value="${p.key}">
        <span class="chip-icon">${prestigeIcons[p.key]}</span>
        <span>${p.label}</span>
        <span class="chip-count">${prestigeCounts[p.key]}</span>
      </button>`).join('');
  };

  const generateGenderChips = () => {
    const genders = [
      { key: 'men', label: "Men's" },
      { key: 'women', label: "Women's" },
      { key: 'mixed', label: 'Mixed' }
    ];
    return genders
      .filter(g => genderCounts[g.key])
      .map(g => `<button class="icon-filter-chip" data-filter-type="gender" data-filter-value="${g.key}">
        <span class="chip-icon">${genderIcons[g.key]}</span>
        <span>${g.label}</span>
        <span class="chip-count">${genderCounts[g.key]}</span>
      </button>`).join('');
  };

  const generateDisciplineChips = () => {
    const disciplines = [
      { key: 'road', label: 'Road' },
      { key: 'cyclocross', label: 'Cyclocross' }
    ];
    return disciplines
      .filter(d => disciplineCounts[d.key])
      .map(d => `<button class="icon-filter-chip" data-filter-type="discipline" data-filter-value="${d.key}">
        <span class="chip-icon">${disciplineIcons[d.key]}</span>
        <span>${d.label}</span>
        <span class="chip-count">${disciplineCounts[d.key]}</span>
      </button>`).join('');
  };

  const generateTopRidersChip = () => {
    // Count races with 3+ top riders
    const count = races.filter(r => (r.topRiders?.length || 0) >= 3).length;
    if (count === 0) return '';

    return `<button class="icon-filter-chip top-riders-chip" data-filter-type="top-riders" data-filter-value="3">
      <span class="chip-icon">🌟</span>
      <span>3+ Top 50</span>
      <span class="chip-count">${count}</span>
    </button>`;
  };

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

    /* Header Navigation */
    .header-nav {
      display: flex;
      gap: 12px;
      margin-top: 16px;
    }

    .nav-link {
      padding: 10px 20px;
      background: #f3f4f6;
      border-radius: 10px;
      text-decoration: none;
      color: #4b5563;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .nav-link:hover {
      background: #e5e7eb;
      color: #111827;
    }

    .nav-link.active {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
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

    .filter-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      flex-wrap: wrap;
      gap: 12px;
    }

    .visible-count {
      font-size: 0.9rem;
      color: #6b7280;
    }

    .clear-filters-btn {
      padding: 8px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: white;
      color: #64748b;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      transition: all 0.2s;
    }

    .clear-filters-btn:hover {
      border-color: #ef4444;
      color: #ef4444;
      background: #fef2f2;
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

    .race-icons {
      font-size: 0.9rem;
      letter-spacing: 1px;
    }

    /* Icon Filters */
    .icon-filter-section {
      margin-bottom: 16px;
    }

    .icon-filter-group {
      margin-bottom: 12px;
    }

    .icon-filter-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 6px;
      display: block;
    }

    .icon-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .icon-filter-chip {
      padding: 6px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      background: white;
      cursor: pointer;
      font-size: 0.85rem;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .icon-filter-chip:hover {
      border-color: #3b82f6;
      background: #eff6ff;
    }

    .icon-filter-chip.active {
      border-color: #3b82f6;
      background: #dbeafe;
    }

    .icon-filter-chip.top-riders-chip.active {
      border-color: #f59e0b;
      background: #fef3c7;
    }

    .icon-filter-chip .chip-icon {
      font-size: 1rem;
    }

    .icon-filter-chip .chip-count {
      font-size: 0.7rem;
      color: #94a3b8;
      margin-left: 2px;
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

    /* Top Riders Section */
    .race-riders {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      padding: 8px 0;
    }

    .riders-label {
      font-size: 0.75rem;
      color: #6b7280;
      font-weight: 500;
    }

    .rider-avatars {
      display: flex;
      gap: 4px;
    }

    .rider-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: help;
      transition: transform 0.2s;
    }

    .rider-avatar:hover {
      transform: scale(1.1);
      z-index: 10;
    }

    .rider-initials {
      color: white;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .rider-avatar.more-riders {
      background: #e5e7eb;
      color: #6b7280;
      font-size: 0.65rem;
      font-weight: 600;
    }

    .rank-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      font-size: 0.55rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid white;
    }

    .rank-badge.rank-1 {
      background: linear-gradient(135deg, #fbbf24, #f59e0b);
      color: white;
    }

    .rank-badge.rank-2 {
      background: linear-gradient(135deg, #9ca3af, #6b7280);
      color: white;
    }

    .rank-badge.rank-3 {
      background: linear-gradient(135deg, #d97706, #b45309);
      color: white;
    }

    /* Ranks 4-10: Blue "elite" tier */
    .rank-badge.rank-4, .rank-badge.rank-5, .rank-badge.rank-6,
    .rank-badge.rank-7, .rank-badge.rank-8, .rank-badge.rank-9,
    .rank-badge.rank-10 {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
    }

    /* Ranks 11-20: Gray tier */
    .rank-badge.rank-11, .rank-badge.rank-12, .rank-badge.rank-13,
    .rank-badge.rank-14, .rank-badge.rank-15, .rank-badge.rank-16,
    .rank-badge.rank-17, .rank-badge.rank-18, .rank-badge.rank-19,
    .rank-badge.rank-20 {
      background: #6b7280;
      color: white;
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

    .status-details {
      color: #3b82f6;
      font-weight: 600;
      font-size: 0.8rem;
    }

    .stage-card-link {
      text-decoration: none;
      color: inherit;
      display: block;
    }

    .stage-card.has-details {
      cursor: pointer;
      border-left-width: 4px;
    }

    .stage-card.has-details:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(59, 130, 246, 0.2);
      border-left-color: #3b82f6 !important;
    }

    .stage-card.has-details:hover .status-details {
      text-decoration: underline;
    }

    .stage-card.has-video {
      cursor: pointer;
      border-left-width: 4px;
    }

    .stage-card.has-video:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(0, 165, 81, 0.2);
      border-left-color: #00A651 !important;
    }

    .stage-card.has-video:hover .status-ready {
      text-decoration: underline;
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

    .footer a {
      color: rgba(255,255,255,0.9);
      text-decoration: none;
    }

    .footer a:hover {
      text-decoration: underline;
    }

    /* Stage Badge */
    .stage-badge {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 12px;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .stage-badge:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4);
    }

    .race-card.has-stages {
      cursor: pointer;
    }

    .race-card.has-stages:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(0,0,0,0.2);
    }

    .race-card.has-details {
      cursor: pointer;
    }

    .race-card.has-details:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 30px rgba(0,0,0,0.2);
    }

    /* Stage Detail View */
    .stage-detail-view {
      margin-bottom: 40px;
    }

    .stage-view-header {
      background: rgba(255, 255, 255, 0.98);
      border-radius: 20px;
      padding: 24px 30px;
      margin-bottom: 30px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }

    .back-button {
      background: #f3f4f6;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      transition: all 0.2s;
    }

    .back-button:hover {
      background: #e5e7eb;
      color: #111827;
    }

    .stage-view-nav {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .race-details-link {
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: white;
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s;
    }

    .race-details-link:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
    }

    .stage-view-title {
      font-size: 2rem;
      font-weight: 800;
      background: linear-gradient(135deg, #1e3a5f, #3b82f6);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 8px;
    }

    .stage-view-meta {
      color: #6b7280;
      font-size: 1rem;
      margin-bottom: 4px;
    }

    .stage-view-types {
      color: #9ca3af;
      font-size: 0.875rem;
    }

    /* Stage Grid */
    .stage-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    /* Stage Cards */
    .stage-card {
      background: white;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      border-left: 4px solid #3b82f6;
      transition: all 0.3s ease;
    }

    .stage-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }

    .stage-card.rest-day {
      background: #f9fafb;
      opacity: 0.8;
    }

    .stage-card.tbd {
      opacity: 0.7;
    }

    .stage-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .stage-icon {
      font-size: 1.25rem;
    }

    .stage-type {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stage-date {
      margin-left: auto;
      font-size: 0.75rem;
      color: #6b7280;
    }

    .stage-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #111827;
      margin-bottom: 10px;
      line-height: 1.3;
    }

    .stage-description {
      font-size: 0.8rem;
      color: #6b7280;
      line-height: 1.4;
      margin-bottom: 12px;
    }

    /* Distance Bar */
    .stage-distance {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }

    .distance-bar-container {
      flex: 1;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
    }

    .distance-bar {
      height: 100%;
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .distance-value {
      font-size: 0.75rem;
      font-weight: 600;
      color: #374151;
      min-width: 55px;
      text-align: right;
    }

    .stage-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
    }

    /* Calendar View (shown/hidden) */
    .calendar-view.hidden {
      display: none;
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
      <nav class="header-nav">
        <a href="index.html" class="nav-link active">Calendar</a>
        <a href="riders.html" class="nav-link">Men's Riders</a>
        <a href="riders-women.html" class="nav-link">Women's Riders</a>
      </nav>

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
        <!-- Icon Filters -->
        <div class="icon-filter-section">
          <div class="icon-filter-group">
            <span class="icon-filter-label">Discipline</span>
            <div class="icon-filters">
              ${generateDisciplineChips()}
            </div>
          </div>
          <div class="icon-filter-group">
            <span class="icon-filter-label">Gender</span>
            <div class="icon-filters">
              ${generateGenderChips()}
            </div>
          </div>
          <div class="icon-filter-group">
            <span class="icon-filter-label">Format</span>
            <div class="icon-filters">
              ${generateFormatChips()}
            </div>
          </div>
          <div class="icon-filter-group">
            <span class="icon-filter-label">Terrain</span>
            <div class="icon-filters">
              ${generateTerrainChips()}
            </div>
          </div>
          <div class="icon-filter-group">
            <span class="icon-filter-label">Prestige</span>
            <div class="icon-filters">
              ${generatePrestigeChips()}
            </div>
          </div>
          <div class="icon-filter-group">
            <span class="icon-filter-label">Top Riders</span>
            <div class="icon-filters">
              ${generateTopRidersChip()}
            </div>
          </div>
        </div>

        <label class="filter-label">Filter by Interest Rating:</label>
        <div class="star-filters">
          <button class="star-filter-btn" data-min="1" onclick="filterByStars(1)">
            <span>All Races</span>
            <span class="filter-count">(${races.length})</span>
          </button>
          <button class="star-filter-btn" data-min="2" onclick="filterByStars(2)">
            <span class="stars">★★</span><span>+</span>
            <span class="filter-count">(${ratingCounts[2] + ratingCounts[3] + ratingCounts[4] + ratingCounts[5]})</span>
          </button>
          <button class="star-filter-btn active" data-min="3" onclick="filterByStars(3)">
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
        <div class="filter-footer">
          <div class="visible-count">Showing <span id="visible-count">${races.length}</span> of ${races.length} races</div>
          <button class="clear-filters-btn" onclick="clearAllFilters()">Clear Filters</button>
        </div>
      </div>
    </header>

    <!-- Calendar View (main view) -->
    <div class="calendar-view" id="calendar-view">
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
    </div>

    <!-- Stage Detail Views -->
    ${racesWithStages.map(race => generateStageDetailView(race)).join('')}

    <!-- Footer -->
    <footer class="footer">
      <p>2026 Pro Cycling Calendar • Built with <a href="https://claude.ai/download" target="_blank" rel="noopener">Claude Code</a></p>
      <p><a href="about.html">About This Project</a></p>
    </footer>
  </div>

  <script>
    // Active filters state
    const activeFilters = {
      minRating: 3,
      discipline: new Set(),
      format: new Set(),
      terrain: new Set(),
      prestige: new Set(),
      gender: new Set(),
      topRiders: false
    };

    // localStorage persistence
    function saveFiltersToStorage() {
      const filtersToSave = {
        minRating: activeFilters.minRating,
        discipline: Array.from(activeFilters.discipline),
        format: Array.from(activeFilters.format),
        terrain: Array.from(activeFilters.terrain),
        prestige: Array.from(activeFilters.prestige),
        gender: Array.from(activeFilters.gender),
        topRiders: activeFilters.topRiders
      };
      localStorage.setItem('cyclingCalendarFilters', JSON.stringify(filtersToSave));
    }

    function loadFiltersFromStorage() {
      const stored = localStorage.getItem('cyclingCalendarFilters');
      if (!stored) return false;

      try {
        const filters = JSON.parse(stored);
        activeFilters.minRating = filters.minRating || 3;
        activeFilters.discipline = new Set(filters.discipline || []);
        activeFilters.format = new Set(filters.format || []);
        activeFilters.terrain = new Set(filters.terrain || []);
        activeFilters.prestige = new Set(filters.prestige || []);
        activeFilters.gender = new Set(filters.gender || []);
        activeFilters.topRiders = filters.topRiders || false;
        return true;
      } catch (e) {
        return false;
      }
    }

    function updateFilterUIFromState() {
      // Update star filter buttons
      document.querySelectorAll('.star-filter-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.min) === activeFilters.minRating);
      });

      // Update icon filter chips
      document.querySelectorAll('.icon-filter-chip').forEach(chip => {
        const type = chip.dataset.filterType;
        const value = chip.dataset.filterValue;
        if (type === 'top-riders') {
          chip.classList.toggle('active', activeFilters.topRiders);
        } else {
          chip.classList.toggle('active', activeFilters[type].has(value));
        }
      });
    }

    function clearAllFilters() {
      activeFilters.minRating = 1;
      activeFilters.discipline.clear();
      activeFilters.format.clear();
      activeFilters.terrain.clear();
      activeFilters.prestige.clear();
      activeFilters.gender.clear();
      activeFilters.topRiders = false;

      // Update UI
      document.querySelectorAll('.star-filter-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.min) === 1);
      });
      document.querySelectorAll('.icon-filter-chip').forEach(chip => {
        chip.classList.remove('active');
      });

      applyFilters();
      localStorage.removeItem('cyclingCalendarFilters');
    }

    // Toggle chip filter
    function toggleChipFilter(chip) {
      const type = chip.dataset.filterType;
      const value = chip.dataset.filterValue;

      if (type === 'top-riders') {
        // Toggle boolean
        activeFilters.topRiders = !activeFilters.topRiders;
        chip.classList.toggle('active', activeFilters.topRiders);
      } else {
        if (activeFilters[type].has(value)) {
          activeFilters[type].delete(value);
          chip.classList.remove('active');
        } else {
          activeFilters[type].add(value);
          chip.classList.add('active');
        }
      }

      applyFilters();
      saveFiltersToStorage();
    }

    // Set star filter
    function filterByStars(minRating) {
      activeFilters.minRating = minRating;

      // Update button states
      document.querySelectorAll('.star-filter-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.min) === minRating);
      });

      applyFilters();
      saveFiltersToStorage();
    }

    // Check if a card matches a specific filter configuration
    function cardMatchesFilterConfig(card, config) {
      const rating = parseInt(card.dataset.rating);
      const discipline = card.dataset.discipline || 'road';
      const format = card.dataset.format;
      const terrain = card.dataset.terrain.split(',').filter(Boolean);
      const prestige = card.dataset.prestige.split(',').filter(Boolean);
      const gender = card.dataset.gender || 'men';
      const topRiderCount = parseInt(card.dataset.topRiders) || 0;

      // Check star rating
      if (rating < config.minRating) return false;

      // Check discipline filter (must match one of selected disciplines)
      if (config.discipline.size > 0 && !config.discipline.has(discipline)) {
        return false;
      }

      // Check format filter (must match one of selected formats)
      if (config.format.size > 0 && !config.format.has(format)) {
        return false;
      }

      // Check terrain filter (OR logic - must have at least one selected terrain)
      if (config.terrain.size > 0) {
        if (!terrain.some(t => config.terrain.has(t))) return false;
      }

      // Check prestige filter (OR logic - must have at least one selected prestige)
      if (config.prestige.size > 0) {
        if (!prestige.some(p => config.prestige.has(p))) return false;
      }

      // Check gender filter (mixed events show when men OR women is selected)
      if (config.gender.size > 0) {
        if (gender === 'mixed') {
          // Mixed events show when men, women, or mixed is explicitly selected
          if (!config.gender.has('mixed') && !config.gender.has('men') && !config.gender.has('women')) {
            return false;
          }
        } else if (!config.gender.has(gender)) {
          return false;
        }
      }

      // Check top riders filter: Must have 3+ if filter is active
      if (config.topRiders) {
        if (topRiderCount < 3) return false;
      }

      return true;
    }

    // Simple check against current active filters
    function cardMatchesFilters(card) {
      return cardMatchesFilterConfig(card, activeFilters);
    }

    // Update chip counts based on current filters
    // Shows: "Of currently visible races, how many have this attribute?"
    function updateChipCounts() {
      // Get currently visible races
      const visibleCards = Array.from(document.querySelectorAll('.race-card:not(.hidden)'));

      // Update icon filter chips
      document.querySelectorAll('.icon-filter-chip').forEach(chip => {
        const type = chip.dataset.filterType;
        const value = chip.dataset.filterValue;
        const isActive = chip.classList.contains('active');

        // Count visible cards that have this attribute
        const count = visibleCards.filter(card => {
          if (type === 'discipline') {
            return (card.dataset.discipline || 'road') === value;
          } else if (type === 'format') {
            return card.dataset.format === value;
          } else if (type === 'terrain') {
            return card.dataset.terrain.split(',').includes(value);
          } else if (type === 'prestige') {
            return card.dataset.prestige.split(',').includes(value);
          } else if (type === 'gender') {
            const cardGender = card.dataset.gender || 'men';
            // For mixed, count it for men and women as well
            if (value === 'mixed') {
              return cardGender === 'mixed';
            }
            return cardGender === value || cardGender === 'mixed';
          } else if (type === 'top-riders') {
            const topRiderCount = parseInt(card.dataset.topRiders) || 0;
            return topRiderCount >= 3;
          }
          return false;
        }).length;

        // Update the count display
        const countEl = chip.querySelector('.chip-count');
        if (countEl) countEl.textContent = count;

        // Dim chips with 0 matches (only if not active)
        chip.style.opacity = (!isActive && count === 0) ? '0.4' : '1';
      });

      // Update star filter counts
      document.querySelectorAll('.star-filter-btn').forEach(btn => {
        const minRating = parseInt(btn.dataset.min);

        // Count visible cards at or above this rating
        const count = visibleCards.filter(card =>
          parseInt(card.dataset.rating) >= minRating
        ).length;

        // Update the count display
        const countEl = btn.querySelector('.filter-count');
        if (countEl) countEl.textContent = '(' + count + ')';
      });
    }

    // Apply all filters
    function applyFilters() {
      let visibleCount = 0;

      document.querySelectorAll('.race-card').forEach(card => {
        if (cardMatchesFilters(card)) {
          card.classList.remove('hidden');
          visibleCount++;
        } else {
          card.classList.add('hidden');
        }
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

      // Update chip counts dynamically
      updateChipCounts();
    }

    // Initialize chip click handlers
    document.querySelectorAll('.icon-filter-chip').forEach(chip => {
      chip.addEventListener('click', () => toggleChipFilter(chip));
    });

    // ========================================
    // STAGE VIEW NAVIGATION
    // ========================================

    // Show stage detail view for a race
    function showStageView(raceId) {
      // Hide calendar view and header filters
      document.getElementById('calendar-view').classList.add('hidden');
      document.querySelector('.header').style.display = 'none';

      // Show the stage view
      const stageView = document.getElementById('stage-view-' + raceId);
      if (stageView) {
        stageView.style.display = 'block';
      }

      // Update URL hash
      history.pushState({ raceId }, '', '#' + raceId);

      // Scroll to top
      window.scrollTo(0, 0);
    }

    // Hide stage view and return to calendar
    function hideStageView() {
      // Hide all stage views
      document.querySelectorAll('.stage-detail-view').forEach(view => {
        view.style.display = 'none';
      });

      // Show calendar view and header
      document.getElementById('calendar-view').classList.remove('hidden');
      document.querySelector('.header').style.display = 'block';

      // Update URL
      history.pushState({}, '', window.location.pathname);

      // Scroll to top
      window.scrollTo(0, 0);
    }

    // Handle clicks on race cards with stages
    document.querySelectorAll('.race-card.has-stages').forEach(card => {
      card.addEventListener('click', () => {
        const raceId = card.dataset.raceId;
        showStageView(raceId);
      });
    });

    // Handle clicks on one-day race cards with details
    document.querySelectorAll('.race-card.has-details').forEach(card => {
      card.addEventListener('click', () => {
        const raceId = card.dataset.raceId;
        window.location.href = 'race-details/' + raceId + '.html';
      });
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.raceId) {
        showStageView(event.state.raceId);
      } else {
        hideStageView();
      }
    });

    // Check URL hash on page load
    if (window.location.hash) {
      const raceId = window.location.hash.slice(1);
      const stageView = document.getElementById('stage-view-' + raceId);
      if (stageView) {
        showStageView(raceId);
      }
    }

    // Load filters from localStorage or use defaults
    const hasStoredFilters = loadFiltersFromStorage();
    if (hasStoredFilters) {
      updateFilterUIFromState();
    }
    applyFilters();
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
