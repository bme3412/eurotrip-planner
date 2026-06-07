/**
 * Build the inner HTML for a custom marker.
 *
 *   <div class="marker-container">
 *     <div class="marker-pin" style="...">
 *       <span class="marker-text">{index}</span>
 *     </div>
 *     <div class="marker-pulse" style="..."></div>
 *     <div class="marker-label">{name}</div>
 *   </div>
 *
 * The `selected` variant scales the container by 1.5 with a slow easing so the
 * dynamic selection effect can mount a marker that's already in its
 * "selected" pose (no flash on first paint).
 */
export function buildMarkerInnerHtml({ color, globalIndex, name, selected = false, scale = 1 }) {
  const s = selected ? 1.5 : scale;
  const containerStyle = `transform: scale(${s}); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);`;
  return `
    <div class="marker-container" style="${containerStyle}">
      <div class="marker-pin" style="background-color: ${color}; box-shadow: 0 2px 6px rgba(0,0,0,0.25); border: 2px solid white;">
        <span class="marker-text" style="font-weight: bold; font-size: 11px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${globalIndex}</span>
      </div>
      <div class="marker-pulse" style="background-color: ${color}"></div>
      <div class="marker-label">${name || ''}</div>
    </div>
  `;
}

/**
 * Create the marker root <div> with the standard data attributes the
 * selection effect relies on (`data-attraction-name`, `data-attraction-index`).
 */
export function createMarkerElement({ attraction, globalIndex, color, selected = false, scale = 1 }) {
  const el = document.createElement('div');
  el.className = selected ? 'custom-marker marker-selected' : 'custom-marker';
  el.setAttribute('data-attraction-name', attraction.name);
  el.setAttribute('data-attraction-index', String(globalIndex));
  el.innerHTML = buildMarkerInnerHtml({
    color,
    globalIndex,
    name: attraction.name,
    selected,
    scale,
  });
  if (selected) {
    el.style.zIndex = '1000';
    el.style.filter = 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))';
  } else {
    // Bigger (more significant) pins sit above smaller ones so they aren't hidden.
    el.style.zIndex = String(Math.round(scale * 100));
  }
  return el;
}

/**
 * Apply selected/unselected styling to an existing marker element.
 * Mirrors the in-place transitions the orchestrator used to inline.
 */
export function applySelectedStyling(markerElement) {
  markerElement.classList.add('marker-selected');
  const container = markerElement.querySelector('.marker-container');
  if (container) {
    container.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
    container.style.transform = 'scale(1.5)';
  }
  markerElement.style.zIndex = '1000';
  markerElement.style.transition = 'filter 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
  markerElement.style.filter = 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8))';
}

export function applyUnselectedStyling(markerElement) {
  markerElement.classList.remove('marker-selected');
  const container = markerElement.querySelector('.marker-container');
  if (container) {
    container.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    container.style.transform = 'scale(1)';
  }
  markerElement.style.zIndex = '1';
  markerElement.style.transition = 'filter 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  markerElement.style.filter = 'none';
}
