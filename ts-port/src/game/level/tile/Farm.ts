/**
 * Port of level/tile/FarmTile.java.
 *
 * Tilled soil that slowly ages, reverts to dirt when stepped on after maturing
 * (random chance), and can be shoveled back to dirt. The shovel check uses
 * ToolItem + Player.payStamina, matching GWT; item drops are stubbed (no
 * ItemEntity port in the slice).
 */
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Player } from '../../entity/Player';
import type { Item } from '../../item/Item';
import type { Entity } from '../../entity/Entity';
import { ToolItem } from '../../item/ToolItem';
import { ToolType } from '../../item/ToolType';
import { Color } from '../../../engine/Color';

export class FarmTile extends Tile {
  constructor(id: number) {
    super(id);
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(level.dirtColor - 121, level.dirtColor - 11, level.dirtColor, level.dirtColor + 111);
    screen.render(x * 16 + 0, y * 16 + 0, 2 + 32, col, 1);
    screen.render(x * 16 + 8, y * 16 + 0, 2 + 32, col, 0);
    screen.render(x * 16 + 0, y * 16 + 8, 2 + 32, col, 0);
    screen.render(x * 16 + 8, y * 16 + 8, 2 + 32, col, 1);
  }

  public interact(level: Level, xt: number, yt: number, player: Player, item: Item, _attackDir: number): boolean {
    if (item instanceof ToolItem) {
      const tool = item as ToolItem;
      if (tool.type === ToolType.shovel) {
        if (player.payStamina(4 - tool.level)) {
          level.setTile(xt, yt, Tile.dirt, 0);
          return true;
        }
      }
    }
    return false;
  }

  public tick(level: Level, xt: number, yt: number): void {
    const age = level.getData(xt, yt);
    if (age < 5) level.setData(xt, yt, age + 1);
  }

  public steppedOn(level: Level, xt: number, yt: number, _entity: Entity): void {
    if (Math.floor(Math.random() * 60) !== 0) return;
    if (level.getData(xt, yt) < 5) return;
    level.setTile(xt, yt, Tile.dirt, 0);
  }
}
