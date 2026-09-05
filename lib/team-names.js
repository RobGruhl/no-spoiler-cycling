// Canonical team names for the 2026 season.
//
// Why: results JSON is written daily by a cloud agent from whatever spelling the
// source article used ("Lidl - Trek" / "Lidl-Trek", "Bahrain Victorious" /
// "Bahrain - Victorious", four spellings of Netcompany INEOS ...). The teams page
// grouped by a first-sponsor heuristic and rendered one team as several cards.
// This registry is the single source of truth: house spelling per team, the
// spelling variants that should be rewritten to it, and names that were
// legitimately different earlier in the season (grouped, never rewritten before
// the rename date).
//
// House spelling = the form data/riders.json and the calendar already use most.
//
// API:
//   canonicalTeam(name, { gender, date }) → { name, key, canonical, former, note }
//     name      house spelling if known, else the input unchanged
//     key       grouping key (same team → same key, whatever the spelling)
//     canonical true when the input was already the house spelling
//     former    true when the input is a pre-rename name still valid on `date`
//     note      human note for a former name ("raced as X until May 2026")
//   teamKey(name)  → grouping key only
//   TEAMS          → the registry (for listing)
//
// Print the list: node -e "import('./lib/team-names.js').then(m => m.printRegistry())"

export const TEAMS = [
  // ---- Men's WorldTeams (UCI 2026) ----
  { name: 'Alpecin-Premier Tech', aliases: ['Alpecin - Premier Tech', 'Alpecin-Deceuninck', 'Alpecin - Deceuninck'] },
  { name: 'Bahrain - Victorious', aliases: ['Bahrain Victorious', 'Team Bahrain Victorious'] },
  { name: 'Decathlon CMA CGM Team', aliases: ['Decathlon CMA CGM', 'Decathlon - CMA CGM Team', 'Decathlon AG2R La Mondiale Team', 'Decathlon AG2R La Mondiale', 'Decathlon AG2R'] },
  { name: 'EF Education - EasyPost', aliases: ['EF Education-EasyPost'] },
  { name: 'Groupama - FDJ United', aliases: ['Groupama-FDJ United', 'Groupama-FDJ'] },
  { name: 'Lidl - Trek', aliases: ['Lidl-Trek'] },
  { name: 'Lotto Intermarché', aliases: ['Lotto - Intermarché', 'Lotto-Intermarché', 'Lotto', 'Intermarché-Wanty'] },
  { name: 'Movistar Team', aliases: ['Movistar'] },
  {
    name: 'Netcompany INEOS Cycling Team',
    aliases: ['Netcompany INEOS', 'Netcompany Ineos Cycling Team', 'NetCompany INEOS Cycling Team', 'Netcompany-INEOS Cycling Team', 'Netcompany-INEOS Team', 'Netcompany - INEOS', 'Netcompany-INEOS'],
    // Renamed from the start of the 2026 Giro d'Italia (Netcompany co-title deal, announced 2026-04-28).
    former: [{ name: 'INEOS Grenadiers', until: '2026-05-07', note: 'raced as INEOS Grenadiers until May 2026' }],
  },
  { name: 'NSN Cycling Team', aliases: ['NSN Cycling', 'Israel - Premier Tech', 'Israel-Premier Tech'] },
  { name: 'Red Bull - BORA - hansgrohe', aliases: ['Red Bull - Bora - Hansgrohe', 'Red Bull-BORA-hansgrohe', 'Red Bull-Bora-Hansgrohe'] },
  { name: 'Soudal Quick-Step', aliases: ['Soudal-Quick-Step', 'Soudal - Quick-Step'] },
  { name: 'Team Jayco AlUla', aliases: ['Jayco AlUla', 'Team Jayco-AlUla', 'Jayco-AlUla'] },
  { name: 'Team Picnic PostNL', aliases: ['Picnic PostNL', 'Team Picnic - PostNL', 'Team Picnic-PostNL', 'PostNL Cycling'] },
  { name: 'Team Visma | Lease a Bike', aliases: ['Visma | Lease a Bike', 'Visma - Lease a Bike', 'Visma-Lease a Bike', 'Visma Lease a Bike'] },
  { name: 'UAE Team Emirates - XRG', aliases: ['UAE Team Emirates XRG', 'UAE Team Emirates-XRG', 'UAE Team Emirates'] },
  { name: 'Uno-X Mobility', aliases: ['Uno-X'] },
  { name: 'XDS Astana Team', aliases: ['XDS Astana', 'XDS-Astana'] },
  // ---- Men's ProTeams / Continental seen in results ----
  { name: 'Pinarello-Q36.5 Pro Cycling Team', aliases: ['Pinarello - Q36.5 Pro Cycling Team', 'Pinarello Q36.5 Pro Cycling Team', 'Pinarello-Q36.5 Pro Cycling', 'Pinarello-Q36.5', 'Q36.5 Pro Cycling Team', 'INEOS Grenadiers / Pinarello-Q36.5'] },
  { name: 'Tudor Pro Cycling Team', aliases: ['Tudor', 'Tudor Pro Cycling'] },
  { name: 'TotalEnergies', aliases: ['Team TotalEnergies'] },
  { name: 'Cofidis', aliases: [] },
  { name: 'Team Polti VisitMalta', aliases: ['Polti VisitMalta'] },
  { name: 'Solution Tech - NIPPO - Rali', aliases: ['Solution Tech NIPPO Rali'] },
  { name: 'Caja Rural - Seguros RGA', aliases: ['Caja Rural-Seguros RGA'] },
  { name: 'Team Flanders - Baloise', aliases: ['Team Flanders-Baloise'] },
  { name: 'Van Rysel Roubaix', aliases: ['Van Rysel-Roubaix'] },
  { name: 'St Michel - Preference Home - Auber93', aliases: ['St Michel - Auber93'] },
  { name: 'Ribble Outliers Gravel Racing Team', aliases: ['Ribble Outliers'] },
  { name: 'Minimax Cycling Team', aliases: ['Minimax Cycling'] },
  // ---- Women's WorldTeams / ProTeams ----
  { name: 'Team SD Worx - Protime', aliases: ['Team SD Worx-Protime', 'SD Worx-Protime', 'SD Worx - Protime', 'SD Worx'] },
  { name: 'FDJ United - SUEZ', aliases: ['FDJ United-SUEZ', 'FDJ United Suez'] },
  { name: 'EF Education-Oatly', aliases: ['EF Education - Oatly'] },
  { name: 'CANYON//SRAM zondacrypto', aliases: ['Canyon//SRAM zondacrypto', 'CANYON//SRAM', 'Canyon//SRAM', 'Canyon-SRAM zondacrypto', 'Canyon//SRAM Racing zondacrypto'] },
  { name: 'Fenix-Premier Tech', aliases: ['Fenix - Premier Tech'] },
  { name: 'AG Insurance - Soudal Team', aliases: ['AG Insurance - Soudal', 'AG Insurance-Soudal Team'] },
  { name: 'Liv AlUla Jayco', aliases: ["Liv AlUla Jayco Women's Continental Team"] },
  { name: 'VolkerWessels Cycling Team', aliases: ['VolkerWessels Cycling'] },
  { name: 'UAE Team ADQ', aliases: [] },
  { name: 'Human Powered Health', aliases: [] },
  { name: 'Cofidis Women Team', aliases: [] },
  { name: 'Laboral Kutxa - Fundación Euskadi', aliases: ['Laboral Kutxa-Fundacion Euskadi'] },
  { name: 'Pauwels Sauzen - Altez Industriebouw', aliases: ['Pauwels Sauzen - Altez'] },
  { name: 'Crelan - Corendon', aliases: ['Crelan-Corendon'] },
];

