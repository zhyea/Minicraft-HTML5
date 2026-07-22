/** Port of level/tile/TreeTile.java. */
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
import { Resource } from '../../item/resource/Resource';
import { ToolItem } from '../../item/ToolItem';
import { ToolType } from '../../item/ToolType';
import { SmashParticle } from '../../entity/particle/SmashParticle';
import { TextParticle } from '../../entity/particle/TextParticle';

export class TreeTile extends Tile {
  constructor(id: number) {
    super(id);
    this.connectsToGrass = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(10, 30, 151, level.grassColor);
    const barkCol1 = Color.get(10, 30, 430, level.grassColor);
    const barkCol2 = Color.get(10, 30, 320, level.grassColor);

    const u = level.getTile(x, y - 1) === this;
    const l = level.getTile(x - 1, y) === this;
    const r = level.getTile(x + 1, y) === this;
    const d = level.getTile(x, y + 1) === this;
    const ul = level.getTile(x - 1, y - 1) === this;
    const ur = level.getTile(x + 1, y - 1) === this;
    const dl = level.getTile(x - 1, y + 1) === this;
    const dr = level.getTile(x + 1, y + 1) === this;

    if (u && ul && l) {
      screen.render(x * 16 + 0, y * 16 + 0, 10 + 1 * 32, col, 0);
    } else {
      screen.render(x * 16 + 0, y * 16 + 0, 9 + 0 * 32, col, 0);
    }
    if (u && ur && r) {
      screen.render(x * 16 + 8, y * 16 + 0, 10 + 2 * 32, barkCol2, 0);
    } else {
      screen.render(x * 16 + 8, y * 16 + 0, 10 + 0 * 32, col, 0);
    }
    if (d && dl && l) {
      screen.render(x * 16 + 0, y * 16 + 8, 10 + 2 * 32, barkCol2, 0);
    } else {
      screen.render(x * 16 + 0, y * 16 + 8, 9 + 1 * 32, barkCol1, 0);
    }
    if (d && dr && r) {
      screen.render(x * 16 + 8, y * 16 + 8, 10 + 1 * 32, col, 0);
    } else {
      screen.render(x * 16 + 8, y * 16 + 8, 10 + 3 * 32, barkCol2, 0);
    }
  }

  public tick(level: Level, xt: number, yt: number): void {
    const damage = level.getData(xt, yt);
    if (damage > 0) level.setData(xt, yt, damage - 1);
  }

  public mayPass(_level: Level, _x: number, _y: number, _e: Entity): boolean {
    return false;
  }

  public interact(level: Level, xt: number, yt: number, player: Player, item: Item, _attackDir: number): boolean {
    if (item instanceof ToolItem) {
      const tool = item as ToolItem;
      if (tool.type === ToolType.axe) {
        if (player.payStamina(4 - tool.level)) {
          this.hurt(level, xt, yt, null as unknown as Mob, Math.floor(Math.random() * 10) + tool.level * 5 + 10, _attackDir);
          return true;
        }
      }
    }
    return false;
  }

  public hurt(level: Level, x: number, y: number, _source: Mob, dmg: number, _attackDir: number): void {
    // Faithful: occasional apple drop on any hit.
    if (Math.random() < 0.1) {
      level.add(new ItemEntity(new ResourceItem(Resource.apple, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3));
    }
    const damage = level.getData(x, y) + dmg;
    level.add(new SmashParticle(x * 16 + 8, y * 16 + 8));
    level.add(new TextParticle(`${dmg}`, x * 16 + 8, y * 16 + 8, Color.get(-1, 500, 500, 500)));
    if (damage >= 20) {
      const count = Math.floor(Math.random() * 2) + 1; // 1..2 wood
      for (let i = 0; i < count; i++) {
        level.add(new ItemEntity(new ResourceItem(Resource.wood, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3));
      }
      const acornCount = Math.floor(Math.random() * 5); // 0..4 acorns
      for (let i = 0; i < acornCount; i++) {
        level.add(new ItemEntity(new ResourceItem(Resource.acorn, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3));
      }
      level.setTile(x, y, Tile.grass, 0);
    } else {
      level.setData(x, y, damage);
    }
  }
}
