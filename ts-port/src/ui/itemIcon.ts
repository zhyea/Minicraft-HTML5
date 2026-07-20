/**
 * Draws an Item's 8x8 sprite into a DOM <canvas> using the SAME engine helpers
 * the canvas renderer uses (SpriteSheet + the exact Color.get selector math +
 * buildPalette). This is the faithful, dependency-free way to show item icons
 * inside the Vue DOM menus — no new asset pipeline, just reuse.
 *
 * Transparency mirrors Screen.render(): a sprite-sheet pixel whose selected
 * palette byte is 255 (a Color digit of -1) is skipped, so it becomes a
 * transparent pixel here (the renderer treats 255 as transparent too).
 *
 * In a headless environment (jsdom) canvas 2D is a no-op; we bail out quietly
 * so component unit tests that only assert on text are unaffected.
 */
import { SpriteSheet } from '../engine/SpriteSheet';
import { buildPalette } from '../engine/palette';

const ICON_SIZE = 8;

export interface IconSource {
  getSprite(): number;
  getColor(): number;
}

export function renderItemIcon(canvas: HTMLCanvasElement, item: IconSource): void {
  let ctx: CanvasRenderingContext2D | null;
  try {
    ctx = canvas.getContext('2d');
  } catch {
    return; // jsdom: getContext throws "Not implemented" without canvas pkg
  }
  if (!ctx) return; // unsupported: null context, skip drawing
  canvas.width = ICON_SIZE;
  canvas.height = ICON_SIZE;

  const sheet = new SpriteSheet();
  const colors = buildPalette();
  const img = ctx.createImageData(ICON_SIZE, ICON_SIZE);

  const sprite = item.getSprite();
  const colorSel = item.getColor();
  const xTile = sprite % 32;
  const yTile = (sprite / 32) | 0;
  const toffs = xTile * 8 + yTile * 8 * sheet.width;

  for (let y = 0; y < ICON_SIZE; y++) {
    for (let x = 0; x < ICON_SIZE; x++) {
      const sp = sheet.pixels[x + y * sheet.width + toffs];
      const col = (colorSel >> (sp * 8)) & 0xff;
      const p = (x + y * ICON_SIZE) * 4;
      if (col >= 255) {
        img.data[p + 3] = 0; // transparent
        continue;
      }
      const rgba = colors[col] | 0;
      img.data[p] = (rgba >> 16) & 0xff;
      img.data[p + 1] = (rgba >> 8) & 0xff;
      img.data[p + 2] = rgba & 0xff;
      img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
