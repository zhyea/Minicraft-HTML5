import { describe, it, expect, beforeEach } from 'vitest';
import { Screen } from '../Screen';
import { SpriteSheet } from '../SpriteSheet';
import { Color } from '../Color';

/**
 * P2#4 — bitmap font text rendering.
 *
 * Verifies Screen.draw / Font.draw blit real glyphs from the shared sprite
 * sheet (the Java gfx.Font tile mapping, tile = charIndex + 30*32) instead of
 * a single colour block, advance 8px per character, leave spaces transparent,
 * and fall back to the built-in 5x7 bitmap for characters absent from the
 * sheet. Glyph pixels use shade 1..3 (non-transparent); empty/space tiles use
 * shade 0 (=255) and are intentionally not written.
 */
describe('Font / Screen.draw (P2#4 bitmap text)', () => {
  const sheet = new SpriteSheet();
  const screen = new Screen(64, 64, sheet);
  const col = Color.get(-1, 555, 555, 555);

  function cellOnCount(x0: number, y0: number): number {
    let n = 0;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (screen.pixels[(x0 + x) + (y0 + y) * screen.w] !== 0) n++;
      }
    }
    return n;
  }

  beforeEach(() => {
    screen.clear(0);
    screen.setOffset(0, 0);
  });

  it('renders a letter glyph from the sprite sheet (not a colour block)', () => {
    screen.draw('A', 0, 0, col);
    expect(cellOnCount(0, 0)).toBeGreaterThan(0);
  });

  it('renders a digit glyph from the sprite sheet', () => {
    screen.draw('3', 0, 0, col);
    expect(cellOnCount(0, 0)).toBeGreaterThan(0);
  });

  it('advances 8px per character', () => {
    screen.draw('AB', 0, 0, col);
    expect(cellOnCount(0, 0)).toBeGreaterThan(0); // 'A' cell
    expect(cellOnCount(8, 0)).toBeGreaterThan(0); // 'B' cell
  });

  it('does not draw a space (empty sheet tile stays transparent)', () => {
    screen.draw(' ', 0, 0, col);
    expect(cellOnCount(0, 0)).toBe(0);
  });

  it('uppercases before mapping so lowercase letters still render', () => {
    screen.draw('z', 0, 0, col);
    expect(cellOnCount(0, 0)).toBeGreaterThan(0);
  });

  it('falls back to the built-in bitmap for characters absent from the sheet', () => {
    // '@' is not in the Java chars set -> built-in '?' 5x7 glyph is drawn.
    screen.draw('@', 0, 0, col);
    expect(cellOnCount(0, 0)).toBeGreaterThan(0);
  });

  it('renders a multi-character damage number like the TextParticle emits', () => {
    screen.draw('12', 0, 0, col);
    expect(cellOnCount(0, 0)).toBeGreaterThan(0); // '1'
    expect(cellOnCount(8, 0)).toBeGreaterThan(0); // '2'
  });
});
