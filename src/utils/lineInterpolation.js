/**
 * Utility functions for interpolating positions along route lines
 * and calculating bearings for icon rotation.
 */

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Interpolate position along a straight line between two points.
 *
 * @param {Array} from - [longitude, latitude] of start point
 * @param {Array} to - [longitude, latitude] of end point
 * @param {number} progress - Value between 0 and 1 (0 = start, 1 = end)
 * @returns {Array} [longitude, latitude] of interpolated point
 */
export function interpolatePosition(from, to, progress) {
  const lng = from[0] + (to[0] - from[0]) * progress;
  const lat = from[1] + (to[1] - from[1]) * progress;
  return [lng, lat];
}

/**
 * Interpolate position along a great circle arc (for long distances like flights).
 * Uses spherical interpolation for more accurate curved paths.
 *
 * @param {Array} from - [longitude, latitude] of start point
 * @param {Array} to - [longitude, latitude] of end point
 * @param {number} progress - Value between 0 and 1
 * @returns {Array} [longitude, latitude] of interpolated point
 */
export function interpolateGreatCircle(from, to, progress) {
  const lat1 = toRadians(from[1]);
  const lng1 = toRadians(from[0]);
  const lat2 = toRadians(to[1]);
  const lng2 = toRadians(to[0]);

  // Calculate angular distance
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lng2 - lng1) / 2), 2)
    )
  );

  // If points are very close, use linear interpolation
  if (d < 0.00001) {
    return interpolatePosition(from, to, progress);
  }

  const a = Math.sin((1 - progress) * d) / Math.sin(d);
  const b = Math.sin(progress * d) / Math.sin(d);

  const x = a * Math.cos(lat1) * Math.cos(lng1) + b * Math.cos(lat2) * Math.cos(lng2);
  const y = a * Math.cos(lat1) * Math.sin(lng1) + b * Math.cos(lat2) * Math.sin(lng2);
  const z = a * Math.sin(lat1) + b * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lng = Math.atan2(y, x);

  return [toDegrees(lng), toDegrees(lat)];
}

/**
 * Calculate bearing (heading) from one point to another.
 * Used to rotate transport icons to face the direction of travel.
 *
 * @param {Array} from - [longitude, latitude] of start point
 * @param {Array} to - [longitude, latitude] of end point
 * @returns {number} Bearing in degrees (0-360, where 0 = North, 90 = East)
 */
export function calculateBearing(from, to) {
  const lng1 = toRadians(from[0]);
  const lat1 = toRadians(from[1]);
  const lng2 = toRadians(to[0]);
  const lat2 = toRadians(to[1]);

  const dLng = lng2 - lng1;

  const x = Math.sin(dLng) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  let bearing = toDegrees(Math.atan2(x, y));

  // Normalize to 0-360
  bearing = (bearing + 360) % 360;

  return bearing;
}

/**
 * Calculate the distance between two points in kilometers.
 * Uses the Haversine formula.
 *
 * @param {Array} from - [longitude, latitude] of start point
 * @param {Array} to - [longitude, latitude] of end point
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(from, to) {
  const R = 6371; // Earth's radius in km
  const lat1 = toRadians(from[1]);
  const lat2 = toRadians(to[1]);
  const dLat = toRadians(to[1] - from[1]);
  const dLng = toRadians(to[0] - from[0]);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Easing function for smoother animation (ease-in-out-quad)
 *
 * @param {number} t - Progress value between 0 and 1
 * @returns {number} Eased progress value
 */
export function easeInOutQuad(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
