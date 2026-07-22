/**
 * Save/Load MVP loop — round-trip + robustness tests.
 *
 * These run in the default vitest 'node' environment, where `localStorage` is
 * undefined. SaveStore transparently falls back to an in-process Map, so the
 * shared single slot is visible across two independent Game instances (g1
 * saves, g2 loads) within one test — exactly what the round-trip cases rely on.
 */
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { installRecipes } from '../crafting/Crafting';
import { Game } from '../Game';
import { ResourceItem } from '../item/ResourceItem';
import { Resource } from '../item/resource/Resource';
import { AirWizard } from '../entity/AirWizard';
import { Player } from '../entity/Player';
import { Chest } from '../entity/Chest';
import { Workbench } from '../entity/Workbench';
import { Zombie } from '../entity/Zombie';
import { ItemEntity } from '../entity/ItemEntity';
import { SaveStore } from '../save/SaveStore';
import { gameState } from '../state';

beforeAll(() => {
  installTiles();
  installResources();
  installRecipes();
});

// Isolate each test: every test starts from an empty save slot.
beforeEach(() => {
  new SaveStore().clear();
  gameState.currentMenu = 'title'; // isMenuOpen() is false for 'title'/'none'
});

describe('A — full round-trip through save/load', () => {
  it('rebuilds identical levels, player and inventory from a save', () => {
    const g1 = new Game();
    g1.startNewGame();

    // Mutate a representative cross-section of state.
    g1.player!.health = 5;
    g1.player!.x = 1000;
    g1.player!.y = 2000;
    g1.player!.score = 4242;
    g1.tickCount = 777;
    g1.hasWon = true;
    g1.wonTimer = 123;
    g1.player!.inventory.add(new ResourceItem(Resource.apple, 7));

    g1.saveGame();

    const g2 = new Game();
    g2.loadGame();

    // Five levels, byte-identical tiles + data after base64 round-trip.
    expect(g2.levels.length).toBe(5);
    for (let i = 0; i < 5; i++) {
      const a = g1.levels[i]!;
      const b = g2.levels[i]!;
      expect(SaveStore.base64Encode(b.tiles)).toBe(SaveStore.base64Encode(a.tiles));
      expect(SaveStore.base64Encode(b.data)).toBe(SaveStore.base64Encode(a.data));
    }

    // Scalar game-level fields.
    expect(g2.currentLevel).toBe(g1.currentLevel);
    expect(g2.tickCount).toBe(777);
    expect(g2.hasWon).toBe(true);
    expect(g2.wonTimer).toBe(123);

    // Player core fields.
    expect(g2.player).not.toBeNull();
    expect(g2.player!.health).toBe(5);
    expect(g2.player!.x).toBe(1000);
    expect(g2.player!.y).toBe(2000);
    expect(g2.player!.score).toBe(4242);

    // Inventory fidelity: exactly one apple stack, count preserved.
    const appleItems = g2.player!.inventory.items.filter(
      (it) => it instanceof ResourceItem && it.resource === Resource.apple,
    );
    expect(appleItems.length).toBe(1);
    expect((appleItems[0] as ResourceItem).count).toBe(7);

    // Player<->level wiring restored.
    expect(g2.player!.level).toBe(g2.levels[g2.currentLevel]);
    expect(g2.levels[g2.currentLevel]!.player).toBe(g2.player);
    expect(g2.active).toBe(true);
  });
});

describe('B — hasSave state machine', () => {
  it('is false before any save and true after saveGame, false again after clear', () => {
    const g = new Game();
    g.startNewGame();
    expect(g.hasSave()).toBe(false);

    g.saveGame();
    expect(g.hasSave()).toBe(true);

    new SaveStore().clear();
    expect(g.hasSave()).toBe(false);
    expect(new SaveStore().hasSave()).toBe(false);
  });
});

describe('C — Sky boss is not duplicated on load', () => {
  it('loads exactly one AirWizard on the sky level', () => {
    const g1 = new Game();
    g1.startNewGame();
    expect(g1.levels[4]!.entities.filter((e) => e instanceof AirWizard).length).toBe(1);

    g1.saveGame();

    const g2 = new Game();
    g2.loadGame();
    const sky = g2.levels[4]!;
    expect(sky.entities.filter((e) => e instanceof AirWizard).length).toBe(1);
  });
});

