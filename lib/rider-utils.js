#!/usr/bin/env node

/**
 * Rider Utilities Library
 * Scraping functions for ProCyclingStats rider data
 */

import 'dotenv/config';
import { scrapeContent } from './firecrawl-utils.js';
import { readFileSync, writeFileSync, mkdirSync, existsSync, createWriteStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PCS_BASE_URL = 'https://www.procyclingstats.com';

/**
 * Load riders data from file
 */
export function loadRiders() {
  const ridersPath = join(__dirname, '..', 'data', 'riders.json');
  if (!existsSync(ridersPath)) {
    return { lastUpdated: null, riders: [] };
  }
  return JSON.parse(readFileSync(ridersPath, 'utf-8'));
}

/**
 * Save riders data to file
 */
export function saveRiders(ridersData) {
  const ridersPath = join(__dirname, '..', 'data', 'riders.json');
  ridersData.lastUpdated = new Date().toISOString();
  writeFileSync(ridersPath, JSON.stringify(ridersData, null, 2));
  console.log(`✅ Saved ${ridersData.riders.length} riders to riders.json`);
}

/**
 * Scrape top N riders from PCS rankings
 * Returns array of basic rider info (name, slug, team, rank, points)
 */
export async function scrapeRankings(limit = 20) {
  console.log(`\n🏆 Scraping top ${limit} riders from PCS rankings...`);

  const result = await scrapeContent(`${PCS_BASE_URL}/rankings.php`);
  if (!result || !result.markdown) {
    console.error('❌ Failed to scrape rankings');
    return [];
  }

  const riders = [];
  const lines = result.markdown.split('\n');

  // Parse table rows - format: | rank | prev | change | links | [NAME](url) | [Team](url) | points |
  for (const line of lines) {
    if (!line.includes('/rider/')) continue;

    // Extract rider link: [NAME](https://www.procyclingstats.com/rider/slug)
    const riderMatch = line.match(/\[([^\]]+)\]\(https:\/\/www\.procyclingstats\.com\/rider\/([^)]+)\)/);
    if (!riderMatch) continue;

    const name = riderMatch[1];
    const slug = riderMatch[2];

    // Extract team: [Team Name](https://www.procyclingstats.com/team/...)
    const teamMatch = line.match(/\[([^\]]+)\]\(https:\/\/www\.procyclingstats\.com\/team\/[^)]+\)/);
    const team = teamMatch ? teamMatch[1] : 'Unknown';

    // Extract rank from start of line (first number in the table row)
    const rankMatch = line.match(/^\|\s*(\d+)\s*\|/);
    const rank = rankMatch ? parseInt(rankMatch[1]) : riders.length + 1;

    // Extract points (last number before closing |)
    const pointsMatch = line.match(/\|\s*\[?(\d+)\]?[^\|]*\|?\s*$/);
    const points = pointsMatch ? parseInt(pointsMatch[1]) : 0;

    riders.push({
      rank,
      name,
      slug,
      team,
      points,
      pcsUrl: `${PCS_BASE_URL}/rider/${slug}`
    });

    if (riders.length >= limit) break;
  }

  console.log(`   ✅ Found ${riders.length} riders`);
  return riders;
}

/**
 * Scrape rider profile info (nationality, photo, specialties)
 */
