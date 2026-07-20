/**
 * SaveManager — orchestrates Game <-> save-string (the JSON container).
 *
 * Container shape (schemaVersion: 1):
 * {
 *   schemaVersion: 1,
 *   currentLevel, tickCount, hasWon, wonTimer,
 *   levels: [ { w, h, level, tiles(base64), data(base64), entities[] }, ... x5 ],
 *   player: <EntityIO payload for the Player>
 * }
 *
 * `level` for each slot is the world depth = index - 3, matching the layout
 * Game.startNewGame() builds (levels[4] = sky/+1, levels[3] = surface/0, ...,
 * levels[0] = depth -3). fromSave rebuilds each Level with that depth so its
 * dirtColor/monsterDensity come out identical to a fresh world.
 *
 * The Player is serialised separately and never inside a level's entity list
 * (it is skipped there to avoid duplication); it is re-added to the
 * currentLevel on load.
 *
 * Robustness: fromJson builds everything into locals and only commits to the
 * Game at the very end, so a corrupt/partial payload never leaves the live
 * game half-mutated. Schema/parse failures are reported via console.warn and
 * the function returns without applying anything.
 */
import type { Game } from '../Game';
import { Level } from '../level/Level';
import { Player } from '../entity/Player';
import { SaveStore } from './SaveStore';
import { EntityIO } from './EntityIO';
import { logger } from '../logger';

export const SAVE_SCHEMA_VERSION = 1;

function levelDepthForIndex(i: number): number {
  return i - 3;
}

export class SaveManager {
  /** Serialise the whole game into a save string. */
  public static toJson(game: Game): string {
    const levels: unknown[] = [];
    for (let i = 0; i < game.levels.length; i++) {
      const lvl = game.levels[i];
      if (!lvl) {
        levels.push(null);
        continue;
      }
      const entities: unknown[] = [];
      for (const e of lvl.entities) {
        // Player is persisted separately; skip it here to avoid duplication.
        if (e instanceof Player) continue;
        const written = EntityIO.write(e);
        if (written) entities.push(written);
      }
      levels.push({
        w: lvl.w,
        h: lvl.h,
        level: levelDepthForIndex(i),
        tiles: SaveStore.base64Encode(lvl.tiles),
        data: SaveStore.base64Encode(lvl.data),
        entities,
      });
    }

    const payload = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      currentLevel: game.currentLevel,
      tickCount: game.tickCount,
      hasWon: game.hasWon,
      wonTimer: game.wonTimer,
      levels,
      player: game.player ? EntityIO.write(game.player) : null,
    };
    return JSON.stringify(payload);
  }

  /**
   * Rebuild `game` from a save string. Throws on invalid JSON (the caller,
   * Game.loadGame, swallows it). A wrong schemaVersion or malformed-but-valid
   * object is reported and returns without applying.
   */
  public static fromJson(game: Game, json: string): void {
    const data = JSON.parse(json); // may throw -> caught by Game.loadGame
    if (!data || typeof data !== 'object') {
      logger.warn('SaveManager', 'save root is not an object; ignoring.');
      return;
    }
    if (data.schemaVersion !== SAVE_SCHEMA_VERSION) {
      logger.warn('SaveManager', `unsupported schemaVersion ${String(data.schemaVersion)} (expected ${SAVE_SCHEMA_VERSION}); ignoring.`);
      return;
    }

    // Build the levels locally first. The world is always exactly 5 layers
    // (matching Game.startNewGame), so size from the save — never from the
    // (possibly empty) live `game.levels`, which would otherwise collapse the
    // array when loading into a freshly-constructed Game.
    const LEVEL_COUNT = 5;
    const levels: (Level | null)[] = new Array(LEVEL_COUNT).fill(null);
    const rawLevels = Array.isArray(data.levels) ? data.levels : [];
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const ld = rawLevels[i];
      if (!ld) continue;
      const w = ld.w as number;
      const h = ld.h as number;
      const depth = (ld.level as number) ?? levelDepthForIndex(i);
      const tiles = SaveStore.base64Decode(ld.tiles as string);
      const dat = SaveStore.base64Decode(ld.data as string);
      const lvl = Level.fromSave(w, h, depth, tiles, dat);
      const rawEntities = Array.isArray(ld.entities) ? ld.entities : [];
      for (const ed of rawEntities) {
        const e = EntityIO.read(ed, game);
        if (e) lvl.add(e);
      }
      levels[i] = lvl;
    }

    // Rebuild the player locally.
    if (!data.player) {
      logger.warn('SaveManager', 'save is missing the player; ignoring.');
      return;
    }
    const player = EntityIO.read(data.player, game);
    if (!(player instanceof Player)) {
      logger.warn('SaveManager', 'save player payload is invalid; ignoring.');
      return;
    }

    // Commit to the game atomically.
    const cl = typeof data.currentLevel === 'number' ? Math.floor(data.currentLevel) : 3;
    game.levels = levels;
    game.currentLevel = cl >= 0 && cl <= 4 && levels[cl] ? cl : 3;
    game.player = player;
    // The player's home level is currentLevel; add it there (sets player.level
    // and level.player). Per-level entity lists already exclude the player.
    game.levels[game.currentLevel]!.add(player);
    game.tickCount = typeof data.tickCount === 'number' ? data.tickCount : 0;
    game.hasWon = data.hasWon === true;
    game.wonTimer = typeof data.wonTimer === 'number' ? data.wonTimer : 0;
    game.active = true;
  }
}
