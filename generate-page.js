#!/usr/bin/env node

// Generate steephill.tv inspired HTML page from race data
import fs from 'fs';

function loadRaceData() {
  const data = fs.readFileSync('./data/race-data.json', 'utf8');
  return JSON.parse(data);
}

function generateHTML(raceData) {
  const { event, races, lastUpdated } = raceData;
  const updateDate = new Date(lastUpdated).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const raceEntries = races.map(race => {
    const duration = race.duration ? ` <small>(${race.duration})</small>` : '';
    const platform = race.platform;

    return `<a class="video" href="${race.url}" target="_blank" rel="noopener">${race.name}</a>${duration} — <i>${platform}</i><br>`;
  }).join('\n\t\t');

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
\t<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
\t<meta name="description" content="Spoiler-free cycling coverage of the ${event.name} with curated video content and race analysis.">
\t<title>Non-Spoiler Cycling | ${event.name}</title>
\t<style>
\t\ttd.borderbot{border-bottom: #000000 1px solid}
\t\thr.style-six {
\t\t    border: 0;
\t\t    height: 0;
\t\t    border-top: 1px solid rgba(0, 0, 0, 0.1);
\t\t    border-bottom: 1px solid rgba(255, 255, 255, 0.3);
\t\t}
\t\t.update { font-weight: bold; color: #cc6600; }
\t\t.video { font-weight: bold; color: #0066cc; text-decoration: none; }
\t\t.video:hover { text-decoration: underline; }
\t\t.article { color: #0066cc; }
\t\tbody { font-family: arial, sans-serif; font-size: 14px; margin: 0; padding: 0; }
\t</style>
</head>
<body>

<table width="1125" style="border-top:0px" cellpadding="4" align="center">
<tbody>
<tr style="height:100">
\t<td width="220">
\t\t<div style="font-size: 24px; font-weight: bold; color: #333; margin-top: 20px;">
\t\t\t🚴‍♂️ Non-Spoiler<br>Cycling
\t\t</div>
\t</td>
\t<td colspan="2">
\t\t<!-- Header space -->
\t</td>
</tr>
<tr>
\t<td valign="top">
\t\t<table width="220" align="left" style="margin-top:-5px;margin-left:5px;font:14px arial;line-height:1.15em;">
\t\t<tbody>
\t\t<tr>
\t\t<td>
\t\t\t<h2 align="left" style="margin-top:0px;font-family:sans-serif;line-height:1.5em">Current Event</h2>
\t\t\t<small>
\t\t\t<b>${event.name}</b><br>
\t\t\t&nbsp;•&nbsp;${event.location} ${event.year}<br>
\t\t\t&nbsp;•&nbsp;Spoiler-free content only<br>
\t\t\t&nbsp;•&nbsp;Updated ${updateDate}
\t\t\t</small>
\t\t\t
\t\t\t<h3 style="margin-top:20px;font-family:sans-serif;">Content Types</h3>
\t\t\t<small>
\t\t\t<b>Race Previews</b><br>
\t\t\t&nbsp;•&nbsp;Expert analysis and predictions<br>
\t\t\t&nbsp;•&nbsp;Course breakdowns<br>
\t\t\t&nbsp;•&nbsp;Tactical discussions
\t\t\t<p>
\t\t\t<b>Course Information</b><br>
\t\t\t&nbsp;•&nbsp;Official race details<br>
\t\t\t&nbsp;•&nbsp;Technical specifications<br>
\t\t\t&nbsp;•&nbsp;Venue information
\t\t\t</p>
\t\t\t</small>
\t\t</td>
\t\t</tr>
\t\t</tbody>
\t\t</table>
\t</td>

\t<!-- center column-->
\t<td valign="top" width="700" style="line-height:1.25em">

\t\t<p><strong>🛡️ Spoiler-Free Guarantee:</strong> All content below is verified to contain no race results or outcomes.</p>

\t\t<span class="update">${updateDate} update:</span><br>
\t\t${raceEntries}

\t\t<hr align="left" class="style-six">

\t\t<p><strong>Race Categories:</strong></p>
\t\t<p style="background-color: #95E1D3; padding: 8px; margin: 4px 0;">
\t\t\t<strong style="color: black;">WORLD CHAMPIONSHIPS</strong><br>
\t\t\t<span style="color: black;">UCI Road World Championships • Time Trials • Road Races</span>
\t\t</p>

\t\t<p style="background-color: #FFD816; padding: 8px; margin: 4px 0;">
\t\t\t<strong style="color: black;">GRAND TOURS</strong><br>
\t\t\t<span style="color: black;">Tour de France • Giro d'Italia • Vuelta a España</span>
\t\t</p>

\t\t<p style="background-color: #FF6B35; padding: 8px; margin: 4px 0;">
\t\t\t<strong style="color: white;">CLASSICS</strong><br>
\t\t\t<span style="color: white;">Paris-Roubaix • Tour of Flanders • Milan-San Remo</span>
\t\t</p>

\t\t<p style="background-color: #4ECDC4; padding: 8px; margin: 4px 0;">
\t\t\t<strong style="color: black;">STAGE RACES</strong><br>
\t\t\t<span style="color: black;">Paris-Nice • Tour Down Under • Volta a Catalunya</span>
\t\t</p>

\t</td>

\t<!-- right column -->
\t<td valign="top" width="200">
\t\t<h3>Quick Links</h3>
\t\t<ul style="list-style: none; padding-left: 0; font-size: 12px;">
\t\t\t<li>• <a href="mailto:info@no-spoiler-cycling.com">Contact</a></li>
\t\t\t<li>• <a href="#updates">Site Updates</a></li>
\t\t\t<li>• <a href="#spoiler-policy">Spoiler Policy</a></li>
\t\t</ul>
\t\t
\t\t<h3>About</h3>
\t\t<p style="font-size: 12px; line-height: 1.3;">
\t\t\tCurated cycling content with guaranteed spoiler-free race coverage.
\t\t\tFocus on previews, analysis, and educational material.
\t\t</p>
\t</td>

</tr>
</tbody>
</table>

<hr align="left" class="style-six">

<p align="center">
\t<small>
\t© Non-Spoiler Cycling - Spoiler-free cycling content discovery<br>
\t🤖 Powered by Claude Code + Firecrawl API
\t</small>
</p>

</body>
</html>`;
}

// Generate the page
const raceData = loadRaceData();
const html = generateHTML(raceData);
fs.writeFileSync('index.html', html);

console.log(`✅ Generated steephill.tv-style index.html with ${raceData.races.length} races`);
console.log(`Event: ${raceData.event.name} in ${raceData.event.location}`);