describe('D — corrupt / wrong-version saves are tolerated', () => {
  it('ignores a wrong schemaVersion without throwing or mutating state', () => {
    const g = new Game(); // fresh: no levels, no player, inactive
    const levelsLen = g.levels.length;
    const playerBefore = g.player;

    new SaveStore().save(JSON.stringify({ schemaVersion: 999, foo: 'bar' }));

    expect(() => g.loadGame()).not.toThrow();
    expect(g.levels.length).toBe(levelsLen);
    expect(g.player).toBe(playerBefore);
    expect(g.active).toBe(false);
  });

  it('ignores illegal JSON without throwing or mutating state', () => {
    const g = new Game();
    const levelsLen = g.levels.length;

    new SaveStore().save('{ this is not valid json ');

    expect(() => g.loadGame()).not.toThrow();
    expect(g.levels.length).toBe(levelsLen);
    expect(g.active).toBe(false);
  });

  it('is a no-op when no save slot exists', () => {
    const g = new Game();
    expect(g.hasSave()).toBe(false);
    expect(() => g.loadGame()).not.toThrow();
    expect(g.levels.length).toBe(0);
    expect(g.active).toBe(false);
  });
});

describe('E — autosave cadence', () => {
  it('saves once the tick counter reaches a 1800 multiple', () => {
    const g = new Game();
    g.startNewGame();
    g.tickCount = 1799;
    new SaveStore().clear();
    gameState.currentMenu = 'title'; // live game (isMenuOpen() === false)

    g.tick();

    expect(g.tickCount).toBe(1800);
    expect(g.hasSave()).toBe(true);
  });
});

describe('F — entity variety round-trip (furniture + mob tiers)', () => {
  it('restores chest inventory, workbench and a tiered zombie', () => {
    const g1 = new Game();
    g1.startNewGame();
    const surface = g1.levels[3]!;

    const chest = new Chest();
    chest.x = 200;
    chest.y = 300;
    chest.inventory.add(new ResourceItem(Resource.wood, 4));
    chest.pushTime = 7; // P2-7
    chest.pushDir = 2; // P2-7
    surface.add(chest);

    const bench = new Workbench();
    bench.x = 400;
    bench.y = 500;
    surface.add(bench);

    const z2 = new Zombie(2);
    z2.x = 600;
    z2.y = 700;
    z2.health = 30;
    z2.xr = 6; // P2-8 (default is 4, so this is observable)
    z2.yr = 5; // P2-8 (default is 3)
    surface.add(z2);

    g1.saveGame();

    const g2 = new Game();
    g2.loadGame();
    const surface2 = g2.levels[3]!;

    const chests = surface2.entities.filter((e) => e instanceof Chest) as Chest[];
    expect(chests.length).toBe(1);
    expect(chests[0].x).toBe(200);
    expect(chests[0].y).toBe(300);
    expect(chests[0].inventory.count(new ResourceItem(Resource.wood))).toBe(4);
    expect(chests[0].pushTime).toBe(7); // P2-7 restored
    expect(chests[0].pushDir).toBe(2); // P2-7 restored

    expect(surface2.entities.filter((e) => e instanceof Workbench).length).toBe(1);

    const z2s = surface2.entities.filter((e) => e instanceof Zombie) as Zombie[];
    const z2loaded = z2s.find((z) => z.lvl === 2);
    expect(z2loaded).toBeTruthy();
    expect(z2loaded!.health).toBe(30);
    expect(z2loaded!.x).toBe(600);
    expect(z2loaded!.y).toBe(700);
  });
});

describe('G — ItemEntity (ground loot) round-trip', () => {
  it('restores a dropped resource with its position and remaining lifetime', () => {
    const g1 = new Game();
    g1.startNewGame();
    const surface = g1.levels[3]!;

    const drop = new ItemEntity(new ResourceItem(Resource.stone, 3), 321, 654);
    drop.lifeTime = 420;
    drop.time = 123;
    drop.hurtTime = 4;
    surface.add(drop);

    g1.saveGame();

    const g2 = new Game();
    g2.loadGame();
    const surface2 = g2.levels[3]!;

    const drops = surface2.entities.filter((e) => e instanceof ItemEntity) as ItemEntity[];
    const loaded = drops.find((d) => d.x === 321 && d.y === 654);
    expect(loaded).toBeTruthy();
    expect(loaded!.item).toBeInstanceOf(ResourceItem);
    expect((loaded!.item as ResourceItem).resource).toBe(Resource.stone);
    expect((loaded!.item as ResourceItem).count).toBe(3);
    expect(loaded!.lifeTime).toBe(420);
    expect(loaded!.time).toBe(123);
    expect(loaded!.hurtTime).toBe(4);
  });
});
