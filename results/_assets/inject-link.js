// Client-side discovery script for the results subsystem.
// Loaded by any existing spoiler-free page that wants a discreet "View results"
// entry-point. The script:
//
//   1. Reads the page's URL to determine the slug (works for race-details/
//      and riders/ pages).
//   2. Fetches /results/_assets/manifest.json — the index of available results
//      pages. If the manifest fetch fails or the slug isn't listed, no link is
//      injected. (Safer than HEAD probes against GitHub Pages.)
//   3. Injects an unobtrusive footer line.
//
// localStorage flags honoured:
//   - nsc:results:dismissed — user has explicitly hidden these links sitewide.
// Never auto-reveals results content; never previews titles or images.

(function () {
  if (typeof window === 'undefined') return;
  try {
    if (localStorage.getItem('nsc:results:dismissed')) return;
  } catch (e) { /* private mode etc. — keep going */ }

  // Determine slug from current URL path
  const path = window.location.pathname;
  let kind = null, slug = null;
  let m;
  if ((m = path.match(/\/race-details\/([^/]+?)\.html?$/))) { kind = 'race'; slug = m[1]; }
  else if ((m = path.match(/\/riders\/([^/]+?)\.html?$/))) { kind = 'rider'; slug = m[1]; }
  else if ((m = path.match(/\/riders-women\/([^/]+?)\.html?$/))) { kind = 'rider'; slug = m[1]; }
  if (!kind || !slug) return;

  // Resolve a manifest URL relative to the current page.
  // Both /race-details/X and /riders/X are one level deep, so we go up one.
  const manifestUrl = (kind === 'race' || kind === 'rider')
    ? '../results/_assets/manifest.json'
    : '/results/_assets/manifest.json';

  fetch(manifestUrl, { cache: 'no-cache' })
    .then(r => r.ok ? r.json() : null)
    .then(manifest => {
      if (!manifest) return;
      const has = (kind === 'race' ? manifest.races : manifest.riders) || [];
      if (!has.includes(slug)) return;
      injectLink(kind, slug);
    })
    .catch(() => { /* swallow */ });

  function injectLink(kind, slug) {
    const href = kind === 'race'
      ? `../results/race/${slug}.html`
      : `../results/rider/${slug}.html`;
    const label = kind === 'race'
      ? "Already watched? — read the race analysis"
      : "Already caught up? — read this rider's 2026 season log";

    const box = document.createElement('aside');
    box.className = 'nsc-results-link';
    box.innerHTML = `
      <div class="nsc-rl-rule"></div>
      <div class="nsc-rl-row">
        <a class="nsc-rl-link" href="${href}">${label} →</a>
        <button class="nsc-rl-dismiss" type="button" aria-label="Hide results links sitewide">× hide</button>
      </div>
      <p class="nsc-rl-warn">Results pages contain podiums, decisive moments, and per-rider analysis. They are spoiler-gated by an opt-in interstitial — clicking only takes you to the warning.</p>
    `;
    box.style.cssText = `
      max-width: 1360px;
      margin: 40px auto 80px;
      padding: 0 32px;
      font-family: 'Inter Tight', sans-serif;
    `;
    // Tiny scoped styles
    const style = document.createElement('style');
    style.textContent = `
      .nsc-rl-rule { height: 1px; background: rgba(20,17,15,.18); margin-bottom: 18px; }
      .nsc-rl-row { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
      .nsc-rl-link { font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: #c8102e; text-decoration: none; border-bottom: 1px solid rgba(200,16,46,.4); padding-bottom: 2px; }
      .nsc-rl-link:hover { border-bottom-color: #c8102e; }
      .nsc-rl-dismiss { background: transparent; border: 0; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .14em; text-transform: lowercase; color: rgba(20,17,15,.6); cursor: pointer; padding: 4px 6px; }
      .nsc-rl-dismiss:hover { color: #14110f; }
      .nsc-rl-warn { font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.6; color: rgba(20,17,15,.6); margin: 10px 0 0; max-width: 70ch; }
    `;
    document.head.appendChild(style);
    document.body.appendChild(box);

    box.querySelector('.nsc-rl-dismiss').addEventListener('click', () => {
      try { localStorage.setItem('nsc:results:dismissed', '1'); } catch (e) {}
      box.remove();
    });
  }
})();
