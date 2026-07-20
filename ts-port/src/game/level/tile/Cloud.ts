/** Port of level/tile/CloudTile.java (minimal — only sky levels use it). */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';

export class CloudTile extends Tile {
  constructor(id: number) {
    super(id);
    this.connectsToSand = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(level.sandColor, level.sandColor, level.sandColor - 110, level.sandColor - 110);
    screen.render(x * 16 + 0, y * 16 + 0, 0, col, 0);
    screen.render(x * 16 + 8, y * 16 + 0, 1, col, 0);
    screen.render(x * 16 + 0, y * 16 + 8, 2, col, 0);
    screen.render(x * 16 + 8, y * 16 + 8, 3, col, 0);
  }
}
