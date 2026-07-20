/**
 * Port of item/FurnitureItem.java.
 *
 * The GWT FurnitureItem wraps a `Furniture` entity. Sprint 3 ported the real
 * Furniture base (entity/Furniture.ts), so we type `furniture` against the
 * concrete class — which still exposes the three fields this item reads
 * (col / sprite / name) plus the full Entity API. `interactOn` is a 1:1 port
 * of the placement logic (mayPass check + level.add).
 */
import type { Screen } from '../../engine/Screen';
import type { Level } from '../level/Level';
import type { Player } from '../entity/Player';
import type { Tile } from '../level/tile/Tile';
import type { Furniture } from '../entity/Furniture';
import { Item } from './Item';

export class FurnitureItem extends Item {
  public furniture: Furniture;
  public placed = false;

  constructor(furniture: Furniture) {
    super();
    this.furniture = furniture;
  }

  public getColor(): number {
    return this.furniture.col;
  }

  public getSprite(): number {
    return this.furniture.sprite + 10 * 32;
  }

  public renderIcon(screen: Screen, x: number, y: number): void {
    screen.render(x, y, this.getSprite(), this.getColor(), 0);
  }

  public renderInventory(screen: Screen, x: number, y: number): void {
    screen.render(x, y, this.getSprite(), this.getColor(), 0);
  }

  public onTake(_itemEntity: unknown): void {}

  public canAttack(): boolean {
    return false;
  }

  public interactOn(tile: Tile, level: Level, xt: number, yt: number, _player: Player, _attackDir: number): boolean {
    if (tile.mayPass(level, xt, yt, this.furniture)) {
      this.furniture.x = xt * 16 + 8;
      this.furniture.y = yt * 16 + 8;
      level.add(this.furniture);
      this.placed = true;
      return true;
    }
    return false;
  }

  public isDepleted(): boolean {
    return this.placed;
  }

  public getName(): string {
    return this.furniture.name;
  }
}
