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
import { installTiles } from './level/tile/registry';
import { installResources } from './item/resource/registry';
import { installRecipes } from './crafting/Crafting';
import { Player } from './entity/Player';
import { Zombie } from './entity/Zombie';
import type { Furniture } from './entity/Furniture';
import { isMenuOpen, openInventory, openWon, openDead } from './state';
import { SaveStore } from './save/SaveStore';
import { SaveManager } from './save/SaveManager';
import { logger } from './logger';

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
    installRecipes();
    this.sheet = new SpriteSheet();
    this.colors = buildPalette();
    this.screen = new Screen(Game.WIDTH, Game.HEIGHT, this.sheet);
    this.lightScreen = new Screen(Game.WIDTH, Game.HEIGHT, this.sheet);
    this.input = input ?? new InputHandler();
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

    const zombie = new Zombie(1);
    if (zombie.findStartPos(this.levels[3]!)) {
      this.levels[3]!.add(zombie);
    }

    this.active = true;
    // A fresh world clears any prior victory so Dead/Won can't linger.
    this.hasWon = false;
    this.wonTimer = 0;
  }

  public start(): void {
    if (this.running) return;
    this.running = true;
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

    // In-game: the menu key (X / Enter) opens the inventory, mirroring Java's
    // `input.menu.clicked -> setMenu(new InventoryMenu(player))`. Opening flips
    // currentMenu away from 'none', so the same press cannot re-trigger.
    if (this.input.menu.clicked) {
      openInventory();
      return;
    }

    if (this.player && this.levels[this.currentLevel]) {
      this.levels[this.currentLevel]!.tick();
      Tile.tickCount++;

      // Autosave every 1800 ticks (= 30s @ 60fps), only inside the live game.
      if (this.tickCount % 1800 === 0) this.saveGame();

      // Victory / death detection (mirrors Java setting the won/dead menu).
      // Guarded by isMenuOpen() above so it fires only once, from the live game.
      if (this.hasWon) {
        openWon();
      } else if (this.player.health <= 0) {
        openDead();
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
    if (!this.player) return;
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 20; x++) {
        this.screen.render(x * 8, this.screen.h - 16 + y * 8, 0 + 12 * 32, Color.get(0, 0, 0, 0), 0);
      }
    }
    for (let i = 0; i < 10; i++) {
      if (i < this.player.health) {
        this.screen.render(i * 8, this.screen.h - 16, 0 + 12 * 32, Color.get(0, 200, 500, 533), 0);
      } else {
        this.screen.render(i * 8, this.screen.h - 16, 0 + 12 * 32, Color.get(0, 100, 0, 0), 0);
      }
    }
  }
}
