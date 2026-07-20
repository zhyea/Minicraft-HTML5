/** Port of level/tile/SandTile.java. */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';

export class SandTile extends Tile {
  constructor(id: number) {
    super(id);
    this.connectsToSand = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(level.sandColor + 2, level.sandColor, level.sandColor - 110, level.sandColor - 110);
    const transitionColor = Color.get(level.sandColor - 110, level.sandColor, level.sandColor - 110, level.dirtColor);

    const u = !level.getTile(x, y - 1).connectsToSand;
    const d = !level.getTile(x, y + 1).connectsToSand;
    const l = !level.getTile(x - 1, y).connectsToSand;
    const r = !level.getTile(x + 1, y).connectsToSand;

    const steppedOn = level.getData(x, y) > 0;

    if (!u && !l) {
      if (!steppedOn) screen.render(x * 16 + 0, y * 16 + 0, 0, col, 0);
      else screen.render(x * 16 + 0, y * 16 + 0, 3 + 1 * 32, col, 0);
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
      if (!steppedOn) screen.render(x * 16 + 8, y * 16 + 8, 3, col, 0);
      else screen.render(x * 16 + 8, y * 16 + 8, 3 + 1 * 32, col, 0);
    } else {
      screen.render(x * 16 + 8, y * 16 + 8, (r ? 13 : 12) + (d ? 2 : 1) * 32, transitionColor, 0);
    }
  }

  public tick(level: Level, x: number, y: number): void {
    const d = level.getData(x, y);
    if (d > 0) level.setData(x, y, d - 1);
  }

  public steppedOn(level: Level, x: number, y: number, _entity: Entity): void {
    level.setData(x, y, 10);
  }
}
