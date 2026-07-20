/**
 * Port of entity/Player.java (slice-flavoured).
 *
 * Movement, swimming, attack (tile hurt), sprite rendering, findStartPos and
 * invulnerability are faithful. Inventory/items/stamina/furniture and the
 * Instructions/Inventory menus are omitted for the vertical slice; the menu
 * overlay is handled by Vue (TitleMenu.vue).
 */
import { Color } from '../../engine/Color';
import type { Screen } from '../../engine/Screen';
import { Mob } from './Mob';
import { TextParticle } from './particle/TextParticle';
import type { InputHandler } from '../../engine/InputHandler';
import type { Game } from '../Game';
import { Tile } from '../level/tile/Tile';
import { Inventory } from './Inventory';
import type { Item } from '../item/Item';
import { Furniture } from './Furniture';

export class Player extends Mob {
  private input: InputHandler;
  private attackTime = 0;
  private attackDir = 0;

  public game: Game;
  public score = 0;
  public maxStamina = 10;
  public stamina = 10;
  public invulnerableTime = 0;

  /** Item model (Sprint 1). Held items are not yet driven by input/menus. */
  public inventory = new Inventory();
  public activeItem: Item | null = null;
  public attackItem: Item | null = null;

  constructor(game: Game, input: InputHandler) {
    super();
    this.game = game;
    this.input = input;
    this.x = 24;
    this.y = 24;
    this.stamina = this.maxStamina;
  }

  public tick(): void {
    super.tick();

    if (this.invulnerableTime > 0) this.invulnerableTime--;

    if (this.isSwimming() && this.tickTime % 60 === 0) {
      if (this.stamina > 0) this.stamina -= 1;
      else this.hurt(this, 1, this.dir ^ 1);
    }

    let xa = 0;
    let ya = 0;
    if (this.input.up.down) ya--;
    if (this.input.down.down) ya++;
    if (this.input.left.down) xa--;
    if (this.input.right.down) xa++;
    this.move(xa, ya);

    if (this.input.attack.clicked) {
      // Furniture interaction: pressing attack (C) next to a usable furniture
      // opens its menu instead of digging the tile, mirroring Java's
      // furniture.use() on interact. The handler is wired by the UI layer.
      const furniture = this.findAdjacentFurniture();
      if (furniture && this.game.furnitureUseHandler && this.game.furnitureUseHandler(furniture, this, this.dir)) {
        this.attackTime = 0;
      } else {
        this.attack();
      }
    }
    if (this.attackTime > 0) this.attackTime--;
  }

  /**
   * Nearest Furniture within interaction range of the player, or null.
   * Used by the attack (C) key to "use" adjacent workbenches/anvils/chests.
   */
  private findAdjacentFurniture(): Furniture | null {
    if (!this.level) return null;
    const r = 12; // px search radius around the player centre
    const near = this.level.getEntities(this.x - r, this.y - r, this.x + r, this.y + r);
    let best: Furniture | null = null;
    let bestDist = Infinity;
    for (const e of near) {
      if (e instanceof Furniture) {
        const dx = e.x - this.x;
        const dy = e.y - this.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          best = e;
        }
      }
    }
    return best;
  }

  private attack(): void {
    this.walkDist += 8;
    this.attackDir = this.dir;
    this.attackTime = 5;

    const xt = this.x >> 4;
    const yt = (this.y - 2) >> 4;
    let tx = xt;
    let ty = yt;
    const r = 12;
    if (this.attackDir === 0) ty = (this.y + r - 2) >> 4;
    if (this.attackDir === 1) ty = (this.y - r - 2) >> 4;
    if (this.attackDir === 2) tx = (this.x - r) >> 4;
    if (this.attackDir === 3) tx = (this.x + r) >> 4;

    if (tx >= 0 && ty >= 0 && tx < this.level.w && ty < this.level.h) {
      this.level.getTile(tx, ty).hurt(this.level, tx, ty, this, 1 + Math.floor(Math.random() * 3), this.attackDir);
    }
  }

  public render(screen: Screen): void {
    let xt = 0;
    const yt = 14;

    let flip1 = (this.walkDist >> 3) & 1;
    let flip2 = (this.walkDist >> 3) & 1;

    if (this.dir === 1) {
      xt += 2;
    }
    if (this.dir > 1) {
      flip1 = 0;
      flip2 = (this.walkDist >> 4) & 1;
      if (this.dir === 2) {
        flip1 = 1;
      }
      xt += 4 + ((this.walkDist >> 3) & 1) * 2;
    }

    const xo = this.x - 8;
    let yo = this.y - 11;
    if (this.isSwimming()) {
      yo += 4;
      let waterColor = Color.get(-1, -1, 115, 335);
      if ((this.tickTime / 8) % 2 === 0) {
        waterColor = Color.get(-1, 335, 5, 115);
      }
      screen.render(xo + 0, yo + 3, 5 + 13 * 32, waterColor, 0);
      screen.render(xo + 8, yo + 3, 5 + 13 * 32, waterColor, 1);
    }

    let col = Color.get(-1, 100, 220, 532);
    if (this.hurtTime > 0) {
      col = Color.get(-1, 555, 555, 555);
    }

    screen.render(xo + 8 * flip1, yo + 0, xt + yt * 32, col, flip1);
    screen.render(xo + 8 - 8 * flip1, yo + 0, xt + 1 + yt * 32, col, flip1);
    if (!this.isSwimming()) {
      screen.render(xo + 8 * flip2, yo + 8, xt + (yt + 1) * 32, col, flip2);
      screen.render(xo + 8 - 8 * flip2, yo + 8, xt + 1 + (yt + 1) * 32, col, flip2);
    }
  }

  public canSwim(): boolean {
    return true;
  }

  public findStartPos(level: { w: number; h: number; getTile(x: number, y: number): Tile }): boolean {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const x = Math.floor(Math.random() * level.w);
      const y = Math.floor(Math.random() * level.h);
      if (level.getTile(x, y) === Tile.grass) {
        this.x = x * 16 + 8;
        this.y = y * 16 + 8;
        return true;
      }
    }
  }

  protected doHurt(damage: number, attackDir: number): void {
    if (this.hurtTime > 0 || this.invulnerableTime > 0) return;
    if (this.level) {
      this.level.add(new TextParticle(`${damage}`, this.x, this.y, Color.get(-1, 504, 504, 504)));
    }
    this.health -= damage;
    if (attackDir === 0) this.yKnockback = 6;
    if (attackDir === 1) this.yKnockback = -6;
    if (attackDir === 2) this.xKnockback = -6;
    if (attackDir === 3) this.xKnockback = 6;
    this.hurtTime = 10;
    this.invulnerableTime = 30;
  }

  public getLightRadius(): number {
    return 2;
  }

  /**
   * Spend stamina if affordable. Faithful port of Player.payStamina(int): returns
   * false when stamina cannot cover the cost (including when already empty),
   * otherwise deducts and returns true.
   */
  public payStamina(cost: number): boolean {
    if (this.stamina >= cost) {
      this.stamina -= cost;
      return true;
    }
    return false;
  }

  /** Restore health up to maxHealth. Faithful port of Player.heal(int). */
  public heal(amount: number): void {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  /**
   * Victory hook. Faithful port of Player.gameWon(): grants post-win
   * invulnerability and flips the Game win flag. (Java also sets
   * level.player.invulnerableTime; this.invulnerableTime is equivalent here.)
   */
  public gameWon(): void {
    this.invulnerableTime = 60 * 5;
    this.game.won();
  }
}
