import { CONFIG } from '../_helpers.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  res.json({
    ok: true,
    geofence_center: CONFIG.GEOFENCE_CENTER,
    geofence_radius_meters: CONFIG.GEOFENCE_RADIUS_METERS,
    skip_geofence: CONFIG.SKIP_GEOFENCE,
    ip_allow_list_active: CONFIG.PUBLIC_IPS.length > 0
  });
}
