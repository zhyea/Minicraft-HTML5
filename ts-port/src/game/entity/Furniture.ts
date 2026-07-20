/**
 * Port of entity/Furniture.java — the base class for every world-object entity
 * (workbench, anvil, furnace, oven, chest, lantern).
 *
 * Faithful to the GWT original:
 *  - col / sprite / name identify the entity (read by FurnitureItem + render).
 *  - tick() drives the player-pickup (`take`) sequence and the push-by-player
 *    shove; both are 1:1 with Java.
 *  - blocks() returns true (furniture is solid); touchedBy() starts a 10-tick
 *    shove in the player's facing direction.
 *  - use() is the Sprint-3 menu-open hook. In Java each subclass overrides use
 *    to open its menu (CraftingMenu / ContainerMenu); here we route through an
 *    `onUse` callback so the behaviour is testable today and Sprint 5 can wire
 *    the real Vue menu registry without touching these entities.
 */
import type { Screen } from '../../engine/Screen';
import { Entity } from './Entity';
import { Player } from './Player';
import { PowerGloveItem } from '../item/PowerGloveItem';
import { FurnitureItem } from '../item/FurnitureItem';

export class Furniture extends Entity {
  public col = 0;
  public sprite = 0;
  public name: string;

  private pushTime = 0;
  private pushDir = -1;
  private shouldTake: Player | null = null;

  /** Sprint-3 menu-open hook (Sprint 5 replaces with a menu registry). */
  public onUse?: (player: Player, attackDir: number) => boolean;

  constructor(name: string) {
    super();
    this.name = name;
    this.xr = 3;
    this.yr = 3;
  }

  public tick(): void {
    if (this.shouldTake != null) {
      if (this.shouldTake.activeItem instanceof PowerGloveItem) {
        this.remove();
        this.shouldTake.inventory.add(0, this.shouldTake.activeItem);
        this.shouldTake.activeItem = new FurnitureItem(this);
      }
      this.shouldTake = null;
    }

    if (this.pushDir === 0) this.move(0, 1);
    if (this.pushDir === 1) this.move(0, -1);
    if (this.pushDir === 2) this.move(-1, 0);
    if (this.pushDir === 3) this.move(1, 0);
    this.pushDir = -1;
    if (this.pushTime > 0) this.pushTime--;
  }

  public render(screen: Screen): void {
    screen.render(this.x - 8, this.y - 8 - 4, this.sprite * 2 + 8 * 32, this.col, 0);
    screen.render(this.x - 0, this.y - 8 - 4, this.sprite * 2 + 8 * 32 + 1, this.col, 0);
    screen.render(this.x - 8, this.y - 0 - 4, this.sprite * 2 + 8 * 32 + 32, this.col, 0);
    screen.render(this.x - 0, this.y - 0 - 4, this.sprite * 2 + 8 * 32 + 33, this.col, 0);
  }

  public blocks(_e: Entity): boolean {
    return true;
  }

  protected touchedBy(entity: Entity): void {
    if (entity instanceof Player && this.pushTime === 0) {
      this.pushDir = entity.dir;
      this.pushTime = 10;
    }
  }

  public take(player: Player): void {
    this.shouldTake = player;
  }

  /** Menu-open hook; returns the hook's result, or false when unwired. */
  public use(player: Player, attackDir: number): boolean {
    return this.onUse ? this.onUse(player, attackDir) : false;
  }

  /**
   * Registry mapping a Furniture's persisted `name` to its constructor. Each
   * subclass self-registers on module load (see the bottom of Workbench/Anvil/
   * Furnace/Oven/Chest/Lantern). This avoids a hard `import` of the subclasses
   * here, which would create a class-extends-value circular dependency that
   * crashes at evaluation time (the subclasses extend Furniture). All six are
   * pulled in transitively by FurnitureRecipe via installRecipes at Game start,
   * so the registry is fully populated before any save is read.
   */
  private static readonly REGISTRY = new Map<string, new () => Furniture>();

  /** Subclasses call this once at module-eval to register their `name`. */
  public static registerFurniture(name: string, ctor: new () => Furniture): void {
    Furniture.REGISTRY.set(name, ctor);
  }

  /**
   * Reconstruct a Furniture subclass from its persisted `name` (e.g. '工作台').
   * Used by EntityIO/ItemIO to bring saved workbenches/chests/lanterns back.
   * Returns null for an unknown name (defensive against forward-incompatible
   * saves).
   */
  public static createByName(name: string): Furniture | null {
    const ctor = Furniture.REGISTRY.get(name);
    return ctor ? new ctor() : null;
  }
}
