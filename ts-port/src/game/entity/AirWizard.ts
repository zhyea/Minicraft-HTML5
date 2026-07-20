/**
 * Port of entity/AirWizard.java — the sky boss.
 *
 * Faithful 2000-HP attack state machine that spawns Spark projectiles. On death
 * it awards score and triggers the win via Player.gameWon(). Sound.bossdeath is
 * dropped (audio is out of slice scope).
 */
import { Color } from '../../engine/Color';
import type { Screen } from '../../engine/Screen';
import { Mob } from './Mob';
import type { Entity } from './Entity';
import { Player } from './Player';
import { Spark } from './Spark';

export class AirWizard extends Mob {
  private xa = 0;
  private ya = 0;
  private randomWalkTime = 0;
  private attackDelay = 0;
  private attackTime = 0;
  private attackType = 0;

  constructor() {
    super();
    this.x = Math.floor(Math.random() * 64 * 16);
    this.y = Math.floor(Math.random() * 64 * 16);
    this.maxHealth = 2000;
    this.health = this.maxHealth;
  }

  public tick(): void {
    super.tick();

    if (this.attackDelay > 0) {
      this.dir = Math.floor((this.attackDelay - 45) / 4) % 4;
      this.dir = (this.dir * 2 % 4) + Math.floor(this.dir / 2);
      if (this.attackDelay < 45) {
        this.dir = 0;
      }
      this.attackDelay--;
      if (this.attackDelay === 0) {
        this.attackType = 0;
        if (this.health < 1000) this.attackType = 1;
        if (this.health < 200) this.attackType = 2;
        this.attackTime = 60 * 2;
      }
      return;
    }

    if (this.attackTime > 0) {
      this.attackTime--;
      const dir = this.attackTime * 0.25 * (this.attackTime % 2 * 2 - 1);
      const speed = 0.7 + this.attackType * 0.2;
      this.level.add(new Spark(this, Math.cos(dir) * speed, Math.sin(dir) * speed));
      return;
    }

    if (this.level.player != null && this.randomWalkTime === 0) {
      const xd = this.level.player.x - this.x;
      const yd = this.level.player.y - this.y;
      if (xd * xd + yd * yd < 32 * 32) {
        this.xa = 0;
        this.ya = 0;
        if (xd < 0) this.xa = 1;
        if (xd > 0) this.xa = -1;
        if (yd < 0) this.ya = 1;
        if (yd > 0) this.ya = -1;
      } else if (xd * xd + yd * yd > 80 * 80) {
        this.xa = 0;
        this.ya = 0;
        if (xd < 0) this.xa = -1;
        if (xd > 0) this.xa = 1;
        if (yd < 0) this.ya = -1;
        if (yd > 0) this.ya = 1;
      }
    }

    const speed = (this.tickTime % 4) === 0 ? 0 : 1;
    if (!this.move(this.xa * speed, this.ya * speed) || Math.floor(Math.random() * 100) === 0) {
      this.randomWalkTime = 30;
      this.xa = Math.floor(Math.random() * 3) - 1;
      this.ya = Math.floor(Math.random() * 3) - 1;
    }
    if (this.randomWalkTime > 0) {
      this.randomWalkTime--;
      if (this.level.player != null && this.randomWalkTime === 0) {
        const xd = this.level.player.x - this.x;
        const yd = this.level.player.y - this.y;
        if (Math.floor(Math.random() * 4) === 0 && xd * xd + yd * yd < 50 * 50) {
          if (this.attackDelay === 0 && this.attackTime === 0) {
            this.attackDelay = 60 * 2;
          }
        }
      }
    }
  }

  protected doHurt(damage: number, attackDir: number): void {
    super.doHurt(damage, attackDir);
    if (this.attackDelay === 0 && this.attackTime === 0) {
      this.attackDelay = 60 * 2;
    }
  }

  public render(screen: Screen): void {
    let xt = 8;
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

    let col1 = Color.get(-1, 100, 500, 555);
    let col2 = Color.get(-1, 100, 500, 532);
    if (this.health < 200) {
      if (Math.floor(this.tickTime / 3) % 2 === 0) {
        col1 = Color.get(-1, 500, 100, 555);
        col2 = Color.get(-1, 500, 100, 532);
      }
    } else if (this.health < 1000) {
      if (Math.floor(this.tickTime / 5) % 4 === 0) {
        col1 = Color.get(-1, 500, 100, 555);
        col2 = Color.get(-1, 500, 100, 532);
      }
    }
    if (this.hurtTime > 0) {
      col1 = Color.get(-1, 555, 555, 555);
      col2 = Color.get(-1, 555, 555, 555);
    }

    screen.render(xo + 8 * flip1, yo + 0, xt + yt * 32, col1, flip1);
    screen.render(xo + 8 - 8 * flip1, yo + 0, xt + 1 + yt * 32, col1, flip1);
    screen.render(xo + 8 * flip2, yo + 8, xt + (yt + 1) * 32, col2, flip2);
    screen.render(xo + 8 - 8 * flip2, yo + 8, xt + 1 + (yt + 1) * 32, col2, flip2);
  }

  protected touchedBy(entity: Entity): void {
    if (entity instanceof Player) {
      entity.hurt(this, 3, this.dir);
    }
  }

  protected die(): void {
    super.die();
    if (this.level.player != null) {
      this.level.player.score += 1000;
      this.level.player.gameWon();
    }
    // Sound.bossdeath.play() — audio dropped for slice.
  }
}
