/**
 * Port of gfx/Screen.java — a software pixel buffer holding palette *indices*
 * (0..255), not RGB. This is the heart of the rendering pipeline: the game
 * logic draws tiles/entities as palette indices into `pixels` (a Uint8Clamped
 * array, equivalent to the GWT CanvasPixelArray's 0..255 clamping), and the
 * Renderer expands those indices through the 256-colour palette into RGBA in
 * the canvas ImageData. The algorithm is 1:1 with the GWT version.
 */
import type { SpriteSheet } from './SpriteSheet';
import { Font } from './Font';

export class Screen {
  public xOffset = 0;
  public yOffset = 0;

  public static readonly BIT_MIRROR_X = 0x01;
  public static readonly BIT_MIRROR_Y = 0x02;

  public readonly w: number;
  public readonly h: number;
  /** Palette indices, one per pixel. 255 = transparent. */
  public pixels: Uint8ClampedArray;

  private sheet: SpriteSheet;

  constructor(w: number, h: number, sheet: SpriteSheet) {
    this.sheet = sheet;
    this.w = w;
    this.h = h;
    this.pixels = new Uint8ClampedArray(w * h);
  }

  public clear(color: number): void {
    this.pixels.fill(color & 0xff);
  }

  /**
   * Draw an 8x8 tile from the sprite sheet at (xp, yp) using `colors` as a
   * 4-byte shade selector and `bits` for mirroring. See Color.ts for how the
   * selector packs four shade digits.
   */
  public render(xp: number, yp: number, tile: number, colors: number, bits: number): void {
    xp -= this.xOffset;
    yp -= this.yOffset;
    const mirrorX = (bits & Screen.BIT_MIRROR_X) > 0;
    const mirrorY = (bits & Screen.BIT_MIRROR_Y) > 0;

    const xTile = tile % 32;
    const yTile = (tile / 32) | 0;
    const toffs = xTile * 8 + yTile * 8 * this.sheet.width;

    for (let y = 0; y < 8; y++) {
      let ys = y;
      if (mirrorY) ys = 7 - y;
      if (y + yp < 0 || y + yp >= this.h) continue;
      for (let x = 0; x < 8; x++) {
        if (x + xp < 0 || x + xp >= this.w) continue;

        let xs = x;
        if (mirrorX) xs = 7 - x;
        const sp = this.sheet.pixels[xs + ys * this.sheet.width + toffs];
        const col = (colors >> (sp * 8)) & 0xff;
        if (col < 255) this.pixels[(x + xp) + (y + yp) * this.w] = col;
      }
    }
  }

  /**
   * Draws an 8x8 1-bit glyph bitmap (on-pixel == 1) at (xp, yp) using the same
   * color mapping as {@link render}. Used by Font for characters not present in
   * the sprite sheet (built-in bitmap fallback) so the 8px monospace grid and
   * palette coloring stay identical to ASCII text. `glyph` is a flat 64-int
   * array indexed [x + y * 8]; 1 means "on" (matching the sheet convention).
   */
  public renderGlyph(xp: number, yp: number, glyph: number[], colors: number): void {
    xp -= this.xOffset;
    yp -= this.yOffset;
    for (let y = 0; y < 8; y++) {
      const ys = y;
      if (y + yp < 0 || y + yp >= this.h) continue;
      for (let x = 0; x < 8; x++) {
        if (x + xp < 0 || x + xp >= this.w) continue;
        const sp = glyph[x + ys * 8];
        const col = (colors >> (sp * 8)) & 0xff;
        if (col < 255) this.pixels[(x + xp) + (y + yp) * this.w] = col;
      }
    }
  }

  /**
   * Convenience text entry point (mirrors gfx.Font.draw). Delegates to the Font
   * module, which renders each glyph 8px apart via {@link render} / {@link
   * renderGlyph}.
   */
  public draw(text: string, x: number, y: number, color: number): void {
    Font.draw(text, this, x, y, color);
  }

  public setOffset(xOffset: number, yOffset: number): void {
    this.xOffset = xOffset;
    this.yOffset = yOffset;
  }

  // Dither matrix used by overlay() (4x4, kept verbatim from the original).
  private dither = [
    0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5,
  ];

  /** Simple darkening overlay (e.g. underground darkness) driven by a second screen. */
  public overlay(screen2: Screen, xa: number, ya: number): void {
    const oPixels = screen2.pixels;
    let i = 0;
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (((oPixels[i] / 10) | 0) <= this.dither[((x + xa) & 3) + ((y + ya) & 3) * 4]) {
          this.pixels[i] = 0;
        }
        i++;
      }
    }
  }

  /** Additive radial light contribution (radius r around x,y). */
  public renderLight(x: number, y: number, r: number): void {
    x -= this.xOffset;
    y -= this.yOffset;
    const x0 = Math.max(0, x - r);
    const x1 = Math.min(this.w, x + r);
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(this.h, y + r);
    for (let yy = y0; yy < y1; yy++) {
      const yd = yy - y;
      const yd2 = yd * yd;
      for (let xx = x0; xx < x1; xx++) {
        const xd = xx - x;
        const dist = xd * xd + yd2;
        if (dist <= r * r) {
          const br = 255 - ((dist * 255) / (r * r) | 0);
          if (this.pixels[xx + yy * this.w] < br) this.pixels[xx + yy * this.w] = br;
        }
      }
    }
  }
}
