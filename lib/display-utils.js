/**
 * Display Utilities
 * Shared functions for generating display text and formatting
 */

// Interior words of a multi-word surname that stay lowercase: "VAN DER POEL" →
// "Van der Poel". A particle LEADING the surname keeps its capital ("Del Toro",
// "Van Aert") — matching how the site has always rendered these names.
const SURNAME_PARTICLES = new Set([
  'van', 'der', 'den', 'de', 'von', 'ter', 'ten', 'te',
  'la', 'le', 'di', 'da', 'dal', 'del', 'dos', 'du',
]);

/**
 * Title-case one ALL-CAPS surname word, preserving Mc/O' patterns:
 * "MCNULTY" → "McNulty", "O'CONNOR" → "O'Connor", "POGAČAR" → "Pogačar".
 */
export function titleCaseSurnameWord(word) {
  if (!word) return '';
  let w = word.charAt(0) + word.slice(1).toLowerCase();
  w = w.replace(/^Mc(\p{L})/u, (_, c) => 'Mc' + c.toUpperCase());
  w = w.replace(/(['’])(\p{L})/u, (_, q, c) => q + c.toUpperCase());
  return w;
}

/**
 * Parse "VAN AERT Wout" (ALL-CAPS surname first, possibly multi-word) into
 * { surname: 'Van Aert', given: 'Wout' }. The surname is the leading run of
 * ALL-CAPS tokens (any letter, including accents).
 */
export function parseRiderName(fullName) {
  const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
  const isUpper = p => p && p === p.toUpperCase() && p !== p.toLowerCase();
  let i = 0;
  while (i < parts.length && isUpper(parts[i])) i++;
  const surname = parts.slice(0, i || 1)
    .map(titleCaseSurnameWord)
    .map((w, idx) => idx > 0 && SURNAME_PARTICLES.has(w.toLowerCase()) ? w.toLowerCase() : w)
    .join(' ');
  const given = parts.slice(i || 1).join(' ');
  return { surname, given };
}

/** "VAN AERT Wout" → "W. Van Aert" (index-card style). */
export function shortRiderName(fullName) {
  const { surname, given } = parseRiderName(fullName);
  if (!given) return surname;
  return `${given.charAt(0)}. ${surname}`;
}

/** "VAN AERT Wout" → "Wout Van Aert" (rider-page style). */
export function fullRiderName(fullName) {
  const { surname, given } = parseRiderName(fullName);
  return `${given} ${surname}`.trim();
}

/**
 * Extract initials from rider name format "LASTNAME Firstname"
 * Multi-part last names (VAN DER POEL) use first part (V).
 * Returns: First letter of first name + First letter of last name (first word)
 *
 * Examples:
 * - "POGAČAR Tadej" -> "TP"
 * - "VAN DER POEL Mathieu" -> "MV" (M from Mathieu, V from VAN)
 * - "DEL TORO Isaac" -> "ID" (I from Isaac, D from DEL)
 * - "VINGEGAARD Jonas" -> "JV"
 * - "ALMEIDA João" -> "JA"
 */
export function getInitials(name) {
  if (!name) return '??';

  const parts = name.split(' ').filter(p => p.length > 0);
  if (parts.length === 0) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  // Find first name (first non-all-caps word)
  // Names are in format "LASTNAME Firstname" where last name is ALL CAPS
  const firstNameIndex = parts.findIndex(p => p !== p.toUpperCase());

  if (firstNameIndex === -1) {
    // All caps - take first two letters of first word
    return parts[0].slice(0, 2).toUpperCase();
  }

  const firstName = parts[firstNameIndex];
  // Last name is the FIRST word (start of multi-part names like VAN DER POEL)
  const lastName = parts[0];

  return (firstName[0] + lastName[0]).toUpperCase();
}

export default { getInitials };
