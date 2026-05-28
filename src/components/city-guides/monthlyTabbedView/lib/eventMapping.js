import { MONTH_NAME_TO_INDEX } from './constants.js';

const coerceInt = (n) => {
  const num = Number(n);
  return Number.isFinite(num) && num >= 1 && num <= 31 ? num : null;
};

const normalize = (s) => (s || '').toString().trim();

/**
 * Build a `dayOfMonth -> events[]` map for the currently selected month from
 * the raw month JSON. Handles the messy real-world date strings in our
 * editorial data:
 *
 *   - "Throughout May", "All month", "Entire month"     → every day
 *   - "Late May to early June"                          → straddles months
 *   - "May 26 - June 8"                                 → cross-month range
 *   - "June 21"                                         → single day, named month
 *   - "7-16"                                            → in-month range
 *   - "14"                                              → bare day number
 *
 * Anything that doesn't belong to `monthIndex` is silently dropped.
 */
export function buildEventMapForMonth(monthIndex, monthJson) {
  if (!monthJson || typeof monthJson !== 'object') return {};

  const all = [];
  const fh = Array.isArray(monthJson?.first_half?.events_holidays) ? monthJson.first_half.events_holidays : [];
  const sh = Array.isArray(monthJson?.second_half?.events_holidays) ? monthJson.second_half.events_holidays : [];
  const fh2 = Array.isArray(monthJson?.first_half?.events) ? monthJson.first_half.events : [];
  const sh2 = Array.isArray(monthJson?.second_half?.events) ? monthJson.second_half.events : [];
  const root1 = Array.isArray(monthJson?.events_holidays) ? monthJson.events_holidays : [];
  const root2 = Array.isArray(monthJson?.events) ? monthJson.events : [];
  all.push(...fh, ...sh, ...fh2, ...sh2, ...root1, ...root2);

  const eventMap = {};
  const daysInMonth = new Date(new Date().getFullYear(), monthIndex + 1, 0).getDate();

  for (const ev of all) {
    const dateStr = normalize(ev?.date);
    if (!dateStr) continue;
    const unified = dateStr.replace(/[–—−]/g, '-').toLowerCase();

    // "Throughout month" / "All month" / "Entire month"
    if (/throughout|all\s*month|entire\s*month/i.test(dateStr)) {
      for (let d = 1; d <= daysInMonth; d++) {
        eventMap[d] = eventMap[d] || [];
        eventMap[d].push(ev);
      }
      continue;
    }

    // Vague cross-month dates: "Late May to early June"
    const vagueMonthMatch = unified.match(/(late|early|mid)?\s*([a-z]+)\s*(to|-)\s*(late|early|mid)?\s*([a-z]+)/);
    if (vagueMonthMatch) {
      const startQualifier = vagueMonthMatch[1] || '';
      const startMonthName = vagueMonthMatch[2];
      const endQualifier = vagueMonthMatch[4] || '';
      const endMonthName = vagueMonthMatch[5];
      const startMonthIdx = MONTH_NAME_TO_INDEX[startMonthName];
      const endMonthIdx = MONTH_NAME_TO_INDEX[endMonthName];

      if (startMonthIdx !== undefined && endMonthIdx !== undefined) {
        if (monthIndex === startMonthIdx) {
          const startDay = startQualifier === 'late' ? 20 : startQualifier === 'mid' ? 10 : 1;
          for (let d = startDay; d <= daysInMonth; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        } else if (monthIndex === endMonthIdx) {
          const endDay = endQualifier === 'early' ? 10 : endQualifier === 'mid' ? 20 : daysInMonth;
          for (let d = 1; d <= endDay; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        } else if (monthIndex > startMonthIdx && monthIndex < endMonthIdx) {
          for (let d = 1; d <= daysInMonth; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        }
        continue;
      }
    }

    // Cross-month ranges with explicit days: "May 26 - June 8"
    const crossMonthMatch = unified.match(/([a-z]+)\s*(\d{1,2})\s*-\s*([a-z]+)\s*(\d{1,2})/);
    if (crossMonthMatch) {
      const startMonthName = crossMonthMatch[1];
      const startDay = coerceInt(crossMonthMatch[2]);
      const endMonthName = crossMonthMatch[3];
      const endDay = coerceInt(crossMonthMatch[4]);
      const startMonthIdx = MONTH_NAME_TO_INDEX[startMonthName];
      const endMonthIdx = MONTH_NAME_TO_INDEX[endMonthName];

      if (startMonthIdx !== undefined && endMonthIdx !== undefined && startDay && endDay) {
        if (monthIndex === startMonthIdx) {
          for (let d = startDay; d <= daysInMonth; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        } else if (monthIndex === endMonthIdx) {
          for (let d = 1; d <= endDay; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        } else if (monthIndex > startMonthIdx && monthIndex < endMonthIdx) {
          for (let d = 1; d <= daysInMonth; d++) {
            eventMap[d] = eventMap[d] || [];
            eventMap[d].push(ev);
          }
          continue;
        }
        continue;
      }
    }

    // Single date with named month: "June 21" or "July 14, 2025"
    const singleDateWithMonth = unified.match(/([a-z]+)\s*(\d{1,2})/);
    if (singleDateWithMonth) {
      const eventMonthIdx = MONTH_NAME_TO_INDEX[singleDateWithMonth[1]];
      if (eventMonthIdx !== undefined && eventMonthIdx !== monthIndex) {
        continue;
      }
    }

    // In-month range: "7-16" / "07-16"
    let matched = unified.match(/\b(\d{1,2})\s*-\s*(\d{1,2})\b/);
    if (matched) {
      const start = coerceInt(matched[1]);
      const end = coerceInt(matched[2]);
      if (start && end && end >= start) {
        for (let d = start; d <= end; d++) {
          eventMap[d] = eventMap[d] || [];
          eventMap[d].push(ev);
        }
        continue;
      }
    }

    // Bare day or "Oct 3" / "July 14, 2025" — fall through to plain day match
    matched = unified.match(/\b(\d{1,2})\b/);
    if (matched) {
      const day = coerceInt(matched[1]);
      if (day) {
        eventMap[day] = eventMap[day] || [];
        eventMap[day].push(ev);
      }
    }
  }
  return eventMap;
}
