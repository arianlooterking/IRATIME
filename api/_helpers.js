export function clientIP(req) {
  const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.headers['x-real-ip'] || '';
}

export function todayYMD() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function parseIPs(s) {
  return s ? s.split(',').map(x => x.trim()).filter(Boolean) : [];
}

function parseCenter(s) {
  if (!s) return null;
  const parts = s.split(',').map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) return null;
  return { lat: parts[0], lon: parts[1] };
}

export const CONFIG = {
  PUBLIC_IPS: parseIPs(process.env.PUBLIC_IPS || ''),
  GEOFENCE_CENTER: parseCenter(process.env.GEOFENCE_CENTER || ''),
  GEOFENCE_RADIUS_METERS: Number(process.env.GEOFENCE_RADIUS_METERS || 0),
  SKIP_GEOFENCE: String(process.env.SKIP_GEOFENCE || 'false').toLowerCase() === 'true',
  ROUTER_WEBHOOK_SECRET: process.env.ROUTER_WEBHOOK_SECRET || ''
};

export function withinGeofence(lat, lon) {
  if (!CONFIG.GEOFENCE_CENTER || !CONFIG.GEOFENCE_RADIUS_METERS) return true;
  const R = 6371000; // meters
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat - CONFIG.GEOFENCE_CENTER.lat);
  const dLon = toRad(lon - CONFIG.GEOFENCE_CENTER.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(CONFIG.GEOFENCE_CENTER.lat)) *
      Math.cos(toRad(lat)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= CONFIG.GEOFENCE_RADIUS_METERS;
}
