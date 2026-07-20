/** Port of level/tile/StairsTile.java. */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';

export class StairsTile extends Tile {
  private leadsUp: boolean;

  constructor(id: number, leadsUp: boolean) {
    super(id);
    this.leadsUp = leadsUp;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const color = Color.get(level.dirtColor, 0, 333, 444);
    let xt = 0;
    if (this.leadsUp) xt = 2;
    screen.render(x * 16 + 0, y * 16 + 0, xt + 2 * 32, color, 0);
    screen.render(x * 16 + 8, y * 16 + 0, xt + 1 + 2 * 32, color, 0);
    screen.render(x * 16 + 0, y * 16 + 8, xt + 3 * 32, color, 0);
    screen.render(x * 16 + 8, y * 16 + 8, xt + 1 + 3 * 32, color, 0);
  }
}
