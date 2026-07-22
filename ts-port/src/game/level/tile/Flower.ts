/** Port of level/tile/FlowerTile.java (extends GrassTile). */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import { GrassTile } from './Grass';
import type { Level } from '../Level';
import type { Mob } from '../../entity/Mob';
import type { Player } from '../../entity/Player';
import type { Item } from '../../item/Item';
import { ItemEntity } from '../../entity/ItemEntity';
import { ResourceItem } from '../../item/ResourceItem';
import { Resource } from '../../item/resource/Resource';
import { ToolItem } from '../../item/ToolItem';
import { ToolType } from '../../item/ToolType';

export class FlowerTile extends GrassTile {
  constructor(id: number) {
    super(id);
    this.connectsToGrass = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    super.render(screen, level, x, y);

    const data = level.getData(x, y);
    const shape = Math.floor(data / 16) % 2;
    const flowerCol = Color.get(10, level.grassColor, 555, 440);

    if (shape === 0) screen.render(x * 16 + 0, y * 16 + 0, 1 + 1 * 32, flowerCol, 0);
    if (shape === 1) screen.render(x * 16 + 8, y * 16 + 0, 1 + 1 * 32, flowerCol, 0);
    if (shape === 1) screen.render(x * 16 + 0, y * 16 + 8, 1 + 1 * 32, flowerCol, 0);
    if (shape === 0) screen.render(x * 16 + 8, y * 16 + 8, 1 + 1 * 32, flowerCol, 0);
  }

  public interact(level: Level, x: number, y: number, player: Player, item: Item, _attackDir: number): boolean {
    if (item instanceof ToolItem) {
      const tool = item as ToolItem;
      if (tool.type === ToolType.shovel) {
        if (player.payStamina(4 - tool.level)) {
          for (let i = 0; i < 2; i++) {
            level.add(
              new ItemEntity(new ResourceItem(Resource.flower, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3)
            );
          }
          level.setTile(x, y, Tile.grass, 0);
          return true;
        }
      }
    }
    return false;
  }

  /** Faithful port of FlowerTile.hurt: drop 1-2 flowers, then revert to grass. */
  public hurt(level: Level, x: number, y: number, _source: Mob, _dmg: number, _attackDir: number): void {
    const count = Math.floor(Math.random() * 2) + 1; // 1..2
    for (let i = 0; i < count; i++) {
      level.add(
        new ItemEntity(new ResourceItem(Resource.flower, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3)
      );
    }
    level.setTile(x, y, Tile.grass, 0);
  }
}
