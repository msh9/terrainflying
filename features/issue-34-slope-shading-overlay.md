# Issue #34 — Slope Shading Overlay

An optional slope shading overlay is available in the map Options panel under **Slope Shading**. When enabled, areas of steep terrain within mountainous regions are highlighted with a multi-part color ramp over the basemap. Gentle slopes near the threshold appear as faint yellow, moderate slopes as orange, and extreme slopes as organge with a higher alpha blend. The overlay is derived from USGS 3DEP 1-arc-second DEM data and is visible at the 20 m/px and 40 m/px zoom levels only. Attribution is displayed as "U.S. Geological Survey."

The slope data is delivered as a PMTiles archive containing lossless PNG tiles with two channels (luminance + alpha). The viewer applies a WebGL interpolation style that maps slope intensity to a yellow-orange-red gradient, keeping zero-slope areas fully transparent so the underlying VFR sectional chart remains visible.
