package com.mojang.ld22.screen;

import com.mojang.ld22.gfx.Color;
import com.mojang.ld22.gfx.Font;
import com.mojang.ld22.gfx.Screen;
import com.mojang.ld22.sound.Sound;

public class TitleMenu extends Menu {
	private int selected = 0;

	public TitleMenu() {
	}

	/** Build the option list dynamically: prepend "继续游戏" when a save exists. */
	private String[] getOptions() {
		if (game.hasSave()) {
			return new String[]{ "继续游戏", "开始游戏", "玩法说明", "关于" };
		}
		return new String[]{ "开始游戏", "玩法说明", "关于" };
	}

	/** Index of the "继续游戏" option, or -1 when there is no save. */
	private int continueIndex() {
		return game.hasSave() ? 0 : -1;
	}

	public void tick() {
		String[] opts = getOptions();
		if (input.up.clicked) selected--;
		if (input.down.clicked) selected++;

		int len = opts.length;
		if (selected < 0) selected += len;
		if (selected >= len) selected -= len;

		if (input.attack.clicked || input.menu.clicked) {
			if (selected == continueIndex()) {
				game.loadGame();
				return;
			}
			if (opts[selected].equals("开始游戏")) {
				Sound.test.play();
				game.resetGame();
				game.setMenu(null);
				return;
			}
			if (opts[selected].equals("玩法说明")) { game.setMenu(new InstructionsMenu(this)); return; }
			if (opts[selected].equals("关于")) { game.setMenu(new AboutMenu(this)); return; }
		}
	}

	public void render(Screen screen) {
		screen.clear(0);

		int h = 2;
		int w = 13;
		int titleColor = Color.get(0, 010, 131, 551);
		int xo = (screen.w - w * 8) / 2;
		int yo = 24;
		for (int y = 0; y < h; y++) {
			for (int x = 0; x < w; x++) {
				screen.render(xo + x * 8, yo + y * 8, x + (y + 6) * 32, titleColor, 0);
			}
		}

		String[] opts = getOptions();
		for (int i = 0; i < opts.length; i++) {
			String msg = opts[i];
			int col = Color.get(0, 222, 222, 222);
			if (i == selected) {
				msg = "> " + msg + " <";
				col = Color.get(0, 555, 555, 555);
			}
			Font.draw(msg, screen, (screen.w - msg.length() * 8) / 2, (8 + i) * 8, col);
		}

		Font.draw("（方向键 X C）", screen, 0, screen.h - 8, Color.get(0, 111, 111, 111));
	}
}