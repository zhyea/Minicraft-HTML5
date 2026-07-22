/**
 * Port of Game.java (slice-flavoured).
 *
 * Owns the fixed-60-tick game loop (requestAnimationFrame accumulator), the
 * palette + sprite sheet, the active levels, the player and the Renderer. The
 * menu itself is a Vue overlay (TitleMenu.vue) — when no game is active the
 * world does not tick and the canvas is cleared to black behind the menu.
 */
import { Screen } from '../engine/Screen';
import { SpriteSheet } from '../engine/SpriteSheet';
import { Renderer } from '../engine/Renderer';
import { InputHandler } from '../engine/InputHandler';
import { buildPalette } from '../engine/palette';
import { Color } from '../engine/Color';
import { Level } from './level/Level';
import { Tile } from './level/tile/Tile';
import { installTiles, installOreTiles } from './level/tile/registry';
import { installResources } from './item/resource/registry';
import { installRecipes } from './crafting/Crafting';
import { Player } from './entity/Player';
import type { Furniture } from './entity/Furniture';
import {
  isMenuOpen,
  openInventory,
  openWon,
  openDead,
  openHelp,
  openTransition,
  closeMenu,
} from './state';
import { SaveStore } from './save/SaveStore';
import { SaveManager } from './save/SaveManager';
import { logger } from './logger';
import { Sound } from './audio/Sound';

export class Game {
  public static readonly WIDTH = 160;
  public static readonly HEIGHT = 120;

  public screen: Screen;
  public lightScreen: Screen;
  public sheet: SpriteSheet;
  public colors: number[];
  public input: InputHandler;

  public levels: (Level | null)[] = [];
  public currentLevel = 3; // 3 == surface (depth 0)
  public player: Player | null = null;

  public active = false;
  public tickCount = 0;

  /** Victory state (mirrors Java Game.hasWon / wonTimer / won()). */
  public hasWon = false;
  public wonTimer = 0;

  /** Death delay counter — only opens DeadMenu once it passes 60 (mirrors
   *  Java Game.playerDeadTime). */
  public deadTime = 0;

  /** Deferred level-change direction, mirrored from Java Game.pendingLevelChange.
   *  Set by changeLevel(); the actual swap happens in completeLevelChange(). */
  public pendingLevelChange = 0;

  /** Persistence boundary for the single localStorage save slot. */
  private readonly saveStore = new SaveStore();

  /**
   * Wired by the UI layer (App.vue) to translate a Furniture `use()` into the
   * correct Vue menu (Workbench/Anvil -> crafting, Chest -> container, ...).
   * Null by default so the game core stays decoupled from the UI and unit
   * tests that never open a menu remain unaffected.
   */
  public furnitureUseHandler:
    | ((furniture: Furniture, player: Player, attackDir: number) => boolean)
    | null = null;

  private renderer: Renderer | null = null;
  private running = false;
  private last = 0;
  private acc = 0;
  private readonly tickRate = 1 / 60;

  constructor(input?: InputHandler) {
    installTiles();
    installResources();
    installOreTiles();
    installRecipes();
    this.sheet = new SpriteSheet();
    this.colors = buildPalette();
    this.screen = new Screen(Game.WIDTH, Game.HEIGHT, this.sheet);
    this.lightScreen = new Screen(Game.WIDTH, Game.HEIGHT, this.sheet);
    this.input = input ?? new InputHandler();
    // Create the shared AudioContext (no-op where Web Audio is unavailable, e.g. tests).
    Sound.init();
  }

  public attachRenderer(canvas: HTMLCanvasElement): void {
    this.renderer = new Renderer(canvas, this.colors);
  }

