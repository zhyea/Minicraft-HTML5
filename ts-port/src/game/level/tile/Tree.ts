/** Port of level/tile/TreeTile.java. Item drops are stubbed for the slice. */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';

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
}
