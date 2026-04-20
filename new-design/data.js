// Representative sample pulled from the live No Spoiler Cycling 2026 calendar.
// Trimmed to ~60 races covering all filter axes. Structure mirrors what the repo
// produces so Claude Code can swap in the full dataset by name.

window.RACES = [
  // ——— January ———
  {d:"Sun, Jan 4", start:"2026-01-04", end:"2026-01-04", month:1, name:"UCI Cyclocross World Cup Zonhoven — Men Elite", loc:"Zonhoven, Belgium", cat:"CX.WC", rating:4, disc:"cx", gender:"m", format:"one", terrain:["circuit"], prestige:[], coverage:"FloBikes"},
  {d:"Sun, Jan 4", start:"2026-01-04", end:"2026-01-04", month:1, name:"UCI Cyclocross World Cup Zonhoven — Women Elite", loc:"Zonhoven, Belgium", cat:"CX.WC", rating:4, disc:"cx", gender:"w", format:"one", terrain:["circuit"], prestige:[], coverage:"FloBikes"},
  {d:"Sun, Jan 11", start:"2026-01-11", end:"2026-01-11", month:1, name:"Australian Road National Championships — Men Elite", loc:"Perth, AUS", cat:"NC", rating:3, disc:"road", gender:"m", format:"one", terrain:["flat"], prestige:[], coverage:"FloBikes"},
  {d:"Jan 17–22", start:"2026-01-17", end:"2026-01-22", month:1, name:"Tour El Salvador", loc:"El Salvador", cat:"2.1", rating:2, disc:"road", gender:"m", format:"stage", terrain:["flat","hilly"], prestige:[], coverage:"YouTube", stages:4, slug:"tour-el-salvador-2026"},
  {d:"Jan 17–19", start:"2026-01-17", end:"2026-01-19", month:1, name:"Women's Tour Down Under", loc:"South Australia", cat:"2.WWT", rating:3, disc:"road", gender:"w", format:"stage", terrain:["hilly","mountain"], prestige:[], coverage:"FloBikes", stages:3},
  {d:"Jan 20–25", start:"2026-01-20", end:"2026-01-25", month:1, name:"Tour Down Under", loc:"Australia", cat:"2.UWT", rating:4, disc:"road", gender:"m", format:"stage", terrain:["hilly","mountain"], prestige:[], coverage:"FloBikes", stages:5, slug:"tour-down-under-2026"},
  {d:"Sat, Jan 31", start:"2026-01-31", end:"2026-01-31", month:1, name:"Cadel Evans Great Ocean Road Race — Women", loc:"Australia", cat:"1.WWT", rating:4, disc:"road", gender:"w", format:"one", terrain:["flat"], prestige:[], coverage:"YouTube"},
  {d:"Sat, Jan 31", start:"2026-01-31", end:"2026-01-31", month:1, name:"UCI Cyclocross World Championships — Women Elite", loc:"Hulst, NED", cat:"CX.WCh", rating:5, disc:"cx", gender:"w", format:"one", terrain:["circuit"], prestige:["worlds"], coverage:"FloBikes"},

  // ——— February ———
  {d:"Feb 1–2", start:"2026-02-01", end:"2026-02-02", month:2, name:"Cadel Evans Great Ocean Road Race", loc:"Australia", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["flat"], prestige:[], coverage:"YouTube"},
  {d:"Sun, Feb 1", start:"2026-02-01", end:"2026-02-01", month:2, name:"UCI Cyclocross World Championships — Men Elite", loc:"Hulst, NED", cat:"CX.WCh", rating:5, disc:"cx", gender:"m", format:"one", terrain:["circuit"], prestige:["worlds"], coverage:"FloBikes"},
  {d:"Feb 5–8", start:"2026-02-05", end:"2026-02-08", month:2, name:"UAE Tour Women", loc:"United Arab Emirates", cat:"2.WWT", rating:4, disc:"road", gender:"w", format:"stage", terrain:["flat","mountain","itt"], prestige:[], coverage:"YouTube", stages:4},
  {d:"Feb 16–23", start:"2026-02-16", end:"2026-02-23", month:2, name:"UAE Tour", loc:"United Arab Emirates", cat:"2.UWT", rating:4, disc:"road", gender:"m", format:"stage", terrain:["flat","mountain","itt"], prestige:[], coverage:"YouTube", stages:7},
  {d:"Sat, Feb 28", start:"2026-02-28", end:"2026-02-28", month:2, name:"Omloop Nieuwsblad — Women", loc:"Belgium", cat:"1.WWT", rating:4, disc:"road", gender:"w", format:"one", terrain:["cobbles"], prestige:[], coverage:"YouTube"},

  // ——— March ———
  {d:"Mar 1–2", start:"2026-03-01", end:"2026-03-02", month:3, name:"Kuurne–Brussels–Kuurne", loc:"Belgium", cat:"1.Pro", rating:3, disc:"road", gender:"m", format:"one", terrain:["cobbles"], prestige:[], coverage:"FloBikes"},
  {d:"Mar 7–8", start:"2026-03-07", end:"2026-03-08", month:3, name:"Strade Bianche", loc:"Italy", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["gravel"], prestige:[], coverage:"YouTube"},
  {d:"Sat, Mar 7", start:"2026-03-07", end:"2026-03-07", month:3, name:"Strade Bianche — Women", loc:"Italy", cat:"1.WWT", rating:5, disc:"road", gender:"w", format:"one", terrain:["gravel"], prestige:["monument"], coverage:"YouTube"},
  {d:"Mar 8–16", start:"2026-03-08", end:"2026-03-16", month:3, name:"Paris–Nice", loc:"France", cat:"2.UWT", rating:4, disc:"road", gender:"m", format:"stage", terrain:["hilly","mountain","itt"], prestige:[], coverage:"YouTube", stages:8, slug:"paris-nice-2026"},
  {d:"Mar 9–16", start:"2026-03-09", end:"2026-03-16", month:3, name:"Tirreno–Adriatico", loc:"Italy", cat:"2.UWT", rating:4, disc:"road", gender:"m", format:"stage", terrain:["hilly","mountain","itt"], prestige:[], coverage:"YouTube", stages:7},
  {d:"Mar 21–22", start:"2026-03-21", end:"2026-03-22", month:3, name:"Milano–Sanremo", loc:"Italy", cat:"1.UWT", rating:5, disc:"road", gender:"m", format:"one", terrain:["flat"], prestige:["monument"], coverage:"TBD", slug:"milano-sanremo-2026"},
  {d:"Sat, Mar 21", start:"2026-03-21", end:"2026-03-21", month:3, name:"Milano–Sanremo Donne", loc:"Italy", cat:"1.WWT", rating:5, disc:"road", gender:"w", format:"one", terrain:["flat"], prestige:["monument"], coverage:"TBD"},
  {d:"Mar 25–26", start:"2026-03-25", end:"2026-03-26", month:3, name:"Ronde Van Brugge", loc:"Belgium", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["cobbles"], prestige:[], coverage:"TBD"},
  {d:"Mar 29–30", start:"2026-03-29", end:"2026-03-30", month:3, name:"Gent–Wevelgem", loc:"Belgium", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["cobbles"], prestige:[], coverage:"TBD"},

  // ——— April ———
  {d:"Apr 1–2", start:"2026-04-01", end:"2026-04-02", month:4, name:"Dwars Door Vlaanderen", loc:"Belgium", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["cobbles"], prestige:[], coverage:"FloBikes"},
  {d:"Apr 5–6", start:"2026-04-05", end:"2026-04-06", month:4, name:"Ronde Van Vlaanderen", loc:"Belgium", cat:"1.UWT", rating:5, disc:"road", gender:"m", format:"one", terrain:["cobbles"], prestige:["monument"], coverage:"FloBikes"},
  {d:"Sun, Apr 5", start:"2026-04-05", end:"2026-04-05", month:4, name:"Ronde Van Vlaanderen — Women", loc:"Belgium", cat:"1.WWT", rating:5, disc:"road", gender:"w", format:"one", terrain:["cobbles"], prestige:["monument"], coverage:"FloBikes"},
  {d:"Apr 6–12", start:"2026-04-06", end:"2026-04-12", month:4, name:"Itzulia Basque Country", loc:"Spain", cat:"2.UWT", rating:4, disc:"road", gender:"m", format:"stage", terrain:["hilly","mountain"], prestige:[], coverage:"FloBikes", stages:6},
  {d:"Apr 12–13", start:"2026-04-12", end:"2026-04-13", month:4, name:"Paris–Roubaix", loc:"France", cat:"1.UWT", rating:5, disc:"road", gender:"m", format:"one", terrain:["cobbles"], prestige:["monument"], coverage:"FloBikes"},
  {d:"Sun, Apr 12", start:"2026-04-12", end:"2026-04-12", month:4, name:"Paris–Roubaix — Women", loc:"France", cat:"1.WWT", rating:5, disc:"road", gender:"w", format:"one", terrain:["cobbles"], prestige:["monument"], coverage:"FloBikes"},
  {d:"Apr 19–20", start:"2026-04-19", end:"2026-04-20", month:4, name:"Amstel Gold Race", loc:"Netherlands", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["mountain"], prestige:[], coverage:"TBD"},
  {d:"Apr 26–27", start:"2026-04-26", end:"2026-04-27", month:4, name:"Liège–Bastogne–Liège", loc:"Belgium", cat:"1.UWT", rating:5, disc:"road", gender:"m", format:"one", terrain:["mountain"], prestige:["monument"], coverage:"TBD"},
  {d:"Sun, Apr 26", start:"2026-04-26", end:"2026-04-26", month:4, name:"Liège–Bastogne–Liège — Women", loc:"Belgium", cat:"1.WWT", rating:5, disc:"road", gender:"w", format:"one", terrain:["mountain"], prestige:["monument"], coverage:"TBD"},

  // ——— May / Giro ———
  {d:"May 3–11", start:"2026-05-03", end:"2026-05-11", month:5, name:"Vuelta España Femenina", loc:"Spain", cat:"2.WWT", rating:4, disc:"road", gender:"w", format:"stage", terrain:["hilly","mountain"], prestige:[], coverage:"TBD", stages:9},
  {d:"May 8 – Jun 1", start:"2026-05-08", end:"2026-06-01", month:5, name:"Giro d'Italia", loc:"Italy", cat:"2.UWT", rating:5, disc:"road", gender:"m", format:"stage", terrain:["flat","hilly","mountain","itt"], prestige:["grand_tour"], coverage:"TBD", stages:21, slug:"giro-d-italia-2026"},
  {d:"May 30 – Jun 8", start:"2026-05-30", end:"2026-06-08", month:5, name:"Giro d'Italia Women", loc:"Italy", cat:"2.WWT", rating:5, disc:"road", gender:"w", format:"stage", terrain:["flat","hilly","mountain","itt"], prestige:["grand_tour"], coverage:"TBD", stages:10},

  // ——— June ———
  {d:"Jun 14–15", start:"2026-06-14", end:"2026-06-15", month:6, name:"Copenhagen Sprint", loc:"Denmark", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["flat"], prestige:[], coverage:"TBD"},
  {d:"Jun 17–22", start:"2026-06-17", end:"2026-06-22", month:6, name:"Tour de Suisse", loc:"Switzerland", cat:"2.UWT", rating:4, disc:"road", gender:"m", format:"stage", terrain:["hilly","mountain","itt"], prestige:[], coverage:"TBD", stages:9},

  // ——— July ———
  {d:"Jul 4–26", start:"2026-07-04", end:"2026-07-26", month:7, name:"Tour de France", loc:"France", cat:"2.UWT", rating:5, disc:"road", gender:"m", format:"stage", terrain:["flat","hilly","mountain","itt"], prestige:["grand_tour"], coverage:"TBD", stages:21, slug:"tour-de-france-2026"},
  {d:"Aug 1–10", start:"2026-08-01", end:"2026-08-10", month:8, name:"Tour de France Femmes", loc:"France", cat:"2.WWT", rating:5, disc:"road", gender:"w", format:"stage", terrain:["flat","hilly","mountain","itt"], prestige:["grand_tour"], coverage:"TBD", stages:10},

  // ——— August ———
  {d:"Aug 1–2", start:"2026-08-01", end:"2026-08-02", month:8, name:"Donostia San Sebastian Klasikoa", loc:"Spain", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["hilly"], prestige:[], coverage:"TBD"},
  {d:"Aug 3–10", start:"2026-08-03", end:"2026-08-10", month:8, name:"Tour de Pologne", loc:"Poland", cat:"2.UWT", rating:4, disc:"road", gender:"m", format:"stage", terrain:["hilly","mountain"], prestige:[], coverage:"TBD", stages:7},
  {d:"Aug 16–17", start:"2026-08-16", end:"2026-08-17", month:8, name:"ADAC Cyclassics", loc:"Germany", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["flat"], prestige:[], coverage:"TBD"},
  {d:"Aug 22 – Sep 14", start:"2026-08-22", end:"2026-09-14", month:8, name:"Vuelta a España", loc:"Spain", cat:"2.UWT", rating:5, disc:"road", gender:"m", format:"stage", terrain:["flat","hilly","mountain","itt"], prestige:["grand_tour"], coverage:"TBD", stages:21},
  {d:"Aug 30–31", start:"2026-08-30", end:"2026-08-31", month:8, name:"Bretagne Classic — Ouest France", loc:"France", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["hilly"], prestige:[], coverage:"TBD"},

  // ——— September ———
  {d:"Sep 11–12", start:"2026-09-11", end:"2026-09-12", month:9, name:"GP de Québec", loc:"Canada", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["flat"], prestige:[], coverage:"TBD"},
  {d:"Sep 13–14", start:"2026-09-13", end:"2026-09-14", month:9, name:"GP de Montréal", loc:"Canada", cat:"1.UWT", rating:4, disc:"road", gender:"m", format:"one", terrain:["flat"], prestige:[], coverage:"TBD"},
  {d:"Sep 20–21", start:"2026-09-20", end:"2026-09-21", month:9, name:"World Championships: Men's TT", loc:"Canada", cat:"WC", rating:4, disc:"road", gender:"m", format:"itt", terrain:["itt","flat"], prestige:["worlds"], coverage:"TBD"},
  {d:"Sep 22–23", start:"2026-09-22", end:"2026-09-23", month:9, name:"World Championships: Mixed Relay TT", loc:"Canada", cat:"WC", rating:4, disc:"road", gender:"x", format:"ttt", terrain:["flat"], prestige:["worlds"], coverage:"TBD"},
  {d:"Sep 27–28", start:"2026-09-27", end:"2026-09-28", month:9, name:"World Championships: Men's Road Race", loc:"Canada", cat:"WC", rating:5, disc:"road", gender:"m", format:"one", terrain:["flat"], prestige:["worlds"], coverage:"TBD"},

  // ——— October ———
  {d:"Oct 10–11", start:"2026-10-10", end:"2026-10-11", month:10, name:"Il Lombardia", loc:"Italy", cat:"1.UWT", rating:5, disc:"road", gender:"m", format:"one", terrain:["mountain"], prestige:["monument"], coverage:"TBD"},
  {d:"Oct 13–19", start:"2026-10-13", end:"2026-10-19", month:10, name:"Tour of Guangxi", loc:"China", cat:"2.UWT", rating:4, disc:"road", gender:"m", format:"stage", terrain:["flat","hilly"], prestige:[], coverage:"TBD", stages:6},
  {d:"Sun, Oct 18", start:"2026-10-18", end:"2026-10-18", month:10, name:"Tour of Guangxi — Women", loc:"China", cat:"1.WWT", rating:4, disc:"road", gender:"w", format:"one", terrain:["flat"], prestige:[], coverage:"TBD"},
];