export async function scrapeRiderProfile(slug) {
  console.log(`\n👤 Scraping profile for ${slug}...`);

  const result = await scrapeContent(`${PCS_BASE_URL}/rider/${slug}`);
  if (!result || !result.markdown) {
    console.error(`❌ Failed to scrape profile for ${slug}`);
    return null;
  }

  const md = result.markdown;

  // Extract nationality from [Country](url) pattern near "Nationality:"
  let nationality = 'Unknown';
  let nationalityCode = 'XX';
  const natMatch = md.match(/Nationality:[\s\S]*?\[([^\]]+)\]\(https:\/\/www\.procyclingstats\.com\/nation\/([^)]+)\)/);
  if (natMatch) {
    nationality = natMatch[1];
    nationalityCode = natMatch[2].toUpperCase().slice(0, 2);
  }

  // Extract photo URL
  let photoUrl = null;
  const photoMatch = md.match(/!\[\]\((https:\/\/www\.procyclingstats\.com\/images\/riders\/[^)]+)\)/);
  if (photoMatch) {
    photoUrl = photoMatch[1];
  }

  // Extract weight and height
  let weight = null;
  let height = null;
  const weightMatch = md.match(/Weight:\s*(\d+)\s*kg/);
  if (weightMatch) weight = parseInt(weightMatch[1]);
  const heightMatch = md.match(/Height:\s*([\d.]+)\s*m/);
  if (heightMatch) height = parseFloat(heightMatch[1]);

  // Extract DOB
  let dateOfBirth = null;
  const dobMatch = md.match(/Date of birth:[\s\S]*?(\d{1,2})[a-z]*\s*(\w+)\s*(\d{4})/);
  if (dobMatch) {
    const months = { 'January': '01', 'February': '02', 'March': '03', 'April': '04',
                     'May': '05', 'June': '06', 'July': '07', 'August': '08',
                     'September': '09', 'October': '10', 'November': '11', 'December': '12' };
    const day = dobMatch[1].padStart(2, '0');
    const month = months[dobMatch[2]] || '01';
    const year = dobMatch[3];
    dateOfBirth = `${year}-${month}-${day}`;
  }

  // Extract specialties with points
  const specialties = [];
  const specialtyPatterns = [
    { pattern: /(\d+)\s*\[Onedayraces\]/, type: 'one-day' },
    { pattern: /(\d+)\s*\[GC\]/, type: 'gc-contender' },
    { pattern: /(\d+)\s*\[TT\]/, type: 'time-trialist' },
    { pattern: /(\d+)\s*\[Sprint\]/, type: 'sprinter' },
    { pattern: /(\d+)\s*\[Climber\]/, type: 'climber' },
    { pattern: /(\d+)\s*\[Hills\]/, type: 'puncheur' }
  ];

  for (const { pattern, type } of specialtyPatterns) {
    const match = md.match(pattern);
    if (match && parseInt(match[1]) > 1000) {
      specialties.push({ type, points: parseInt(match[1]) });
    }
  }

  // Sort by points and take top 3
  specialties.sort((a, b) => b.points - a.points);
  const topSpecialties = specialties.slice(0, 3).map(s => s.type);

  console.log(`   ✅ ${nationality}, specialties: ${topSpecialties.join(', ')}`);

  return {
    nationality,
    nationalityCode,
    photoUrl,
    weight,
    height,
    dateOfBirth,
    specialties: topSpecialties
  };
}

/**
 * Scrape rider's race program/calendar
 */
export async function scrapeRiderProgram(slug) {
  console.log(`\n📅 Scraping program for ${slug}...`);

  const result = await scrapeContent(`${PCS_BASE_URL}/rider/${slug}/calendar`);
  if (!result || !result.markdown) {
    console.error(`❌ Failed to scrape program for ${slug}`);
    return { status: 'error', races: [] };
  }

  const md = result.markdown;
  const races = [];

  // Find the "Upcoming program" table
  // Format: | 2026-03-07 | [Race Name](url) | Class |
  const lines = md.split('\n');
  let inUpcomingTable = false;

  for (const line of lines) {
    if (line.includes('Upcoming program')) {
      inUpcomingTable = true;
      continue;
    }
    if (inUpcomingTable && line.includes('Program in the current season')) {
      break; // End of upcoming program table
    }

    if (!inUpcomingTable) continue;
    if (!line.includes('/race/')) continue;

    // Extract date
    const dateMatch = line.match(/\|\s*(2026-\d{2}-\d{2})\s*\|/);
    if (!dateMatch) continue;

    // Extract race name and URL
    const raceMatch = line.match(/\[([^\]]+)\]\(https:\/\/www\.procyclingstats\.com\/race\/([^/]+)\/\d+\)/);
    if (!raceMatch) continue;

    // Extract class (1.UWT, 2.UWT, etc.)
    const classMatch = line.match(/\|\s*([\d.]+UWT|[\d.]+Pro)\s*\|?\s*$/);

    races.push({
      raceName: raceMatch[1],
      raceSlug: raceMatch[2],
      raceDate: dateMatch[1],
      raceClass: classMatch ? classMatch[1] : null
    });
  }

  const status = races.length > 0 ? 'announced' : 'not-announced';
  console.log(`   ✅ ${races.length} races in program (${status})`);

  return {
    status,
    lastFetched: new Date().toISOString(),
    races
  };
}

/**
 * Download rider photo to local directory
 */
export async function downloadRiderPhoto(photoUrl, slug) {
  if (!photoUrl) return null;

  const photosDir = join(__dirname, '..', 'riders', 'photos');
  if (!existsSync(photosDir)) {
    mkdirSync(photosDir, { recursive: true });
  }

  const photoPath = join(photosDir, `${slug}.jpg`);

  console.log(`📷 Downloading photo for ${slug}...`);

  return new Promise((resolve, reject) => {
    const protocol = photoUrl.startsWith('https') ? https : http;
    const file = createWriteStream(photoPath);

    protocol.get(photoUrl, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirect
        protocol.get(response.headers.location, (redirectResponse) => {
          redirectResponse.pipe(file);
          file.on('finish', () => {
            file.close();
            console.log(`   ✅ Saved to ${photoPath}`);
            resolve(`riders/photos/${slug}.jpg`);
          });
        }).on('error', reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`   ✅ Saved to ${photoPath}`);
          resolve(`riders/photos/${slug}.jpg`);
        });
      }
    }).on('error', reject);
  });
}

