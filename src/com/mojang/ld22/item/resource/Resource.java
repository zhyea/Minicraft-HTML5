package com.mojang.ld22.item.resource;

import com.mojang.ld22.entity.Player;
import com.mojang.ld22.gfx.Color;
import com.mojang.ld22.level.Level;
import com.mojang.ld22.level.tile.Tile;

import java.util.HashMap;
import java.util.Map;

public class Resource {
	public static Resource wood = new Resource("木", 1 + 4 * 32, Color.get(-1, 200, 531, 430));
	public static Resource stone = new Resource("石", 2 + 4 * 32, Color.get(-1, 111, 333, 555));
	public static Resource flower = new PlantableResource("鲜花", 0 + 4 * 32, Color.get(-1, 10, 444, 330), Tile.flower, Tile.grass);
	public static Resource acorn = new PlantableResource("橡果", 3 + 4 * 32, Color.get(-1, 100, 531, 320), Tile.treeSapling, Tile.grass);
	public static Resource dirt = new PlantableResource("泥土", 2 + 4 * 32, Color.get(-1, 100, 322, 432), Tile.dirt, Tile.hole, Tile.water, Tile.lava);
	public static Resource sand = new PlantableResource("沙", 2 + 4 * 32, Color.get(-1, 110, 440, 550), Tile.sand, Tile.grass, Tile.dirt);
	public static Resource cactusFlower = new PlantableResource("仙人掌", 4 + 4 * 32, Color.get(-1, 10, 40, 50), Tile.cactusSapling, Tile.sand);
	public static Resource seeds = new PlantableResource("种子", 5 + 4 * 32, Color.get(-1, 10, 40, 50), Tile.wheat, Tile.farmland);
	public static Resource wheat = new Resource("小麦", 6 + 4 * 32, Color.get(-1, 110, 330, 550));
	public static Resource bread = new FoodResource("面包", 8 + 4 * 32, Color.get(-1, 110, 330, 550), 2, 5);
	public static Resource apple = new FoodResource("苹果", 9 + 4 * 32, Color.get(-1, 100, 300, 500), 1, 5);

	public static Resource coal = new Resource("煤", 10 + 4 * 32, Color.get(-1, 000, 111, 111));
	public static Resource ironOre = new Resource("铁矿", 10 + 4 * 32, Color.get(-1, 100, 322, 544));
	public static Resource goldOre = new Resource("金矿", 10 + 4 * 32, Color.get(-1, 110, 440, 553));
	public static Resource ironIngot = new Resource("铁锭", 11 + 4 * 32, Color.get(-1, 100, 322, 544));
	public static Resource goldIngot = new Resource("金锭", 11 + 4 * 32, Color.get(-1, 110, 330, 553));

	public static Resource slime = new Resource("黏液", 10 + 4 * 32, Color.get(-1, 10, 30, 50));
	public static Resource glass = new Resource("玻璃", 12 + 4 * 32, Color.get(-1, 555, 555, 555));
	public static Resource cloth = new Resource("布", 1 + 4 * 32, Color.get(-1, 25, 252, 141));
	public static Resource cloud = new PlantableResource("云", 2 + 4 * 32, Color.get(-1, 222, 555, 444), Tile.cloud, Tile.infiniteFall);
	public static Resource gem = new Resource("宝石", 13 + 4 * 32, Color.get(-1, 101, 404, 545));

	public final String name;
	public final int sprite;
	public final int color;

	public Resource(String name, int sprite, int color) {
		if (name.length() > 6) throw new RuntimeException("Name cannot be longer than six characters!");
		this.name = name;
		this.sprite = sprite;
		this.color = color;
	}

	public boolean interactOn(Tile tile, Level level, int xt, int yt, Player player, int attackDir) {
		return false;
	}

	private static final Map<String, Resource> BY_NAME = new HashMap<String, Resource>();

	static {
		BY_NAME.put(wood.name, wood);
		BY_NAME.put(stone.name, stone);
		BY_NAME.put(flower.name, flower);
		BY_NAME.put(acorn.name, acorn);
		BY_NAME.put(dirt.name, dirt);
		BY_NAME.put(sand.name, sand);
		BY_NAME.put(cactusFlower.name, cactusFlower);
		BY_NAME.put(seeds.name, seeds);
		BY_NAME.put(wheat.name, wheat);
		BY_NAME.put(bread.name, bread);
		BY_NAME.put(apple.name, apple);
		BY_NAME.put(coal.name, coal);
		BY_NAME.put(ironOre.name, ironOre);
		BY_NAME.put(goldOre.name, goldOre);
		BY_NAME.put(ironIngot.name, ironIngot);
		BY_NAME.put(goldIngot.name, goldIngot);
		BY_NAME.put(slime.name, slime);
		BY_NAME.put(glass.name, glass);
		BY_NAME.put(cloth.name, cloth);
		BY_NAME.put(cloud.name, cloud);
		BY_NAME.put(gem.name, gem);
	}

	public static Resource getByName(String name) {
		return name == null ? null : BY_NAME.get(name);
	}
}