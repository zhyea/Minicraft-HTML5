/** Port of level/tile/WaterTile.java. */
import { Color } from '../../../engine/Color';
import { Rand } from '../../../engine/Rand';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';

const wRandom = new Rand(0);

export class WaterTile extends Tile {
  constructor(id: number) {
    super(id);
    this.connectsToSand = true;
    this.connectsToWater = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    // Deterministic shimmer: mirror the GWT seed derivation (integer division).
    const t = Math.floor((Tile.tickCount + (Math.floor(x / 2) - y) * 4311) / 10);
    const seed = t * 54687121 + x * 3271612 + y * 3412987161;
    wRandom.setSeed(seed);

    const col = Color.get(5, 5, 115, 115);
    const transitionColor1 = Color.get(3, 5, level.dirtColor - 111, level.dirtColor);
    const transitionColor2 = Color.get(3, 5, level.sandColor - 110, level.sandColor);

    const u = !level.getTile(x, y - 1).connectsToWater;
    const d = !level.getTile(x, y + 1).connectsToWater;
    const l = !level.getTile(x - 1, y).connectsToWater;
    const r = !level.getTile(x + 1, y).connectsToWater;

    const su = u && level.getTile(x, y - 1).connectsToSand;
    const sd = d && level.getTile(x, y + 1).connectsToSand;
    const sl = l && level.getTile(x - 1, y).connectsToSand;
    const sr = r && level.getTile(x + 1, y).connectsToSand;

    if (!u && !l) {
      screen.render(x * 16 + 0, y * 16 + 0, wRandom.nextInt(4), col, wRandom.nextInt(4));
    } else {
      screen.render(x * 16 + 0, y * 16 + 0, (l ? 14 : 15) + (u ? 0 : 1) * 32, su || sl ? transitionColor2 : transitionColor1, 0);
    }
    if (!u && !r) {
      screen.render(x * 16 + 8, y * 16 + 0, wRandom.nextInt(4), col, wRandom.nextInt(4));
    } else {
      screen.render(x * 16 + 8, y * 16 + 0, (r ? 16 : 15) + (u ? 0 : 1) * 32, su || sr ? transitionColor2 : transitionColor1, 0);
    }
    if (!d && !l) {
      screen.render(x * 16 + 0, y * 16 + 8, wRandom.nextInt(4), col, wRandom.nextInt(4));
    } else {
      screen.render(x * 16 + 0, y * 16 + 8, (l ? 14 : 15) + (d ? 2 : 1) * 32, sd || sl ? transitionColor2 : transitionColor1, 0);
    }
    if (!d && !r) {
      screen.render(x * 16 + 8, y * 16 + 8, wRandom.nextInt(4), col, wRandom.nextInt(4));
    } else {
      screen.render(x * 16 + 8, y * 16 + 8, (r ? 16 : 15) + (d ? 2 : 1) * 32, sd || sr ? transitionColor2 : transitionColor1, 0);
    }
  }

  public mayPass(_level: Level, _x: number, _y: number, e: Entity): boolean {
    return e.canSwim();
  }

  public tick(level: Level, xt: number, yt: number): void {
    let xn = xt;
    let yn = yt;
    if (Math.random() < 0.5) xn += Math.floor(Math.random() * 2) * 2 - 1;
    else yn += Math.floor(Math.random() * 2) * 2 - 1;
    if (level.getTile(xn, yn) === Tile.hole) {
      level.setTile(xn, yn, this, 0);
    }
  }
}
