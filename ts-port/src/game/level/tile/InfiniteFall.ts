/** Port of level/tile/InfiniteFallTile.java (minimal — only sky levels use it). */
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';

export class InfiniteFallTile extends Tile {
  constructor(id: number) {
    super(id);
  }

  public render(_screen: Screen, _level: Level, _x: number, _y: number): void {
    // Transparent in the original; nothing is drawn here.
  }
}
