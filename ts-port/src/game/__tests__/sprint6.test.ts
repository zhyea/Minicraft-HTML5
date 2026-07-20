import { describe, it, expect, beforeAll } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { installRecipes } from '../crafting/Crafting';
import { Game } from '../Game';
import { Level } from '../level/Level';
import { Tile } from '../level/tile/Tile';
import { Resource } from '../item/resource/Resource';
import { Player } from '../entity/Player';
import { AirWizard } from '../entity/AirWizard';
import { TextParticle } from '../entity/particle/TextParticle';
import { SmashParticle } from '../entity/particle/SmashParticle';
import type { Mob } from '../entity/Mob';

beforeAll(() => {
  installTiles();
  installResources();
  installRecipes();
});

/** Carve a guaranteed tile so planting/harvest targets are deterministic. */
function setTile(level: Level, tx: number, ty: number, t: Tile): void {
  level.setTile(tx, ty, t, 0);
}

/** Probe the surface map build time across several fresh games. */
function buildSkyAndTime(): { game: Game; elapsed: number } {
  const game = new Game();
  const t0 = Date.now();
  game.startNewGame();
  return { game, elapsed: Date.now() - t0 };
}

describe('D1 — Sky level generation + AirWizard win path', () => {
  it('builds all 5 levels quickly (<5s) and the Sky level contains an AirWizard', () => {
    const { game, elapsed } = buildSkyAndTime();

    // All five levels exist.
    for (let i = 0; i < 5; i++) expect(game.levels[i]).not.toBeNull();
    const sky = game.levels[4]!;
    expect(sky).toBeInstanceOf(Level);

    // The Sky level (level===1) must have spawned exactly one AirWizard.
    const wizards = sky.entities.filter((e) => e instanceof AirWizard);
    expect(wizards.length).toBe(1);

    // Surface still hosts the player + a zombie (pre-existing behaviour).
    expect(game.levels[3]!.player).not.toBeNull();

    expect(elapsed).toBeLessThan(5000);
  });

  it('does not hang across repeated builds', () => {
    for (let i = 0; i < 5; i++) {
      const { elapsed } = buildSkyAndTime();
      expect(elapsed).toBeLessThan(5000);
    }
  });
});

describe('D2 — previously-missing tiles ported, placeholders resolved', () => {
  it('all five formerly-null tiles are installed in the registry', () => {
    expect(Tile.hole).not.toBeNull();
    expect(Tile.treeSapling).not.toBeNull();
    expect(Tile.cactusSapling).not.toBeNull();
    expect(Tile.farmland).not.toBeNull();
    expect(Tile.wheat).not.toBeNull();
  });

  it('acorn (treeSapling) plants on grass', () => {
    const level = new Level(64, 64, 0, null);
    setTile(level, 5, 5, Tile.grass);
    const ok = Resource.acorn.interactOn(Tile.grass, level, 5, 5, null as unknown as Player, 0);
    expect(ok).toBe(true);
    expect(level.getTile(5, 5)).toBe(Tile.treeSapling);
  });

  it('dirt converts a hole back into dirt', () => {
    const level = new Level(64, 64, 0, null);
    setTile(level, 5, 5, Tile.hole);
    const ok = Resource.dirt.interactOn(Tile.hole, level, 5, 5, null as unknown as Player, 0);
    expect(ok).toBe(true);
    expect(level.getTile(5, 5)).toBe(Tile.dirt);
  });

  it('seeds grow wheat on farmland', () => {
    const level = new Level(64, 64, 0, null);
    setTile(level, 5, 5, Tile.farmland);
    const ok = Resource.seeds.interactOn(Tile.farmland, level, 5, 5, null as unknown as Player, 0);
    expect(ok).toBe(true);
    expect(level.getTile(5, 5)).toBe(Tile.wheat);
  });

  it('cactusFlower plants cactusSapling on sand', () => {
    const level = new Level(64, 64, 0, null);
    setTile(level, 5, 5, Tile.sand);
    const ok = Resource.cactusFlower.interactOn(Tile.sand, level, 5, 5, null as unknown as Player, 0);
    expect(ok).toBe(true);
    expect(level.getTile(5, 5)).toBe(Tile.cactusSapling);
  });
});

describe('D3 — particle system', () => {
  it('hurting a mob adds a TextParticle (hit particle) to the level', () => {
    const level = new Level(64, 64, 0, null);
    const game = new Game();
    const player = new Player(game, game.input);
    player.x = 100;
    player.y = 100;
    level.add(player);

    const before = level.entities.filter((e) => e instanceof TextParticle).length;
    player.hurt(player, 3, 0); // Mob.hurt -> Player.doHurt -> spawns TextParticle
    const after = level.entities.filter((e) => e instanceof TextParticle).length;

    expect(after).toBe(before + 1);
  });

  it('breaking a cactus spawns a SmashParticle + TextParticle', () => {
    const level = new Level(64, 64, 0, null);
    setTile(level, 5, 5, Tile.cactus, 5);

    const sBefore = level.entities.filter((e) => e instanceof SmashParticle).length;
    const tBefore = level.entities.filter((e) => e instanceof TextParticle).length;

    level.getTile(5, 5).hurt(level, 5, 5, null as unknown as Mob, 4, 0);

    expect(level.entities.filter((e) => e instanceof SmashParticle).length).toBe(sBefore + 1);
    expect(level.entities.filter((e) => e instanceof TextParticle).length).toBe(tBefore + 1);
  });
});