  /**
   * Build all 5 levels (mirrors Java `resetGame`) and spawn the player + 1
   * zombie on the surface. The Sky level (levels[4], depth +1, `level===1`)
   * is what makes the AirWizard boss reachable — Level.ts spawns it there,
   * completing the S4 victory path. Each child level digs stairsUp where its
   * parent has stairsDown.
   */
  public startNewGame(): void {
    this.levels = new Array(5).fill(null);
    this.levels[4] = new Level(128, 128, 1, null);
    this.levels[3] = new Level(128, 128, 0, this.levels[4]!);
    this.levels[2] = new Level(128, 128, -1, this.levels[3]!);
    this.levels[1] = new Level(128, 128, -2, this.levels[2]!);
    this.levels[0] = new Level(128, 128, -3, this.levels[1]!);
    this.currentLevel = 3;

    this.player = new Player(this, this.input);
    this.player.findStartPos(this.levels[3]!);
    this.levels[3]!.add(this.player);

    // Faithful port of Java's startNewGame(): flood every level to its density
    // cap. findStartPos() skips the player's tile on the surface level, so the
    // hero never gets a mob spawned on top of them. 5000 is "fill to capacity"
    // — the original used the same brute-force count; trySpawn() self-limits.
    for (const lvl of this.levels) {
      if (lvl) lvl.trySpawn(5000);
    }

    this.active = true;
    // A fresh world clears any prior victory so Dead/Won can't linger.
    this.hasWon = false;
    this.wonTimer = 0;
    this.deadTime = 0;
    this.pendingLevelChange = 0;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
    // Wire the one-time user-gesture listener that resumes the (initially
    // suspended) AudioContext per the browser autoplay policy.
    Sound.ensure();
    this.last = performance.now();
    requestAnimationFrame(this.frame);
  }

  public stop(): void {
    this.running = false;
  }

  /** Flip the victory flag (mirrors Java Game.won()). */
  public won(): void {
    this.wonTimer = 60 * 3;
    this.hasWon = true;
  }

  /**
   * Defer a level change (faithful port of Java `Game.scheduleLevelChange`):
   * only records the pending direction. The actual swap is performed in
   * completeLevelChange() once the TransitionMenu overlay finishes. Called
   * from Player.tick() when the player steps onto a stairs tile; we must NOT
   * swap immediately (the other engineer owns Player.tick and expects this to
   * be a deferred no-op that mirrors the original's pendingLevelChange).
   */
  public changeLevel(dir: number): void {
    this.pendingLevelChange = dir;
  }

  /**
   * Perform the real level swap (faithful port of Java `Game.changeLevel(int
   * dir)`). Invoked by App.vue when the TransitionMenu emits `done`: remove
   * the player, advance the level with bounds clamping, re-center and re-add
   * the player, then close the overlay back to the live game.
   */
  public completeLevelChange(dir: number): void {
    if (dir === 0) {
      closeMenu();
      return;
    }

    const level = this.levels[this.currentLevel];
    if (level && this.player) {
      level.remove(this.player);
    }

    this.currentLevel += dir;
    // Defensive guard against out-of-bounds at the sky / lowest cave. Level
    // geometry normally prevents stairs leading past either end, but clamp
    // rather than index a null slot.
    if (this.currentLevel < 0) this.currentLevel = 0;
    if (this.currentLevel > this.levels.length - 1) this.currentLevel = this.levels.length - 1;

    const newLevel = this.levels[this.currentLevel];
    if (newLevel && this.player) {
      this.player.x = (this.player.x >> 4) * 16 + 8;
      this.player.y = (this.player.y >> 4) * 16 + 8;
      newLevel.add(this.player);
    }

    closeMenu();
  }

  /** Tear down: stop the loop and detach DOM listeners (renderer + input). */
  public dispose(): void {
    this.stop();
    this.input.dispose();
    this.renderer?.dispose();
  }

  // ---- Save / Load (MVP single-slot loop) ----

  /** True when a save slot currently exists. */
  public hasSave(): boolean {
    return this.saveStore.hasSave();
  }

