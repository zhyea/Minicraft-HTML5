import { describe, it, expect, beforeAll } from 'vitest';
import { installTiles } from '../level/tile/registry';
import { installResources } from '../item/resource/registry';
import { installRecipes } from '../crafting/Crafting';
import { Game } from '../Game';
import { Level } from '../level/Level';
import { Tile } from '../level/tile/Tile';
import { Player } from '../entity/Player';
import { Slime } from '../entity/Slime';
import { AirWizard } from '../entity/AirWizard';
import { Spark } from '../entity/Spark';

beforeAll(() => {
  // Game's constructor also installs these, but be explicit and idempotent.
  installTiles();
  installResources();
  installRecipes();
});

/** Carve a guaranteed grass tile so movement/touch tests aren't blocked by map RNG. */
function clearTile(level: Level, tx: number, ty: number): void {
  level.setTile(tx, ty, Tile.grass, 0);
}

describe('Slime contact damage', () => {
  it('damages the player by lvl on contact (faithful: lvl, not lvl+1)', () => {
    const game = new Game();
    const level = new Level(64, 64, 0, null);
    clearTile(level, 6, 6);

    const player = new Player(game, game.input);
    player.x = 100;
    player.y = 100;
    player.invulnerableTime = 0;
    level.add(player);

    const slime = new Slime(2);
    slime.x = 100;
    slime.y = 100;
    level.add(slime);

    const hpBefore = player.health; // 10
    player.move(1, 0); // slide into the slime -> touchedBy -> player.hurt

    expect(player.health).toBe(hpBefore - slime.lvl);
    expect(player.health).toBeLessThan(hpBefore);
  });

  it('awards score to the player on death (mirrors Zombie; no ItemEntity drop)', () => {
    const game = new Game();
    const level = new Level(64, 64, 0, null);
    clearTile(level, 6, 6);

    const player = new Player(game, game.input);
    player.x = 100;
    player.y = 100;
    level.add(player);

    const slime = new Slime(3);
    slime.x = 200;
    slime.y = 200;
    level.add(slime);

    const scoreBefore = player.score;
    slime.health = 0;
    slime.tick(); // Mob.tick -> die() -> player.score += 25*lvl

    expect(player.score).toBe(scoreBefore + 25 * slime.lvl);
  });
});

describe('Spark projectile damage', () => {
  it('damages the player on contact but never its owner', () => {
    const game = new Game();
    const level = new Level(64, 64, 0, null);
    clearTile(level, 6, 6);

    const player = new Player(game, game.input);
    player.x = 100;
    player.y = 100;
    player.invulnerableTime = 0;
    level.add(player);

    const boss = new AirWizard();
    boss.x = 300;
    boss.y = 300;

    const spark = new Spark(boss, 0, 0);
    spark.x = spark.xx = 100;
    spark.y = spark.yy = 100;
    level.add(spark);

    const hpBefore = player.health; // 10
    spark.tick(); // overlaps player -> player.hurt(owner, 1, dir)

    expect(player.health).toBe(hpBefore - 1);
  });
});

describe('AirWizard victory wiring', () => {
  it('death flips the Game win flag, grants invuln, and scores 1000', () => {
    const game = new Game();
    const level = new Level(64, 64, 0, null); // win wiring is level-agnostic
    clearTile(level, 6, 6);

    const player = new Player(game, game.input);
    player.x = 100;
    player.y = 100;
    level.add(player);

    const boss = new AirWizard();
    boss.x = 100;
    boss.y = 100;
    level.add(boss);

    expect(game.hasWon).toBe(false);

    boss.health = 0;
    boss.tick(); // Mob.tick -> AirWizard.die -> player.gameWon -> game.won()

    expect(game.hasWon).toBe(true);
    expect(player.invulnerableTime).toBe(60 * 5);
    expect(player.score).toBe(1000);
  });
});
