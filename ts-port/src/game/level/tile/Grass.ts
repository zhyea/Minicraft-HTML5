/** Port of level/tile/GrassTile.java. */
import { Color } from '../../../engine/Color';
import { Sound } from '../../audio/Sound';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Player } from '../../entity/Player';
import type { Item } from '../../item/Item';
import { ItemEntity } from '../../entity/ItemEntity';
import { ResourceItem } from '../../item/ResourceItem';
import { Resource } from '../../item/resource/Resource';
import { ToolItem } from '../../item/ToolItem';
import { ToolType } from '../../item/ToolType';

export class GrassTile extends Tile {
  constructor(id: number) {
    super(id);
    this.connectsToGrass = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(level.grassColor, level.grassColor, level.grassColor + 111, level.grassColor + 111);
    const transitionColor = Color.get(level.grassColor - 111, level.grassColor, level.grassColor + 111, level.dirtColor);

    const u = !level.getTile(x, y - 1).connectsToGrass;
    const d = !level.getTile(x, y + 1).connectsToGrass;
    const l = !level.getTile(x - 1, y).connectsToGrass;
    const r = !level.getTile(x + 1, y).connectsToGrass;

    if (!u && !l) {
      screen.render(x * 16 + 0, y * 16 + 0, 0, col, 0);
    } else {
      screen.render(x * 16 + 0, y * 16 + 0, (l ? 11 : 12) + (u ? 0 : 1) * 32, transitionColor, 0);
    }
    if (!u && !r) {
      screen.render(x * 16 + 8, y * 16 + 0, 1, col, 0);
    } else {
      screen.render(x * 16 + 8, y * 16 + 0, (r ? 13 : 12) + (u ? 0 : 1) * 32, transitionColor, 0);
    }
    if (!d && !l) {
      screen.render(x * 16 + 0, y * 16 + 8, 2, col, 0);
    } else {
      screen.render(x * 16 + 0, y * 16 + 8, (l ? 11 : 12) + (d ? 2 : 1) * 32, transitionColor, 0);
    }
    if (!d && !r) {
      screen.render(x * 16 + 8, y * 16 + 8, 3, col, 0);
    } else {
      screen.render(x * 16 + 8, y * 16 + 8, (r ? 13 : 12) + (d ? 2 : 1) * 32, transitionColor, 0);
    }
  }

  public tick(level: Level, xt: number, yt: number): void {
    if (Math.random() * 40 >= 1) return;
    let xn = xt;
    let yn = yt;
    if (Math.random() < 0.5) xn += Math.floor(Math.random() * 2) * 2 - 1;
    else yn += Math.floor(Math.random() * 2) * 2 - 1;
    if (level.getTile(xn, yn) === Tile.dirt) {
      level.setTile(xn, yn, Tile.grass, 0);
    }
  }

  public interact(level: Level, xt: number, yt: number, player: Player, item: Item, _attackDir: number): boolean {
    if (item instanceof ToolItem) {
      const tool = item as ToolItem;
      if (tool.type === ToolType.shovel) {
        if (player.payStamina(4 - tool.level)) {
          level.setTile(xt, yt, Tile.dirt, 0);
          Sound.play('monsterHurt'); // Java GrassTile.java:72
          if (Math.floor(Math.random() * 5) === 0) {
            level.add(
              new ItemEntity(new ResourceItem(Resource.seeds, 1), xt * 16 + Math.floor(Math.random() * 10) + 3, yt * 16 + Math.floor(Math.random() * 10) + 3)
            );
          }
          return true;
        }
      }
      if (tool.type === ToolType.hoe) {
        if (player.payStamina(4 - tool.level)) {
          Sound.play('monsterHurt'); // Java GrassTile.java:81
          if (Math.floor(Math.random() * 5) === 0) {
            level.add(
              new ItemEntity(new ResourceItem(Resource.seeds, 1), xt * 16 + Math.floor(Math.random() * 10) + 3, yt * 16 + Math.floor(Math.random() * 10) + 3)
            );
            return true;
          }
          level.setTile(xt, yt, Tile.farmland, 0);
          return true;
        }
      }
    }
    return false;
  }
}
