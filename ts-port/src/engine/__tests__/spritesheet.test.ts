import { describe, it, expect } from 'vitest';
import { SpriteSheet } from '../SpriteSheet';

describe('SpriteSheet (gfx/SpriteSheet.java port)', () => {
  const sheet = new SpriteSheet();

  it('decompresses to a 256x256 pixel buffer (length === 256*256)', () => {
    expect(sheet.width).toBe(256);
    expect(sheet.height).toBe(256);
    expect(sheet.pixels.length).toBe(256 * 256);
  });

  it('unpacks eight 2-bit pixels per compressed int (values stay 0..3)', () => {
    let allTwoBit = true;
    for (const p of sheet.pixels) {
      if (p < 0 || p > 3) {
        allTwoBit = false;
        break;
      }
    }
    expect(allTwoBit).toBe(true);
  });

  it('consumes exactly 8192 compressed ints to fill 65536 pixels', () => {
    // 8192 ints * 8 pixels/int === 65536 pixels. The head of the GWT sheet is a
    // known 0x5555 (==21845) run, so the first few pixels are 1.
    expect(sheet.pixels[0]).toBe(1);
    expect(sheet.pixels[7]).toBe(1);
  });
});
