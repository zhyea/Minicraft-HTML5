/**
 * Port of item/resource/PlantableResource.java.
 *
 * A resource that, when used on a matching source tile, converts that tile into
 * a target tile. The GWT overload taking `Tile... sourceTiles` is ported as a
 * rest parameter; interactOn is a 1:1 port (contains check + level.setTile).
 */
import type { Level } from '../../level/Level';
import type { Player } from '../../entity/Player';
import type { Tile } from '../../level/tile/Tile';
import { Resource } from './Resource';

export class PlantableResource extends Resource {
  private sourceTiles: Tile[];
  private targetTile: Tile;

  constructor(name: string, sprite: number, color: number, description = '', targetTile: Tile, ...sourceTiles: Tile[]) {
    super(name, sprite, color, description);
    this.sourceTiles = sourceTiles;
    this.targetTile = targetTile;
  }

  public interactOn(tile: Tile, level: Level, xt: number, yt: number, _player: Player, _attackDir: number): boolean {
    if (this.sourceTiles.includes(tile)) {
      level.setTile(xt, yt, this.targetTile, 0);
      return true;
    }
    return false;
  }
}
