export function clientIP(req){
  const xff = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.headers['x-real-ip'] || '';
}
export function todayYMD(){
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset()*60000).toISOString().slice(0,10);
}
function parseIPs(s){ return s? s.split(',').map(x=>x.trim()).filter(Boolean):[]; }
export const CONFIG = {
  PUBLIC_IPS: parseIPs(process.env.PUBLIC_IPS || ''),
  SKIP_GEOFENCE: String(process.env.SKIP_GEOFENCE || 'true').toLowerCase()==='true'
};