/**
 * Scrape complete rider data (profile + program)
 */
export async function scrapeFullRider(slug, rank = null, team = null, points = null) {
  const profile = await scrapeRiderProfile(slug);
  if (!profile) return null;

  const program = await scrapeRiderProgram(slug);

  // Download photo
  let localPhotoPath = null;
  if (profile.photoUrl) {
    try {
      localPhotoPath = await downloadRiderPhoto(profile.photoUrl, slug);
    } catch (e) {
      console.error(`   ⚠️ Failed to download photo: ${e.message}`);
    }
  }

  return {
    id: slug,
    slug,
    name: formatRiderName(slug),
    team: team || 'Unknown',
    ranking: rank,
    points,
    nationality: profile.nationality,
    nationalityCode: profile.nationalityCode,
    dateOfBirth: profile.dateOfBirth,
    weight: profile.weight,
    height: profile.height,
    specialties: profile.specialties,
    photoUrl: localPhotoPath || profile.photoUrl,
    pcsUrl: `${PCS_BASE_URL}/rider/${slug}`,
    raceProgram: program
  };
}

/**
 * Format rider name from slug
 * "tadej-pogacar" -> "Tadej Pogačar" (best effort, special chars may be lost)
 */
function formatRiderName(slug) {
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Scrape and add/update a single rider in riders.json
 */
export async function updateRider(slug, rank = null, name = null, team = null, points = null) {
  console.log(`\n🔄 Updating rider: ${slug}...`);

  const ridersData = loadRiders();
  const fullRider = await scrapeFullRider(slug, rank, team, points);

  if (!fullRider) {
    console.error(`❌ Failed to scrape ${slug}`);
    return null;
  }

  // Use provided name or formatted slug
  if (name) fullRider.name = name;

  // Find existing rider index
  const existingIdx = ridersData.riders.findIndex(r => r.slug === slug);

  if (existingIdx >= 0) {
    ridersData.riders[existingIdx] = fullRider;
    console.log(`   ✅ Updated existing rider`);
  } else {
    ridersData.riders.push(fullRider);
    console.log(`   ✅ Added new rider`);
  }

  // Sort by ranking
  ridersData.riders.sort((a, b) => (a.ranking || 999) - (b.ranking || 999));

  saveRiders(ridersData);
  return fullRider;
}

/**
 * Scrape all top N riders and save to riders.json
 */
export async function scrapeAllRiders(limit = 20, delayMs = 2000) {
  console.log(`\n🚴 Starting full scrape of top ${limit} riders...`);
  console.log('─'.repeat(50));

  // Get rankings first
  const rankings = await scrapeRankings(limit);
  if (rankings.length === 0) {
    console.error('❌ No rankings data, aborting');
    return null;
  }

  const riders = [];

  for (let i = 0; i < rankings.length; i++) {
    const basic = rankings[i];
    console.log(`\n[${i + 1}/${rankings.length}] ${basic.name}`);

    const fullRider = await scrapeFullRider(basic.slug, basic.rank, basic.team, basic.points);
    if (fullRider) {
      // Use actual name from rankings instead of formatted slug
      fullRider.name = basic.name;
      riders.push(fullRider);
    }

    // Delay between requests to be nice to PCS
    if (i < rankings.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  const ridersData = {
    lastUpdated: new Date().toISOString(),
    riders
  };

  saveRiders(ridersData);

  console.log('\n' + '─'.repeat(50));
  console.log(`✅ Scrape complete: ${riders.length} riders saved`);

  return ridersData;
}

/**
 * Match rider race programs to race-data.json race IDs
 */
export function linkRidersToRaces(ridersData, raceData) {
  console.log('\n🔗 Linking riders to races...');

  // Build a map of race slugs to race IDs
  const raceMap = new Map();
  for (const race of raceData.races) {
    // Try to match by name similarity
    const simpleName = race.name.toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    raceMap.set(simpleName, race.id);

    // Also try without year
    const nameNoYear = race.name.toLowerCase()
      .replace(/\s*2026\s*/g, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    raceMap.set(nameNoYear, race.id);
  }

  let totalLinks = 0;

  for (const rider of ridersData.riders) {
    if (!rider.raceProgram || !rider.raceProgram.races) continue;

    for (const programRace of rider.raceProgram.races) {
      // Try to find matching race ID
      const raceId = raceMap.get(programRace.raceSlug);
      if (raceId) {
        programRace.raceId = raceId;
        totalLinks++;
      }
    }
  }

  console.log(`   ✅ Linked ${totalLinks} race participations`);
  return ridersData;
}

// Export default for CLI usage
export default {
  loadRiders,
  saveRiders,
  scrapeRankings,
  scrapeRiderProfile,
  scrapeRiderProgram,
  downloadRiderPhoto,
  scrapeFullRider,
  updateRider,
  scrapeAllRiders,
  linkRidersToRaces
};
