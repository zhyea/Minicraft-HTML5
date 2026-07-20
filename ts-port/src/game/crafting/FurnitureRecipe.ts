/**
 * Port of crafting/FurnitureRecipe.java — yields a FurnitureItem on craft.
 *
 * The Java original calls `new <Furniture subclass>()` per FurnitureType. With
 * the real Furniture entities now ported (Sprint 3), each FurnitureType.newInst()
 * builds the concrete entity (Workbench / Anvil / Furnace / Oven / Chest /
 * Lantern) instead of the placeholder FurnitureStub used in Sprint 2. The
 * furniture *identity* (name) and the cost logic are unchanged.
 */
import type { Furniture } from '../entity/Furniture';
import { Workbench } from '../entity/Workbench';
import { Anvil } from '../entity/Anvil';
import { Furnace } from '../entity/Furnace';
import { Oven } from '../entity/Oven';
import { Chest } from '../entity/Chest';
import { Lantern } from '../entity/Lantern';
import { Inventory } from '../entity/Inventory';
import { Recipe } from './Recipe';
import { FurnitureItem } from '../item/FurnitureItem';

export class FurnitureRecipe extends Recipe {
  private type: FurnitureRecipe.FurnitureType;

  constructor(type: FurnitureRecipe.FurnitureType) {
    super(new FurnitureItem(type.newInst()));
    this.type = type;
  }

  public craft(inventory: Inventory): void {
    inventory.add(0, new FurnitureItem(this.type.newInst()));
  }
}

/** Mirrors Java `FurnitureRecipe.FurnitureType` enum (per-type newInst()). */
export namespace FurnitureRecipe {
  export class FurnitureType {
    public static readonly LANTERN = new FurnitureType('灯笼', Lantern);
    public static readonly OVEN = new FurnitureType('烤箱', Oven);
    public static readonly FURNACE = new FurnitureType('熔炉', Furnace);
    public static readonly WORKBENCH = new FurnitureType('工作台', Workbench);
    public static readonly CHEST = new FurnitureType('箱子', Chest);
    public static readonly ANVIL = new FurnitureType('铁砧', Anvil);

    private constructor(
      public readonly name: string,
      private readonly ctor: new () => Furniture,
    ) {}

    public newInst(): Furniture {
      return new this.ctor();
    }
  }
}
