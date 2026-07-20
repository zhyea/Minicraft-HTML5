/**
 * Port of gfx/Sprite.java — a lightweight reference to a rectangular region of a
 * SpriteSheet. In the phase-0 engine the Screen reads sprite-sheet pixels
 * directly (so Sprite is currently only a data holder), but it is kept for
 * parity with the original architecture and future sprite-based rendering.
 */
import type { SpriteSheet } from './SpriteSheet';

export class Sprite {
  public x: number;
  public y: number;
  public w: number;
  public h: number;
  public img: SpriteSheet;

  constructor(x: number, y: number, w: number, h: number, img: SpriteSheet) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.img = img;
  }
}
