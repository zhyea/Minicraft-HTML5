/**
 * Port of item/resource/Resource.java — the central resource registry.
 *
 * Static singletons follow the same deferred-init pattern as Tile (see
 * ../../level/tile/Tile.ts): they are declared as `null as unknown as Resource`
 * and filled by installResources() in ./registry.ts. That install step must
 * run AFTER installTiles() so PlantableResource can read the Tile singletons.
 *
 * The 6-character name guard throws exactly like the GWT RuntimeException. The
 * static instances are assigned from ./registry.ts (not here) to avoid an
 * ES-module circular-init hazard: Resource is the base class of
 * PlantableResource / FoodResource, and installing those subclasses here would
 * force Resource to import its own subclasses at module-eval time.
 */
import type { Level } from '../../level/Level';
import type { Player } from '../../entity/Player';
import type { Tile } from '../../level/tile/Tile';

export class Resource {
  // Static singletons — assigned by installResources() in ./registry.ts.
  public static wood: Resource = null as unknown as Resource;
  public static stone: Resource = null as unknown as Resource;
  public static flower: Resource = null as unknown as Resource;
  public static acorn: Resource = null as unknown as Resource;
  public static dirt: Resource = null as unknown as Resource;
  public static sand: Resource = null as unknown as Resource;
  public static cactusFlower: Resource = null as unknown as Resource;
  public static seeds: Resource = null as unknown as Resource;
  public static wheat: Resource = null as unknown as Resource;
  public static bread: Resource = null as unknown as Resource;
  public static apple: Resource = null as unknown as Resource;
  public static coal: Resource = null as unknown as Resource;
  public static ironOre: Resource = null as unknown as Resource;
  public static goldOre: Resource = null as unknown as Resource;
  public static ironIngot: Resource = null as unknown as Resource;
  public static goldIngot: Resource = null as unknown as Resource;
  public static slime: Resource = null as unknown as Resource;
  public static glass: Resource = null as unknown as Resource;
  public static cloth: Resource = null as unknown as Resource;
  public static cloud: Resource = null as unknown as Resource;
  public static gem: Resource = null as unknown as Resource;

  public readonly name: string;
  public readonly sprite: number;
  public readonly color: number;
  public readonly description: string;

  constructor(name: string, sprite: number, color: number, description = '') {
    if (name.length > 6) throw new Error('Name cannot be longer than six characters!');
    this.name = name;
    this.sprite = sprite;
    this.color = color;
    this.description = description;
  }

  public interactOn(_tile: Tile, _level: Level, _xt: number, _yt: number, _player: Player, _attackDir: number): boolean {
    return false;
  }

  private static readonly BY_NAME = new Map<string, Resource>();

  /** Register a resource under its name (called from ./registry.ts). */
  public static register(resource: Resource): void {
    Resource.BY_NAME.set(resource.name, resource);
  }

  public static getByName(name: string): Resource | null {
    return name == null ? null : Resource.BY_NAME.get(name) ?? null;
  }
}
