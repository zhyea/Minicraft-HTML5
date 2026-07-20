import { describe, it, expect } from 'vitest';
import { Color } from '../Color';

describe('Color (gfx/Color.java port)', () => {
  it('get1 maps a single shade digit to a 0..215 palette index', () => {
    expect(Color.get1(0)).toBe(0);
    expect(Color.get1(5)).toBe(5);
    // 100 -> r=1, g=0, b=0 -> 1*36 = 36
    expect(Color.get1(100)).toBe(36);
    // 555 -> r=5, g=5, b=5 -> 5*36 + 5*6 + 5 = 215
    expect(Color.get1(555)).toBe(215);
  });

  it('get1 returns 255 for the transparent sentinel (-1)', () => {
    expect(Color.get1(-1)).toBe(255);
  });

  it('get packs four digits into a 32-bit shade selector', () => {
    expect(Color.get(0, 0, 0, 0)).toBe(0);
    const all = Color.get(555, 555, 555, 555);
    expect(all).toBe((215 << 24) + (215 << 16) + (215 << 8) + 215);
    const trans = Color.get(-1, -1, -1, -1);
    expect(trans).toBe((255 << 24) + (255 << 16) + (255 << 8) + 255);
  });
});
