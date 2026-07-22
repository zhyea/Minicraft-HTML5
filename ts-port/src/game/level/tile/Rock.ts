/** Port of level/tile/RockTile.java — mined with a pickaxe, drops stone + coal. */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
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

export class RockTile extends Tile {
  constructor(id: number) {
    super(id);
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(444, 444, 333, 333);
    const transitionColor = Color.get(111, 444, 555, level.dirtColor);

    const u = level.getTile(x, y - 1) !== this;
    const d = level.getTile(x, y + 1) !== this;
    const l = level.getTile(x - 1, y) !== this;
    const r = level.getTile(x + 1, y) !== this;

    const ul = level.getTile(x - 1, y - 1) !== this;
    const dl = level.getTile(x - 1, y + 1) !== this;
    const ur = level.getTile(x + 1, y - 1) !== this;
    const dr = level.getTile(x + 1, y + 1) !== this;

    if (!u && !l) {
      if (!ul) screen.render(x * 16 + 0, y * 16 + 0, 0, col, 0);
      else screen.render(x * 16 + 0, y * 16 + 0, 7 + 0 * 32, transitionColor, 3);
    } else {
      screen.render(x * 16 + 0, y * 16 + 0, (l ? 6 : 5) + (u ? 2 : 1) * 32, transitionColor, 3);
    }
    if (!u && !r) {
      if (!ur) screen.render(x * 16 + 8, y * 16 + 0, 1, col, 0);
      else screen.render(x * 16 + 8, y * 16 + 0, 8 + 0 * 32, transitionColor, 3);
    } else {
      screen.render(x * 16 + 8, y * 16 + 0, (r ? 4 : 5) + (u ? 2 : 1) * 32, transitionColor, 3);
    }
    if (!d && !l) {
      if (!dl) screen.render(x * 16 + 0, y * 16 + 8, 2, col, 0);
      else screen.render(x * 16 + 0, y * 16 + 8, 7 + 1 * 32, transitionColor, 3);
    } else {
      screen.render(x * 16 + 0, y * 16 + 8, (l ? 6 : 5) + (d ? 0 : 1) * 32, transitionColor, 3);
    }
    if (!d && !r) {
      if (!dr) screen.render(x * 16 + 8, y * 16 + 8, 3, col, 0);
      else screen.render(x * 16 + 8, y * 16 + 8, 8 + 1 * 32, transitionColor, 3);
    } else {
      screen.render(x * 16 + 8, y * 16 + 8, (r ? 4 : 5) + (d ? 0 : 1) * 32, transitionColor, 3);
    }
  }

  public mayPass(): boolean {
    return false;
  }

  public tick(level: Level, xt: number, yt: number): void {
    const damage = level.getData(xt, yt);
    if (damage > 0) level.setData(xt, yt, damage - 1);
  }

  public hurt(level: Level, x: number, y: number, _source: Mob, dmg: number, _attackDir: number): void {
    this.hurtRock(level, x, y, dmg);
  }

  public interact(level: Level, xt: number, yt: number, player: Player, item: Item, _attackDir: number): boolean {
    if (item instanceof ToolItem) {
      const tool = item as ToolItem;
      if (tool.type === ToolType.pickaxe) {
        if (player.payStamina(4 - tool.level)) {
          this.hurtRock(level, xt, yt, Math.floor(Math.random() * 10) + tool.level * 5 + 10);
          return true;
        }
      }
    }
    return false;
  }

  /** Faithful port of RockTile.hurt(level, x, y, dmg): threshold 50 → stone + coal, then dirt. */
  private hurtRock(level: Level, x: number, y: number, dmg: number): void {
    const damage = level.getData(x, y) + dmg;
    level.add(new SmashParticle(x * 16 + 8, y * 16 + 8));
    level.add(new TextParticle(`${dmg}`, x * 16 + 8, y * 16 + 8, Color.get(-1, 500, 500, 500)));
    if (damage >= 50) {
      const count = Math.floor(Math.random() * 4) + 1; // 1..4 stone
      for (let i = 0; i < count; i++) {
        level.add(
          new ItemEntity(new ResourceItem(Resource.stone, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3)
        );
      }
      const coalCount = Math.floor(Math.random() * 2); // 0..1 coal
      for (let i = 0; i < coalCount; i++) {
        level.add(
          new ItemEntity(new ResourceItem(Resource.coal, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3)
        );
      }
      level.setTile(x, y, Tile.dirt, 0);
    } else {
      level.setData(x, y, damage);
    }
  }
}
