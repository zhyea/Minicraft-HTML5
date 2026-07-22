import { describe, it, expect, beforeAll, vi } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { Game } from '../Game';
import { Level } from '../level/Level';
import { Tile } from '../level/tile/Tile';
import { Player } from '../entity/Player';
import { Resource } from '../item/resource/Resource';
import { ResourceItem } from '../item/ResourceItem';
import { TextParticle } from '../entity/particle/TextParticle';
import { Sound } from '../audio/Sound';
import { Color } from '../../engine/Color';

beforeAll(() => {
  // Resource.bread / Resource.apple are FoodResource singletons once installed.
  installTiles();
  installResources();
});

/** Fire a ground attack with the currently-held activeItem, facing a tile. */
function attack(player: Player): void {
  (player as unknown as { attack: () => void }).attack();
}

function makePlayer(): { game: Game; level: Level; player: Player } {
  const game = new Game();
  const level = new Level(64, 64, 0, null);
  // Guarantee a plain ground tile directly in front of the player (dir = 0 / down).
  level.setTile(6, 6, Tile.grass, 0);
  const player = new Player(game, game.input);
  player.x = 100;
  player.y = 100;
  player.dir = 0;
  level.add(player); // assigns player.level (required by attack()/feedback)
  return { game, level, player };
}

describe('Eating food: consume + heal (e2e, #52)', () => {
  it('heals the player and consumes the item when hurt', () => {
    const { player } = makePlayer();
    player.health = 8; // below maxHealth (10)
    player.stamina = player.maxStamina; // 10 >= bread cost 5
    const bread = new ResourceItem(Resource.bread, 1);
    player.activeItem = bread;

    attack(player);

    expect(player.health).toBe(10); // 8 + heal(2), capped at maxHealth
    expect(bread.count).toBe(0); // consumed (interactOn decremented)
    expect(player.activeItem).toBeNull(); // depleted -> cleared
  });

  it('does nothing (no heal, no consumption) when already at full HP', () => {
    const { player } = makePlayer();
    player.health = player.maxHealth; // full
    player.stamina = player.maxStamina;
    const bread = new ResourceItem(Resource.bread, 1);
    player.activeItem = bread;

    attack(player);

    expect(player.health).toBe(player.maxHealth); // unchanged
    expect(bread.count).toBe(1); // not consumed
    expect(player.activeItem).toBe(bread); // still held
  });

  it('does not consume when stamina is insufficient', () => {
    const { player } = makePlayer();
    player.health = 8; // hurt
    player.stamina = 3; // < bread cost 5
    const bread = new ResourceItem(Resource.bread, 1);
    player.activeItem = bread;

    attack(player);

    expect(player.health).toBe(8); // unchanged (couldn't pay stamina)
    expect(bread.count).toBe(1); // not consumed
    expect(player.activeItem).toBe(bread); // still held
  });
});

describe('Eating feedback: particles + eat SFX (#53)', () => {
  it('spawns a green "+N" particle and plays the eat sound on a successful bite', () => {
    const { level, player } = makePlayer();
    player.health = 8;
    player.stamina = player.maxStamina;
    player.activeItem = new ResourceItem(Resource.bread, 1);

    const playSpy = vi.spyOn(Sound, 'play');
    const addSpy = vi.spyOn(level, 'add');

    attack(player);

    expect(Sound.play).toHaveBeenCalledWith('eat');
    playSpy.mockRestore();

    const particles = addSpy.mock.calls
      .map((c) => c[0])
      .filter((e) => e instanceof TextParticle) as TextParticle[];
    expect(particles.length).toBeGreaterThan(0);
    const msgs = particles.map((p) => (p as unknown as { msg: string }).msg);
    const cols = particles.map((p) => (p as unknown as { col: number }).col);
    expect(msgs).toContain('+2'); // bread heal = 2
    expect(cols).toContain(Color.get(-1, 50, 50, 50)); // green
    addSpy.mockRestore();
  });

  it('spawns a yellow "吃饱了" hint when full, and never plays the eat sound', () => {
    const { level, player } = makePlayer();
    player.health = player.maxHealth;
    player.stamina = player.maxStamina;
    player.activeItem = new ResourceItem(Resource.bread, 1);

    const playSpy = vi.spyOn(Sound, 'play');
    const addSpy = vi.spyOn(level, 'add');

    attack(player);

    expect(Sound.play).not.toHaveBeenCalledWith('eat');
    playSpy.mockRestore();

    const particles = addSpy.mock.calls
      .map((c) => c[0])
      .filter((e) => e instanceof TextParticle) as TextParticle[];
    expect(particles.length).toBeGreaterThan(0);
    const msgs = particles.map((p) => (p as unknown as { msg: string }).msg);
    const cols = particles.map((p) => (p as unknown as { col: number }).col);
    expect(msgs).toContain('吃饱了');
    expect(cols).toContain(Color.get(-1, 550, 550, 550)); // yellow
    addSpy.mockRestore();
  });

  it('spawns a yellow "体力不足" hint when stamina is too low', () => {
    const { level, player } = makePlayer();
    player.health = 8;
    player.stamina = 3; // < bread cost 5
    player.activeItem = new ResourceItem(Resource.bread, 1);

    const addSpy = vi.spyOn(level, 'add');

    attack(player);

    const particles = addSpy.mock.calls
      .map((c) => c[0])
      .filter((e) => e instanceof TextParticle) as TextParticle[];
    expect(particles.length).toBeGreaterThan(0);
    const msgs = particles.map((p) => (p as unknown as { msg: string }).msg);
    expect(msgs).toContain('体力不足');
    addSpy.mockRestore();
  });
});
