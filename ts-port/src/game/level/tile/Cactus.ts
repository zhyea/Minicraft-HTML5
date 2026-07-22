/** Port of level/tile/CactusTile.java. */
import { Color } from '../../../engine/Color';
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Entity } from '../../entity/Entity';
import type { Mob } from '../../entity/Mob';
import { SmashParticle } from '../../entity/particle/SmashParticle';
import { TextParticle } from '../../entity/particle/TextParticle';
import { ItemEntity } from '../../entity/ItemEntity';
import { ResourceItem } from '../../item/ResourceItem';
import { Resource } from '../../item/resource/Resource';

export class CactusTile extends Tile {
  constructor(id: number) {
    super(id);
    this.connectsToSand = true;
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const col = Color.get(20, 40, 50, level.sandColor);
    screen.render(x * 16 + 0, y * 16 + 0, 8 + 2 * 32, col, 0);
    screen.render(x * 16 + 8, y * 16 + 0, 9 + 2 * 32, col, 0);
    screen.render(x * 16 + 0, y * 16 + 8, 8 + 3 * 32, col, 0);
    screen.render(x * 16 + 8, y * 16 + 8, 9 + 3 * 32, col, 0);
  }

  public mayPass(_level: Level, _x: number, _y: number, _e: Entity): boolean {
    return false;
  }

  public bumpedInto(_level: Level, _x: number, _y: number, entity: Entity): void {
    entity.hurtTile(this, _x, _y, 1);
  }

  public tick(level: Level, xt: number, yt: number): void {
    const damage = level.getData(xt, yt);
    if (damage > 0) level.setData(xt, yt, damage - 1);
  }

  public hurt(level: Level, x: number, y: number, _source: Mob, dmg: number, _attackDir: number): void {
    const damage = level.getData(x, y) + dmg;
    // Faithful: smash burst + damage readout at the cactus centre.
    level.add(new SmashParticle(x * 16 + 8, y * 16 + 8));
    level.add(new TextParticle(`${dmg}`, x * 16 + 8, y * 16 + 8, Color.get(-1, 500, 500, 500)));
    if (damage >= 10) {
      // Faithful: drop a cactusFlower ResourceItem (1..2), then revert to sand.
      const count = Math.floor(Math.random() * 2) + 1;
      for (let i = 0; i < count; i++) {
        level.add(new ItemEntity(new ResourceItem(Resource.cactusFlower, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3));
      }
      level.setTile(x, y, Tile.sand, 0);
    } else {
      level.setData(x, y, damage);
    }
  }
}
