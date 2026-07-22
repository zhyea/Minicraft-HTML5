/**
 * Port of entity/particle/SmashParticle.java.
 *
 * A short-lived 4-pixel burst shown when a tile is broken. The GWT constructor
 * plays Sound.monsterHurt (Java SmashParticle.java:14) — wired to match.
 */
import { Entity } from '../Entity';
import type { Screen } from '../../../engine/Screen';
import { Color } from '../../../engine/Color';
import { Sound } from '../../audio/Sound';

export class SmashParticle extends Entity {
  private time = 0;

  constructor(x: number, y: number) {
    super();
    this.x = x;
    this.y = y;
    Sound.play('monsterHurt'); // Java SmashParticle.java:14
  }

  public tick(): void {
    this.time++;
    if (this.time > 10) this.remove();
  }

  public render(screen: Screen): void {
    const col = Color.get(-1, 555, 555, 555);
    screen.render(this.x - 8, this.y - 8, 5 + 12 * 32, col, 2);
    screen.render(this.x - 0, this.y - 8, 5 + 12 * 32, col, 3);
    screen.render(this.x - 8, this.y - 0, 5 + 12 * 32, col, 0);
    screen.render(this.x - 0, this.y - 0, 5 + 12 * 32, col, 1);
  }
}
