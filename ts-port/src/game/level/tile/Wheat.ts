/**
 * Port of level/tile/WheatTile.java.
 *
 * A growing crop: `data` holds the age (0 = sprout .. 50 = ripe). The renderer
 * picks one of four wheat sprite frames and tints the body on a green→gold ramp
 * so intermediate growth is visible (more realistic than the old "seed snaps to
 * full wheat" feel). The crop is shoveled back to dirt and, on stepped-on /
 * hurt, "harvests" back to dirt while dropping seeds/wheat ItemEntities.
 */
import type { Screen } from '../../../engine/Screen';
import { Tile } from './Tile';
import type { Level } from '../Level';
import type { Player } from '../../entity/Player';
import type { Item } from '../../item/Item';
import type { Entity } from '../../entity/Entity';
import type { Mob } from '../../entity/Mob';
import { ItemEntity } from '../../entity/ItemEntity';
import { ResourceItem } from '../../item/ResourceItem';
import { Resource } from '../../item/resource/Resource';
import { ToolItem } from '../../item/ToolItem';
import { ToolType } from '../../item/ToolType';
import { Color } from '../../../engine/Color';

export class WheatTile extends Tile {
  constructor(id: number) {
    super(id);
  }

  public render(screen: Screen, level: Level, x: number, y: number): void {
    const age = level.getData(x, y);
    // Four wheat sprite frames: 0 = tiny sprout .. 3 = mature stalk.
    const icon = Math.min(3, Math.floor(age / 13));

    let col: number;
    if (age >= 50) {
      // Ripe: golden wheat (keeps the GWT ripe palette).
      col = Color.get(0, 0, 150, 240);
    } else {
      // Growth ramp: the soil-coloured outline (shades a/b) preserves the stalk
      // shape, while the body (shades c/d) climbs from fresh green (50) through
      // yellow-green (350) as the crop matures, so each intermediate age reads
      // distinctly instead of looking like static dirt.
      const body = 50 + icon * 100; // 50 (green) .. 150 .. 250 .. 350 (yellow-green)
      col = Color.get(level.dirtColor - 121, level.dirtColor - 11, body, body);
    }

    const base = 4 + 3 * 32 + icon;
    screen.render(x * 16 + 0, y * 16 + 0, base, col, 0);
    screen.render(x * 16 + 8, y * 16 + 0, base, col, 0);
    screen.render(x * 16 + 0, y * 16 + 8, base, col, 1);
    screen.render(x * 16 + 8, y * 16 + 8, base, col, 1);
  }

  public tick(level: Level, xt: number, yt: number): void {
    // Grow on ~20% of ticks so the staged visual is observable (≈4s to ripen at
    // 60fps) instead of snapping from seed to ripe within ~1.6s.
    if (Math.random() < 0.8) return;
    const age = level.getData(xt, yt);
    if (age < 50) level.setData(xt, yt, age + 1);
  }

  public interact(level: Level, xt: number, yt: number, player: Player, item: Item, _attackDir: number): boolean {
    if (item instanceof ToolItem) {
      const tool = item as ToolItem;
      if (tool.type === ToolType.shovel) {
        if (player.payStamina(4 - tool.level)) {
          level.setTile(xt, yt, Tile.dirt, 0);
          return true;
        }
      }
    }
    return false;
  }

  public steppedOn(level: Level, xt: number, yt: number, _entity: Entity): void {
    if (Math.floor(Math.random() * 60) !== 0) return;
    if (level.getData(xt, yt) < 2) return;
    this.harvest(level, xt, yt);
  }

  public hurt(level: Level, x: number, y: number, _source: Mob, _dmg: number, _attackDir: number): void {
    this.harvest(level, x, y);
  }

  private harvest(level: Level, x: number, y: number): void {
    const age = level.getData(x, y);

    const seedCount = Math.floor(Math.random() * 2); // 0..1 seeds
    for (let i = 0; i < seedCount; i++) {
      level.add(
        new ItemEntity(new ResourceItem(Resource.seeds, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3)
      );
    }

    let wheatCount = 0;
    if (age === 50) wheatCount = Math.floor(Math.random() * 3) + 2; // 2..4
    else if (age >= 40) wheatCount = Math.floor(Math.random() * 2) + 1; // 1..2
    for (let i = 0; i < wheatCount; i++) {
      level.add(
        new ItemEntity(new ResourceItem(Resource.wheat, 1), x * 16 + Math.floor(Math.random() * 10) + 3, y * 16 + Math.floor(Math.random() * 10) + 3)
      );
    }

    level.setTile(x, y, Tile.dirt, 0);
  }
}
