import { stripMarkdown } from '../lib/markdown';

/**
 * Build the rich HTML popup attached to each marker.
 *
 * Shows: title + categories, optional description, address, hours/best-time,
 * price, and ratings/duration.
 */
export function buildAttractionPopupHtml({ attraction, category, standardCategory, color }) {
  const cleanName = stripMarkdown(attraction.name);
  const cleanDesc = stripMarkdown(attraction.description || '');
  const cleanBestTime = stripMarkdown(attraction.best_time || '');

  let html = `
    <div class="popup-container">
      <h3 class="popup-title">${cleanName}</h3>
      <p class="popup-category" style="color: ${color};">
        <span>${category}</span>
        <span class="popup-main-category">${standardCategory}</span>
      </p>
  `;

  if (cleanDesc) {
    const truncated = cleanDesc.length > 120 ? cleanDesc.substring(0, 120) + '...' : cleanDesc;
    html += `<p class="popup-description">${truncated}</p>`;
  }

  html += `<div class="popup-details">`;

  if (attraction.address) {
    html += `
      <div class="popup-detail-item">
        <span class="popup-detail-icon">📍</span>
        <span class="popup-detail-text">${attraction.address}</span>
      </div>`;
  }

  if (attraction.hours) {
    html += `
      <div class="popup-detail-item">
        <span class="popup-detail-icon">🕒</span>
        <span class="popup-detail-text">${stripMarkdown(attraction.hours)}</span>
      </div>`;
  } else if (cleanBestTime) {
    html += `
      <div class="popup-detail-item">
        <span class="popup-detail-icon">🕒</span>
        <span class="popup-detail-text">Best: ${cleanBestTime}</span>
      </div>`;
  }

  const priceInfo = attraction.ticket_price || attraction.price_range || attraction.price;
  if (priceInfo) {
    html += `
      <div class="popup-detail-item">
        <span class="popup-detail-icon">💰</span>
        <span class="popup-detail-text">${priceInfo}</span>
      </div>`;
  }

  if (attraction.ratings) {
    let ratingInfo = '';
    if (typeof attraction.ratings === 'object') {
      if (attraction.ratings.score) ratingInfo = attraction.ratings.score;
      if (attraction.ratings.suggested_duration_hours) {
        ratingInfo += ratingInfo
          ? ` (${attraction.ratings.suggested_duration_hours} hrs)`
          : `${attraction.ratings.suggested_duration_hours} hrs`;
      }
    } else {
      ratingInfo = attraction.ratings;
    }
    if (ratingInfo) {
      html += `
        <div class="popup-detail-item">
          <span class="popup-detail-icon">⭐</span>
          <span class="popup-detail-text">${ratingInfo}</span>
        </div>`;
    }
  }

  html += `</div></div>`;
  return html;
}

/**
 * Build the dedicated "selected" popup with collapsible description.
 *
 * Returns { html, popupId, isLongDesc, cleanDesc, truncatedDesc } so the
 * orchestrator can wire up the expand/collapse toggle after insertion.
 */
export function buildSelectedPopupHtml(attraction) {
  const cleanName = stripMarkdown(attraction.name || '');
  const cleanDesc = stripMarkdown(attraction.description || '');
  const isLongDesc = cleanDesc.length > 180;
  const truncatedDesc = isLongDesc ? cleanDesc.substring(0, 180) + '...' : cleanDesc;
  const popupId = `popup-${Date.now()}`;

  const html = `
    <div id="${popupId}" style="width:380px;max-width:calc(100vw - 80px);max-height:calc(100vh - 200px);display:flex;flex-direction:column;">
      <div style="font-weight:700;color:#111827;margin-bottom:12px;font-size:18px;line-height:1.35;word-wrap:break-word;flex-shrink:0;">${cleanName}</div>
      <div id="${popupId}-desc-container" style="max-height:150px;overflow-y:auto;flex:1;transition:max-height 0.3s ease;">
        <div id="${popupId}-desc" style="color:#374151;font-size:14px;line-height:1.7;word-wrap:break-word;white-space:pre-wrap;">${truncatedDesc}</div>
      </div>
      ${isLongDesc ? `
        <button
          id="${popupId}-toggle"
          style="margin-top:12px;padding:8px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;color:#3b82f6;font-size:13px;font-weight:600;cursor:pointer;transition:all 0.2s;width:100%;flex-shrink:0;"
          onmouseover="this.style.background='#e5e7eb';this.style.borderColor='#d1d5db'"
          onmouseout="this.style.background='#f3f4f6';this.style.borderColor='#e5e7eb'"
        >
          Read more ↓
        </button>
      ` : ''}
    </div>
  `;

  return { html, popupId, isLongDesc, cleanDesc, truncatedDesc };
}

/**
 * Wire the expand / collapse behaviour for a selected popup that was inserted
 * into the DOM by Mapbox. Safe to call after a 0–50ms `setTimeout` once the
 * popup HTML is in the document.
 */
export function setupExpandToggle({ popupId, isLongDesc, cleanDesc, truncatedDesc }) {
  if (!isLongDesc) return;
  const toggle = document.getElementById(`${popupId}-toggle`);
  const desc = document.getElementById(`${popupId}-desc`);
  const container = document.getElementById(`${popupId}-desc-container`);
  if (!toggle || !desc || !container) return;

  let expanded = false;
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    expanded = !expanded;
    if (expanded) {
      desc.textContent = cleanDesc;
      container.style.maxHeight = '280px';
      container.style.overflowY = 'auto';
      toggle.innerHTML = 'Show less ↑';
    } else {
      desc.textContent = truncatedDesc;
      container.style.maxHeight = '150px';
      toggle.innerHTML = 'Read more ↓';
      container.scrollTop = 0;
    }
  });
}
