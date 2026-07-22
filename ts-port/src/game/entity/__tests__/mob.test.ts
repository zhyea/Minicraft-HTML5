// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { Mob } from '../Mob';
import type { Tile } from '../../level/tile/Tile';

/** Minimal concrete Mob so we can exercise the base damage path without pulling
 *  the full Zombie/Slime import chain (which drags in Game). Mob has no abstract
 *  members, so this is instantiable. */
class TestMob extends Mob {}

/** hurtTile ignores the tile argument, so any stub works. */
const tileStub = {} as unknown as Tile;

describe('Mob.hurtTile (P1-A: tile contact damage)', () => {
  it('applies ore damage (3) to health and sets hurtTime', () => {
    const mob = new TestMob();
    mob.hurtTime = 0; // gates repeat hits
    const before = mob.health;

    mob.hurtTile(tileStub, 0, 0, 3);

    expect(mob.health).toBe(before - 3);
    expect(mob.hurtTime).toBeGreaterThan(0);
  });

  it('applies cactus damage (1) to health', () => {
    const mob = new TestMob();
    mob.hurtTime = 0;
    const before = mob.health;

    mob.hurtTile(tileStub, 0, 0, 1);

    expect(mob.health).toBe(before - 1);
    expect(mob.hurtTime).toBeGreaterThan(0);
  });

  it('does not apply damage while hurtTime is active (invulnerability gate)', () => {
    const mob = new TestMob();
    mob.hurtTime = 5; // mid-invulnerability window
    const before = mob.health;

    mob.hurtTile(tileStub, 0, 0, 3);

    expect(mob.health).toBe(before); // unchanged
  });

  it('is reachable from the Entity base contract (Ore.bumpedInto / Cactus.bumpedInto)', () => {
    // The base Entity.hurtTile is an empty no-op; Mob must override it so that
    // Ore/Cactus bumpedInto -> entity.hurtTile(...) actually deals damage.
    const mob = new TestMob();
    expect(typeof (mob as any).hurtTile).toBe('function');
    mob.hurtTime = 0;
    const before = mob.health;
    mob.hurtTile(tileStub, 0, 0, 3);
    expect(mob.health).toBe(before - 3);
  });
});
