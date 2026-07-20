/** Port of level/tile/GrassTile.java. */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';

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
}
