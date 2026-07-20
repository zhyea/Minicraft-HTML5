/**
 * Port of entity/Slime.java.
 *
 * Faithful jump/homing logic. Note: the original Slime has NO splitting
 * behaviour (only die() scores), so none is ported. Contact damage uses `lvl`
 * exactly as the Java source does (not lvl+1 — that is Zombie's value).
 */
import { Color } from '../../engine/Color';
import type { Screen } from '../../engine/Screen';
import { Mob } from './Mob';
import type { Entity } from './Entity';
import { Player } from './Player';

export class Slime extends Mob {
  private xa = 0;
  private ya = 0;
  private jumpTime = 0;
  public lvl: number;

  constructor(lvl: number) {
    super();
    this.lvl = lvl;
    this.x = Math.floor(Math.random() * 64 * 16);
    this.y = Math.floor(Math.random() * 64 * 16);
    this.maxHealth = lvl * lvl * 5;
    this.health = this.maxHealth;
  }

  public tick(): void {
    super.tick();

    const speed = 1;
    if (!this.move(this.xa * speed, this.ya * speed) || Math.floor(Math.random() * 40) === 0) {
      if (this.jumpTime <= -10) {
        this.xa = Math.floor(Math.random() * 3) - 1;
        this.ya = Math.floor(Math.random() * 3) - 1;

        if (this.level.player != null) {
          const xd = this.level.player.x - this.x;
          const yd = this.level.player.y - this.y;
          if (xd * xd + yd * yd < 50 * 50) {
            if (xd < 0) this.xa = -1;
            if (xd > 0) this.xa = 1;
            if (yd < 0) this.ya = -1;
            if (yd > 0) this.ya = 1;
          }
        }

        if (this.xa !== 0 || this.ya !== 0) this.jumpTime = 10;
      }
    }

    this.jumpTime--;
    if (this.jumpTime === 0) {
      this.xa = 0;
      this.ya = 0;
    }
  }

  public render(screen: Screen): void {
    let xt = 0;
    const yt = 18;

    const xo = this.x - 8;
    let yo = this.y - 11;

    if (this.jumpTime > 0) {
      xt += 2;
      yo -= 4;
    }

    let col = Color.get(-1, 10, 252, 555);
    if (this.lvl === 2) col = Color.get(-1, 100, 522, 555);
    if (this.lvl === 3) col = Color.get(-1, 111, 444, 555);
    if (this.lvl === 4) col = Color.get(-1, 0, 111, 224);

    if (this.hurtTime > 0) {
      col = Color.get(-1, 555, 555, 555);
    }

    screen.render(xo + 0, yo + 0, xt + yt * 32, col, 0);
    screen.render(xo + 8, yo + 0, xt + 1 + yt * 32, col, 0);
    screen.render(xo + 0, yo + 8, xt + (yt + 1) * 32, col, 0);
    screen.render(xo + 8, yo + 8, xt + 1 + (yt + 1) * 32, col, 0);
  }

  protected touchedBy(entity: Entity): void {
    if (entity instanceof Player) {
      entity.hurt(this, this.lvl, this.dir);
    }
  }

  protected die(): void {
    super.die();
    // Java drops 1-2 slime ItemEntities here; ts-port has no ItemEntity, so we
    // mirror Zombie.die() and only award score (deviation, see Sprint 4 report).
    if (this.level.player != null) {
      this.level.player.score += 25 * this.lvl;
    }
  }
}
