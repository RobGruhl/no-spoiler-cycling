// Shared page chrome injected into every generated page by the build scripts.
// Added 2026-07 in the legal risk-reduction pass:
//   - rider photo placeholders (PCS rider photos were removed pending licensing)
//   - a standard legal footer (unofficial-project notice + privacy/contact/etc. links)
// Keep this dependency-free so every generator can import it directly.

const CONTACT_URL = 'https://github.com/RobGruhl/no-spoiler-cycling/issues';
const UNOFFICIAL_NOTICE =
  'Unofficial fan project — not affiliated with the UCI, race organizers, teams, or broadcasters.';

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Two-letter initials from a rider name. Handles "SURNAME First" and "First Surname".
function riderInitials(name) {
  const parts = String(name || '')
    .replace(/[^\p{L}\p{M}\s'-]/gu, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Deterministic, muted background color derived from the name (dark enough for white text).
function riderColor(name) {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 42%, 38%)`;
}

// Inline SVG avatar: a deterministic colored circle with the rider's initials.
// Fills its square container (matches the old photo frames), keeping page layout intact.
function riderPlaceholder(name) {
  const initials = riderInitials(name);
  const bg = riderColor(name);
  return `<svg class="rider-ph" viewBox="0 0 100 100" width="100%" height="100%" role="img" aria-label="${esc(name)}" preserveAspectRatio="xMidYMid meet">` +
    `<circle cx="50" cy="50" r="46" fill="${bg}"/>` +
    `<text x="50" y="50" dy="0.35em" text-anchor="middle" font-family="var(--font-sans, sans-serif)" font-size="34" font-weight="700" letter-spacing="1" fill="#fff">${esc(initials)}</text>` +
    `</svg>`;
}

// Standard legal footer block. `prefix` is the relative path back to the site root
// ('' for top-level pages, '../' one dir deep, '../../' two deep).
function siteLegalFooter(prefix = '') {
  return `<div class="site-legal">
        <nav class="site-legal-links mono">
          <a href="${prefix}privacy.html">Privacy</a> · <a href="${CONTACT_URL}">Contact</a> · <a href="${prefix}site-info.html#accessibility">Accessibility</a> · <a href="${prefix}site-info.html#takedown">Takedown</a>
        </nav>
        <p class="site-legal-note mono">${UNOFFICIAL_NOTICE}</p>
      </div>`;
}

export {
  CONTACT_URL,
  UNOFFICIAL_NOTICE,
  riderInitials,
  riderColor,
  riderPlaceholder,
  siteLegalFooter,
};
