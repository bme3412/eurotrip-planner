// Maps neighborhood names (or place types) to emoji icons. Used by the
// neighborhood grid cards, the editor's-picks spotlight, and the comparison
// modal.
export function getNeighborhoodIcon(name) {
  const nameLower = name?.toLowerCase() || '';
  if (nameLower.includes('marais')) return '🏛️';
  if (nameLower.includes('montmartre')) return '⛪';
  if (nameLower.includes('latin')) return '📚';
  if (nameLower.includes('champs')) return '🛍️';
  if (nameLower.includes('eiffel')) return '🗼';
  if (nameLower.includes('louvre')) return '🖼️';
  if (nameLower.includes('seine')) return '🌊';
  if (nameLower.includes('opera') || nameLower.includes('opéra')) return '🎭';
  if (nameLower.includes('bastille')) return '🏰';
  if (nameLower.includes('republic') || nameLower.includes('république')) return '🏛️';
  if (nameLower.includes('germain')) return '☕';
  if (nameLower.includes('belleville')) return '🎨';
  if (nameLower.includes('canal')) return '🚣';
  if (nameLower.includes('île') || nameLower.includes('ile') || nameLower.includes('cité')) return '🏝️';
  if (nameLower.includes('défense') || nameLower.includes('defense')) return '🏢';
  if (nameLower.includes('montparnasse')) return '🗼';
  return '🏘️';
}
