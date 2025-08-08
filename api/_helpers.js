import { strictEqual } from "assert";

// Utilities for request handling and environment configuration.
//
// The original project only exposed a small helper for reading the client IP
// address and formatting dates. This version expands upon those helpers by
// introducing basic geofencing support. A geofence can be defined via
// environment variables and is used by the event handlers to ensure that
// employees can only perform actions (check in/out or start/end breaks)
// when physically located within an allowed area. The helpers also expose
// functions for parsing and validating latitude/longitude values and
// computing distances between two geo‑coordinates using the haversine
// formula.

// Return the client’s public IP address. Vercel sets x‑forwarded‑for and
// x‑real-ip when running behind their proxies. If neither header is
// present an empty string is returned.
export function clientIP(req){
  const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.headers['x-real-ip'] || '';
}

// Format the current date in YYYY-MM-DD (local) notation. This helper
// compensates for timezone offsets to ensure consistent day boundaries.
export function todayYMD(){
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,10);
}

// Parse a comma-separated list of IP addresses into an array. Any empty
// entries are removed. If an environment variable is not set or empty
// this function returns an empty array.
function parseIPs(s){
  return s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
}

// Compute the haversine distance between two points on Earth in meters.
// lat/lon arguments should be numbers expressed in decimal degrees. The
// implementation uses a standard spherical earth radius of 6371 km.
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (d) => d * Math.PI / 180;
  const R = 6371000; // metres
  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δφ = toRad(lat2 - lat1);
  const Δλ = toRad(lon2 - lon1);
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Global configuration derived from environment variables. PUBLIC_IPS lists
// IP addresses allowed to access the system; SKIP_GEOFENCE disables
// geofence checks entirely; GEOFENCE_CENTER expects a string like
// "41.0082,28.9784" (lat,lon); GEOFENCE_RADIUS_METERS defines the
// permitted radius in metres. When the center or radius are not provided
// the geofence check always returns true.
export const CONFIG = {
  PUBLIC_IPS: parseIPs(process.env.PUBLIC_IPS || ''),
  SKIP_GEOFENCE: String(process.env.SKIP_GEOFENCE || 'true').toLowerCase() === 'true',
  GEOFENCE_CENTER: (() => {
    const s = process.env.GEOFENCE_CENTER || '';
    const parts = s.split(',').map(p => parseFloat(p.trim())).filter(x => !Number.isNaN(x));
    return parts.length === 2 ? { lat: parts[0], lon: parts[1] } : null;
  })(),
  GEOFENCE_RADIUS_METERS: Number(process.env.GEOFENCE_RADIUS_METERS || 0)
};

// Test whether a given point is inside the configured geofence. If no
// geofence is defined (missing center or radius) this function returns
// true. If SKIP_GEOFENCE is enabled the caller should skip this check
// entirely. Latitude and longitude should be numbers.
export function withinGeofence(lat, lon) {
  if (!CONFIG.GEOFENCE_CENTER || !CONFIG.GEOFENCE_RADIUS_METERS) return true;
  const { lat: clat, lon: clon } = CONFIG.GEOFENCE_CENTER;
  const dist = haversineDistance(lat, lon, clat, clon);
  return dist <= CONFIG.GEOFENCE_RADIUS_METERS;
}
