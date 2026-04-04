'use client';

// Lightweight popup HTML builder extracted for reuse
export const buildAttractionPopup = (attraction, color, standardCategory) => {
  const title = attraction?.name || 'Attraction';
  const category = attraction?.category || attraction?.type || 'Uncategorized';
  const desc = attraction?.description || '';
  const duration = attraction?.ratings?.suggested_duration_hours;
  const cost = attraction?.ratings?.cost_estimate;
  const best = attraction?.best_time;
  const priceRange = attraction?.price_range || attraction?.price;

  let html = `
    <div class="popup-container">
      <h3 class="popup-title">${title}</h3>
      <p class="popup-category" style="color: ${color};">
        <span>${category}</span>
        <span class="popup-main-category">${standardCategory}</span>
      </p>
  `;

  if (desc) {
    const short = desc.length > 100 ? `${desc.substring(0, 100)}...` : desc;
    html += `<p class="popup-description">${short}</p>`;
  }

  html += `<div class="popup-details">`;
  if (best) {
    html += `
      <div class="popup-detail-item">
        <span class="popup-detail-icon">🕒</span>
        <span class="popup-detail-text">Best time: ${best}</span>
      </div>`;
  }
  if (priceRange) {
    html += `
      <div class="popup-detail-item">
        <span class="popup-detail-icon">💰</span>
        <span class="popup-detail-text">${priceRange}</span>
      </div>`;
  }
  if (duration || typeof cost !== 'undefined') {
    const parts = [];
    if (duration) parts.push(`${duration} hrs`);
    if (typeof cost !== 'undefined') parts.push(`€${cost}`);
    if (parts.length) {
      html += `
        <div class="popup-detail-item">
          <span class="popup-detail-icon">⭐</span>
          <span class="popup-detail-text">${parts.join(' • ')}</span>
        </div>`;
    }
  }
  html += `</div></div>`;
  return html;
};


