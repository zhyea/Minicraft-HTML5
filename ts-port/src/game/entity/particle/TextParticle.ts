/**
 * Port of entity/particle/TextParticle.java.
 *
 * A floating damage/number readout. The GWT physics (gaussian jitter + bounce)
 * are ported 1:1; the text glyphs (gfx.Font.draw) are not ported in the slice,
 * so render() draws a single coloured marker at the particle's floating
 * position instead of the string — faithful behaviour, simplified visual.
 */
import { Entity } from '../Entity';
import type { Screen } from '../../../engine/Screen';
import { Rand } from '../../../engine/Rand';

export class TextParticle extends Entity {
  private col: number;
  private time = 0;
  public xa = 0;
  public ya = 0;
  public za = 0;
  public xx = 0;
  public yy = 0;
  public zz = 0;
  private rand = new Rand();

  constructor(_msg: string, x: number, y: number, col: number) {
    super();
    this.x = x;
    this.y = y;
    this.col = col;
    this.xx = x;
    this.yy = y;
    this.zz = 2;
    this.xa = this.rand.nextGaussian() * 0.3;
    this.ya = this.rand.nextGaussian() * 0.2;
    this.za = this.rand.next() * 0.7 + 2;
  }

  public tick(): void {
    this.time++;
    if (this.time > 60) {
      this.remove();
      return;
    }
    this.xx += this.xa;
    this.yy += this.ya;
    this.zz += this.za;
    if (this.zz < 0) {
      this.zz = 0;
      this.za *= -0.5;
      this.xa *= 0.6;
      this.ya *= 0.6;
    }
    this.za -= 0.15;
    this.x = Math.floor(this.xx);
    this.y = Math.floor(this.yy);
  }

  public render(screen: Screen): void {
    const px = this.x;
    const py = this.y - Math.floor(this.zz);
    screen.render(px, py, 5 + 12 * 32, this.col, 0);
  }
}
