package com.mojang.ld22.gfx;

import com.google.gwt.canvas.client.Canvas;
import com.google.gwt.canvas.dom.client.CanvasPixelArray;
import com.google.gwt.canvas.dom.client.Context2d;
import com.google.gwt.canvas.dom.client.ImageData;
import com.google.gwt.canvas.dom.client.TextBaseline;

import java.util.HashMap;
import java.util.Map;

public class Font {
	private static String chars = "" + //
			"ABCDEFGHIJKLMNOPQRSTUVWXYZ      " + //
			"0123456789.,!?'\"-+=/\\%()<>:;     " + //
			"";

	// --- CJK / full-width dot-matrix pipeline ---------------------------------
	// ASCII glyphs above are rendered from the baked 8x8 sprite sheet (on-pixel = 1).
	// Any non-ASCII character (Chinese hanzi, full-width punctuation) is rasterized at
	// runtime from the browser's system CJK font into an 8x8 1-bit bitmap (on = 1,
	// matching the sheet convention) and cached. This keeps the 8px monospace grid so
	// every msg.length()*8 centering / HUD offset stays correct, and no external
	// asset or build step is needed (rendering happens lazily on first draw, which is
	// always after the game canvas + applyDisplaySize() have run).
	private static final int SRC = 16; // supersample size for a cleaner downscale
	private static final int DST = 8;  // final glyph size (monospace 8px/char)

	private static Canvas rasterCanvas;
	private static Context2d rasterCtx;
	private static boolean rasterReady = false;
	private static Map<Integer, int[]> cjkCache = new HashMap<Integer, int[]>();

	/** Creates the offscreen rasterization canvas at most once. */
	private static void ensureRaster() {
		if (rasterReady) return;
		rasterReady = true; // attempt exactly once
		Canvas c = Canvas.createIfSupported();
		if (c == null) return;
		c.setCoordinateSpaceWidth(SRC);
		c.setCoordinateSpaceHeight(SRC);
		rasterCtx = c.getContext2d();
		rasterCanvas = c;
	}

	/** Returns the cached 8x8 1-bit bitmap for char c, or null if it cannot be drawn. */
	private static int[] getCJK(char c) {
		Integer key = Integer.valueOf(c);
		int[] g = cjkCache.get(key);
		if (g != null) return g;
		ensureRaster();
		g = (rasterCtx != null) ? rasterize(c) : null;
		cjkCache.put(key, g);
		return g;
	}

	/** Rasterizes char c into an 8x8 1-bit bitmap (on-pixel = 1). */
	private static int[] rasterize(char c) {
		Context2d ctx = rasterCtx;
		ctx.clearRect(0, 0, SRC, SRC);
		ctx.setFillStyle("#ffffff");
		ctx.setFont(SRC + "px \"Microsoft YaHei\",\"PingFang SC\",\"Noto Sans CJK SC\",\"WenQuanYi Micro Hei\",sans-serif");
		ctx.setTextBaseline(TextBaseline.TOP);
		ctx.fillText(String.valueOf(c), 0, 0);
		ImageData imageData = ctx.getImageData(0, 0, SRC, SRC);
		CanvasPixelArray data = imageData.getData();
		int[] glyph = new int[DST * DST];
		int scale = SRC / DST;
		for (int y = 0; y < DST; y++) {
			for (int x = 0; x < DST; x++) {
				int sum = 0, cnt = 0;
				for (int sy = 0; sy < scale; sy++) {
					for (int sx = 0; sx < scale; sx++) {
						int px = x * scale + sx;
						int py = y * scale + sy;
						int alpha = data.get((py * SRC + px) * 4 + 3);
						sum += alpha;
						cnt++;
					}
				}
				glyph[x + y * DST] = (sum / cnt > 96) ? 1 : 0;
			}
		}
		return glyph;
	}

	public static void draw(String msg, Screen screen, int x, int y, int col) {
		msg = msg.toUpperCase();
		for (int i = 0; i < msg.length(); i++) {
			char c = msg.charAt(i);
			int ix = chars.indexOf(c);
			if (ix >= 0) {
				// ASCII: render from the baked font sheet (tile row 30), unchanged.
				screen.render(x + i * 8, y, ix + 30 * 32, col, 0);
			} else {
				// CJK / full-width: render from the runtime rasterized 8x8 bitmap.
				int[] glyph = getCJK(c);
				if (glyph != null) {
					screen.renderGlyph(x + i * 8, y, glyph, col);
				}
			}
		}
	}

	public static void renderFrame(Screen screen, String title, int x0, int y0, int x1, int y1) {
		for (int y = y0; y <= y1; y++) {
			for (int x = x0; x <= x1; x++) {
				if (x == x0 && y == y0)
					screen.render(x * 8, y * 8, 0 + 13 * 32, Color.get(-1, 1, 5, 445), 0);
				else if (x == x1 && y == y0)
					screen.render(x * 8, y * 8, 0 + 13 * 32, Color.get(-1, 1, 5, 445), 1);
				else if (x == x0 && y == y1)
					screen.render(x * 8, y * 8, 0 + 13 * 32, Color.get(-1, 1, 5, 445), 2);
				else if (x == x1 && y == y1)
					screen.render(x * 8, y * 8, 0 + 13 * 32, Color.get(-1, 1, 5, 445), 3);
				else if (y == y0)
					screen.render(x * 8, y * 8, 1 + 13 * 32, Color.get(-1, 1, 5, 445), 0);
				else if (y == y1)
					screen.render(x * 8, y * 8, 1 + 13 * 32, Color.get(-1, 1, 5, 445), 2);
				else if (x == x0)
					screen.render(x * 8, y * 8, 2 + 13 * 32, Color.get(-1, 1, 5, 445), 0);
				else if (x == x1)
					screen.render(x * 8, y * 8, 2 + 13 * 32, Color.get(-1, 1, 5, 445), 1);
				else
					screen.render(x * 8, y * 8, 2 + 13 * 32, Color.get(5, 5, 5, 5), 1);
			}
		}

		draw(title, screen, x0 * 8 + 8, y0 * 8, Color.get(5, 5, 5, 550));
	}
}
