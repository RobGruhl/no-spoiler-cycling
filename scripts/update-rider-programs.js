import { scrapeRiderProgram, loadRiders, saveRiders, loadOutsiders, saveOutsiders, populateRaceRiders, loadRaceData, saveRaceData } from '../lib/rider-utils.js';

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function refreshGroup(group, label) {
  const changes = [];
  for (let i = 0; i < group.length; i++) {
    const rider = group[i];
    const oldRaces = rider.raceProgram?.races || [];
    const oldRaceSet = new Set(oldRaces.map(r => r.raceSlug + '-' + r.raceDate));

    process.stdout.write(`[${label} ${i+1}/${group.length}] ${rider.name}... `);

    try {
      const newProgram = await scrapeRiderProgram(rider.slug);
      const newRaces = newProgram.races || [];
      const addedRaces = newRaces.filter(r => !oldRaceSet.has(r.raceSlug + '-' + r.raceDate));

      if (addedRaces.length > 0) {
        changes.push({ rider: rider.name, ranking: rider.ranking, added: addedRaces.map(r => r.raceName) });
        console.log(`+${addedRaces.length} new races`);
      } else if (newRaces.length !== oldRaces.length) {
        console.log(`${oldRaces.length} → ${newRaces.length} races`);
      } else {
        console.log('no changes');
      }

      rider.raceProgram = newProgram;
    } catch (err) {
      console.log('ERROR:', err.message);
    }

    if (i < group.length - 1) await delay(1500);
  }
  return changes;
}

async function updateAllPrograms() {
  const ridersData = loadRiders();
  const outsidersData = loadOutsiders();

  console.log('🔄 Updating race programs for', ridersData.riders.length, 'ranked riders +', outsidersData.riders.length, 'outsiders...\n');

  const rankedChanges = await refreshGroup(ridersData.riders, 'R');
  saveRiders(ridersData);

  if (outsidersData.riders.length > 0) {
    console.log('');
    await delay(1500);
    const outsiderChanges = await refreshGroup(outsidersData.riders, 'O');
    saveOutsiders(outsidersData);
    rankedChanges.push(...outsiderChanges);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('📊 SUMMARY: Program Changes\n');

  if (rankedChanges.length === 0) {
    console.log('No new races announced since last check.');
  } else {
    rankedChanges.forEach(c => {
      console.log(`${c.ranking ?? '✦'}. ${c.rider}:`);
      c.added.forEach(race => console.log(`   + ${race}`));
    });
  }

  console.log('\n🚴 Updating race attendance...');
  const raceData = loadRaceData();
  const updatedRaceData = populateRaceRiders(ridersData, raceData, outsidersData);
  saveRaceData(updatedRaceData);

  return rankedChanges;
}

updateAllPrograms();
