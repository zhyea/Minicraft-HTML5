/**
 * Port of item/ResourceItem.java.
 *
 * A stackable wrapper around a Resource. Rendering draws the resource's own
 * sprite/color; the GWT name + count text (Font.draw) is deferred with the
 * menu UI, since no Font module exists in the slice yet.
 */
import type { Screen } from '../../engine/Screen';
import type { Level } from '../level/Level';
import type { Player } from '../entity/Player';
import type { Tile } from '../level/tile/Tile';
import { Item } from './Item';
import type { Resource } from './resource/Resource';

export class ResourceItem extends Item {
  public resource: Resource;
  public count = 1;

  constructor(resource: Resource, count = 1) {
    super();
    this.resource = resource;
    this.count = count;
  }

  public getColor(): number {
    return this.resource.color;
  }

  public getSprite(): number {
    return this.resource.sprite;
  }

  public renderIcon(screen: Screen, x: number, y: number): void {
    screen.render(x, y, this.resource.sprite, this.resource.color, 0);
  }

  public renderInventory(screen: Screen, x: number, y: number): void {
    // Icon only in the slice; GWT also draws the resource name + count via
    // Font.draw, which is deferred together with the inventory menu.
    screen.render(x, y, this.resource.sprite, this.resource.color, 0);
  }

  public getName(): string {
    return this.resource.name;
  }

  public onTake(_itemEntity: unknown): void {}

  public interactOn(tile: Tile, level: Level, xt: number, yt: number, player: Player, attackDir: number): boolean {
    if (this.resource.interactOn(tile, level, xt, yt, player, attackDir)) {
      this.count--;
      return true;
    }
    return false;
  }

  public isDepleted(): boolean {
    return this.count <= 0;
  }
}
