# Issue 37 — Per-Layer Release Metadata (Effective Date + Data Cut / Window)

Each map layer can now carry a structured `release` object in the manifest that describes the data currency of that layer. Supported fields are `effectiveDate` (e.g. an FAA chart cycle date), `dataCutDate` (the most recent record in the source dataset), and `dataWindow` (a start/end date range). When present, the date information is automatically appended to the layer's attribution string shown in the OpenLayers attribution control, and the effective date is displayed beside the layer name in the Options panel.

To use it, add a `release` block to any layer in `map-config.json`:

```json
{
  "release": { "effectiveDate": "2025-01-23" }
}
```
