'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';

/**
 * Hook for managing UI state patterns like tooltips, modals, dropdowns
 */
export const useUIState = (initialState = {}) => {
  const [uiState, setUIState] = useState({
    activeTooltip: null,
    activeModal: null,
    activeDropdown: null,
    expandedItems: {},
    selectedItems: {},
    hoveredItems: {},
    ...initialState
  });

  // Generic toggle function
  const toggle = useCallback((stateKey, itemId) => {
    setUIState(prev => ({
      ...prev,
      [stateKey]: prev[stateKey] === itemId ? null : itemId
    }));
  }, []);

  // Generic set function
  const set = useCallback((stateKey, value) => {
    setUIState(prev => ({
      ...prev,
      [stateKey]: value
    }));
  }, []);

  // Specific UI actions
  const actions = useMemo(() => ({
    // Tooltip management
    showTooltip: (tooltipId, data = null) => {
      setUIState(prev => ({
        ...prev,
        activeTooltip: { id: tooltipId, data }
      }));
    },
    hideTooltip: () => set('activeTooltip', null),
    toggleTooltip: (tooltipId, data = null) => {
      setUIState(prev => ({
        ...prev,
        activeTooltip: prev.activeTooltip?.id === tooltipId 
          ? null 
          : { id: tooltipId, data }
      }));
    },

    // Modal management
    openModal: (modalId, data = null) => {
      setUIState(prev => ({
        ...prev,
        activeModal: { id: modalId, data }
      }));
    },
    closeModal: () => set('activeModal', null),

    // Dropdown management
    openDropdown: (dropdownId) => set('activeDropdown', dropdownId),
    closeDropdown: () => set('activeDropdown', null),
    toggleDropdown: (dropdownId) => toggle('activeDropdown', dropdownId),

    // Item expansion
    toggleExpansion: (itemId) => {
      setUIState(prev => ({
        ...prev,
        expandedItems: {
          ...prev.expandedItems,
          [itemId]: !prev.expandedItems[itemId]
        }
      }));
    },
    expandItem: (itemId) => {
      setUIState(prev => ({
        ...prev,
        expandedItems: {
          ...prev.expandedItems,
          [itemId]: true
        }
      }));
    },
    collapseItem: (itemId) => {
      setUIState(prev => ({
        ...prev,
        expandedItems: {
          ...prev.expandedItems,
          [itemId]: false
        }
      }));
    },
    collapseAll: () => set('expandedItems', {}),

    // Item selection
    selectItem: (itemId) => {
      setUIState(prev => ({
        ...prev,
        selectedItems: {
          ...prev.selectedItems,
          [itemId]: true
        }
      }));
    },
    deselectItem: (itemId) => {
      setUIState(prev => ({
        ...prev,
        selectedItems: {
          ...prev.selectedItems,
          [itemId]: false
        }
      }));
    },
    toggleSelection: (itemId) => {
      setUIState(prev => ({
        ...prev,
        selectedItems: {
          ...prev.selectedItems,
          [itemId]: !prev.selectedItems[itemId]
        }
      }));
    },
    clearSelection: () => set('selectedItems', {}),

    // Hover states
    setHovered: (itemId) => set('hoveredItems', { [itemId]: true }),
    clearHovered: () => set('hoveredItems', {}),

    // Bulk updates
    bulkUpdate: (updates) => {
      setUIState(prev => ({ ...prev, ...updates }));
    },

    // Reset all UI state
    resetAll: () => {
      setUIState({
        activeTooltip: null,
        activeModal: null,
        activeDropdown: null,
        expandedItems: {},
        selectedItems: {},
        hoveredItems: {}
      });
    }
  }), [set, toggle]);

  // Utility functions
  const utils = useMemo(() => ({
    isTooltipActive: (tooltipId) => uiState.activeTooltip?.id === tooltipId,
    isModalActive: (modalId) => uiState.activeModal?.id === modalId,
    isDropdownOpen: (dropdownId) => uiState.activeDropdown === dropdownId,
    isExpanded: (itemId) => !!uiState.expandedItems[itemId],
    isSelected: (itemId) => !!uiState.selectedItems[itemId],
    isHovered: (itemId) => !!uiState.hoveredItems[itemId],
    getSelectedItems: () => Object.keys(uiState.selectedItems).filter(id => uiState.selectedItems[id]),
    getExpandedItems: () => Object.keys(uiState.expandedItems).filter(id => uiState.expandedItems[id]),
    getTooltipData: () => uiState.activeTooltip?.data,
    getModalData: () => uiState.activeModal?.data
  }), [uiState]);

  return {
    uiState,
    actions,
    utils
  };
};

/**
 * Hook for managing responsive UI states
 */
export const useResponsiveState = () => {
  const [screenSize, setScreenSize] = useState('lg');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setScreenSize('sm');
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
      } else if (width < 1024) {
        setScreenSize('md');
        setIsMobile(false);
        setIsTablet(true);
        setIsDesktop(false);
      } else {
        setScreenSize('lg');
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return {
    screenSize,
    isMobile,
    isTablet,
    isDesktop
  };
};

/**
 * Hook for managing keyboard navigation
 */
export const useKeyboardNavigation = (items = [], options = {}) => {
  const [activeIndex, setActiveIndex] = useState(-1);
  const {
    onSelect,
    onEscape,
    enableArrowKeys = true,
    enableEnterKey = true,
    enableEscapeKey = true,
    circular = false
  } = options;

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!enableArrowKeys && !enableEnterKey && !enableEscapeKey) return;

      switch (event.key) {
        case 'ArrowDown':
          if (enableArrowKeys) {
            event.preventDefault();
            setActiveIndex(prev => {
              if (circular) {
                return (prev + 1) % items.length;
              }
              return Math.min(prev + 1, items.length - 1);
            });
          }
          break;

        case 'ArrowUp':
          if (enableArrowKeys) {
            event.preventDefault();
            setActiveIndex(prev => {
              if (circular) {
                return prev <= 0 ? items.length - 1 : prev - 1;
              }
              return Math.max(prev - 1, 0);
            });
          }
          break;

        case 'Enter':
          if (enableEnterKey && activeIndex >= 0 && items[activeIndex]) {
            event.preventDefault();
            if (onSelect) onSelect(items[activeIndex], activeIndex);
          }
          break;

        case 'Escape':
          if (enableEscapeKey) {
            event.preventDefault();
            setActiveIndex(-1);
            if (onEscape) onEscape();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items, activeIndex, onSelect, onEscape, enableArrowKeys, enableEnterKey, enableEscapeKey, circular]);

  const reset = useCallback(() => {
    setActiveIndex(-1);
  }, []);

  const setActive = useCallback((index) => {
    setActiveIndex(Math.max(-1, Math.min(index, items.length - 1)));
  }, [items.length]);

  return {
    activeIndex,
    setActiveIndex: setActive,
    reset,
    isActive: (index) => activeIndex === index
  };
};