// The same normalized string can mean different teams in different pelotons.
const GENDER_OVERRIDES = {
  women: { cofidis: 'Cofidis Women Team' },
};

export function normalizeTeam(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/[|/]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(team|pro|cycling)\b/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const ALIAS_INDEX = new Map();   // normalized alias → entry
const FORMER_INDEX = new Map();  // normalized former name → { entry, former }
for (const entry of TEAMS) {
  ALIAS_INDEX.set(normalizeTeam(entry.name), entry);
  for (const a of entry.aliases || []) ALIAS_INDEX.set(normalizeTeam(a), entry);
  for (const f of entry.former || []) FORMER_INDEX.set(normalizeTeam(f.name), { entry, former: f });
}

export function canonicalTeam(name, { gender, date } = {}) {
  const raw = String(name ?? '').trim();
  const norm = normalizeTeam(raw);
  if (!norm) return { name: raw, key: '', canonical: false, former: false, note: '' };

  const override = GENDER_OVERRIDES[gender]?.[norm];
  if (override) {
    const entry = ALIAS_INDEX.get(normalizeTeam(override));
    return { name: entry.name, key: normalizeTeam(entry.name), canonical: raw === entry.name, former: false, note: '' };
  }

  const hit = ALIAS_INDEX.get(norm);
  if (hit) return { name: hit.name, key: normalizeTeam(hit.name), canonical: raw === hit.name, former: false, note: '' };

  const old = FORMER_INDEX.get(norm);
  if (old) {
    const stillValid = !date || date <= old.former.until;
    return { name: old.entry.name, key: normalizeTeam(old.entry.name), canonical: false, former: stillValid, note: old.former.note };
  }

  return { name: raw, key: norm, canonical: true, former: false, note: '' };
}

export function teamKey(name, opts) { return canonicalTeam(name, opts).key; }

export function printRegistry() {
  for (const t of TEAMS) {
    const extra = [...(t.aliases || []), ...(t.former || []).map(f => `${f.name} (until ${f.until})`)];
    console.log(t.name + (extra.length ? `\n    ← ${extra.join(' · ')}` : ''));
  }
}
