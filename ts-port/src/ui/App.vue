<script setup lang="ts">
/**
 * Root component for the Minicraft TypeScript port.
 *
 * Responsibilities:
 *   - Own the single <canvas id="game"> the Renderer binds to.
 *   - Instantiate the Game core on mount, attach the renderer, register the
 *     active game with the state bridge (so menus can reach the player), and
 *     install the furniture->menu handler (Sprint 5).
 *   - Mount the correct Vue overlay based on `gameState.currentMenu`:
 *       - 'title'      -> TitleMenu (phase-0 entry, kept intact)
 *       - in-game menu -> Inventory / Crafting / Container / Dead / Won /
 *                        Help / About overlays, fed from the player + menuContext
 *       - 'none'       -> live game (canvas only)
 *
 * The game loop stays fully decoupled: it pauses world ticking whenever an
 * in-game menu is open (see Game.tick) and the overlays are pure DOM.
 */
import { onMounted, onBeforeUnmount, ref, computed } from 'vue';
import { Game } from '../game/Game';
import {
  gameState,
  setActiveGame,
  startSession,
  openHelp,
  openAbout,
  openCrafting,
  openContainer,
  closeMenu,
  returnToTitle,
} from '../game/state';
import type { CraftStation } from '../game/state';
import { Crafting } from '../game/crafting/Crafting';
import type { Inventory } from '../game/entity/Inventory';
import { Workbench } from '../game/entity/Workbench';
import { Anvil } from '../game/entity/Anvil';
import { Furnace } from '../game/entity/Furnace';
import { Oven } from '../game/entity/Oven';
import { Chest } from '../game/entity/Chest';
import TitleMenu from './menus/TitleMenu.vue';
import InventoryMenu from './menus/InventoryMenu.vue';
import CraftingMenu from './menus/CraftingMenu.vue';
import ContainerMenu from './menus/ContainerMenu.vue';
import DeadMenu from './menus/DeadMenu.vue';
import WonMenu from './menus/WonMenu.vue';
import HelpMenu from './menus/HelpMenu.vue';
import AboutMenu from './menus/AboutMenu.vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
let game: Game | null = null;

/** Map furniture use() to the matching Vue menu (Sprint-5 wiring). */
function installFurnitureHandler(): void {
  if (!game) return;
  game.furnitureUseHandler = (furniture, _player, _dir) => {
    if (furniture instanceof Workbench) {
      openCrafting('workbench');
      return true;
    }
    if (furniture instanceof Anvil) {
      openCrafting('anvil');
      return true;
    }
    if (furniture instanceof Furnace) {
      openCrafting('furnace');
      return true;
    }
    if (furniture instanceof Oven) {
      openCrafting('oven');
      return true;
    }
    if (furniture instanceof Chest) {
      openContainer('箱子', furniture.inventory);
      return true;
    }
    return false;
  };
}

function onStart(): void {
  if (!game) return;
  game.startNewGame();
  installFurnitureHandler();
  startSession();
  game.start();
}

/** Resume a saved game (TitleMenu "继续游戏" button). */
function onContinue(): void {
  if (!game || !game.hasSave()) return;
  game.loadGame();
  installFurnitureHandler();
  startSession();
  game.start();
}

const onBeforeUnload = (): void => {
  game?.saveGame();
};

onMounted(() => {
  game = new Game();
  if (canvasRef.value) game.attachRenderer(canvasRef.value);
  setActiveGame(game);
  window.addEventListener('beforeunload', onBeforeUnload);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', onBeforeUnload);
  game?.dispose();
  setActiveGame(null);
});

// ---- Props fed to the mounted overlay (read live from the active game) ----

const playerItems = computed(() => game?.player?.inventory.items ?? []);
const playerInventory = computed<Inventory>(() => game?.player?.inventory ?? new Inventory());
const playerScore = computed(() => game?.player?.score ?? 0);
const elapsedSeconds = computed(() => Math.floor((game?.tickCount ?? 0) / 60));

function recipesFor(station: CraftStation | undefined): ReturnType<typeof Crafting.recipes> {
  switch (station) {
    case 'workbench':
      return Crafting.workbenchRecipes;
    case 'anvil':
      return Crafting.anvilRecipes;
    case 'furnace':
      return Crafting.furnaceRecipes;
    case 'oven':
      return Crafting.ovenRecipes;
    default:
      return [];
  }
}

const stationRecipes = computed(() => recipesFor(gameState.menuContext.station));
const containerTitle = computed(() => gameState.menuContext.containerTitle ?? '箱子');
const containerInv = computed<Inventory>(() => gameState.menuContext.container ?? new Inventory());
</script>

<template>
  <div class="stage">
    <canvas ref="canvasRef" id="game"></canvas>

    <div class="overlay" v-if="gameState.currentMenu === 'title'">
      <TitleMenu @start="onStart" @continue="onContinue" @help="openHelp" @about="openAbout" />
    </div>

    <div class="overlay" v-else-if="gameState.currentMenu !== 'none'">
      <InventoryMenu
        v-if="gameState.currentMenu === 'inventory'"
        :items="playerItems"
        @close="closeMenu"
      />
      <CraftingMenu
        v-else-if="gameState.currentMenu === 'crafting'"
        :recipes="stationRecipes"
        :inventory="playerInventory"
        @close="closeMenu"
      />
      <ContainerMenu
        v-else-if="gameState.currentMenu === 'container'"
        :title="containerTitle"
        :container="containerInv"
        :player-inventory="playerInventory"
        @close="closeMenu"
      />
      <DeadMenu
        v-else-if="gameState.currentMenu === 'dead'"
        :score="playerScore"
        :time="elapsedSeconds"
        @to-title="returnToTitle"
      />
      <WonMenu
        v-else-if="gameState.currentMenu === 'won'"
        :has-won="game?.hasWon ?? true"
        :score="playerScore"
        :time="elapsedSeconds"
        @to-title="returnToTitle"
      />
      <HelpMenu v-else-if="gameState.currentMenu === 'help'" @close="closeMenu" />
      <AboutMenu v-else-if="gameState.currentMenu === 'about'" @close="closeMenu" />
    </div>
  </div>
</template>

<style scoped>
.stage {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  overflow: hidden;
}

canvas#game {
  display: block;
  image-rendering: pixelated;
  width: 640px;
  height: 480px;
  background: #000;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
}
</style>
