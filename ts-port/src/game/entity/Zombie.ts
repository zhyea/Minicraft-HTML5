/** Port of entity/Zombie.java. */
import { Color } from '../../engine/Color';
import type { Screen } from '../../engine/Screen';
import { Mob } from './Mob';
import type { Entity } from './Entity';
import { Player } from './Player';

export class Zombie extends Mob {
  private xa = 0;
  private ya = 0;
  public lvl: number;
  private randomWalkTime = 0;

  constructor(lvl: number) {
    super();
    this.lvl = lvl;
    this.x = Math.floor(Math.random() * 64 * 16);
    this.y = Math.floor(Math.random() * 64 * 16);
    this.maxHealth = lvl * lvl * 10;
    this.health = this.maxHealth;
  }

  public tick(): void {
    super.tick();

    if (this.level.player != null && this.randomWalkTime === 0) {
      const xd = this.level.player.x - this.x;
      const yd = this.level.player.y - this.y;
      if (xd * xd + yd * yd < 50 * 50) {
        this.xa = 0;
        this.ya = 0;
        if (xd < 0) this.xa = -1;
        if (xd > 0) this.xa = 1;
        if (yd < 0) this.ya = -1;
        if (yd > 0) this.ya = 1;
      }
    }

    const speed = this.tickTime & 1;
    if (!this.move(this.xa * speed, this.ya * speed) || Math.random() * 200 < 1) {
      this.randomWalkTime = 60;
      this.xa = (Math.floor(Math.random() * 3) - 1) * Math.floor(Math.random() * 2);
      this.ya = (Math.floor(Math.random() * 3) - 1) * Math.floor(Math.random() * 2);
    }
    if (this.randomWalkTime > 0) this.randomWalkTime--;
  }

  public render(screen: Screen): void {
    let xt = 0;
    const yt = 14;

    let flip1 = (this.walkDist >> 3) & 1;
    let flip2 = (this.walkDist >> 3) & 1;

    if (this.dir === 1) {
      xt += 2;
    }
    if (this.dir > 1) {
      flip1 = 0;
      flip2 = (this.walkDist >> 4) & 1;
      if (this.dir === 2) {
        flip1 = 1;
      }
      xt += 4 + ((this.walkDist >> 3) & 1) * 2;
    }

    const xo = this.x - 8;
    const yo = this.y - 11;

    let col = Color.get(-1, 10, 252, 50);
    if (this.lvl === 2) col = Color.get(-1, 100, 522, 50);
    if (this.lvl === 3) col = Color.get(-1, 111, 444, 50);
    if (this.lvl === 4) col = Color.get(-1, 0, 111, 20);
    if (this.hurtTime > 0) {
      col = Color.get(-1, 555, 555, 555);
    }

    screen.render(xo + 8 * flip1, yo + 0, xt + yt * 32, col, flip1);
    screen.render(xo + 8 - 8 * flip1, yo + 0, xt + 1 + yt * 32, col, flip1);
    screen.render(xo + 8 * flip2, yo + 8, xt + (yt + 1) * 32, col, flip2);
    screen.render(xo + 8 - 8 * flip2, yo + 8, xt + 1 + (yt + 1) * 32, col, flip2);
  }

  protected touchedBy(entity: Entity): void {
    if (entity instanceof Player) {
      entity.hurt(this, this.lvl + 1, this.dir);
    }
  }

  protected die(): void {
    super.die();
    if (this.level.player != null) {
      this.level.player.score += 50 * this.lvl;
    }
  }
}
