package com.mojang.ld22.screen;

import com.mojang.ld22.gfx.Color;
import com.mojang.ld22.gfx.Font;
import com.mojang.ld22.gfx.Screen;

public class InstructionsMenu extends Menu {
	private Menu parent;

	public InstructionsMenu(Menu parent) {
		this.parent = parent;
	}

	public void tick() {
		if (input.attack.clicked || input.menu.clicked) {
			game.setMenu(parent);
		}
	}

	public void render(Screen screen) {
		screen.clear(0);

		Font.draw("玩法说明", screen, 4 * 8 + 4, 1 * 8, Color.get(0, 555, 555, 555));
		Font.draw("移动你的角色", screen, 0 * 8 + 4, 3 * 8, Color.get(0, 333, 333, 333));
		Font.draw("使用方向键", screen, 0 * 8 + 4, 4 * 8, Color.get(0, 333, 333, 333));
		Font.draw("按 C 攻击", screen, 0 * 8 + 4, 5 * 8, Color.get(0, 333, 333, 333));
		Font.draw("按 X 打开", screen, 0 * 8 + 4, 6 * 8, Color.get(0, 333, 333, 333));
		Font.draw("背包并用来", screen, 0 * 8 + 4, 7 * 8, Color.get(0, 333, 333, 333));
		Font.draw("使用物品", screen, 0 * 8 + 4, 8 * 8, Color.get(0, 333, 333, 333));
		Font.draw("选择背包中的", screen, 0 * 8 + 4, 9 * 8, Color.get(0, 333, 333, 333));
		Font.draw("物品以", screen, 0 * 8 + 4, 10 * 8, Color.get(0, 333, 333, 333));
		Font.draw("装备它", screen, 0 * 8 + 4, 11 * 8, Color.get(0, 333, 333, 333));
		Font.draw("击败空气巫师", screen, 0 * 8 + 4, 12 * 8, Color.get(0, 333, 333, 333));
		Font.draw("即可获胜！", screen, 0 * 8 + 4, 13 * 8, Color.get(0, 333, 333, 333));
	}
}
