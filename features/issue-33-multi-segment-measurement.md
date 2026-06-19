# Issue #33: Multi-Segment Measurement

## Implementation plan

- Rework measurement interaction into a multi-segment state machine in `src/measure.js`.
- Keep desktop map interactions on primary click and use right-click/context-menu suppression for vertex placement.
- Keep mobile entry on long press, and treat the long-press drag/release path as the segment placement flow so issue `#40` is covered by the same event rewrite.
- Expand formatting helpers and tests for nautical miles plus total/per-segment reporting.
- Add Playwright coverage for desktop multi-segment placement, left-click clearing, and mobile long-press regression coverage.

## Feature guide

- Desktop: right-click adds measurement vertices, mouse movement previews the trailing segment, and any left-click clears the measurement before normal click behavior continues.
- Mobile: long press starts segment placement, dragging adjusts the active segment, and a short tap clears the current measurement.
- Output now includes total distance and per-segment breakdowns for both geodesic and spherical calculations in kilometers and nautical miles.
