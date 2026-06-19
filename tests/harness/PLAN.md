# Playwright harness plan

## Outcome goal

Provide a deterministic, offline Playwright test harness that exercises the real UI in Chromium headless and supports both quantitative assertions and visual conformance snapshots for Milestone 1.

## Acceptance criteria

- A dedicated test harness page renders synthetic tiles in a fixed viewport using the Vite dev server.
- Quantitative Playwright tests can assert the exact tile z/x/y set and view state.
- Visual snapshot tests compare a stable baseline image with a pixel-diff threshold.
- The harness is offline-capable (tiles served locally) and deterministic (fixed viewport, DPR, reduced motion).
- Commands are available to run headless tests and update snapshots.

## Changes to make

- Add Playwright config + scripts for `test:e2e` and visual snapshots.
- Add a test harness HTML entrypoint + minimal renderer + CSS.
- Add synthetic manifest + tiles as fixtures.
- Add one quantitative test and one visual snapshot test.
