/**
 * Port of level/tile/WheatTile.java.
 *
 * A growing crop whose icon advances with `data`, is shoveled back to dirt, and
 * on stepped-on / hurt "harvests" back to dirt. The GWT harvest also drops
 * seeds/wheat ItemEntities; that drop is stubbed in the slice (no ItemEntity
 * port), matching the existing tile drop-stubbing policy.
 */
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Player } from '../../entity/Player';
import type { Item } from '../../item/Item';
import type { Entity } from '../../entity/Entity';
import type { Mob } from '../../entity/Mob';
import { ToolItem } from '../../item/ToolItem';
import { ToolType } from '../../item/ToolType';
import { Color } from '../../../engine/Color';

export class WheatTile extends Tile {
  constructor(id: number) {
    super(id);
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const age = level.getData(x, y);
    let col = Color.get(level.dirtColor - 121, level.dirtColor - 11, level.dirtColor, 50);
    let icon = Math.floor(age / 10);
    if (icon >= 3) {
      col = Color.get(level.dirtColor - 121, level.dirtColor - 11, 50 + icon * 100, 40 + (icon - 3) * 2 * 100);
      if (age === 50) {
        col = Color.get(0, 0, 50 + icon * 100, 40 + (icon - 3) * 2 * 100);
      }
      icon = 3;
    }

    screen.render(x * 16 + 0, y * 16 + 0, 4 + 3 * 32 + icon, col, 0);
    screen.render(x * 16 + 8, y * 16 + 0, 4 + 3 * 32 + icon, col, 0);
    screen.render(x * 16 + 0, y * 16 + 8, 4 + 3 * 32 + icon, col, 1);
    screen.render(x * 16 + 8, y * 16 + 8, 4 + 3 * 32 + icon, col, 1);
  }

  public tick(level: Level, xt: number, yt: number): void {
    if (Math.floor(Math.random() * 2) === 0) return;
    const age = level.getData(xt, yt);
    if (age < 50) level.setData(xt, yt, age + 1);
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

  public steppedOn(level: Level, xt: number, yt: number, _entity: Entity): void {
    if (Math.floor(Math.random() * 60) !== 0) return;
    if (level.getData(xt, yt) < 2) return;
    this.harvest(level, xt, yt);
  }

  public hurt(level: Level, x: number, y: number, _source: Mob, _dmg: number, _attackDir: number): void {
    this.harvest(level, x, y);
  }

  private harvest(level: Level, x: number, y: number): void {
    // GWT also spawns seeds/wheat ItemEntities here; drops are stubbed in the
    // slice (no ItemEntity port). Only the tile conversion is performed.
    level.setTile(x, y, Tile.dirt, 0);
  }
}
