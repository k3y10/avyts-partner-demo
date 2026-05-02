# AvyTS Terrain Intelligence TS Copy

This folder is a standalone TypeScript-only copy of the AvyTS terrain-intel prototype for side-by-side Vercel testing.

## What changed

- Next.js serves both the frontend and backend from one deployment.
- The legacy Python `api/` prototype and Flask scripts are intentionally removed from this copy.
- Built-in route handlers under `app/api/` serve the terrain, forecast, observation, and reporting endpoints.
- The TS-only copy now defaults to a real-only runtime path: live UAC advisories, imported terrain assets, and stored observations.
- Disabled services now fail honestly instead of silently serving seeded demo content.

## Project shape

```text
.
├── app/
│   └── api/
├── components/
├── data/
├── hooks/
├── lib/
├── public/
│   └── terrain/
├── tests/
├── types/
├── package.json
└── .env.example
```

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs on `http://127.0.0.1:3000` and uses its own built-in `/api` routes by default.

## Environment

Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in `.env.local` if you want the live Mapbox basemap.

Leave `NEXT_PUBLIC_API_BASE_URL` unset for the normal TS-only path. Only set it if you intentionally want this frontend to target another backend.

Set `DATABASE_URL` if you want submitted observations stored in Postgres through Prisma. If `DATABASE_URL` is not set, the app falls back to local JSON storage during development and temp-directory storage on Vercel.

`NEXT_PUBLIC_REQUIRE_LIVE_TERRAIN_DATA` now defaults to real-only behavior. Set `NEXT_PUBLIC_REQUIRE_LIVE_TERRAIN_DATA=0` only if you intentionally want the older mock-backed demo fallback path for prototype comparison.

Set these server-side variables to protect the internal workspaces:

```bash
AVYTS_ADMIN_USERNAME=admin
AVYTS_ADMIN_PASSWORD=your-strong-password
AVYTS_AUTH_SECRET=your-long-random-secret
```

Optional write location for submitted observations:

```bash
AVYTS_OBSERVATION_STORAGE_DIR=/absolute/path/for/local-observation-storage
```

## Prisma

This copy now includes a Prisma schema at `prisma/schema.prisma` for the mutable observation data path.

Typical setup:

```bash
npm install
npx prisma generate
npx prisma db push
```

The API uses Prisma for `GET /api/observations/recent` and `POST /api/observations/submit` when `DATABASE_URL` is configured. The rest of the terrain and forecast routes remain file-backed and deterministic.

## Backend routes

The built-in Next.js backend serves:

- `GET /api/health`
- `GET /api/sources/status`
- `GET /api/zones`
- `GET /api/zones/<zone_id>`
- `GET /api/forecast/current`
- `GET /api/weather/stations`
- `GET /api/weather/stations/<station_id>`
- `GET /api/terrain/hex?zone_id=salt-lake`
- `GET /api/terrain/cell/<cell_id>`
- `GET /api/observations/recent`
- `POST /api/observations/submit`
- `GET /api/reports/daily-briefing?zone_id=salt-lake`
- `POST /api/sherpai/draft`
- `POST /api/sherpai/radio-ingest`

Observation submissions persist locally to disk during development. On Vercel they fall back to the writable temp directory, so the data is useful for free-tier testing but not durable.

With `DATABASE_URL` configured and Prisma generated, observation submissions instead persist to Postgres and behave more like a conventional app-backed project.

`GET /api/forecast/current` now hydrates imported UAC zones with live Utah Avalanche Center advisories.

`GET /api/observations/recent` now returns only persisted observations from Prisma or local storage; the seeded mock feed is no longer blended into the live path.

`GET /api/weather/stations` now returns live NWS observation stations selected near each Utah avalanche zone. This improves current temperature, wind, and humidity fidelity in the default runtime.

The current live weather path is still weaker than SNOTEL- or OpenSnow-style snow telemetry because NWS observations do not consistently expose snow depth or 24-hour snowfall. Those values are intentionally left blank instead of being synthesized.

`POST /api/sherpai/draft` and `POST /api/sherpai/radio-ingest` now return `501` until a real AI or speech pipeline is configured.

## Terrain data

Bundled terrain assets live in `public/terrain/`:

- `zones.geojson`
- `terrain_cells.geojson`

Those files override the synthetic terrain generator. If they are missing and strict mode is enabled, the built-in API returns `503` instead of silently falling back.

## Validation

```bash
npm run lint
npm run build
npm run test
```

## Deployment notes

- This copy is intended for a single Vercel project with no separate Python backend.
- `.vercelignore` excludes local artifacts and DEM staging files from deployment.
- The frontend defaults to `/api`, so frontend and backend behavior can be tested together on the free tier.