window.MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// Sample stage race — Tour Down Under 2026
window.STAGE_RACE = {
  slug:"tour-down-under-2026",
  name:"Santos Tour Down Under",
  cat:"2.UWT",
  rating:4,
  start:"2026-01-20",
  end:"2026-01-25",
  country:"Australia",
  totals:{stages:5, km:765, climb:7800, restDays:0},
  tag:"First WorldTour race of the season — hot, rolling South Australia.",
  broadcaster:"FloBikes",
  stages:[
    {no:"P", type:"ITT", label:"Prologue", from:"Adelaide", to:"Adelaide", date:"Mon, Jan 19", km:3.6, desc:"Short flat run-out with a twisting conclusion through Victoria Park.", terrain:"itt"},
    {no:"1", type:"ROAD", label:"Stage 1", from:"Tanunda", to:"Tanunda", date:"Tue, Jan 20", km:120.6, desc:"Circuit through Barossa wine country with three ascents of Menglers Hill.", terrain:"hilly"},
    {no:"2", type:"ROAD", label:"Stage 2", from:"Norwood", to:"Uraidla", date:"Wed, Jan 21", km:148.1, desc:"Corkscrew Road (9.7% avg) twice — midway and 14 km from the finish.", terrain:"mountain"},
    {no:"3", type:"ROAD", label:"Stage 3", from:"Henley Beach", to:"Nairne", date:"Thu, Jan 22", km:140.8, desc:"Wickham Hill early, Mount Barker at 115 km — sprinters hang on.", terrain:"hilly"},
    {no:"4", type:"QS",   label:"Stage 4 · Queen", from:"Brighton", to:"Willunga Hill", date:"Fri, Jan 23", km:176.0, desc:"Three ascents of Willunga Hill including two in the final 26 km.", terrain:"mountain"},
    {no:"5", type:"ROAD", label:"Stage 5", from:"Stirling", to:"Stirling", date:"Sat, Jan 24", km:169.8, desc:"Eight laps, saw-blade profile, Mount Barker Road finish. Anything can happen.", terrain:"hilly"},
  ],
  startlist:[
    {no:1,  name:"J. Vingegaard", team:"Visma–Lease a Bike"},
    {no:11, name:"T. Pogačar",    team:"UAE Team Emirates"},
    {no:21, name:"M. Pidcock",    team:"Q36.5"},
    {no:31, name:"P. Roglič",     team:"Red Bull–BORA"},
    {no:41, name:"R. Evenepoel",  team:"Soudal Quick-Step"},
    {no:51, name:"J. Almeida",    team:"UAE Team Emirates"},
    {no:61, name:"M. Jorgenson",  team:"Visma–Lease a Bike"},
    {no:71, name:"C. Storer",     team:"Tudor"},
  ],
};

