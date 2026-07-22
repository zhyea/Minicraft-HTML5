/** Port of level/tile/CloudTile.java — shoveled for cloud resource (sky levels). */
import { Color } from '../../../engine/Color';
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

export class CloudTile extends Tile {
  constructor(id: number) {
    super(id);
    this.connectsToSand = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(level.sandColor, level.sandColor, level.sandColor - 110, level.sandColor - 110);
    screen.render(x * 16 + 0, y * 16 + 0, 0, col, 0);
    screen.render(x * 16 + 8, y * 16 + 0, 1, col, 0);
    screen.render(x * 16 + 0, y * 16 + 8, 2, col, 0);
    screen.render(x * 16 + 8, y * 16 + 8, 3, col, 0);
  }

  public interact(level: Level, xt: number, yt: number, player: Player, item: Item, _attackDir: number): boolean {
    if (item instanceof ToolItem) {
      const tool = item as ToolItem;
      if (tool.type === ToolType.shovel) {
        if (player.payStamina(5)) {
          const count = Math.floor(Math.random() * 2) + 1; // 1..2
          for (let i = 0; i < count; i++) {
            level.add(
              new ItemEntity(new ResourceItem(Resource.cloud, 1), xt * 16 + Math.floor(Math.random() * 10) + 3, yt * 16 + Math.floor(Math.random() * 10) + 3)
            );
          }
          return true;
        }
      }
    }
    return false;
  }
}
