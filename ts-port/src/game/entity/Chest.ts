/**
 * Port of entity/Chest.java — a container with its own Inventory.
 *
 * The Inventory storage + add/remove logic is ported faithfully. `use` (which
 * opens the ContainerMenu) is inherited from Furniture and routes through the
 * `onUse` hook (Sprint 3); Sprint 5 will wire it to open ContainerMenu(player,
 * "箱子", inventory).
 */
import { Furniture } from './Furniture';
import { Color } from '../../engine/Color';
import { Inventory } from './Inventory';

export class Chest extends Furniture {
  public inventory = new Inventory();

  constructor() {
    super('箱子');
    this.col = Color.get(-1, 110, 331, 552);
    this.sprite = 1;
  }
}

Furniture.registerFurniture('箱子', Chest);
