# web-tilelayer

A browser-based map viewer for aviation charts and related geospatial data,
built on [OpenLayers](https://openlayers.org/). It renders raster and vector
[PMTiles](https://docs.protomaps.com/pmtiles/) archives (and `custom-zxy` tile
templates) in the chart's native projection rather than Web Mercator, and
overlays features such as FAA navaids, digital obstacles, satellite imagery,
and slope shading.

web-tilelayer is the viewer component of the broader **flyer-maps** tool set.
It consumes tiles and manifests produced by the companion
[`map-data-tools`](https://github.com/msh9/map-data-tools) pipeline. This
repository contains the viewer only; the tile data itself is generated
separately and is not bundled here.

## Features

- Renders in the chart's embedded CRS (ESRI:102009 Lambert Conformal Conic), not
  Web Mercator; cursor readout converts to WGS84 latitude/longitude. See
  [`adr/ADR-001 CRS.md`](<adr/ADR-001 CRS.md>).
- Raster PMTiles layers (AVIF/WebP) and `custom-zxy` URL-template layers.
- Vector PMTiles (MVT) overlays with click/tap popups — e.g. FAA navaids and
  digital obstacles.
- WebGL slope-shading overlay for non-image raster data.
- Per-layer visibility, layer groups, resolution-constrained zoom, rotation
  controls, scale bar, and per-layer attribution.

## Prerequisites

- [Node.js](https://nodejs.org/) 22.x (the version used in CI).

## Setup

```bash
npm install --cache .npm-cache
npx playwright install chromium   # only needed to run e2e/visual tests

# Provide the build-time manifest URL and a local manifest. Both targets are
# git-ignored, so each clone supplies its own:
cp .env.example .env.development
cp local/map-config.example.json local/map-config.json
```

`.env.example` documents the single build-time variable, `VITE_MANIFEST_URL`.
`local/map-config.example.json` is a ready-to-use sample manifest.

## Running

```bash
npm run dev
```

By default the dev server loads the manifest at `/local/map-config.json` (the
copy you created in Setup). The sample manifest references tile archives under
`local/tiles/`, which is **git-ignored** and must be populated with your own
PMTiles (e.g. output from
[`map-data-tools`](https://github.com/msh9/map-data-tools)). The Vite dev
server serves `local/tiles/` at `/tiles/*`.

To load a different manifest at runtime, append `?manifestUrl=...` to the URL:

```
http://localhost:5173/?manifestUrl=/tests/fixtures/manifest.multilayer.json
```

A manifest can also be supplied via the `manifestUrl` argument to `renderApp`,
the `manifest-url` attribute on `<tile-viewer-app>`,
`window.FLYER_MAPS_CONFIG.manifestUrl`, or a
`<meta name="flyer-manifest-url" content="...">` tag.

## Commands

```bash
npm run dev                 # start the dev server
npm run build               # production build
npm run build:prod          # build, then verify dist/ is app-only
npm run preview             # serve the built dist/ (no /tiles or /fixtures mounts)
npm run verify:dist         # assert dist/ has no fixtures, tiles, or harness files
npm run test                # unit tests (vitest)
npm run test:e2e            # end-to-end tests (Playwright)
npm run test:visual         # visual regression tests
npm run test:visual:update  # update visual snapshots
npm run lint                # eslint
npm run format              # prettier --write
```

## Manifest configuration

The startup manifest URL is set at build time via `VITE_MANIFEST_URL`. Copy
`.env.example` to `.env.development` (and/or `.env.production`) and adjust;
the example uses `/local/map-config.json` for development and suggests
`/map-media/map-config.json` for production.

The viewer's manifest schema lives in
[`contracts/tiler-manifest.schema.json`](contracts/tiler-manifest.schema.json)
(`schemaVersion: "3.0"`). The viewer also accepts `raster-tilemaker`
`tile_config.json` input (`schemaVersion: "1.0"`) and normalizes it to the
viewer shape at load time. Layer tiles support both `custom-zxy` URL templates
and `pmtiles` archives; layer attribution is a plain string.

## Architecture decisions

Key design decisions are recorded as ADRs in [`adr/`](adr/). Of particular
note: rendering in the chart CRS (ADR-001), the custom tiling scheme
(ADR-002), tile encoding (ADR-003), and resolution-based zoom levels
(ADR-005).

## Data and attribution

Tile data is not included in this repository. The sample manifest references
publicly available sources, including FAA aeronautical data, Copernicus
Sentinel-2 imagery, and USGS elevation data; consult each provider for its
terms of use. Per-layer attribution strings are carried in the manifest and
rendered by the viewer.

## License

[MIT](LICENSE) © Michael Hughes