// Sample monument — Paris–Roubaix 2026
window.ONEDAY_RACE = {
  slug:"paris-roubaix-2026",
  name:"Paris–Roubaix",
  subtitle:"L'Enfer du Nord · 123rd edition",
  cat:"1.UWT",
  rating:5,
  prestige:["monument"],
  date:"Sunday, April 12, 2026",
  country:"France",
  startTown:"Compiègne",
  finishTown:"Roubaix Velodrome",
  km:259.2,
  sectors:30,       // pavé sectors
  pave:55.3,        // km of pavé
  broadcaster:"FloBikes",
  profile:"flat",
  favourites:[
    {no:1,  tag:"M",  name:"M. van der Poel", team:"Alpecin–Deceuninck",  form:"★★★★★"},
    {no:2,  tag:"P",  name:"T. Pogačar",       team:"UAE Team Emirates",   form:"★★★★"},
    {no:3,  tag:"WV", name:"W. van Aert",      team:"Visma–Lease a Bike",  form:"★★★★"},
    {no:4,  tag:"JP", name:"J. Philipsen",     team:"Alpecin–Deceuninck",  form:"★★★"},
    {no:5,  tag:"MP", name:"M. Pedersen",      team:"Lidl–Trek",            form:"★★★"},
    {no:6,  tag:"SK", name:"S. Küng",          team:"Groupama–FDJ",         form:"★★★"},
  ],
  keySectors:[
    {km: 95.6, no:30, name:"Troisvilles à Inchy",   len:2.2, stars:3},
    {km:164.4, no:19, name:"Trouée d'Arenberg",     len:2.3, stars:5},
    {km:208.3, no:11, name:"Mons-en-Pévèle",        len:3.0, stars:5},
    {km:240.1, no: 4, name:"Carrefour de l'Arbre",  len:2.1, stars:5},
    {km:253.5, no: 2, name:"Hem",                   len:1.4, stars:1},
    {km:256.9, no: 1, name:"Roubaix",               len:0.3, stars:1},
  ],
  winners:[
    {yr:2025, who:"Mathieu van der Poel", team:"Alpecin–Deceuninck", gap:"+1:32"},
    {yr:2024, who:"Mathieu van der Poel", team:"Alpecin–Deceuninck", gap:"+2:59"},
    {yr:2023, who:"Mathieu van der Poel", team:"Alpecin–Deceuninck", gap:"+47\""},
    {yr:2022, who:"Dylan van Baarle",     team:"INEOS Grenadiers",    gap:"+1:47"},
    {yr:2021, who:"Sonny Colbrelli",      team:"Bahrain Victorious",  gap:"s.t."},
  ],
};
