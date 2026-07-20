/**
 * EntityIO — serialises the persisted entity set to/from plain JSON objects.
 *
 * Dispatch key is `t` (typeId):
 *   1  Player
 *   2  Zombie      (stores `lvl`)
 *   3  Slime       (stores `lvl`)
 *   4  AirWizard
 *   6  Chest       (stores inventory)
 *   7  Workbench
 *   8  Anvil
 *   9  Furnace
 *   10 Oven
 *   11 Lantern
 *
 * 5 (Spark) and all particles are transient and are never written — `write`
 * returns null for anything without a persistent representation, and the caller
 * skips nulls. Mob common fields (position, health, knockback, timers) are
 * captured by `writeMobCommon`/`applyMobCommon`; per-type extras are layered on
 * top. Attack timers (AirWizard) and the player's private attackTime/attackDir
 * are intentionally omitted — they reset to a clean state on load.
 */
import type { Entity } from '../entity/Entity';
import type { Game } from '../Game';
import type { Mob } from '../entity/Mob';
import { Player } from '../entity/Player';
import { Zombie } from '../entity/Zombie';
import { Slime } from '../entity/Slime';
import { AirWizard } from '../entity/AirWizard';
import { Chest } from '../entity/Chest';
import { Furniture } from '../entity/Furniture';
import { Workbench } from '../entity/Workbench';
import { Anvil } from '../entity/Anvil';
import { Furnace } from '../entity/Furnace';
import { Oven } from '../entity/Oven';
import { Lantern } from '../entity/Lantern';
import { ItemIO } from './ItemIO';

interface MobPayload {
  x: number;
  y: number;
  walkDist: number;
  dir: number;
  hurtTime: number;
  xKnockback: number;
  yKnockback: number;
  maxHealth: number;
  health: number;
  swimTimer: number;
  tickTime: number;
}

function writeMobCommon(m: Mob): MobPayload {
  return {
    x: m.x,
    y: m.y,
    walkDist: m.walkDist,
    dir: m.dir,
    hurtTime: m.hurtTime,
    xKnockback: m.xKnockback,
    yKnockback: m.yKnockback,
    maxHealth: m.maxHealth,
    health: m.health,
    swimTimer: m.swimTimer,
    tickTime: m.tickTime,
  };
}

function applyMobCommon(m: Mob, o: MobPayload): void {
  m.x = o.x;
  m.y = o.y;
  m.walkDist = o.walkDist ?? 0;
  m.dir = o.dir ?? 0;
  m.hurtTime = o.hurtTime ?? 0;
  m.xKnockback = o.xKnockback ?? 0;
  m.yKnockback = o.yKnockback ?? 0;
  m.maxHealth = o.maxHealth ?? 10;
  m.health = o.health ?? m.maxHealth;
  m.swimTimer = o.swimTimer ?? 0;
  m.tickTime = o.tickTime ?? 0;
}

function writeInventory(inv: { items: unknown[] }): unknown[] {
  const out: unknown[] = [];
  for (const it of inv.items) {
    const w = ItemIO.write(it as never);
    if (w) out.push(w);
  }
  return out;
}

function readInventoryInto(target: { items: unknown[] }, arr: unknown): void {
  target.items.length = 0; // start clean; direct push preserves exact slots
  if (!Array.isArray(arr)) return;
  for (const o of arr) {
    const item = ItemIO.read(o);
    if (item) target.items.push(item);
  }
}

export class EntityIO {
  /** Serialise an entity, or null if it has no persistent representation. */
  public static write(e: Entity): Record<string, unknown> | null {
    if (e instanceof Player) {
      const base = writeMobCommon(e);
      return {
        t: 1,
        ...base,
        score: e.score,
        maxStamina: e.maxStamina,
        stamina: e.stamina,
        invulnerableTime: e.invulnerableTime,
        inventory: writeInventory(e.inventory),
        activeItem: e.activeItem ? ItemIO.write(e.activeItem) : null,
        attackItem: e.attackItem ? ItemIO.write(e.attackItem) : null,
      };
    }
    if (e instanceof Zombie) {
      return { t: 2, ...writeMobCommon(e), lvl: e.lvl };
    }
    if (e instanceof Slime) {
      return { t: 3, ...writeMobCommon(e), lvl: e.lvl };
    }
    if (e instanceof AirWizard) {
      return { t: 4, ...writeMobCommon(e) };
    }
    if (e instanceof Chest) {
      return {
        t: 6,
        x: e.x,
        y: e.y,
        col: e.col,
        sprite: e.sprite,
        name: e.name,
        inventory: writeInventory(e.inventory),
      };
    }
    if (e instanceof Workbench) {
      return { t: 7, x: e.x, y: e.y, col: e.col, sprite: e.sprite, name: e.name };
    }
    if (e instanceof Anvil) {
      return { t: 8, x: e.x, y: e.y, col: e.col, sprite: e.sprite, name: e.name };
    }
    if (e instanceof Furnace) {
      return { t: 9, x: e.x, y: e.y, col: e.col, sprite: e.sprite, name: e.name };
    }
    if (e instanceof Oven) {
      return { t: 10, x: e.x, y: e.y, col: e.col, sprite: e.sprite, name: e.name };
    }
    if (e instanceof Lantern) {
      return { t: 11, x: e.x, y: e.y, col: e.col, sprite: e.sprite, name: e.name };
    }
    // Spark, particles and any unknown entity: do not persist.
    return null;
  }

  /** Reconstruct an entity from its payload, or null if unrecognised. */
  public static read(o: unknown, game: Game): Entity | null {
    if (!o || typeof o !== 'object') return null;
    const obj = o as Record<string, unknown> & MobPayload;
    switch (obj.t) {
      case 1: {
        const p = new Player(game, game.input);
        applyMobCommon(p, obj);
        p.score = (obj.score as number) ?? 0;
        p.maxStamina = (obj.maxStamina as number) ?? 10;
        p.stamina = (obj.stamina as number) ?? p.maxStamina;
        p.invulnerableTime = (obj.invulnerableTime as number) ?? 0;
        readInventoryInto(p.inventory, obj.inventory);
        p.activeItem = obj.activeItem ? ItemIO.read(obj.activeItem) : null;
        p.attackItem = obj.attackItem ? ItemIO.read(obj.attackItem) : null;
        return p;
      }
      case 2: {
        const z = new Zombie((obj.lvl as number) ?? 1);
        applyMobCommon(z, obj);
        return z;
      }
      case 3: {
        const s = new Slime((obj.lvl as number) ?? 1);
        applyMobCommon(s, obj);
        return s;
      }
      case 4: {
        const aw = new AirWizard();
        applyMobCommon(aw, obj);
        return aw;
      }
      case 6: {
        const c = new Chest();
        c.x = obj.x as number;
        c.y = obj.y as number;
        c.col = obj.col as number;
        c.sprite = obj.sprite as number;
        c.name = obj.name as string;
        readInventoryInto(c.inventory, obj.inventory);
        return c;
      }
      case 7:
      case 8:
      case 9:
      case 10:
      case 11: {
        const f = Furniture.createByName(obj.name as string);
        if (!f) return null;
        f.x = obj.x as number;
        f.y = obj.y as number;
        f.col = obj.col as number;
        f.sprite = obj.sprite as number;
        f.name = obj.name as string;
        return f;
      }
      default:
        return null;
    }
  }
}
