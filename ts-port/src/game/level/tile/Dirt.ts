/** Port of level/tile/DirtTile.java. */
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

export class DirtTile extends Tile {
  constructor(id: number) {
    super(id);
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(level.dirtColor, level.dirtColor, level.dirtColor - 111, level.dirtColor - 111);
    screen.render(x * 16 + 0, y * 16 + 0, 0, col, 0);
    screen.render(x * 16 + 8, y * 16 + 0, 1, col, 0);
    screen.render(x * 16 + 0, y * 16 + 8, 2, col, 0);
    screen.render(x * 16 + 8, y * 16 + 8, 3, col, 0);
  }

  public interact(level: Level, xt: number, yt: number, player: Player, item: Item, _attackDir: number): boolean {
    if (item instanceof ToolItem) {
      const tool = item as ToolItem;
      if (tool.type === ToolType.shovel) {
        if (player.payStamina(4 - tool.level)) {
          level.setTile(xt, yt, Tile.hole, 0);
          level.add(new ItemEntity(new ResourceItem(Resource.dirt, 1), xt * 16 + Math.floor(Math.random() * 10) + 3, yt * 16 + Math.floor(Math.random() * 10) + 3));
          Sound.play('monsterHurt'); // Java DirtTile.java:35
          return true;
        }
      }
      if (tool.type === ToolType.hoe) {
        if (player.payStamina(4 - tool.level)) {
          level.setTile(xt, yt, Tile.farmland, 0);
          Sound.play('monsterHurt'); // Java DirtTile.java:42
          return true;
        }
      }
    }
    return false;
  }
}
