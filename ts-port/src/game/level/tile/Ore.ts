/** Port of level/tile/OreTile.java — drops a Resource when mined with a pickaxe. */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';
import type { Mob } from '../../entity/Mob';
import type { Player } from '../../entity/Player';
import type { Item } from '../../item/Item';
import { ItemEntity } from '../../entity/ItemEntity';
import { ResourceItem } from '../../item/ResourceItem';
import type { Resource } from '../../item/resource/Resource';
import { ToolItem } from '../../item/ToolItem';
import { ToolType } from '../../item/ToolType';
import { SmashParticle } from '../../entity/particle/SmashParticle';
import { TextParticle } from '../../entity/particle/TextParticle';

export class OreTile extends Tile {
  private toDrop: Resource;
  private baseColor: number;

  constructor(id: number, toDrop: Resource) {
    super(id);
    this.toDrop = toDrop;
    // Java OreTile.java:25 masks the low 2 bytes (0xffff00), leaving only the
    // lowest byte for the dirt shadow written at render time.
    this.baseColor = toDrop.color & 0xffff00;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    // Java OreTile.java:29 — single-arg Color.get (get1) replaces only the
    // low byte with the dirt palette index; the four-arg Color.get used
    // previously polluted the high bytes and corrupted the ore colour.
    const color = this.baseColor + Color.get1(level.dirtColor);
    screen.render(x * 16 + 0, y * 16 + 0, 17 + 1 * 32, color, 0);
    screen.render(x * 16 + 8, y * 16 + 0, 18 + 1 * 32, color, 0);
    screen.render(x * 16 + 0, y * 16 + 8, 17 + 2 * 32, color, 0);
    screen.render(x * 16 + 8, y * 16 + 8, 18 + 2 * 32, color, 0);
  }

  public mayPass(_level: Level, _x: number, _y: number, _e: Entity): boolean {
    return false;
  }

  public bumpedInto(_level: Level, _x: number, _y: number, entity: Entity): void {
    entity.hurtTile(this, _x, _y, 3);
  }

  public hurt(level: Level, x: number, y: number, _source: Mob, _dmg: number, _attackDir: number): void {
    this.hurtOre(level, x, y, 0);
  }

  public interact(level: Level, xt: number, yt: number, player: Player, item: Item, _attackDir: number): boolean {
    if (item instanceof ToolItem) {
      const tool = item as ToolItem;
      if (tool.type === ToolType.pickaxe) {
        if (player.payStamina(6 - tool.level)) {
          this.hurtOre(level, xt, yt, 1);
          return true;
        }
      }
    }
    return false;
  }

  /** Faithful port of OreTile.hurt(level, x, y, dmg): accumulates damage, drops toDrop on break. */
  private hurtOre(level: Level, x: number, y: number, dmg: number): void {
    const damage = level.getData(x, y) + 1;
    level.add(new SmashParticle(x * 16 + 8, y * 16 + 8));
    level.add(new TextParticle(`${dmg}`, x * 16 + 8, y * 16 + 8, Color.get(-1, 500, 500, 500)));
    if (dmg > 0) {
      let count = Math.floor(Math.random() * 2); // 0..1
      if (damage >= Math.floor(Math.random() * 10) + 3) {
        level.setTile(x, y, Tile.dirt, 0);
        count += 2;
      } else {
        level.setData(x, y, damage);
      }
      for (let i = 0; i < count; i++) {
        level.add(
          new ItemEntity(new ResourceItem(this.toDrop, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3)
        );
      }
    }
  }
}
