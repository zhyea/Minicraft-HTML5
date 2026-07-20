/**
 * Port of level/tile/HoleTile.java.
 *
 * A hole connects to sand/water/lava so it blends with those liquids; only
 * swimmable entities may pass through it. Rendering mirrors the GWT transition
 * logic but draws plain rectangles (the GWT sprite-sheet indices are unchanged).
 */
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';
import { Color } from '../../../engine/Color';

export class HoleTile extends Tile {
  constructor(id: number) {
    super(id);
    this.connectsToSand = true;
    this.connectsToWater = true;
    this.connectsToLava = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(111, 111, 110, 110);
    const transitionColor1 = Color.get(3, 111, level.dirtColor - 111, level.dirtColor);
    const transitionColor2 = Color.get(3, 111, level.sandColor - 110, level.sandColor);

    const u = !level.getTile(x, y - 1).connectsToLiquid();
    const d = !level.getTile(x, y + 1).connectsToLiquid();
    const l = !level.getTile(x - 1, y).connectsToLiquid();
    const r = !level.getTile(x + 1, y).connectsToLiquid();

    const su = u && level.getTile(x, y - 1).connectsToSand;
    const sd = d && level.getTile(x, y + 1).connectsToSand;
    const sl = l && level.getTile(x - 1, y).connectsToSand;
    const sr = r && level.getTile(x + 1, y).connectsToSand;

    if (!u && !l) {
      screen.render(x * 16 + 0, y * 16 + 0, 0, col, 0);
    } else {
      screen.render(x * 16 + 0, y * 16 + 0, (l ? 14 : 15) + (u ? 0 : 1) * 32, (su || sl) ? transitionColor2 : transitionColor1, 0);
    }

    if (!u && !r) {
      screen.render(x * 16 + 8, y * 16 + 0, 1, col, 0);
    } else {
      screen.render(x * 16 + 8, y * 16 + 0, (r ? 16 : 15) + (u ? 0 : 1) * 32, (su || sr) ? transitionColor2 : transitionColor1, 0);
    }

    if (!d && !l) {
      screen.render(x * 16 + 0, y * 16 + 8, 2, col, 0);
    } else {
      screen.render(x * 16 + 0, y * 16 + 8, (l ? 14 : 15) + (d ? 2 : 1) * 32, (sd || sl) ? transitionColor2 : transitionColor1, 0);
    }

    if (!d && !r) {
      screen.render(x * 16 + 8, y * 16 + 8, 3, col, 0);
    } else {
      screen.render(x * 16 + 8, y * 16 + 8, (r ? 16 : 15) + (d ? 2 : 1) * 32, (sd || sr) ? transitionColor2 : transitionColor1, 0);
    }
  }

  public mayPass(_level: Level, _x: number, _y: number, e: Entity): boolean {
    return e.canSwim();
  }
}
