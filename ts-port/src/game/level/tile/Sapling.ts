/**
 * Port of level/tile/SaplingTile.java.
 *
 * A sapling grows into `growsTo` after enough ticks, and reverts to `onType`
 * when hurt. It inherits the connect flags of the tile it sprouts from (grass
 * or sand). One class implements both Tile.treeSapling (on grass → tree) and
 * Tile.cactusSapling (on sand → cactus), mirroring GWT's two constructor calls.
 */
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Mob } from '../../entity/Mob';
import { Color } from '../../../engine/Color';

export class SaplingTile extends Tile {
  private onType: Tile;
  private growsTo: Tile;

  constructor(id: number, onType: Tile, growsTo: Tile) {
    super(id);
    this.onType = onType;
    this.growsTo = growsTo;
    this.connectsToSand = onType.connectsToSand;
    this.connectsToGrass = onType.connectsToGrass;
    this.connectsToWater = onType.connectsToWater;
    this.connectsToLava = onType.connectsToLava;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    this.onType.render(screen, level, x, y);
    const col = Color.get(10, 40, 50, -1);
    screen.render(x * 16 + 4, y * 16 + 4, 11 + 3 * 32, col, 0);
  }

  public tick(level: Level, x: number, y: number): void {
    const age = level.getData(x, y) + 1;
    if (age > 100) {
      level.setTile(x, y, this.growsTo, 0);
    } else {
      level.setData(x, y, age);
    }
  }

  public hurt(level: Level, x: number, y: number, _source: Mob, _dmg: number, _attackDir: number): void {
    level.setTile(x, y, this.onType, 0);
  }
}
