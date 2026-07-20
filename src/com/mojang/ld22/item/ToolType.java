package com.mojang.ld22.item;

import java.util.HashMap;
import java.util.Map;

public class ToolType {
	public static ToolType shovel = new ToolType("铲", 0);
	public static ToolType hoe = new ToolType("锄", 1);
	public static ToolType sword = new ToolType("剑", 2);
	public static ToolType pickaxe = new ToolType("镐", 3);
	public static ToolType axe = new ToolType("斧", 4);

	public final String name;
	public final int sprite;

	private ToolType(String name, int sprite) {
		this.name = name;
		this.sprite = sprite;
	}

	private static final Map<String, ToolType> BY_NAME = new HashMap<String, ToolType>();

	static {
		BY_NAME.put(shovel.name, shovel);
		BY_NAME.put(hoe.name, hoe);
		BY_NAME.put(sword.name, sword);
		BY_NAME.put(pickaxe.name, pickaxe);
		BY_NAME.put(axe.name, axe);
	}

	public static ToolType getByName(String name) {
		return name == null ? null : BY_NAME.get(name);
	}
}
