/**
 * Port of item/PowerGloveItem.java.
 *
 * `interact` lets the player pick a Furniture back up. The GWT uses
 * `entity instanceof Furniture`; since the Furniture entity is not part of the
 * Sprint-1 slice (see FurnitureItem.ts), we apply the equivalent structural
 * test — "is this entity a furniture?" — by probing for a `take(Player)` method.
 */
import type { Screen } from '../../engine/Screen';
import type { Entity } from '../entity/Entity';
import type { Player } from '../entity/Player';
import { Color } from '../../engine/Color';
import { Item } from './Item';

export class PowerGloveItem extends Item {
  public getColor(): number {
    return Color.get(-1, 100, 320, 430);
  }

  public getSprite(): number {
    return 7 + 4 * 32;
  }

  public renderIcon(screen: Screen, x: number, y: number): void {
    screen.render(x, y, this.getSprite(), this.getColor(), 0);
  }

  public renderInventory(screen: Screen, x: number, y: number): void {
    screen.render(x, y, this.getSprite(), this.getColor(), 0);
  }

  public getName(): string {
    return '力量手套';
  }

  public getDescription(): string {
    return '手持它对准已放下的家具按攻击键，即可收回背包。';
  }

  public interact(_player: Player, entity: Entity, _attackDir: number): boolean {
    const f = entity as unknown as { take?: (p: Player) => void };
    if (typeof f.take === 'function') {
      f.take(_player);
      return true;
    }
    return false;
  }
}
