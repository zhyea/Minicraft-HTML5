/**
 * Installs the static Resource singletons (mirrors ../../level/tile/registry.ts).
 *
 * Must run once, AFTER installTiles(), so PlantableResource can read the Tile
 * singletons. Idempotent + guarded, so safe to call repeatedly.
 *
 * Faithful port of every resource defined in the GWT item/resource/Resource.java
 * — names, sprite coordinates and colours match the Java source exactly. In
 * Sprint 6 the previously-null target/source tiles (treeSapling, hole, wheat,
 * farmland, cactusSapling) were ported, so every PlantableResource now points
 * at a real, installed Tile (see ../../level/tile/registry.ts).
 */
import { Color } from '../../../engine/Color';
import { Tile } from '../../level/tile/Tile';
import { installTiles } from '../../level/tile/registry';
import { Resource } from './Resource';
import { PlantableResource } from './PlantableResource';
import { FoodResource } from './FoodResource';

let installed = false;

export function installResources(): void {
  if (installed) return;
  installed = true;

  // Ensure the Tile singletons exist before PlantableResource reads them.
  installTiles();

  Resource.wood = new Resource('木', 1 + 4 * 32, Color.get(-1, 200, 531, 430));
  Resource.stone = new Resource('石', 2 + 4 * 32, Color.get(-1, 111, 333, 555));
  Resource.flower = new PlantableResource('鲜花', 0 + 4 * 32, Color.get(-1, 10, 444, 330), Tile.flower, Tile.grass);
  Resource.acorn = new PlantableResource('橡果', 3 + 4 * 32, Color.get(-1, 100, 531, 320), Tile.treeSapling, Tile.grass);
  Resource.dirt = new PlantableResource('泥土', 2 + 4 * 32, Color.get(-1, 100, 322, 432), Tile.dirt, Tile.hole, Tile.water, Tile.lava);
  Resource.sand = new PlantableResource('沙', 2 + 4 * 32, Color.get(-1, 110, 440, 550), Tile.sand, Tile.grass, Tile.dirt);
  Resource.cactusFlower = new PlantableResource('仙人掌', 4 + 4 * 32, Color.get(-1, 10, 40, 50), Tile.cactusSapling, Tile.sand);
  Resource.seeds = new PlantableResource('种子', 5 + 4 * 32, Color.get(-1, 10, 40, 50), Tile.wheat, Tile.farmland);
  Resource.wheat = new Resource('小麦', 6 + 4 * 32, Color.get(-1, 110, 330, 550));
  Resource.bread = new FoodResource('面包', 8 + 4 * 32, Color.get(-1, 110, 330, 550), 2, 5);
  Resource.apple = new FoodResource('苹果', 9 + 4 * 32, Color.get(-1, 100, 300, 500), 1, 5);

  // Java literal "000" is octal == 0; written as decimal 0 to keep the packed
  // colour identical to the GWT source.
  Resource.coal = new Resource('煤', 10 + 4 * 32, Color.get(-1, 0, 111, 111));
  Resource.ironOre = new Resource('铁矿', 10 + 4 * 32, Color.get(-1, 100, 322, 544));
  Resource.goldOre = new Resource('金矿', 10 + 4 * 32, Color.get(-1, 110, 440, 553));
  Resource.ironIngot = new Resource('铁锭', 11 + 4 * 32, Color.get(-1, 100, 322, 544));
  Resource.goldIngot = new Resource('金锭', 11 + 4 * 32, Color.get(-1, 110, 330, 553));

  Resource.slime = new Resource('黏液', 10 + 4 * 32, Color.get(-1, 10, 30, 50));
  Resource.glass = new Resource('玻璃', 12 + 4 * 32, Color.get(-1, 555, 555, 555));
  Resource.cloth = new Resource('布', 1 + 4 * 32, Color.get(-1, 25, 252, 141));
  Resource.cloud = new PlantableResource('云', 2 + 4 * 32, Color.get(-1, 222, 555, 444), Tile.cloud, Tile.infiniteFall);
  Resource.gem = new Resource('宝石', 13 + 4 * 32, Color.get(-1, 101, 404, 545));

  for (const r of [
    Resource.wood, Resource.stone, Resource.flower, Resource.acorn, Resource.dirt,
    Resource.sand, Resource.cactusFlower, Resource.seeds, Resource.wheat, Resource.bread,
    Resource.apple, Resource.coal, Resource.ironOre, Resource.goldOre, Resource.ironIngot,
    Resource.goldIngot, Resource.slime, Resource.glass, Resource.cloth, Resource.cloud, Resource.gem,
  ]) {
    Resource.register(r);
  }
}
