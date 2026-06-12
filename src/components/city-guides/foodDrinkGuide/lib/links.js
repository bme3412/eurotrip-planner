/**
 * Reservation link for a restaurant card.
 *
 * The culinary data has a `booking_url` field but it is null across the
 * corpus today, so the practical path is: use it when present, otherwise a
 * Google search for "{name} {city} reservations" — one click from the
 * restaurant's own site / TheFork / Google Reserve.
 *
 * Pure, plain-Node testable.
 */
export function buildReservationUrl(restaurant, cityName) {
  if (restaurant?.booking_url) return restaurant.booking_url;
  if (!restaurant?.name) return null;
  const query = [restaurant.name, cityName, 'reservations'].filter(Boolean).join(' ');
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
