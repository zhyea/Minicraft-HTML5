/**
 * Port of entity/Entity.java — the base entity with collision/movement.
 *
 * Movement (`move`/`move2`) is a faithful 1:1 port of the GWT algorithm. Item
 * interaction hooks are trimmed to no-ops for the slice (no item system).
 */
import type { Screen } from '../../engine/Screen';
import type { Level } from '../level/Level';
import type { Tile } from '../level/tile/Tile';
import type { Mob } from './Mob';

export class Entity {
  public x = 0;
  public y = 0;
  public xr = 6;
  public yr = 6;
  public removed = false;
  public level!: Level;

  public render(_screen: Screen): void {}

  public tick(): void {}

  public remove(): void {
    this.removed = true;
  }

  public init(level: Level): void {
    this.level = level;
  }

  public intersects(x0: number, y0: number, x1: number, y1: number): boolean {
    return !(this.x + this.xr < x0 || this.y + this.yr < y0 || this.x - this.xr > x1 || this.y - this.yr > y1);
  }

  public blocks(_e: Entity): boolean {
    return false;
  }

  public hurt(_mob: Mob, _dmg: number, _attackDir: number): void {}
  public hurtTile(_tile: Tile, _x: number, _y: number, _dmg: number): void {}

  public move(xa: number, ya: number): boolean {
    if (xa !== 0 || ya !== 0) {
      let stopped = true;
      if (xa !== 0 && this.move2(xa, 0)) stopped = false;
      if (ya !== 0 && this.move2(0, ya)) stopped = false;
      if (!stopped) {
        const xt = this.x >> 4;
        const yt = this.y >> 4;
        this.level.getTile(xt, yt).steppedOn(this.level, xt, yt, this);
      }
      return !stopped;
    }
    return true;
  }

  protected move2(xa: number, ya: number): boolean {
    if (xa !== 0 && ya !== 0) throw new Error('Move2 can only move along one axis at a time!');

    const xto0 = (this.x - this.xr) >> 4;
    const yto0 = (this.y - this.yr) >> 4;
    const xto1 = (this.x + this.xr) >> 4;
    const yto1 = (this.y + this.yr) >> 4;

    const xt0 = (this.x + xa - this.xr) >> 4;
    const yt0 = (this.y + ya - this.yr) >> 4;
    const xt1 = (this.x + xa + this.xr) >> 4;
    const yt1 = (this.y + ya + this.yr) >> 4;

    for (let yt = yt0; yt <= yt1; yt++) {
      for (let xt = xt0; xt <= xt1; xt++) {
        if (xt >= xto0 && xt <= xto1 && yt >= yto0 && yt <= yto1) continue;
        const tile = this.level.getTile(xt, yt);
        tile.bumpedInto(this.level, xt, yt, this);
        if (!tile.mayPass(this.level, xt, yt, this)) {
          return false;
        }
      }
    }

    const wasInside = this.level.getEntities(this.x - this.xr, this.y - this.yr, this.x + this.xr, this.y + this.yr);
    const isInside = this.level.getEntities(this.x + xa - this.xr, this.y + ya - this.yr, this.x + xa + this.xr, this.y + ya + this.yr);
    for (const e of isInside) {
      if (e === this) continue;
      e.touchedBy(this);
    }
    const newInside = isInside.filter((e) => !wasInside.includes(e));
    for (const e of newInside) {
      if (e === this) continue;
      if (e.blocks(this)) {
        return false;
      }
    }

    this.x += xa;
    this.y += ya;
    return true;
  }

  protected touchedBy(_entity: Entity): void {}

  public isBlockableBy(_mob: Mob): boolean {
    return true;
  }

  public canSwim(): boolean {
    return false;
  }

  public getLightRadius(): number {
    return 0;
  }
}
