/**
 * Port of level/tile/Tile.java — the base tile.
 *
 * Tiles are registered into the static `Tile.tiles[256]` array by id (exactly
 * like the GWT `public static Tile grass = new GrassTile(0)` initialisers). To
 * avoid ES-module circular-init problems (subclasses extend Tile, and Tile's
 * static singletons construct subclasses), the registration is performed by the
 * side-effecting `installTiles()` in ./registry.ts, which must be called once
 * before any tile logic runs. Each subclass constructor still self-registers
 * via `super(id)` (mirroring GWT), so the lookup table is always consistent.
 */
import type { Screen } from '../../../engine/Screen';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';
import type { Mob } from '../../entity/Mob';
import type { Player } from '../../entity/Player';

export class Tile {
  public static tickCount = 0;
  /** id -> Tile instance (null until installTiles() populates it). */
  public static tiles: (Tile | null)[] = new Array(256).fill(null);

  // Static singletons, assigned by installTiles(). Typed as `Tile` but
  // initialised to null (cast) because this tsconfig rejects definite-
  // assignment assertions (`!`) on static fields (TS1255). installTiles()
  // fills these before any tile logic runs, so access sites may treat them
  // as non-null `Tile`.
  public static grass: Tile = null as unknown as Tile;
  public static rock: Tile = null as unknown as Tile;
  public static water: Tile = null as unknown as Tile;
  public static flower: Tile = null as unknown as Tile;
  public static tree: Tile = null as unknown as Tile;
  public static dirt: Tile = null as unknown as Tile;
  public static sand: Tile = null as unknown as Tile;
  public static cactus: Tile = null as unknown as Tile;
  public static lava: Tile = null as unknown as Tile;
  public static stairsDown: Tile = null as unknown as Tile;
  public static stairsUp: Tile = null as unknown as Tile;
  public static infiniteFall: Tile = null as unknown as Tile;
  public static cloud: Tile = null as unknown as Tile;
  public static hardRock: Tile = null as unknown as Tile;
  public static ironOre: Tile = null as unknown as Tile;
  public static cloudCactus: Tile = null as unknown as Tile;
  // Sprint-6 ported tiles (mirrors GWT Tile.java statics hole..wheat).
  public static hole: Tile = null as unknown as Tile;
  public static treeSapling: Tile = null as unknown as Tile;
  public static cactusSapling: Tile = null as unknown as Tile;
  public static farmland: Tile = null as unknown as Tile;
  public static wheat: Tile = null as unknown as Tile;

  public readonly id: number;
  public connectsToGrass = false;
  public connectsToSand = false;
  public connectsToLava = false;
  public connectsToWater = false;

  constructor(id: number) {
    this.id = id & 0xff;
    if (Tile.tiles[this.id] != null) throw new Error(`Duplicate tile id: ${this.id}`);
    Tile.tiles[this.id] = this;
  }

  public render(_screen: Screen, _level: Level, _x: number, _y: number): void {}

  public mayPass(_level: Level, _x: number, _y: number, _e: Entity): boolean {
    return true;
  }

  public getLightRadius(_level: Level, _x: number, _y: number): number {
    return 0;
  }

  public hurt(_level: Level, _x: number, _y: number, _source: Mob, _dmg: number, _attackDir: number): void {}

  public bumpedInto(_level: Level, _xt: number, _yt: number, _entity: Entity): void {}

  public tick(_level: Level, _xt: number, _yt: number): void {}

  public steppedOn(_level: Level, _xt: number, _yt: number, _entity: Entity): void {}

  public interact(_level: Level, _xt: number, _yt: number, _player: Player, _item: unknown, _attackDir: number): boolean {
    return false;
  }

  public use(_level: Level, _xt: number, _yt: number, _player: Player, _attackDir: number): boolean {
    return false;
  }

  public connectsToLiquid(): boolean {
    return this.connectsToWater || this.connectsToLava;
  }
}
