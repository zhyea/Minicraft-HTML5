/**
 * Installs the static Tile singletons into the Tile.tiles[] lookup table.
 *
 * In the GWT source these are `public static Tile grass = new GrassTile(0)`
 * initialisers on the Tile class. We cannot do that directly without creating
 * an ES-module circular-init hazard (subclasses extend Tile while Tile's
 * statics would construct those subclasses), so registration is performed here,
 * once, by installTiles(). Safe to call multiple times (guarded).
 */
import { Tile } from './Tile';
import { GrassTile } from './Grass';
import { RockTile } from './Rock';
import { WaterTile } from './Water';
import { FlowerTile } from './Flower';
import { TreeTile } from './Tree';
import { DirtTile } from './Dirt';
import { SandTile } from './Sand';
import { CactusTile } from './Cactus';
import { LavaTile } from './Lava';
import { StairsTile } from './Stairs';
import { InfiniteFallTile } from './InfiniteFall';
import { CloudTile } from './Cloud';
import { HardRockTile } from './HardRock';
import { OreTile } from './Ore';
import { CloudCactusTile } from './CloudCactus';
import { HoleTile } from './Hole';
import { SaplingTile } from './Sapling';
import { FarmTile } from './Farm';
import { WheatTile } from './Wheat';

let installed = false;

export function installTiles(): void {
  if (installed) return;
  installed = true;

  Tile.grass = new GrassTile(0);
  Tile.rock = new RockTile(1);
  Tile.water = new WaterTile(2);
  Tile.flower = new FlowerTile(3);
  Tile.tree = new TreeTile(4);
  Tile.dirt = new DirtTile(5);
  Tile.sand = new SandTile(6);
  Tile.cactus = new CactusTile(7);
  Tile.hole = new HoleTile(8);
  Tile.treeSapling = new SaplingTile(9, Tile.grass, Tile.tree);
  Tile.cactusSapling = new SaplingTile(10, Tile.sand, Tile.cactus);
  Tile.farmland = new FarmTile(11);
  Tile.wheat = new WheatTile(12);
  Tile.lava = new LavaTile(13);
  Tile.stairsDown = new StairsTile(14, false);
  Tile.stairsUp = new StairsTile(15, true);
  Tile.infiniteFall = new InfiniteFallTile(16);
  Tile.cloud = new CloudTile(17);
  Tile.hardRock = new HardRockTile(18);
  // TODO: ironOre tint is a hardcoded stub (0x333333); goldOre/gemOre not yet ported — see STAGE1-WRAPUP.
  Tile.ironOre = new OreTile(19, Color_get_ore());
  Tile.cloudCactus = new CloudCactusTile(22);
}

// Representative iron-ore tint (the GWT source derives this from Resource.ironOre.color).
function Color_get_ore(): number {
  // Temporary placeholder tint — only the low 24 bits are used by OreTile.
  // 0xRRGGBB-ish base; only the low 24 bits are used by OreTile.
  return 0x333333;
}
