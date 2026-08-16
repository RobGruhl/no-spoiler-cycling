#!/usr/bin/env node
// COPY of cycling-agent/scripts/check-paths.mjs (canon, tested there) — do not edit here.
// Sync: copy canon below this 3-line header verbatim. Last synced 2026-08-16.
// PATH-GUARD (security-critical). The agent may only touch the results subsystem + generated HTML.
// Anything else — the spoiler-safe calendar SOURCE (data/race-data.json), code, CI — is forbidden.
// Default-deny: a file passes iff it matches an ALLOW pattern and no DENY pattern.
//
// Used by no-spoiler-cycling/.github/workflows/path-guard.yml as a REQUIRED status check, so a PR
// that changes anything off-allowlist cannot be auto-merged (branch protection blocks red checks).
//
// CLI: node check-paths.mjs <file> [file...]      (or pipe a newline list on stdin)
//      exit 0 = all allowed; exit 1 = offenders printed.

export const ALLOW = [
  /^data\/results\/(races|stages|riders)\/[^/]+\.json$/, // the ONLY data the agent may add
  /^results\/race\/[^/]+\.html$/,                         // generated race + stage result pages
  /^results\/rider\/[^/]+\.html$/,                        // generated rider result pages
  /^results\/_assets\/[^/]+$/,                            // generated manifest.json / results.css
  /^index\.html$/,                                        // generated calendar (cross-links)
  /^riders\.html$/,
  /^riders-women\.html$/,
  /^riders\/[^/]+\.html$/,                                // generated rider index pages
  /^riders-women\/[^/]+\.html$/,
  /^race-details\/[^/]+\.html$/,                          // generated race detail pages (cross-links)
];

// Explicit denials (defense-in-depth / documentation). Default-deny already blocks anything not
// in ALLOW; these make the highest-risk paths unmistakable and override any future ALLOW widening.
export const DENY = [
  /^data\/race-data\.json$/,                              // the spoiler-safe calendar SOURCE — NEVER
  /^data\/(riders|riders-women|broadcasters|outsiders|riders-cyclocross)[^/]*\.json$/,
  /^\.github\//,                                          // no CI / workflow / branch-policy changes
  /^package(-lock)?\.json$/,
  /^(lib|scripts|tools|config|bootstrap)\//,
  /^about\.html$/,
  /^shared\.css$/,
  /^new-design\//,
  /\.\./,                                                 // no path traversal
];

export function classify(files) {
  const offenders = [];
  for (const raw of files) {
    const f = String(raw).trim();
    if (!f) continue;
    const denied = DENY.some((r) => r.test(f));
    const allowed = ALLOW.some((r) => r.test(f));
    if (denied || !allowed) offenders.push(f);
  }
  return offenders;
}

// --- CLI ---
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const argv = process.argv.slice(2);
  const files = argv.length ? argv : (await readStdin()).split('\n');
  const offenders = classify(files.filter(Boolean));
  if (offenders.length) {
    console.error('PATH-GUARD FAILED — these files are outside the agent allowlist:');
    for (const f of offenders) console.error(`  ✗ ${f}`);
    console.error('\nAllowed: data/results/** + generated HTML (results/**, index.html, riders*.html, riders/**, race-details/**).');
    process.exit(1);
  }
  console.log(`PATH-GUARD OK — ${files.filter(Boolean).length} changed file(s) within allowlist.`);
}

async function readStdin() {
  let s = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) s += chunk;
  return s;
}
