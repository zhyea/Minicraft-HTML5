/**
 * Port of entity/ItemEntity.java — a resource dropped on the ground that the
 * player can walk over to pick up.
 *
 * Physics (gaussian jitter + bounce) are ported 1:1 from the GWT source. The
 * original plays Sound.pickup on take(); no Sound module exists in the slice,
 * so that is intentionally omitted.
 */
import { Color } from '../../engine/Color';
import type { Screen } from '../../engine/Screen';
import { Entity } from './Entity';
import type { Player } from './Player'; // type-only: avoids a runtime cycle
import type { Mob } from './Mob'; // type-only: safe, no runtime cycle
import { ResourceItem } from '../item/ResourceItem';
import { Sound } from '../audio/Sound';

export class ItemEntity extends Entity {
  /** Original is Item; the slice's drops are always ResourceItems. */
  public item: ResourceItem;
  public lifeTime: number;
  public time = 0;
  public hurtTime = 0;
  private xa = 0;
  private ya = 0;
  private za = 0;
  private xx = 0;
  private yy = 0;
  private zz = 0;

  constructor(item: ResourceItem, x: number, y: number) {
    super();
    this.item = item;
    this.xx = this.x = x;
    this.yy = this.y = y;
    this.xr = 3;
    this.yr = 3;
    this.zz = 2;
    this.xa = (Math.random() * 2 - 1) * 0.3; // approx Java random.nextGaussian() * 0.3
    this.ya = (Math.random() * 2 - 1) * 0.2; // approx * 0.2
    this.za = Math.random() * 0.7 + 1;
    this.lifeTime = 60 * 10 + Math.floor(Math.random() * 60); // original 600 + rand(60)
  }

  public tick(): void {
    this.time++;
    if (this.time >= this.lifeTime) {
      this.remove();
      return;
    }
    this.xx += this.xa;
    this.yy += this.ya;
    this.zz += this.za;
    if (this.zz < 0) {
      this.zz = 0;
      this.za *= -0.5;
      this.xa *= 0.6;
      this.ya *= 0.6;
    }
    this.za -= 0.15;
    const nx = Math.floor(this.xx);
    const ny = Math.floor(this.yy);
    this.move(nx - this.x, ny - this.y);
    if (this.hurtTime > 0) this.hurtTime--;
  }

  public render(screen: Screen): void {
    if (this.time >= this.lifeTime - 6 * 20) {
      if (Math.floor(this.time / 6) % 2 === 0) return; // blink out near end of life
    }
    screen.render(this.x - 4, this.y - 4, this.item.getSprite(), Color.get(-1, 0, 0, 0), 0);
    screen.render(this.x - 4, this.y - 4 - Math.floor(this.zz), this.item.getSprite(), this.item.getColor(), 0);
  }

  protected touchedBy(entity: Entity): void {
    if (this.time > 30) entity.touchItem(this); // Entity.touchItem no-op; Player overrides
  }

  /** Player walked over the drop. Awards score, adds to inventory, removes self. */
  public take(player: Player): void {
    player.score++;
    player.inventory.add(this.item);
    // Mirrors Java ItemEntity.take(): play the pickup blip on a successful grab.
    // take() runs exactly once per drop (this.remove() prevents re-touching),
    // so the chime fires once per item. Sound.play is a silent no-op without
    // Web Audio, so this never breaks headless / test environments.
    Sound.play('pickup');
    this.remove();
  }

  public isBlockableBy(_mob: Mob): boolean {
    return false;
  }
}
