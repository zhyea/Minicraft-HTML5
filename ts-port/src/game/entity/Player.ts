/**
 * Port of entity/Player.java (gameplay-logic complete).
 *
 * Implements the full interaction model the vertical slice was missing:
 *   - attack()  : the four-stage pipeline (activeItem.interactOn(tile) ->
 *                 tile.interact(item) -> activeItem.interact(entity) ->
 *                 tile.hurt + entity.hurt). This is the master switch that
 *                 makes mining / farming / combat / item-placement reachable.
 *   - use()     : the menu/X key path -> adjacent entity.use() + tile.use().
 *   - tick()    : stairs detection (level change), stamina recharge, attack
 *                 (C) and menu (X) and select (Z) input handling.
 *
 * Inventory/items/stamina are faithful. The InventoryMenu/CraftingMenu shells
 * are owned by the Vue layer (opening is delegated to Game/state), but the
 * underlying logic here is 1:1 with the GWT original.
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
import type { Entity } from './Entity';
import { ItemEntity } from './ItemEntity';
import { FurnitureItem } from '../item/FurnitureItem';
import { Workbench } from './Workbench';
import { PowerGloveItem } from '../item/PowerGloveItem';
import { ResourceItem } from '../item/ResourceItem';
import { FoodResource } from '../item/resource/FoodResource';
import { Rand } from '../../engine/Rand';
import { Sound } from '../audio/Sound';

export class Player extends Mob {
  private input: InputHandler;
  private attackTime = 0;
  private attackDir = 0;
  /** Mirrors Java `public Item attackItem` — read by the save layer (EntityIO). */
  public attackItem: Item | null = null;
  private onStairDelay = 0;
  private staminaRecharge = 0;
  /** Stamina-bar blink state. Read by Game.renderGui() to mirror the Java
   *  stamina-bar blink, so it is public (a public getter would also work). */
  public staminaRechargeDelay = 0;
  private random = new Rand();

  public game: Game;
  public score = 0;
  public maxStamina = 10;
  public stamina = 10;
  public invulnerableTime = 0;

  /** Item model. activeItem is the currently-held item (set by the inventory UI or cycleActiveItem). */
  public inventory = new Inventory();
  public activeItem: Item | null = null;

  constructor(game: Game, input: InputHandler, seedStartingItems = true) {
    super();
    this.game = game;
    this.input = input;
    this.x = 24;
    this.y = 24;
    this.stamina = this.maxStamina;

    // Java seeds a Workbench + PowerGlove on a fresh game; a loaded game skips
    // this so the saved inventory is not duplicated (see SaveManager).
    if (seedStartingItems) {
      this.inventory.add(new FurnitureItem(new Workbench()));
      this.inventory.add(new PowerGloveItem());
    }
  }

  public tick(): void {
    super.tick();

    if (this.invulnerableTime > 0) this.invulnerableTime--;

    // Stairs: stepping onto a stairs tile schedules a level change (mirrors Java).
    const onTile = this.level.getTile(this.x >> 4, this.y >> 4);
    if (onTile === Tile.stairsDown || onTile === Tile.stairsUp) {
      if (this.onStairDelay === 0) {
        this.game.changeLevel(onTile === Tile.stairsUp ? 1 : -1);
        this.onStairDelay = 10;
        return;
      }
      this.onStairDelay = 10;
    } else if (this.onStairDelay > 0) {
      this.onStairDelay--;
    }

    // Stamina recharge (mirrors Java's recharge state machine).
    if (this.stamina <= 0 && this.staminaRechargeDelay === 0 && this.staminaRecharge === 0) {
      this.staminaRechargeDelay = 40;
    }
    if (this.staminaRechargeDelay > 0) this.staminaRechargeDelay--;
    if (this.staminaRechargeDelay === 0) {
      this.staminaRecharge++;
      if (this.isSwimming()) this.staminaRecharge = 0;
      while (this.staminaRecharge > 10) {
        this.staminaRecharge -= 10;
        if (this.stamina < this.maxStamina) this.stamina++;
      }
    }

    let xa = 0;
    let ya = 0;
    if (this.input.up.down) ya--;
    if (this.input.down.down) ya++;
    if (this.input.left.down) xa--;
    if (this.input.right.down) xa++;
    if (this.isSwimming() && this.tickTime % 60 === 0) {
      if (this.stamina > 0) this.stamina -= 1;
      else this.hurt(this, 1, this.dir ^ 1);
    }

    // Move on every other recharge tick (matches Java's `staminaRechargeDelay % 2 == 0` gate).
    if (this.staminaRechargeDelay % 2 === 0) this.move(xa, ya);

    if (this.input.attack.clicked) {
      if (this.stamina === 0) {
        // Out of stamina: no action (mirrors Java's empty branch).
      } else {
        this.stamina -= 1;
        this.staminaRecharge = 0;
        this.attack();
      }
    }

    // Select (Z): cycle the held item through the inventory (incl. a null slot).
    if (this.input.select.clicked) {
      this.cycleActiveItem();
    }

    if (this.attackTime > 0) this.attackTime--;
  }

  /** Cycle activeItem: item0 -> item1 -> ... -> null -> item0. */
  public cycleActiveItem(): void {
    const items = this.inventory.items;
    if (items.length === 0) {
      this.activeItem = null;
      return;
    }
    const idx = this.activeItem ? items.indexOf(this.activeItem) : -1;
    const nextIdx = (idx + 1) % (items.length + 1);
    this.activeItem = nextIdx >= items.length ? null : items[nextIdx];
  }

  /** The menu/X key: use an adjacent furniture or tile. Returns true if something was used. */
  public use(): boolean {
    this.attackDir = this.dir;
    let yo = -2;
    if (this.dir === 0 && this.useEntity(this.x - 8, this.y + 4 + yo, this.x + 8, this.y + 12 + yo)) return true;
    if (this.dir === 1 && this.useEntity(this.x - 8, this.y - 12 + yo, this.x + 8, this.y - 4 + yo)) return true;
    if (this.dir === 3 && this.useEntity(this.x + 4, this.y - 8 + yo, this.x + 12, this.y + 8 + yo)) return true;
    if (this.dir === 2 && this.useEntity(this.x - 12, this.y - 8 + yo, this.x - 4, this.y + 8 + yo)) return true;

    const xt = this.x >> 4;
    const yt = (this.y + yo) >> 4;
    let tx = xt;
    let ty = yt;
    const r = 12;
    if (this.attackDir === 0) ty = (this.y + r + yo) >> 4;
    if (this.attackDir === 1) ty = (this.y - r + yo) >> 4;
    if (this.attackDir === 2) tx = (this.x - r) >> 4;
    if (this.attackDir === 3) tx = (this.x + r) >> 4;

    if (tx >= 0 && ty >= 0 && tx < this.level.w && ty < this.level.h) {
      if (this.level.getTile(tx, ty).use(this.level, tx, ty, this, this.attackDir)) return true;
    }
    return false;
  }

  /** The attack/C key: the four-stage interaction pipeline. */
  private attack(): void {
    this.walkDist += 8;
    this.attackDir = this.dir;
    this.attackTime = 5;
    this.attackItem = this.activeItem;
    let done = false;

    if (this.activeItem != null) {
      // Stage 1+2: use the held item on an adjacent entity, then on the tile
      // in front (mirrors Java's interact() + tile.interact branches).
      const item = this.activeItem;
      let yo = -2;
      const range = 12;
      if (this.dir === 0 && this.useItemOnBox(this.x - 8, this.y + 4 + yo, this.x + 8, this.y + range + yo, item)) done = true;
      if (this.dir === 1 && this.useItemOnBox(this.x - 8, this.y - range + yo, this.x + 8, this.y - 4 + yo, item)) done = true;
      if (this.dir === 3 && this.useItemOnBox(this.x + 4, this.y - 8 + yo, this.x + range, this.y + 8 + yo, item)) done = true;
      if (this.dir === 2 && this.useItemOnBox(this.x - range, this.y - 8 + yo, this.x - 4, this.y + 8 + yo, item)) done = true;
      if (done) return;

      const xt = this.x >> 4;
      const yt = (this.y + yo) >> 4;
      let tx = xt;
      let ty = yt;
      const r = 12;
      if (this.attackDir === 0) ty = (this.y + r + yo) >> 4;
      if (this.attackDir === 1) ty = (this.y - r + yo) >> 4;
      if (this.attackDir === 2) tx = (this.x - r) >> 4;
      if (this.attackDir === 3) tx = (this.x + r) >> 4;

      if (tx >= 0 && ty >= 0 && tx < this.level.w && ty < this.level.h) {
        const ate = item.interactOn(this.level.getTile(tx, ty), this.level, tx, ty, this, this.attackDir);
        if (ate) {
          done = true;
        } else if (this.level.getTile(tx, ty).interact(this.level, tx, ty, this, item, this.attackDir)) {
          done = true;
        }
        this.feedbackFood(item, ate);
        if (item.isDepleted()) this.activeItem = null;
      }
    }

    if (done) return;

    // Stage 3+4: with no item, or a weapon, hit adjacent entities and the tile.
    if (this.activeItem == null || this.activeItem.canAttack()) {
      this.attackTime = 5;
      let yo = -2;
      const range = 20;
      if (this.dir === 0) this.damageInBox(this.x - 8, this.y + 4 + yo, this.x + 8, this.y + range + yo);
      if (this.dir === 1) this.damageInBox(this.x - 8, this.y - range + yo, this.x + 8, this.y - 4 + yo);
      if (this.dir === 3) this.damageInBox(this.x + 4, this.y - 8 + yo, this.x + range, this.y + 8 + yo);
      if (this.dir === 2) this.damageInBox(this.x - range, this.y - 8 + yo, this.x - 4, this.y + 8 + yo);

      const xt = this.x >> 4;
      const yt = (this.y + yo) >> 4;
      let tx = xt;
      let ty = yt;
      const r = 12;
      if (this.attackDir === 0) ty = (this.y + r + yo) >> 4;
      if (this.attackDir === 1) ty = (this.y - r + yo) >> 4;
      if (this.attackDir === 2) tx = (this.x - r) >> 4;
      if (this.attackDir === 3) tx = (this.x + r) >> 4;

      if (tx >= 0 && ty >= 0 && tx < this.level.w && ty < this.level.h) {
        this.level.getTile(tx, ty).hurt(this.level, tx, ty, this, this.random.nextInt(3) + 1, this.attackDir);
      }
    }
  }

  /**
   * Eating feedback, fired from attack() after a held ResourceItem resolves
   * against the ground tile via interactOn.
   *
   *  - ate === true  : the player actually ate — show a green "+N" heal
   *    particle (N = the food's heal value) and play the 'eat' SFX.
   *  - ate === false : the held item IS food but couldn't be eaten (full HP or
   *    not enough stamina). Show a yellow hint so the silent Java behaviour
   *    becomes perceptible. The item is NOT consumed.
   *
   * Non-food items fall through the early guard — no spam. The core eat logic
   * in FoodResource.interactOn is untouched.
   */
  private feedbackFood(item: Item, ate: boolean): void {
    if (!(item instanceof ResourceItem)) return;
    const res = item.resource;
    if (!(res instanceof FoodResource)) return;

    const x = this.x;
    const y = this.y;
    if (ate) {
      const heal = res.getHeal();
      this.level.add(new TextParticle(`+${heal}`, x, y, Color.get(-1, 50, 50, 50)));
      Sound.play('eat');
    } else if (this.health >= this.maxHealth) {
      this.level.add(new TextParticle('吃饱了', x, y, Color.get(-1, 550, 550, 550)));
    } else if (this.stamina < res.getStaminaCost()) {
      this.level.add(new TextParticle('体力不足', x, y, Color.get(-1, 550, 550, 550)));
    }
  }

  /** Use the held item on any entity in the box (returns true if one was used). */
  private useItemOnBox(x0: number, y0: number, x1: number, y1: number, item: Item): boolean {
    const entities = this.level.getEntities(x0, y0, x1, y1);
    for (const e of entities) {
      if (e !== this && e.interact(this, item, this.attackDir)) return true;
    }
    return false;
  }

  /** Use an adjacent entity (furniture) — used by the menu/X key. */
  private useEntity(x0: number, y0: number, x1: number, y1: number): boolean {
    const entities = this.level.getEntities(x0, y0, x1, y1);
    for (const e of entities) {
      if (e !== this && e.use(this, this.attackDir)) return true;
    }
    return false;
  }

  /** Damage every entity in the box (the combat branch of attack). */
  private damageInBox(x0: number, y0: number, x1: number, y1: number): void {
    const entities = this.level.getEntities(x0, y0, x1, y1);
    for (const e of entities) {
      if (e !== this) e.hurt(this, this.getAttackDamage(e), this.attackDir);
    }
  }

  private getAttackDamage(e: Entity): number {
    let dmg = this.random.nextInt(3) + 1;
    if (this.attackItem != null) dmg += this.attackItem.getAttackDamageBonus(e);
    return dmg;
  }

  public render(screen: Screen): void {
    let xt = 0;
    let yt = 14;

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
    const swingCol = Color.get(-1, 555, 555, 555);

    // Attack swing (decorative, mirrors Java Player.render's attackDir branches).
    // Drawn before the body for the up direction, like the original.
    if (this.attackTime > 0 && this.attackDir === 1) {
      screen.render(xo + 0, yo - 4, 6 + 13 * 32, swingCol, 0);
      screen.render(xo + 8, yo - 4, 6 + 13 * 32, swingCol, 1);
      if (this.attackItem != null) this.attackItem.renderIcon(screen, xo + 4, yo - 4);
    }

    if (this.activeItem instanceof FurnitureItem) {
      yt += 2;
    }
    screen.render(xo + 8 * flip1, yo + 0, xt + yt * 32, col, flip1);
    screen.render(xo + 8 - 8 * flip1, yo + 0, xt + 1 + yt * 32, col, flip1);
    if (!this.isSwimming()) {
      screen.render(xo + 8 * flip2, yo + 8, xt + (yt + 1) * 32, col, flip2);
      screen.render(xo + 8 - 8 * flip2, yo + 8, xt + 1 + (yt + 1) * 32, col, flip2);
    }

    // Swing continuations for the remaining directions + the held item icon.
    if (this.attackTime > 0 && this.attackDir === 2) {
      screen.render(xo - 4, yo, 7 + 13 * 32, swingCol, 1);
      screen.render(xo - 4, yo + 8, 7 + 13 * 32, swingCol, 3);
      if (this.attackItem != null) this.attackItem.renderIcon(screen, xo - 4, yo + 4);
    }
    if (this.attackTime > 0 && this.attackDir === 3) {
      screen.render(xo + 8 + 4, yo, 7 + 13 * 32, swingCol, 0);
      screen.render(xo + 8 + 4, yo + 8, 7 + 13 * 32, swingCol, 2);
      if (this.attackItem != null) this.attackItem.renderIcon(screen, xo + 8 + 4, yo + 4);
    }
    if (this.attackTime > 0 && this.attackDir === 0) {
      screen.render(xo + 0, yo + 8 + 4, 6 + 13 * 32, swingCol, 2);
      screen.render(xo + 8, yo + 8 + 4, 6 + 13 * 32, swingCol, 3);
      if (this.attackItem != null) this.attackItem.renderIcon(screen, xo + 4, yo + 8 + 4);
    }

    // Carried furniture: draw its sprite at the player (mirrors Java).
    if (this.activeItem instanceof FurnitureItem) {
      const furniture = this.activeItem.furniture;
      furniture.x = this.x;
      furniture.y = yo;
      furniture.render(screen);
    }
  }

  public canSwim(): boolean {
    return true;
  }

  /** Override of Entity.touchItem: pick up a dropped ItemEntity into the inventory. */
  public touchItem(ie: ItemEntity): void {
    ie.take(this);
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
    Sound.play('playerHurt');
  }

  protected die(): void {
    Sound.play('playerDeath');
    super.die();
  }

  public getLightRadius(): number {
    let r = 2;
    if (this.activeItem instanceof FurnitureItem) {
      const rr = this.activeItem.furniture.getLightRadius();
      if (rr > r) r = rr;
    }
    return r;
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
   * invulnerability and flips the Game win flag.
   */
  public gameWon(): void {
    this.invulnerableTime = 60 * 5;
    this.game.won();
  }
}
