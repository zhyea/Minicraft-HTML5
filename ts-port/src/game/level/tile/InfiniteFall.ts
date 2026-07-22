/** Port of level/tile/InfiniteFallTile.java — only the AirWizard can pass. */
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';
import { AirWizard } from '../../entity/AirWizard';

export class InfiniteFallTile extends Tile {
  constructor(id: number) {
    super(id);
  }

  public render(_screen: Screen, _level: Level, _x: number, _y: number): void {
    // Transparent in the original; nothing is drawn here.
  }

  public mayPass(_level: Level, _x: number, _y: number, e: Entity): boolean {
    return e instanceof AirWizard;
  }
}
