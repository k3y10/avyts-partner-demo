# Imported Terrain Data Contract

Use this directory as a staging area while preparing authoritative mapping layers for the TS-only AvyTS app.

The running app reads bundled assets from `public/terrain/`. When you are ready to publish updated terrain files, copy the final GeoJSON outputs there.

Required files for import-first mode:

- `zones.geojson`
- `terrain_cells.geojson`

If `NEXT_PUBLIC_REQUIRE_LIVE_TERRAIN_DATA=1`, the built-in Next.js API returns `503` when the required terrain files are unavailable.

## zones.geojson

Use a GeoJSON `FeatureCollection` of polygon features.

Recommended properties:

- `zoneId`
- `zoneName`
- `region`
- `issuedAt`
- `summary`
- `terrainIntelSummary`
- `forecastHeadline`
- `overall`
- `aboveTreeline`
- `nearTreeline`
- `belowTreeline`
- `confidence`
- `recentSnowfallIn`
- `windSpeedMph`
- `windDirection`
- `temperatureF`
- `avalancheProblems` as a JSON array or native array

## terrain_cells.geojson

Use a GeoJSON `FeatureCollection` of polygon features, ideally one feature per H3 cell.

Recommended properties:

- `cellId`
- `zoneId`
- `h3Index`
- `dangerRating`
- `slopeAngleBand` or `slopeMin` + `slopeMax`
- `aspect`
- `elevationFt`
- `elevationBand`
- `loadingExposure`
- `terrainTrapProximity`
- `operationalSummary`
- `cautionSummary`
- `relativeRiskExplanation`
- `score`
- `centroid` as `[longitude, latitude]` when you want to control popup placement explicitly

Keep `h3Index` authoritative. The frontend renders terrain cells using deck.gl's H3 layer, so the index must match the imported polygon and the intended resolution.