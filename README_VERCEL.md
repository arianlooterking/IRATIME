# IRATIME on Vercel

Production-ready geofenced time tracking.

## Quick start
1. Provision a PostgreSQL database (Neon, Supabase, etc.).
2. Import this repo into GitHub and deploy with Vercel.
3. Set environment variables on Vercel:
   - `DATABASE_URL` – Postgres connection string
   - `PUBLIC_IPS` – comma-separated list of allowed public IPs (empty = allow all)
   - `GEOFENCE_CENTER` – "lat,lon" of workplace
   - `GEOFENCE_RADIUS_METERS` – radius around center
   - `SKIP_GEOFENCE` – `true` to bypass location checks
   - `ROUTER_WEBHOOK_SECRET` – secret string for router webhook
4. Deploy and open the app. Register a device then use the actions.

## Router webhook
Configure your Wi-Fi router to POST to `/api/router/webhook` with header `x-router-secret` set to `ROUTER_WEBHOOK_SECRET` and body:
```json
{ "event":"assoc|disassoc", "wifi_mac":"aa:bb:cc:dd:ee:ff", "device_uuid":"optional", "lat":0, "lon":0 }
```
`assoc` triggers check-in, `disassoc` triggers check-out.
