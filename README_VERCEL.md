# TimeGuard on Vercel (Wi-Fi only)

## Steps
1) Create a Neon or Supabase Postgres and copy the connection string.
2) Import this folder into a new GitHub repo.
3) On Vercel → New Project → Import the repo.
4) Set Environment Variables:
   - DATABASE_URL = <your postgres connection string>
   - PUBLIC_IPS    =   (leave blank for testing; set to your shop IP later)
   - SKIP_GEOFENCE = true
   - ROUTER_WEBHOOK_SECRET = <long random>   (optional; for router events)
5) Deploy. Open the URL → Register → Check In.

API routes live under `/api/*`.
