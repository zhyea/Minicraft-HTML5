/**
 * Port of entity/Spark.java — AirWizard's projectile.
 *
 * Faithful: a short-lived projectile that drifts by (xa, ya), damages any Mob
 * other than its AirWizard owner on contact, and is never blockable. The
 * end-of-life flicker is kept; audio is dropped (slice scope).
 */
import type { Screen } from '../../engine/Screen';
import { Color } from '../../engine/Color';
import { Entity } from './Entity';
import { Mob } from './Mob';
import { AirWizard } from './AirWizard';

export class Spark extends Entity {
  public xa: number;
  public ya: number;
  public xx: number;
  public yy: number;
  private time = 0;
  private lifeTime: number;
  private owner: AirWizard;

  constructor(owner: AirWizard, xa: number, ya: number) {
    super();
    this.owner = owner;
    this.xx = this.x = owner.x;
    this.yy = this.y = owner.y;
    this.xr = 0;
    this.yr = 0;
    this.xa = xa;
    this.ya = ya;
    this.lifeTime = 60 * 10 + Math.floor(Math.random() * 30);
  }

  public tick(): void {
    this.time++;
    if (this.time >= this.lifeTime) {
      this.remove();
      return;
    }
    this.xx += this.xa;
    this.yy += this.ya;
    this.x = Math.floor(this.xx);
    this.y = Math.floor(this.yy);

    const toHit = this.level.getEntities(this.x, this.y, this.x, this.y);
    for (const e of toHit) {
      if (e instanceof Mob && !(e instanceof AirWizard)) {
        e.hurt(this.owner, 1, e.dir ^ 1);
      }
    }
  }

  public isBlockableBy(_mob: Mob): boolean {
    return false;
  }

  public render(screen: Screen): void {
    if (this.time >= this.lifeTime - 6 * 20) {
      if (Math.floor(this.time / 6) % 2 === 0) return;
    }
    const xt = 8;
    const yt = 13;
    screen.render(this.x - 4, this.y - 4 - 2, xt + yt * 32, Color.get(-1, 555, 555, 555), Math.floor(Math.random() * 4));
    screen.render(this.x - 4, this.y - 4 + 2, xt + yt * 32, Color.get(-1, 0, 0, 0), Math.floor(Math.random() * 4));
  }
}
