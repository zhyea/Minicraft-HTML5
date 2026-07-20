/** Port of level/tile/LavaTile.java (minimal — only deep underground uses it). */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';

export class LavaTile extends Tile {
  constructor(id: number) {
    super(id);
    this.connectsToLava = true;
  }

  public render(screen: Screen, _level: Level, x: number, y: number): void {
    const col = Color.get(400, 400, 500, 500);
    screen.render(x * 16 + 0, y * 16 + 0, 0, col, 0);
    screen.render(x * 16 + 8, y * 16 + 0, 1, col, 0);
    screen.render(x * 16 + 0, y * 16 + 8, 2, col, 0);
    screen.render(x * 16 + 8, y * 16 + 8, 3, col, 0);
  }
}
