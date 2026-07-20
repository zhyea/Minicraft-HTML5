/** Port of level/tile/RockTile.java. Item/particle drops are stubbed for the slice. */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';

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
}
