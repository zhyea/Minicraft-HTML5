/**
 * Port of entity/Lantern.java — emits light. Mirrors Java's getLightRadius()==8,
 * exposed both as the `lightRadius` field and the overridden getLightRadius().
 */
import { Furniture } from './Furniture';
import { Color } from '../../engine/Color';

export class Lantern extends Furniture {
  /** Light radius in tiles; mirrors Java Lantern.getLightRadius() == 8. */
  public readonly lightRadius = 8;

  constructor() {
    super('灯笼');
    this.col = Color.get(-1, 0, 111, 555);
    this.sprite = 5;
    this.xr = 3;
    this.yr = 2;
  }

  public getLightRadius(): number {
    return this.lightRadius;
  }
}

Furniture.registerFurniture('灯笼', Lantern);
