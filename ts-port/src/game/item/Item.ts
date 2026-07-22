/**
 * Port of item/Item.java — the base item class.
 *
 * Faithful 1:1 port of the public API. Rendering hooks (renderIcon /
 * renderInventory) take the existing engine Screen and call its `render`
 * exactly like the GWT gfx.Screen.render(x, y, sprite, color, 0). Interaction
 * hooks are ported but only exercised once later sprints wire menus/tiles.
 *
 * `onTake` originally receives an ItemEntity; that entity type is not part of
 * the Sprint-1 slice, so the parameter is typed `unknown` (arity preserved).
 */
import type { Screen } from '../../engine/Screen';
import type { Level } from '../level/Level';
import type { Player } from '../entity/Player';
import type { Entity } from '../entity/Entity';
import type { Tile } from '../level/tile/Tile';

export class Item {
  public getColor(): number {
    return 0;
  }

  public getSprite(): number {
    return 0;
  }

  public onTake(_itemEntity: unknown): void {}

  public renderInventory(_screen: Screen, _x: number, _y: number): void {}

  public interact(_player: Player, _entity: Entity, _attackDir: number): boolean {
    return false;
  }

  public renderIcon(_screen: Screen, _x: number, _y: number): void {}

  public interactOn(_tile: Tile, _level: Level, _xt: number, _yt: number, _player: Player, _attackDir: number): boolean {
    return false;
  }

  public isDepleted(): boolean {
    return false;
  }

  public canAttack(): boolean {
    return false;
  }

  public getAttackDamageBonus(_e: Entity): number {
    return 0;
  }

  public getName(): string {
    return '';
  }

  /** Short zh-CN blurb for the inventory description area. Base class returns ''. */
  public getDescription(): string {
    return '';
  }

  /** Mirrors Java `getClass() == getClass()` — same concrete class. */
  public matches(item: Item): boolean {
    return item.constructor === this.constructor;
  }
}
