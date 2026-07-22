/**
 * Port of crafting/Recipe.java — abstract base for all crafting recipes.
 *
 * Faithful 1:1 port of the public model + cost logic. The GWT original takes a
 * `Player` in checkCanCraft / craft / deductCost and reads `player.inventory`;
 * the ts-port Sprint-1 Inventory is decoupled from Player, so we accept an
 * `Inventory` directly (same hasResources / removeResource API the GWT player
 * inventory exposed). UI hooks (renderInventory) are deferred with the Vue
 * CraftingMenu (a later sprint), so they are intentionally omitted here.
 *
 * Note on `canCraft`: in Java this is a *state field* set by
 * checkCanCraft(Player); the menu reads it to grey out unavailable entries. We
 * keep that exact shape — call checkCanCraft(inv) to recompute, then read the
 * `canCraft` flag. (The task brief's "canCraft(Inventory)" paraphrase maps to
 * this checkCanCraft() + canCraft pattern.)
 */
import type { Item } from '../item/Item';
import { ResourceItem } from '../item/ResourceItem';
import type { Resource } from '../item/resource/Resource';
import type { Inventory } from '../entity/Inventory';
import { Sound } from '../audio/Sound';

export abstract class Recipe {
  public costs: Item[] = [];
  public canCraft = false;
  public resultTemplate: Item;

  constructor(resultTemplate: Item) {
    this.resultTemplate = resultTemplate;
  }

  /** Chainable cost entry, mirroring Java `addCost(Resource, int)`. */
  public addCost(resource: Resource, count: number): this {
    this.costs.push(new ResourceItem(resource, count));
    return this;
  }

  /**
   * Recomputes `canCraft` by checking every ResourceItem cost against the
   * inventory (short-circuits to false on the first missing resource).
   * Mirrors Java checkCanCraft(Player).
   */
  public checkCanCraft(inventory: Inventory): void {
    for (const item of this.costs) {
      if (item instanceof ResourceItem) {
        if (!inventory.hasResources(item.resource, item.count)) {
          this.canCraft = false;
          return;
        }
      }
    }
    this.canCraft = true;
  }

  /**
   * Yields the recipe output into the inventory + plays the 'craft' chime.
   * Mirrors Java craft(Player); the single wiring point for the craft SFX so
   * every concrete recipe (resource / tool / furniture) triggers it exactly
   * once on a successful craft. `Sound.play` is a silent no-op where Web Audio
   * is unavailable (tests / headless), so this never affects logic or counts.
   */
  public craft(inventory: Inventory): void {
    this.produce(inventory);
    Sound.play('craft');
  }

  /** Subclass hook that actually yields the output item(s). */
  protected abstract produce(inventory: Inventory): void;

  /**
   * Removes the input costs from the inventory. In Java this is a *separate*
   * step invoked by the crafting menu right after craft(); craft() itself does
   * NOT consume inputs. Mirrors Java deductCost(Player).
   */
  public deductCost(inventory: Inventory): void {
    for (const item of this.costs) {
      if (item instanceof ResourceItem) {
        inventory.removeResource(item.resource, item.count);
      }
    }
  }
}
