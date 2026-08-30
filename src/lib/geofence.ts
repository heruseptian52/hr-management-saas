const EARTH_RADIUS_M = 6_371_000;
const radians = (degrees: number) => degrees * Math.PI / 180;

export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = radians(lat2 - lat1);
  const dLon = radians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function isInsideGeofence(distanceM: number, radiusM: number) {
  return distanceM <= radiusM;
}
