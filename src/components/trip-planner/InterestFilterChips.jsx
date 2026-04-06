'use client';

import {
  Landmark,
  Wine,
  Frame,
  TreePine,
  Castle,
  Sparkles,
  ShoppingBag,
  Camera,
} from './icons';
import FilterChip, { FilterChipGroup } from './FilterChip';

// Interest categories - same as StepPreferences
const INTEREST_OPTIONS = [
  { id: 'Culture & History', Icon: Landmark },
  { id: 'Food & Drink', Icon: Wine },
  { id: 'Art & Museums', Icon: Frame },
  { id: 'Nature & Outdoors', Icon: TreePine },
  { id: 'Architecture', Icon: Castle },
  { id: 'Nightlife', Icon: Sparkles },
  { id: 'Shopping', Icon: ShoppingBag },
  { id: 'Photography', Icon: Camera },
];

/**
 * InterestFilterChips - Multi-select interest filters for city discovery
 *
 * Props:
 * - activeFilters: string[] - Currently active interest filters
 * - userPreferences: string[] - User's preferred interests from Step 2 (highlighted)
 * - onToggle: (interestId: string) => void
 */
export default function InterestFilterChips({
  activeFilters = [],
  userPreferences = [],
  onToggle,
}) {
  return (
    <FilterChipGroup label="Interests">
      {INTEREST_OPTIONS.map(({ id, Icon }) => {
        const isActive = activeFilters.includes(id);
        const isUserPreferred = userPreferences.includes(id);

        return (
          <FilterChip
            key={id}
            label={id.split(' & ')[0]} // Short label: "Culture", "Food", etc.
            icon={Icon}
            isActive={isActive}
            onClick={() => onToggle(id)}
            multiSelect
            // Highlight user's preferred interests with a subtle indicator
            className={isUserPreferred && !isActive ? 'ring-1 ring-[#c9a227]/30' : ''}
          />
        );
      })}
    </FilterChipGroup>
  );
}

// Export interest options for use elsewhere
export { INTEREST_OPTIONS };
