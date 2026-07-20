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

export type MenuName =
  | 'title'
  | 'none'
  | 'inventory'
  | 'crafting'
  | 'container'
  | 'dead'
  | 'won'
  | 'help'
  | 'about';

/** Crafting stations, mirroring the four recipe groups in Crafting.java. */
export type CraftStation = 'workbench' | 'anvil' | 'furnace' | 'oven';

export interface MenuContext {
  /** Active crafting station, when `currentMenu === 'crafting'`. */
  station?: CraftStation;
  /** Chest inventory, when `currentMenu === 'container'`. */
  container?: Inventory;
  /** Title shown for the container (Chest.name in Chinese: 箱子). */
  containerTitle?: string;
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
}

export const gameState = reactive<GameState>({
  currentMenu: 'title',
  selectedIndex: 0,
  started: false,
  menuContext: {},
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

/** Return to the title screen (used by Dead/Won -> title paths). */
export function showTitle(): void {
  activeGame?.stop();
  gameState.currentMenu = 'title';
  gameState.selectedIndex = 0;
  gameState.started = false;
  gameState.menuContext = {};
}

/** Player committed to starting a game: hide the menu overlay, mark started. */
export function startSession(): void {
  gameState.started = true;
  gameState.currentMenu = 'none';
  gameState.selectedIndex = 0;
  gameState.menuContext = {};
}

/** Move the menu cursor. */
export function setSelectedIndex(i: number): void {
  gameState.selectedIndex = i;
}

// ---- In-game menu openers (mirror the Java setMenu(new XMenu(...)) calls) ----

export function openInventory(): void {
  gameState.currentMenu = 'inventory';
  gameState.selectedIndex = 0;
  gameState.menuContext = {};
}

export function openCrafting(station: CraftStation): void {
  gameState.currentMenu = 'crafting';
  gameState.selectedIndex = 0;
  gameState.menuContext = { station };
}

export function openContainer(title: string, container: Inventory): void {
  gameState.currentMenu = 'container';
  gameState.selectedIndex = 0;
  gameState.menuContext = { container, containerTitle: title };
}

export function openDead(): void {
  gameState.currentMenu = 'dead';
  gameState.selectedIndex = 0;
  gameState.menuContext = {};
}

export function openWon(): void {
  gameState.currentMenu = 'won';
  gameState.selectedIndex = 0;
  gameState.menuContext = {};
}

export function openHelp(): void {
  gameState.currentMenu = 'help';
  gameState.selectedIndex = 0;
  gameState.menuContext = {};
}

export function openAbout(): void {
  gameState.currentMenu = 'about';
  gameState.selectedIndex = 0;
  gameState.menuContext = {};
}

/**
 * Close the active overlay back to the live game. Absorbs the pending menu-key
 * press so Game.tick() (which opens the inventory on `input.menu.clicked`) does
 * not immediately reopen a menu on the very next frame after the user closed it.
 */
export function closeMenu(): void {
  gameState.currentMenu = 'none';
  gameState.selectedIndex = 0;
  gameState.menuContext = {};
  activeGame?.input.menu.absorb();
}

/** Dead/Won confirmation -> back to title screen. */
export function returnToTitle(): void {
  showTitle();
}

/** True when any in-game (non-title, non-live) menu overlay is showing. */
export function isMenuOpen(): boolean {
  return gameState.currentMenu !== 'none' && gameState.currentMenu !== 'title';
}
