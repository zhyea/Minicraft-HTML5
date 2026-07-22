/**
 * Port of entity/particle/TextParticle.java.
 *
 * A floating damage/number readout. The GWT physics (gaussian jitter + bounce)
 * are ported 1:1; render() now blits the real string through Font.draw (the
 * gfx.Font Java port) instead of a single coloured marker, so damage numbers
 * show as actual digits — fixing the "colour block" regression.
 */
import { Entity } from '../Entity';
import type { Screen } from '../../../engine/Screen';
import { Rand } from '../../../engine/Rand';
import { Font } from '../../../engine/Font';

export class TextParticle extends Entity {
  private col: number;
  private msg: string;
  private time = 0;
  public xa = 0;
  public ya = 0;
  public za = 0;
  public xx = 0;
  public yy = 0;
  public zz = 0;
  private rand = new Rand();

  constructor(msg: string, x: number, y: number, col: number) {
    super();
    this.x = x;
    this.y = y;
    this.col = col;
    this.msg = msg;
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
    Font.draw(this.msg, screen, px, py, this.col);
  }
}
