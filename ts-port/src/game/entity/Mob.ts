/**
 * Port of entity/Mob.java — mobile entities (Player, Zombie, ...).
 *
 * Particle/sound effects from the original hurt() are dropped for the slice;
 * the movement, knockback, swimming and findStartPos logic is faithful.
 */
import { Entity } from './Entity';
import type { Level } from '../level/Level';
import { Tile } from '../level/tile/Tile';
import type { Tile as TileType } from '../level/tile/Tile';
import { TextParticle } from './particle/TextParticle';
import { Color } from '../../engine/Color';

export abstract class Mob extends Entity {
  public walkDist = 0;
  public dir = 0;
  public hurtTime = 0;
  public xKnockback = 0;
  public yKnockback = 0;
  public maxHealth = 10;
  public health = 10;
  public swimTimer = 0;
  public tickTime = 0;

  constructor() {
    super();
    this.x = 8;
    this.y = 8;
    this.xr = 4;
    this.yr = 3;
    this.health = this.maxHealth;
  }

  public tick(): void {
    this.tickTime++;
    const tile: TileType = this.level.getTile(this.x >> 4, this.y >> 4);
    if (tile === Tile.lava) {
      this.hurt(this, 4, this.dir ^ 1);
    }
    if (this.health <= 0) {
      this.die();
    }
    if (this.hurtTime > 0) this.hurtTime--;
  }

  protected die(): void {
    this.remove();
  }

  public move(xa: number, ya: number): boolean {
    if (this.isSwimming()) {
      if (this.swimTimer++ % 2 === 0) return true;
    }
    if (this.xKnockback < 0) {
      this.move2(-1, 0);
      this.xKnockback++;
    }
    if (this.xKnockback > 0) {
      this.move2(1, 0);
      this.xKnockback--;
    }
    if (this.yKnockback < 0) {
      this.move2(0, -1);
      this.yKnockback++;
    }
    if (this.yKnockback > 0) {
      this.move2(0, 1);
      this.yKnockback--;
    }
    if (this.hurtTime > 0) return true;
    if (xa !== 0 || ya !== 0) {
      this.walkDist++;
      if (xa < 0) this.dir = 2;
      if (xa > 0) this.dir = 3;
      if (ya < 0) this.dir = 1;
      if (ya > 0) this.dir = 0;
    }
    return super.move(xa, ya);
  }

  protected isSwimming(): boolean {
    const tile = this.level.getTile(this.x >> 4, this.y >> 4);
    return tile === Tile.water || tile === Tile.lava;
  }

  public blocks(e: Entity): boolean {
    return e.isBlockableBy(this);
  }

  public hurt(_mob: Mob, damage: number, attackDir: number): void {
    this.doHurt(damage, attackDir);
  }

  protected doHurt(damage: number, attackDir: number): void {
    if (this.hurtTime > 0) return;
    if (this.level) {
      this.level.add(new TextParticle(`${damage}`, this.x, this.y, Color.get(-1, 500, 500, 500)));
    }
    this.health -= damage;
    if (attackDir === 0) this.yKnockback = 6;
    if (attackDir === 1) this.yKnockback = -6;
    if (attackDir === 2) this.xKnockback = -6;
    if (attackDir === 3) this.xKnockback = 6;
    this.hurtTime = 10;
  }

  public findStartPos(level: Level): boolean {
    const x = Math.floor(Math.random() * level.w);
    const y = Math.floor(Math.random() * level.h);
    const xx = x * 16 + 8;
    const yy = y * 16 + 8;

    if (level.player != null) {
      const xd = level.player.x - xx;
      const yd = level.player.y - yy;
      if (xd * xd + yd * yd < 80 * 80) return false;
    }

    const r = level.monsterDensity * 16;
    if (level.getEntities(xx - r, yy - r, xx + r, yy + r).length > 0) return false;

    if (level.getTile(x, y).mayPass(level, x, y, this)) {
      this.x = xx;
      this.y = yy;
      return true;
    }
    return false;
  }
}
