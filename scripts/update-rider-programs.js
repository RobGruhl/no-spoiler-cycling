import { scrapeRiderProgram, loadRiders, saveRiders, populateRaceRiders, loadRaceData, saveRaceData } from '../lib/rider-utils.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function updateAllPrograms() {
  const ridersData = loadRiders();
  const changes = [];
  
  console.log('🔄 Updating race programs for', ridersData.riders.length, 'riders...\n');
  
  for (let i = 0; i < ridersData.riders.length; i++) {
    const rider = ridersData.riders[i];
    const oldRaces = rider.raceProgram?.races || [];
    const oldRaceSet = new Set(oldRaces.map(r => r.raceSlug + '-' + r.raceDate));
    
    process.stdout.write(`[${i+1}/50] ${rider.name}... `);
    
    try {
      const newProgram = await scrapeRiderProgram(rider.slug);
      const newRaces = newProgram.races || [];
      
      // Find new races
      const addedRaces = newRaces.filter(r => !oldRaceSet.has(r.raceSlug + '-' + r.raceDate));
      
      if (addedRaces.length > 0) {
        changes.push({
          rider: rider.name,
          ranking: rider.ranking,
          added: addedRaces.map(r => r.raceName)
        });
        console.log(`+${addedRaces.length} new races`);
      } else if (newRaces.length !== oldRaces.length) {
        console.log(`${oldRaces.length} → ${newRaces.length} races`);
      } else {
        console.log('no changes');
      }
      
      // Update the rider's program
      rider.raceProgram = newProgram;
      
    } catch (err) {
      console.log('ERROR:', err.message);
    }
    
    // Rate limiting - 1.5 seconds between requests
    if (i < ridersData.riders.length - 1) {
      await delay(1500);
    }
  }
  
  // Save updated riders
  saveRiders(ridersData);
  
  // Summary
  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY: Program Changes\n');
  
  if (changes.length === 0) {
    console.log('No new races announced since last check.');
  } else {
    changes.forEach(c => {
      console.log(`${c.ranking}. ${c.rider}:`);
      c.added.forEach(race => console.log(`   + ${race}`));
    });
  }
  
  // Update race attendance
  console.log('\n🚴 Updating race attendance...');
  const raceData = loadRaceData();
  const updatedRaceData = populateRaceRiders(ridersData, raceData);
  saveRaceData(updatedRaceData);
  
  return changes;
}

updateAllPrograms();
