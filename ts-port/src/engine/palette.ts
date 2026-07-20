/**
 * Port of the 6x6x6 palette generation performed in Game.init().
 *
 * The original builds `colors[256]` by sweeping r,g,b in 0..5, interpolating
 * each to 0..255, computing a luminance `mid`, and deriving a slightly washed
 * out channel value. Index 0..215 are valid (6^3); indices 216..255 are unused
 * padding. A palette index of 255 is treated as "transparent" by the renderer.
 */

/** Build the 256-entry RGB-packed palette used to expand screen pixel indices. */
export function buildPalette(): number[] {
  const colors: number[] = new Array(256).fill(0);
  let pp = 0;
  for (let r = 0; r < 6; r++) {
    for (let g = 0; g < 6; g++) {
      for (let b = 0; b < 6; b++) {
        const rr = ((r * 255) / 5) | 0;
        const gg = ((g * 255) / 5) | 0;
        const bb = ((b * 255) / 5) | 0;
        const mid = (((rr * 30 + gg * 59 + bb * 11) / 100) | 0);

        const r1 = ((((rr + mid) / 2) | 0) * 230 / 255 | 0) + 10;
        const g1 = ((((gg + mid) / 2) | 0) * 230 / 255 | 0) + 10;
        const b1 = ((((bb + mid) / 2) | 0) * 230 / 255 | 0) + 10;

        colors[pp++] = (r1 << 16) | (g1 << 8) | b1;
      }
    }
  }
  // Indices 216..255 are unused padding (kept at 0).
  return colors;
}

/**
 * Expand a screen palette index (0..255) into RGB using the global palette.
 * Returns null for the transparent sentinel (index 255) or out-of-range input.
 */
export function paletteToRGBA(
  index: number,
  colors: number[],
): [number, number, number] | null {
  if (index < 0 || index >= 255) return null;
  const rgba = colors[index] | 0;
  const r = (rgba >> 16) & 0xff;
  const g = (rgba >> 8) & 0xff;
  const b = rgba & 0xff;
  return [r, g, b];
}