  /**
   * Persist the whole game. Guards:
   *   - only when the world is active (no title-screen saves), and
   *   - never when the player is dead/removed — this prevents the
   *     "load-into-death" trap where a corpse save would instantly re-trigger
   *     the dead screen on continue.
   * Backend failures (private mode / quota) are swallowed by SaveStore.
   */
  public saveGame(): void {
    if (!this.active) return;
    if (this.player && (this.player.removed || this.player.health <= 0)) return;
    try {
      const json = SaveManager.toJson(this);
      this.saveStore.save(json);
    } catch (e) {
      logger.warn('Game', 'saveGame failed; save skipped', e);
    }
  }

  /**
   * Load the single save slot into this Game. Safe against corrupt data:
   * a missing slot is a no-op; a parse error or schema mismatch is reported
   * via console.warn and the current game state is left untouched.
   */
  public loadGame(): void {
    try {
      const raw = this.saveStore.load();
      if (raw == null) return;
      SaveManager.fromJson(this, raw);
    } catch (e) {
      logger.warn('Game', 'loadGame failed; corrupt save ignored', e);
    }
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    let dt = (now - this.last) / 1000;
    if (dt > 0.25) dt = 0.25;
    this.last = now;
    this.acc += dt;
    while (this.acc >= this.tickRate) {
      this.tick();
      this.acc -= this.tickRate;
    }
    this.render();
    requestAnimationFrame(this.frame);
  };

  public tick(): void {
    this.input.tick();
    if (!this.active) return;

    // Advance the global tick counter (used by the 30s autosave cadence).
    this.tickCount++;

    // While any in-game menu overlay is showing, the world is paused — the Java
    // original does not call level.tick() while a menu is active. The canvas
    // keeps the last frame and the DOM overlay renders on top.
    if (isMenuOpen()) return;

    // In-game help (H): open the 玩法说明 panel. Guarded above by isMenuOpen(),
    // so it only fires from the live game and cannot re-trigger while the panel
    // is open (closeMenu() returns to 'none', restoring the live view).
    if (this.input.help.clicked) {
      openHelp();
      return;
    }

    // In-game: the menu/use key (X / Enter). Faithful to Java, this first tries
    // to *use* an adjacent furniture (workbench/anvil/chest/...) via
    // Player.use() -> Furniture.use() -> Game.furnitureUseHandler, which opens
    // the matching Vue menu. Only if nothing was used do we fall back to the
    // inventory, mirroring Java's `input.menu.clicked -> setMenu(...)`. Opening
    // flips currentMenu away from 'none', so the same press cannot re-trigger.
    if (this.input.menu.clicked) {
      if (!this.player || !this.player.use()) {
        openInventory();
      }
      return;
    }

    if (this.player && this.levels[this.currentLevel]) {
      this.levels[this.currentLevel]!.tick();
      Tile.tickCount++;

      // Autosave every 1800 ticks (= 30s @ 60fps), only inside the live game.
      if (this.tickCount % 1800 === 0) this.saveGame();

      // Pending dimension change (mirrors Java Game.tick: when pendingLevelChange
      // != 0, open the LevelTransitionMenu before ticking). We open the Vue
      // TransitionMenu overlay and let the world pause (isMenuOpen() is now true);
      // the actual swap happens in completeLevelChange() when the overlay emits
      // 'done'. Guarded by isMenuOpen() above so it cannot re-trigger while the
      // overlay is up.
      if (this.pendingLevelChange !== 0) {
        const dir = this.pendingLevelChange;
        this.pendingLevelChange = 0;
        const label = dir < 0 ? '进入洞穴…' : '进入天空…';
        openTransition(dir, label);
        return;
      }

      // Victory / death detection — faithful count-down gating (mirrors Java
      // Game.tick's playerDeadTime and wonTimer logic). Guarded by isMenuOpen()
      // above so each menu opens exactly once, from the live game.
      if (this.player.removed || this.player.health <= 0) {
        // Player is dead: accumulate deadTime and only open DeadMenu once the
        // brief (60-tick) delay elapses, so the death moment is visible.
        this.deadTime++;
        if (this.deadTime > 60) {
          openDead();
        }
      } else if (this.hasWon) {
        // Victory: count wonTimer down each tick; open WonMenu at zero.
        if (--this.wonTimer <= 0) {
          openWon();
        }
      }
    }
  }

