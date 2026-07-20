/** Port of level/tile/FlowerTile.java (extends GrassTile). */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { GrassTile } from './Grass';
import type { Level } from '../Level';

export class FlowerTile extends GrassTile {
  constructor(id: number) {
    super(id);
    this.connectsToGrass = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    super.render(screen, level, x, y);

    const data = level.getData(x, y);
    const shape = Math.floor(data / 16) % 2;
    const flowerCol = Color.get(10, level.grassColor, 555, 440);

    if (shape === 0) screen.render(x * 16 + 0, y * 16 + 0, 1 + 1 * 32, flowerCol, 0);
    if (shape === 1) screen.render(x * 16 + 8, y * 16 + 0, 1 + 1 * 32, flowerCol, 0);
    if (shape === 1) screen.render(x * 16 + 0, y * 16 + 8, 1 + 1 * 32, flowerCol, 0);
    if (shape === 0) screen.render(x * 16 + 8, y * 16 + 8, 1 + 1 * 32, flowerCol, 0);
  }
}
