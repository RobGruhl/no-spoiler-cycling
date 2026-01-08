/**
 * Display Utilities
 * Shared functions for generating display text and formatting
 */

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
