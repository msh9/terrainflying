# Architecture Decision Records (ADRs)

This folder contains the architecture decisions that the web-tilelayer viewer
implements. They are the subset of the broader flyer-maps project's ADRs that
are relevant to the browser viewer; pipeline- and data-processing-only
decisions are intentionally omitted.

- `ADR-001 CRS.md` — render in the chart's embedded CRS (ESRI:102009), convert
  to WGS84 for cursor readout.
- `ADR-002 Raster Tiling.md` — custom XYZ tiling scheme based on the source
  data extent.
- `ADR-003 Raster Image Tile Encoding.md` — AVIF/WebP for image rasters, PNG
  (LA) for non-image raster data such as slope masks.
- `ADR-004 Language Choices.md` — JavaScript with modern ESM for the frontend;
  prefer minimal dependencies.
- `ADR-005 Zooming.md` — resolution-driven zoom levels.
