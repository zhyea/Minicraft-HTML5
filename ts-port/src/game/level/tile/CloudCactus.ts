/** Port of level/tile/CloudCactusTile.java (minimal — only sky levels use it). */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';

export class CloudCactusTile extends Tile {
  constructor(id: number) {
    super(id);
    this.connectsToSand = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(20, 40, 50, level.sandColor);
    screen.render(x * 16 + 0, y * 16 + 0, 8 + 2 * 32, col, 0);
    screen.render(x * 16 + 8, y * 16 + 0, 9 + 2 * 32, col, 0);
    screen.render(x * 16 + 0, y * 16 + 8, 8 + 3 * 32, col, 0);
    screen.render(x * 16 + 8, y * 16 + 8, 9 + 3 * 32, col, 0);
  }

  public mayPass(_level: Level, _x: number, _y: number, _e: Entity): boolean {
    return false;
  }
}