  public render(): void {
    this.screen.clear(0);

    const level = this.active ? this.levels[this.currentLevel] : null;
    if (level && this.player) {
      let xScroll = this.player.x - this.screen.w / 2;
      let yScroll = this.player.y - (this.screen.h - 8) / 2;
      if (xScroll < 16) xScroll = 16;
      if (yScroll < 16) yScroll = 16;
      if (xScroll > level.w * 16 - this.screen.w - 16) xScroll = level.w * 16 - this.screen.w - 16;
      if (yScroll > level.h * 16 - this.screen.h - 16) yScroll = level.h * 16 - this.screen.h - 16;

      // Surface sky backdrop (currentLevel > 3 never happens in the slice).
      if (this.currentLevel > 3) {
        const col = Color.get(20, 20, 121, 121);
        for (let y = 0; y < 14; y++) {
          for (let x = 0; x < 24; x++) {
            this.screen.render(x * 8 - ((xScroll / 4) & 7), y * 8 - ((yScroll / 4) & 7), 0, col, 0);
          }
        }
      }

      level.renderBackground(this.screen, xScroll, yScroll);
      level.renderSprites(this.screen, xScroll, yScroll);

      if (this.currentLevel < 3) {
        this.lightScreen.clear(0);
        level.renderLight(this.lightScreen, xScroll, yScroll);
        this.screen.overlay(this.lightScreen, xScroll, yScroll);
      }

      this.renderGui();
    }

    this.renderer?.blit(this.screen);
  }

  private renderGui(): void {
    const p = this.player;
    if (!p) return;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 20; x++) {
        this.screen.render(x * 8, this.screen.h - 16 + y * 8, 0 + 12 * 32, Color.get(0, 0, 0, 0), 0);
      }
    }
    // Player.staminaRechargeDelay is public; read it directly to mirror the Java
    // stamina-bar blink (no structural cast needed).
    const rechargeDelay = p.staminaRechargeDelay;
    for (let i = 0; i < 10; i++) {
      // Health hearts (top row).
      if (i < p.health) {
        this.screen.render(i * 8, this.screen.h - 16, 0 + 12 * 32, Color.get(0, 200, 500, 533), 0);
      } else {
        this.screen.render(i * 8, this.screen.h - 16, 0 + 12 * 32, Color.get(0, 100, 0, 0), 0);
      }

      // Stamina bar (bottom row). Mirrors Java Game.renderGui() lines 522-533:
      // while recharging from exhaustion (staminaRechargeDelay > 0) the bar
      // blinks between two greens; otherwise it fills by player.stamina.
      if (rechargeDelay > 0) {
        if (Math.floor(rechargeDelay / 4) % 2 === 0) {
          this.screen.render(i * 8, this.screen.h - 8, 1 + 12 * 32, Color.get(0, 555, 0, 0), 0);
        } else {
          this.screen.render(i * 8, this.screen.h - 8, 1 + 12 * 32, Color.get(0, 110, 0, 0), 0);
        }
      } else if (i < p.stamina) {
        this.screen.render(i * 8, this.screen.h - 8, 1 + 12 * 32, Color.get(0, 220, 550, 553), 0);
      } else {
        this.screen.render(i * 8, this.screen.h - 8, 1 + 12 * 32, Color.get(0, 110, 0, 0), 0);
      }
    }

    // Held-item icon (mirrors Java Game.renderGui(): player.activeItem.renderInventory).
    if (p.activeItem != null) {
      p.activeItem.renderInventory(this.screen, 10 * 8, this.screen.h - 16);
    }
  }
}
