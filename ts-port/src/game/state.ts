/**
 * Reactive bridge between the Vue menu layer and the TypeScript game core.
 *
 * This is the single source of truth for "which overlay is showing" and the
 * menu selection cursor. The game loop never reads Vue; instead App.vue watches
 * `currentMenu` to decide which menu overlay to mount, and the menu components
 * mutate `selectedIndex` / emit close events while they are on screen. When the
 * player starts a game, `startSession()` flips `currentMenu` to 'none' (overlay
 * disappears) and the canvas behind it becomes the live game view.
 *
 * Sprint 5 extends the original `title` | `none` model with the full in-game
 * menu tree (inventory / crafting / container / dead / won / help / about). A
 * `menuContext` carries per-menu data (which crafting station, which chest
 * inventory) so App.vue can feed the right props to the mounted component.
 */
import { reactive } from 'vue';
import type { Inventory } from './entity/Inventory';
import type { Game } from './Game';
import type { Item } from './item/Item';

export type MenuName =
  | 'title'
  | 'none'
  | 'inventory'
  | 'crafting'
  | 'container'
  | 'dead'
  | 'won'
  | 'help'
  | 'about'
  | 'transition';

/** Crafting stations, mirroring the four recipe groups in Crafting.java. */
export type CraftStation = 'workbench' | 'anvil' | 'furnace' | 'oven' | 'portable';

export interface MenuContext {
  /** Active crafting station, when `currentMenu === 'crafting'`. */
  station?: CraftStation;
  /** Chest inventory, when `currentMenu === 'container'`. */
  container?: Inventory;
  /** Title shown for the container (Chest.name in Chinese: 箱子). */
  containerTitle?: string;
  /** Pending level-change direction, when `currentMenu === 'transition'`. */
  levelChangeDir?: number;
  /** Label shown on the transition overlay (e.g. "进入洞穴…" / "进入天空…"). */
  transitionLabel?: string;
}

export interface GameState {
  /** Which Vue overlay is mounted. 'none' == in-game (canvas only). */
  currentMenu: MenuName;
  /** Cursor position inside the active menu. */
  selectedIndex: number;
  /** True once a world has been generated and the loop is running. */
  started: boolean;
  /** Per-menu data consumed by the mounted overlay component. */
  menuContext: MenuContext;
  /**
   * Stack of overlay names so closing a sub-menu returns to its *exact* parent
   * (e.g. live game -> inventory -> help -> back to inventory), rather than a
   * single hardcoded target. The bottom is implicitly the root ('none' live
   * game, or 'title'); each enterMenu() pushes the current menu, closeMenu()
   * pops it. Prevents the help-from-inventory case from getting stranded.
   */
  menuStack: MenuName[];
}

export const gameState = reactive<GameState>({
  currentMenu: 'title',
  selectedIndex: 0,
  started: false,
  menuContext: {},
  menuStack: [],
});

/**
 * Active game session (set by App.vue when a world starts) so the menu state
 * can reach the player/inventory and absorb key presses without prop-drilling
 * through every component.
 */
let activeGame: Game | null = null;

export function setActiveGame(g: Game | null): void {
  activeGame = g;
}

export function getActiveGame(): Game | null {
  return activeGame;
}

/**
 * Equip an item as the player's currently-held item (the `activeItem` the
 * attack/use pipeline acts on). Called when the player picks an entry in the
 * InventoryMenu. Without this the inventory is browse-only and the player can
 * never actually hold a tool/seed/furniture — which silently breaks mining,
 * tilling, planting and (via workbench placement) crafting.
 */
export function equipItem(item: Item): void {
  if (activeGame?.player) activeGame.player.activeItem = item;
}

/** Return to the title screen (used by Dead/Won -> title paths). */
export function showTitle(): void {
  activeGame?.stop();
  gameState.currentMenu = 'title';
  gameState.selectedIndex = 0;
  gameState.started = false;
  gameState.menuContext = {};
  gameState.menuStack = [];
}

/** Player committed to starting a game: hide the menu overlay, mark started. */
export function startSession(): void {
  gameState.started = true;
  gameState.currentMenu = 'none';
  gameState.selectedIndex = 0;
  gameState.menuContext = {};
  gameState.menuStack = [];
}

/** Move the menu cursor. */
export function setSelectedIndex(i: number): void {
  gameState.selectedIndex = i;
}

// ---- In-game menu openers (mirror the Java setMenu(new XMenu(...)) calls) ----

/**
 * Enter a sub-menu, pushing the *current* menu onto the stack so closeMenu()
 * can return to exactly where we came from. This is what lets help opened from
 * the inventory close back to the inventory (not to the live game).
 */
function enterMenu(name: MenuName): void {
  gameState.menuStack.push(gameState.currentMenu);
  gameState.currentMenu = name;
  gameState.selectedIndex = 0;
  gameState.menuContext = {};
}

export function openInventory(): void {
  enterMenu('inventory');
}

export function openCrafting(station: CraftStation): void {
  enterMenu('crafting');
  gameState.menuContext = { station };
}

export function openContainer(title: string, container: Inventory): void {
  enterMenu('container');
  gameState.menuContext = { container, containerTitle: title };
}

export function openDead(): void {
  enterMenu('dead');
}

export function openWon(): void {
  enterMenu('won');
}

/** Open the 玩法说明 panel. The return target is whatever menu is showing now
 *  (title / live game / inventory / ...), captured by enterMenu(). */
export function openHelp(): void {
  enterMenu('help');
}

export function openAbout(): void {
  enterMenu('about');
}

/**
 * Open the dimension-change transition overlay (mirrors Java's
 * LevelTransitionMenu). `dir` is the pending level-change direction (negative
 * = down to cave, positive = up to sky); `label` is the centered caption. The
 * overlay pauses the world (isMenuOpen() is true) and calls back into the game
 * core via its `done` event to perform the actual swap.
 */
export function openTransition(dir: number, label: string): void {
  enterMenu('transition');
  gameState.menuContext = { levelChangeDir: dir, transitionLabel: label };
}

/**
 * Close the active overlay, returning to the menu directly beneath it on the
 * stack. Absorbs the pending menu-key press only when the target is the live
 * game ('none'), so Game.tick() (which opens the inventory on
 * `input.menu.clicked`) does not immediately reopen a menu on the very next
 * frame after the user closed it. For any other target the loop is paused (or
 * absent), so no absorption is needed.
 */
export function closeMenu(): void {
  const target = gameState.menuStack.pop() ?? 'none';
  gameState.currentMenu = target;
  gameState.selectedIndex = 0;
  gameState.menuContext = {};
  if (target === 'none') {
    activeGame?.input.menu.absorb();
  }
}

/** Dead/Won confirmation -> back to title screen. */
export function returnToTitle(): void {
  showTitle();
}

/** True when any in-game (non-title, non-live) menu overlay is showing. */
export function isMenuOpen(): boolean {
  return gameState.currentMenu !== 'none' && gameState.currentMenu !== 'title';
}
