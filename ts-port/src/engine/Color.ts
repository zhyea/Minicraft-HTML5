/**
 * Port of gfx/Color.java.
 *
 * Color.get(a, b, c, d) packs four "shade" digits (each 0..5, with -1 meaning
 * 255 / transparent) into a 32-bit selector. Each digit maps to one of 216
 * palette entries via get1(). Screen.render() later picks one of the four
 * bytes (based on the sprite-sheet pixel 0..3) to obtain a 0..215 palette
 * index, which the global 256-colour palette (palette.ts) expands to RGB.
 */

export class Color {
  /** Pack four shade digits into a 32-bit selector (a=LSB byte .. d=MSB byte). */
  static get(a: number, b: number, c: number, d: number): number {
    return (Color.get1(d) << 24) + (Color.get1(c) << 16) + (Color.get1(b) << 8) + Color.get1(a);
  }

  /** Map a single -1..555 shade digit to a 0..215 palette index. */
  static get1(d: number): number {
    if (d < 0) return 255;
    const r = Math.floor(d / 100) % 10;
    const g = Math.floor(d / 10) % 10;
    const b = d % 10;
    return r * 36 + g * 6 + b;
  }
}
