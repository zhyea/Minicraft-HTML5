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

  Resource.wood = new Resource('木', 1 + 4 * 32, Color.get(-1, 200, 531, 430), '砍树获得，用途最广的基础材料，可合成木级工具与家具。');
  Resource.stone = new Resource('石', 2 + 4 * 32, Color.get(-1, 111, 333, 555), '挖岩石获得，用来制作石级工具、熔炉等更耐用的装备。');
  Resource.flower = new PlantableResource('鲜花', 0 + 4 * 32, Color.get(-1, 10, 444, 330), '种在草地上的装饰花，为你的小世界添一抹亮色。', Tile.flower, Tile.grass);
  Resource.acorn = new PlantableResource('橡果', 3 + 4 * 32, Color.get(-1, 100, 531, 320), '种在草地上会慢慢长成大树，是木材的不竭源头。', Tile.treeSapling, Tile.grass);
  Resource.dirt = new PlantableResource('泥土', 2 + 4 * 32, Color.get(-1, 100, 322, 432), '可用它填平洞穴、积水、岩浆和沙地，自由改造地形。', Tile.dirt, Tile.hole, Tile.water, Tile.lava);
  Resource.sand = new PlantableResource('沙', 2 + 4 * 32, Color.get(-1, 110, 440, 550), '沙漠地形方块，可在上面种仙人掌，也能烧成玻璃。', Tile.sand, Tile.grass, Tile.dirt);
  Resource.cactusFlower = new PlantableResource('仙人掌', 4 + 4 * 32, Color.get(-1, 10, 40, 50), '种在沙地上，成熟后可收获；但徒手碰触会受伤。', Tile.cactusSapling, Tile.sand);
  Resource.seeds = new PlantableResource('种子', 5 + 4 * 32, Color.get(-1, 10, 40, 50), '把种子种在耕地上会发芽长成小麦，再烤成面包。', Tile.wheat, Tile.farmland);
  Resource.wheat = new Resource('小麦', 6 + 4 * 32, Color.get(-1, 110, 330, 550), '种子长成后收获小麦，拿到烤箱里就能烤成面包。');
  Resource.bread = new FoodResource('面包', 8 + 4 * 32, Color.get(-1, 110, 330, 550), '手持面包对地面按攻击键吃下，能恢复生命值。', 2, 5);
  Resource.apple = new FoodResource('苹果', 9 + 4 * 32, Color.get(-1, 100, 300, 500), '砍树时掉落的果实，手持对地面按攻击键吃下回血。', 1, 5);

  // Java literal "000" is octal == 0; written as decimal 0 to keep the packed
  // colour identical to the GWT source.
  Resource.coal = new Resource('煤', 10 + 4 * 32, Color.get(-1, 0, 111, 111), '熔炉烧矿与烧玻璃的燃料，在矿洞里很常见。');
  Resource.ironOre = new Resource('铁矿', 10 + 4 * 32, Color.get(-1, 100, 322, 544), '挖矿获得，靠近熔炉按 X 放矿与煤，烧成铁锭。');
  Resource.goldOre = new Resource('金矿', 10 + 4 * 32, Color.get(-1, 110, 440, 553), '挖矿获得，靠近熔炉按 X 放矿与煤，烧成金锭。');
  Resource.ironIngot = new Resource('铁锭', 11 + 4 * 32, Color.get(-1, 100, 322, 544), '熔炉烧出，用来打造铁砧和铁、金级工具武器。');
  Resource.goldIngot = new Resource('金锭', 11 + 4 * 32, Color.get(-1, 110, 330, 553), '熔炉烧出，用来打造金级工具（快但较脆）。');

  Resource.slime = new Resource('黏液', 10 + 4 * 32, Color.get(-1, 10, 30, 50), '击败史莱姆掉落的黏液，和玻璃一起做成灯笼。');
  Resource.glass = new Resource('玻璃', 12 + 4 * 32, Color.get(-1, 555, 555, 555), '把沙与煤放进熔炉烧成玻璃，再和黏液做灯笼。');
  Resource.cloth = new Resource('布', 1 + 4 * 32, Color.get(-1, 25, 252, 141), '击败史莱姆会掉落布，不过原版中它基本没用。');
  Resource.cloud = new PlantableResource('云', 2 + 4 * 32, Color.get(-1, 222, 555, 444), '天空层的特殊方块，能像泥土那样被你放置。', Tile.cloud, Tile.infiniteFall);
  Resource.gem = new Resource('宝石', 13 + 4 * 32, Color.get(-1, 101, 404, 545), '地下深处挖到，集满 50 个可做顶级宝石工具武器。');

  for (const r of [
    Resource.wood, Resource.stone, Resource.flower, Resource.acorn, Resource.dirt,
    Resource.sand, Resource.cactusFlower, Resource.seeds, Resource.wheat, Resource.bread,
    Resource.apple, Resource.coal, Resource.ironOre, Resource.goldOre, Resource.ironIngot,
    Resource.goldIngot, Resource.slime, Resource.glass, Resource.cloth, Resource.cloud, Resource.gem,
  ]) {
    Resource.register(r);
  }
}
