/** Port of level/tile/LavaTile.java (only deep underground uses it). */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';

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

  public getLightRadius(_level: Level, _x: number, _y: number): number {
    return 6;
  }
}
