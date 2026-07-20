/** Port of level/tile/OreTile.java. The original drops a Resource; drops are stubbed for the slice. */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';

export class OreTile extends Tile {
  private baseColor: number;

  constructor(id: number, color: number) {
    super(id);
    this.baseColor = color & 0xffffff00;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const color = this.baseColor + Color.get(level.dirtColor, level.dirtColor, level.dirtColor, level.dirtColor);
    screen.render(x * 16 + 0, y * 16 + 0, 17 + 1 * 32, color, 0);
    screen.render(x * 16 + 8, y * 16 + 0, 18 + 1 * 32, color, 0);
    screen.render(x * 16 + 0, y * 16 + 8, 17 + 2 * 32, color, 0);
    screen.render(x * 16 + 8, y * 16 + 8, 18 + 2 * 32, color, 0);
  }

  public mayPass(_level: Level, _x: number, _y: number, _e: Entity): boolean {
    return false;
  }

  public bumpedInto(_level: Level, _x: number, _y: number, entity: Entity): void {
    entity.hurtTile(this, _x, _y, 3);
  }
}
