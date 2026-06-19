/**
 * WebGL tile style that maps slope data to a yellow-to-red gradient.
 *
 * Input tiles are LA (luminance + alpha) PNG. The browser decodes LA PNG to
 * RGBA (L->R=G=B, A->A), so band 1 (red) contains the slope intensity.
 *
 * Upstream dem-2-slope linearly stretches slope values from
 * [threshold, 90 degrees] to [1, 255], so the full 0-1 normalized range
 * is meaningful after WebGL normalization.
 *
 * Band 1 == 0 is transparent (below threshold).
 * Band 1 > 0 interpolates from faint yellow through orange to deep red
 * with increasing opacity, representing gentle to extreme slopes.
 */

// Normalized stop values across the full stretched range
const BAND_LOW = 10 / 255; // 10 degrees
const BAND_MID = 20 / 255; // 20 degrees
const BAND_MAX = 90 / 255; // maximum possible value

export function createSlopeShadingStyle() {
  return {
    color: [
      "case",
      ["==", ["band", 1], 0],
      [0, 0, 0, 0],
      ["<=", ["band", 1], BAND_LOW],
      [205, 85, 0, 0.4],
      ["<=", ["band", 1], BAND_MID],
      [205, 85, 0, 0.5],
      ["<=", ["band", 1], BAND_MAX],
      [205, 85, 0, 0.7],
      [205, 85, 0, 1]
    ]
  };
}
