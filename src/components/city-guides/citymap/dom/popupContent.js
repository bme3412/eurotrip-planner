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

  // Photo — prefer a Google photo (via the proxy), then a curated local image,
  // then resolve from the placeId. The <img> only loads when the popup opens.
  const photoName = attraction.googlePhotos?.[0]?.name || attraction.photoName;
  const placeId = attraction.googlePlaceId;
  let photoUrl = null;
  if (photoName) photoUrl = `/api/google-photos?name=${encodeURIComponent(photoName)}&w=400`;
  else if (attraction.image) photoUrl = attraction.image;
  else if (placeId) photoUrl = `/api/google-photos?placeId=${encodeURIComponent(placeId)}&w=400`;

  let html = `<div class="popup-container">`;

  if (photoUrl) {
    html += `<img src="${photoUrl}" alt="${cleanName}" loading="lazy" style="width:100%;height:140px;object-fit:cover;border-radius:8px;margin-bottom:10px;display:block;" onerror="this.style.display='none'" />`;
  }

  html += `
      <h3 class="popup-title">${cleanName}</h3>
      <p class="popup-category" style="color: ${color};">
        <span>${category}</span>
        <span class="popup-main-category">${standardCategory}</span>
      </p>
  `;

  // Rating + open-now row.
  const rating = attraction.googleRating;
  const reviews = attraction.googleReviewCount;
  const open = attraction.currentlyOpen;
  const chips = [];
  if (typeof rating === 'number') {
    chips.push(
      `<span style="color:#b45309;font-weight:600;">★ ${rating}${
        reviews ? `<span style="color:#9ca3af;font-weight:400;"> · ${Number(reviews).toLocaleString()} reviews</span>` : ''
      }</span>`,
    );
  }
  if (open === true) chips.push(`<span style="color:#059669;font-weight:600;">● Open now</span>`);
  else if (open === false) chips.push(`<span style="color:#dc2626;font-weight:600;">● Closed</span>`);
  if (chips.length) {
    html += `<p style="display:flex;flex-wrap:wrap;gap:10px;font-size:12.5px;margin:0 0 8px;">${chips.join('')}</p>`;
  }

  if (cleanDesc) {
    const truncated = cleanDesc.length > 160 ? cleanDesc.substring(0, 160) + '…' : cleanDesc;
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

  html += `</div>`; // close .popup-details

  const mapsUrl =
    attraction.googleUrl ||
    (attraction.latitude && attraction.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${attraction.latitude},${attraction.longitude}`
      : null);
  if (mapsUrl) {
    html += `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;margin-top:8px;font-size:12.5px;font-weight:600;color:#2563eb;text-decoration:none;">Directions ↗</a>`;
  }

  html += `</div>`; // close .popup-container
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
  const cleanBestTime = stripMarkdown(attraction.best_time || '');
  const isLongDesc = cleanDesc.length > 220;
  const truncatedDesc = isLongDesc ? cleanDesc.substring(0, 220) + '…' : cleanDesc;
  const popupId = `popup-${Date.now()}`;

  // Photo (Google → local → placeId); only loads when the popup is shown.
  const photoName = attraction.googlePhotos?.[0]?.name || attraction.photoName;
  const placeId = attraction.googlePlaceId;
  let photoUrl = null;
  if (photoName) photoUrl = `/api/google-photos?name=${encodeURIComponent(photoName)}&w=500`;
  else if (attraction.image) photoUrl = attraction.image;
  else if (placeId) photoUrl = `/api/google-photos?placeId=${encodeURIComponent(placeId)}&w=500`;

  // Rating + open-now chips.
  const rating = attraction.googleRating;
  const reviews = attraction.googleReviewCount;
  const open = attraction.currentlyOpen;
  const chips = [];
  if (typeof rating === 'number') {
    chips.push(`<span style="color:#b45309;font-weight:600;">★ ${rating}${reviews ? `<span style="color:#9ca3af;font-weight:400;"> · ${Number(reviews).toLocaleString()}</span>` : ''}</span>`);
  }
  if (open === true) chips.push(`<span style="color:#059669;font-weight:600;">● Open now</span>`);
  else if (open === false) chips.push(`<span style="color:#dc2626;font-weight:600;">● Closed</span>`);

  // Quick facts.
  const facts = [];
  const price = attraction.price_range || attraction.ticket_price;
  if (price) facts.push(`<span>💰 ${stripMarkdown(String(price))}</span>`);
  const dur = attraction.ratings?.suggested_duration_hours;
  if (dur) facts.push(`<span>⏱ ${dur}h</span>`);
  if (cleanBestTime) facts.push(`<span>🕒 ${cleanBestTime}</span>`);

  const mapsUrl =
    attraction.googleUrl ||
    (attraction.latitude && attraction.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${attraction.latitude},${attraction.longitude}`
      : null);

  const html = `
    <div id="${popupId}" style="width:340px;max-width:calc(100vw - 80px);max-height:calc(100vh - 200px);display:flex;flex-direction:column;">
      ${photoUrl ? `<img src="${photoUrl}" alt="${cleanName}" loading="lazy" style="width:100%;height:150px;object-fit:cover;border-radius:8px;margin-bottom:10px;display:block;flex-shrink:0;" onerror="this.style.display='none'" />` : ''}
      <div style="font-weight:700;color:#111827;margin-bottom:6px;font-size:17px;line-height:1.3;word-wrap:break-word;flex-shrink:0;">${cleanName}</div>
      ${chips.length ? `<div style="display:flex;flex-wrap:wrap;gap:10px;font-size:12.5px;margin-bottom:8px;flex-shrink:0;">${chips.join('')}</div>` : ''}
      <div id="${popupId}-desc-container" style="max-height:140px;overflow-y:auto;flex:1;transition:max-height 0.3s ease;">
        <div id="${popupId}-desc" style="color:#374151;font-size:13.5px;line-height:1.6;word-wrap:break-word;white-space:pre-wrap;">${truncatedDesc}</div>
      </div>
      ${isLongDesc ? `
        <button id="${popupId}-toggle"
          style="margin-top:8px;padding:7px 14px;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:8px;color:#3b82f6;font-size:12.5px;font-weight:600;cursor:pointer;width:100%;flex-shrink:0;"
          onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">Read more ↓</button>
      ` : ''}
      ${facts.length ? `<div style="display:flex;flex-wrap:wrap;gap:12px;font-size:12.5px;color:#6b7280;margin-top:10px;flex-shrink:0;">${facts.join('')}</div>` : ''}
      ${mapsUrl ? `<a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:4px;margin-top:10px;font-size:13px;font-weight:600;color:#2563eb;text-decoration:none;flex-shrink:0;">Directions ↗</a>` : ''}
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
