package com.mojang.ld22;


import com.google.gwt.canvas.client.Canvas;
import com.google.gwt.canvas.dom.client.CanvasPixelArray;
import com.google.gwt.canvas.dom.client.Context2d;
import com.google.gwt.canvas.dom.client.ImageData;
import com.google.gwt.core.client.Duration;
import com.google.gwt.event.dom.client.BlurEvent;
import com.google.gwt.event.dom.client.BlurHandler;
import com.google.gwt.event.dom.client.FocusEvent;
import com.google.gwt.event.dom.client.FocusHandler;
import com.google.gwt.event.logical.shared.ResizeEvent;
import com.google.gwt.event.logical.shared.ResizeHandler;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.Label;
import com.mojang.ld22.entity.Player;
import com.mojang.ld22.gfx.Color;
import com.mojang.ld22.gfx.Font;
import com.mojang.ld22.gfx.Screen;
import com.mojang.ld22.gfx.SpriteSheet;
import com.mojang.ld22.level.Level;
import com.mojang.ld22.level.tile.Tile;
import com.mojang.ld22.screen.DeadMenu;
import com.mojang.ld22.screen.LevelTransitionMenu;
import com.mojang.ld22.screen.Menu;
import com.mojang.ld22.screen.TitleMenu;
import com.mojang.ld22.save.SaveManager;
import com.mojang.ld22.save.SaveStore;
import com.mojang.ld22.screen.WonMenu;
import com.mojang.ld22.sound.Sound;

public class Game extends Composite {
    public static final String NAME = "Minicraft";
    public static final int HEIGHT = 120;
    public static final int WIDTH = 160;

    /** Autosave cadence: 1800 ticks @ ~60fps ≈ 30 seconds. */
    private static final int AUTOSAVE_INTERVAL = 1800;

    /**
     * Current integer display scale (CSS multiplier applied to the fixed 160x120
     * internal buffer). Computed from the viewport in {@link #computeScale()};
     * never fixed, so the game fills large screens without blurring.
     */
    private int scale = 1;

    final boolean isMobileBrowser;
    final public Canvas canvas;
    final private Context2d context;

    final private ImageData imageData;
    final private CanvasPixelArray pixelArray;
//    final private ImageData softwareScaledImageData;
//    final private CanvasPixelArray softwareScaledPixelArray;

    private Label statusWidget = null;
    private boolean isGodMode = false;

    private boolean hasFocus = false;

    private boolean running = false;
    private Screen screen;
    private Screen lightScreen;
    public InputHandler input;

    private int[] colors = new int[256];
    public int tickCount = 0;
    public int gameTime = 0;

    private Level level;
    public Level[] levels = new Level[5];
    public int currentLevel = 3;
    public Player player;

    public Menu menu;
    public int playerDeadTime;
    private int pendingLevelChange;
    public int wonTimer = 0;
    public boolean hasWon = false;

    public void setStatusWidget(Label statusWidget) {
        this.statusWidget = statusWidget;
    }

    public void setGodMode(boolean godMode) {
        isGodMode = godMode;
    }

    public boolean isGodMode() {
        return isGodMode;
    }

    public Game(boolean isMobileBrowser) {
        this.isMobileBrowser = isMobileBrowser;
        this.scale = computeScale();

        canvas = Canvas.createIfSupported();
        if (canvas == null) {
            Window.alert("Your browser doesn't support the canvas element");
            context = null;
            imageData = null;
            pixelArray = null;
//            softwareScaledImageData = null;
//            softwareScaledPixelArray = null;
            return;
        }

        canvas.setStyleName("mainCanvas");
        applyDisplaySize();
        canvas.setCoordinateSpaceWidth(WIDTH);
        canvas.setCoordinateSpaceHeight(HEIGHT);

        // Recompute the integer scale and reapply the CSS size on viewport changes.
        Window.addResizeHandler(new ResizeHandler() {
            @Override
            public void onResize(ResizeEvent event) {
                scale = computeScale();
                applyDisplaySize();
            }
        });

        context = canvas.getContext2d();
        imageData = context.createImageData(WIDTH, HEIGHT);
        pixelArray = imageData.getData();
//        softwareScaledImageData = context.createImageData(WIDTH * SCALE, HEIGHT * SCALE);
//        softwareScaledPixelArray = softwareScaledImageData.getData();

        if (!isMobileBrowser) {
            canvas.addFocusHandler(new FocusHandler() {
                @Override
                public void onFocus(FocusEvent event) {
                    hasFocus = true;
                }
            });

            canvas.addBlurHandler(new BlurHandler() {
                @Override
                public void onBlur(BlurEvent event) {
                    hasFocus = false;
                }
            });
        }

        // Persist the game when the page/tab is being closed. This is a synchronous
        // localStorage write, which is safe to do here (saveGame() no-ops until a
        // live player exists). It is fully independent of the resize handler above.
        Window.addWindowClosingHandler(new Window.ClosingHandler() {
            @Override
            public void onWindowClosing(Window.ClosingEvent event) {
                saveGame();
            }
        });

        input = new InputHandler(this);

        initWidget(canvas);
    }

    /**
     * Largest integer scale at which the fixed 160x120 buffer still fits the
     * viewport. Integer division (/ ) already floors, so the result is always an
     * integer; clamps to >=1, and >=2 on mobile to preserve original readability.
     */
    private int computeScale() {
        int sx = Window.getClientWidth() / WIDTH;
        int sy = Window.getClientHeight() / HEIGHT;
        int s = Math.min(sx, sy);
        if (s < 1) s = 1;
        if (isMobileBrowser && s < 2) s = 2;
        return s;
    }

    /** Push the current scale into the canvas CSS size and keep pixels crisp. */
    private void applyDisplaySize() {
        canvas.setWidth(WIDTH * scale + "px");
        canvas.setHeight(HEIGHT * scale + "px");
        // Belt-and-suspenders: CSS already sets image-rendering, but the inline
        // rule guarantees crisp upscaling even if the stylesheet is overridden.
        canvas.getElement().getStyle().setProperty("image-rendering", "pixelated");
    }

    /** CSS pixel width of the displayed canvas (= WIDTH * scale). */
    public int getDisplayWidth() {
        return WIDTH * scale;
    }

    /** CSS pixel height of the displayed canvas (= HEIGHT * scale). */
    public int getDisplayHeight() {
        return HEIGHT * scale;
    }

    public void setMenu(Menu menu) {
        this.menu = menu;
        if (menu != null) menu.init(this, input);
    }

    public void stop() {
        running = false;
    }

    public void resetGame() {
        playerDeadTime = 0;
        wonTimer = 0;
        gameTime = 0;
        hasWon = false;

        levels = new Level[5];
        currentLevel = 3;

        levels[4] = new Level(128, 128, 1, null);
        levels[3] = new Level(128, 128, 0, levels[4]);
        levels[2] = new Level(128, 128, -1, levels[3]);
        levels[1] = new Level(128, 128, -2, levels[2]);
        levels[0] = new Level(128, 128, -3, levels[1]);

        level = levels[currentLevel];
        player = new Player(this, input);
        player.findStartPos(level);

        level.add(player);

        for (int i = 0; i < 5; i++) {
            levels[i].trySpawn(5000);
        }
    }

    public boolean hasSave() {
        return SaveStore.hasSave();
    }

    /**
     * Persist the current game. No-ops when there is no live player or the
     * player is dead — we must never persist a removed player (doing so would
     * re-trigger DeadMenu on the next load; see save-system-plan.md §8.4). Any
     * storage failure (private mode, quota exceeded) is swallowed so gameplay is
     * never blocked.
     */
    public void saveGame() {
        if (player == null || player.removed) return;
        try {
            SaveStore.save(SaveManager.toJson(this));
        } catch (Throwable t) {
            // Storage unavailable or serialization error: fail silently.
        }
    }

    /**
     * Load the saved game. Rebuilds the 5 levels via {@link Level#fromSave}
     * (bypassing world generation), the player without re-seeding starter items,
     * and all entities/items, then drops straight into play. On a missing,
     * corrupt, or version-mismatched save, a fresh world is started instead of
     * crashing.
     */
    public void loadGame() {
        String s = SaveStore.load();
        if (s == null) {
            resetGame();
            setMenu(null);
            return;
        }
        try {
            SaveManager.fromJson(this, s);
            playerDeadTime = 0;
            wonTimer = 0;
            hasWon = false;
            pendingLevelChange = 0;
            level = levels[currentLevel];
            level.add(player);
            setMenu(null);
        } catch (Throwable t) {
            // Corrupt or unsupported save: discard and start fresh.
            resetGame();
            setMenu(null);
        }
    }

    private void init() {
        int pp = 0;
        for (int r = 0; r < 6; r++) {
            for (int g = 0; g < 6; g++) {
                for (int b = 0; b < 6; b++) {
                    int rr = (r * 255 / 5);
                    int gg = (g * 255 / 5);
                    int bb = (b * 255 / 5);
                    int mid = (rr * 30 + gg * 59 + bb * 11) / 100;

                    int r1 = ((rr + mid * 1) / 2) * 230 / 255 + 10;
                    int g1 = ((gg + mid * 1) / 2) * 230 / 255 + 10;
                    int b1 = ((bb + mid * 1) / 2) * 230 / 255 + 10;
                    colors[pp++] = r1 << 16 | g1 << 8 | b1;

                }
            }
        }

        screen = new Screen(WIDTH, HEIGHT, new SpriteSheet());
        lightScreen = new Screen(WIDTH, HEIGHT, new SpriteSheet());

        resetGame();
        setMenu(new TitleMenu());
    }

    public void run() {
        Sound.initAllSounds();
        init();

        final Looper looper = new Looper();
        final Timer timer = new Timer() {
            @Override
            public void run() {
                looper.mainLoop();
                schedule(2);
            }
        };
        timer.schedule(2);
    }

    private class Looper {
        double lastTime;
        double unprocessed;
        double msPerTick;
        int frames;
        int ticks;
        double lastTimer1;

        int scrollyTicks =0;

        private Looper() {
            lastTime = Duration.currentTimeMillis();
            unprocessed = 0;
            msPerTick = 1000.0 / 60;
            frames = 0;
            ticks = 0;
            lastTimer1 = Duration.currentTimeMillis();

        }

        private void mainLoop() {
            double now = Duration.currentTimeMillis();
            unprocessed += (now - lastTime) / msPerTick;
            lastTime = now;
            boolean shouldRender = true;

            if (isMobileBrowser) {
                //hack - if iOS, closes the app, and comes back to it an hour later
                //we want to avoid stalling and processing an hour worth of ticks
                if (unprocessed > 60) {
                    unprocessed = 60;
                }
            }

            while (unprocessed >= 1) {
                ticks++;
                tick();
                unprocessed -= 1;
                shouldRender = true;
            }

            if (shouldRender) {
                frames++;
                render();
            }

            if (Duration.currentTimeMillis() - lastTimer1 > 1000) {
                lastTimer1 = Duration.currentTimeMillis();
                if (statusWidget != null) {
                    statusWidget.setText(ticks + " ticks, " + frames + " fps");
                }
                frames = 0;
                ticks = 0;

                if (isMobileBrowser) {
                    Window.scrollTo(0, 1);
                }
            }
        }
    }

    public void tick() {
        tickCount++;
        if (!hasFocus()) {
            input.releaseAll();
        } else {
            if (!player.removed && !hasWon) gameTime++;

            // Periodic autosave during active play (≈30s). saveGame() itself
            // guards against a dead/missing player, and menu!=null (title/menus)
            // is excluded so we only snapshot a live game.
            if (menu == null && gameTime > 0 && gameTime % AUTOSAVE_INTERVAL == 0) {
                saveGame();
            }

            input.tick();
            if (menu != null) {
                menu.tick();
            } else {
                if (player.removed) {
                    playerDeadTime++;
                    if (playerDeadTime > 60) {
                        setMenu(new DeadMenu());
                    }
                } else {
                    if (pendingLevelChange != 0) {
                        setMenu(new LevelTransitionMenu(pendingLevelChange));
                        pendingLevelChange = 0;
                    }
                }
                if (wonTimer > 0) {
                    if (--wonTimer == 0) {
                        setMenu(new WonMenu());
                    }
                }
                level.tick();
                Tile.tickCount++;
            }
        }
    }

    public void changeLevel(int dir) {
        level.remove(player);
        currentLevel += dir;
        level = levels[currentLevel];
        player.x = (player.x >> 4) * 16 + 8;
        player.y = (player.y >> 4) * 16 + 8;
        level.add(player);

    }

    public void render() {
        int xScroll = player.x - screen.w / 2;
        int yScroll = player.y - (screen.h - 8) / 2;
        if (xScroll < 16) xScroll = 16;
        if (yScroll < 16) yScroll = 16;
        if (xScroll > level.w * 16 - screen.w - 16) xScroll = level.w * 16 - screen.w - 16;
        if (yScroll > level.h * 16 - screen.h - 16) yScroll = level.h * 16 - screen.h - 16;
        if (currentLevel > 3) {
            int col = Color.get(20, 20, 121, 121);
            for (int y = 0; y < 14; y++)
                for (int x = 0; x < 24; x++) {
                    screen.render(x * 8 - ((xScroll / 4) & 7), y * 8 - ((yScroll / 4) & 7), 0, col, 0);
                }
        }

        level.renderBackground(screen, xScroll, yScroll);
        level.renderSprites(screen, xScroll, yScroll);

        if (currentLevel < 3) {
            lightScreen.clear(0);
            level.renderLight(lightScreen, xScroll, yScroll);
            screen.overlay(lightScreen, xScroll, yScroll);
        }

        renderGui();

        if (!hasFocus()) renderFocusNagger();
        for (int y = 0; y < screen.h; y++) {
            for (int x = 0; x < screen.w; x++) {
                int cc = screen.pixels[x + y * screen.w];
                if (cc < 255) {
                    int ind = 4 * (y * WIDTH + x);
                    int rgba = colors[cc];
                    int r = (rgba >> 16) & 0xff;
                    int g = (rgba >> 8) & 0xff;
                    int b = rgba & 0xff;

                    pixelArray.set(ind + 0, r);
                    pixelArray.set(ind + 1, g);
                    pixelArray.set(ind + 2, b);
                    pixelArray.set(ind + 3, 255);
                }
            }
        }
        context.putImageData(imageData, 0, 0);

        /*
        for (int y = 0; y < screen.h; y++) {
            for (int x = 0; x < screen.w; x++) {
                int cc = screen.pixels[x + y * screen.w];
                if (cc < 255) {
                    int rowStart = 4 * ((y * SCALE) * (WIDTH * SCALE) + (x * SCALE));
                    int rgba = colors[cc];
                    int r = (rgba >> 16) & 0xff;
                    int g = (rgba >> 8) & 0xff;
                    int b = rgba & 0xff;

                    for (int pxlY = 0; pxlY < SCALE; pxlY++) {
                        int pxlStart = rowStart;

                        for (int pxlX = 0; pxlX < SCALE; pxlX++) {
                            softwareScaledPixelArray.set(pxlStart + 0, r);
                            softwareScaledPixelArray.set(pxlStart + 1, g);
                            softwareScaledPixelArray.set(pxlStart + 2, b);
                            softwareScaledPixelArray.set(pxlStart + 3, 255);

                            pxlStart+=4;
                        }
                        rowStart += (WIDTH * SCALE * 4);
                    }
                }
            }
        }
        context.putImageData(softwareScaledImageData, 0, 0);
        */
    }

    private void renderGui() {
        for (int y = 0; y < 2; y++) {
            for (int x = 0; x < 20; x++) {
                screen.render(x * 8, screen.h - 16 + y * 8, 0 + 12 * 32, Color.get(000, 000, 000, 000), 0);
            }
        }

        for (int i = 0; i < 10; i++) {
            if (i < player.health)
                screen.render(i * 8, screen.h - 16, 0 + 12 * 32, Color.get(000, 200, 500, 533), 0);
            else
                screen.render(i * 8, screen.h - 16, 0 + 12 * 32, Color.get(000, 100, 000, 000), 0);

            if (player.staminaRechargeDelay > 0) {
                if (player.staminaRechargeDelay / 4 % 2 == 0)
                    screen.render(i * 8, screen.h - 8, 1 + 12 * 32, Color.get(000, 555, 000, 000), 0);
                else
                    screen.render(i * 8, screen.h - 8, 1 + 12 * 32, Color.get(000, 110, 000, 000), 0);
            } else {
                if (i < player.stamina)
                    screen.render(i * 8, screen.h - 8, 1 + 12 * 32, Color.get(000, 220, 550, 553), 0);
                else
                    screen.render(i * 8, screen.h - 8, 1 + 12 * 32, Color.get(000, 110, 000, 000), 0);
            }
        }
        if (player.activeItem != null) {
            player.activeItem.renderInventory(screen, 10 * 8, screen.h - 16);
        }

        if (menu != null) {
            menu.render(screen);
        }
    }

    private void renderFocusNagger() {
        String msg = "点击聚焦！";
        int xx = (WIDTH - msg.length() * 8) / 2;
        int yy = (HEIGHT - 8) / 2;
        int w = msg.length();
        int h = 1;

        screen.render(xx - 8, yy - 8, 0 + 13 * 32, Color.get(-1, 1, 5, 445), 0);
        screen.render(xx + w * 8, yy - 8, 0 + 13 * 32, Color.get(-1, 1, 5, 445), 1);
        screen.render(xx - 8, yy + 8, 0 + 13 * 32, Color.get(-1, 1, 5, 445), 2);
        screen.render(xx + w * 8, yy + 8, 0 + 13 * 32, Color.get(-1, 1, 5, 445), 3);
        for (int x = 0; x < w; x++) {
            screen.render(xx + x * 8, yy - 8, 1 + 13 * 32, Color.get(-1, 1, 5, 445), 0);
            screen.render(xx + x * 8, yy + 8, 1 + 13 * 32, Color.get(-1, 1, 5, 445), 2);
        }
        for (int y = 0; y < h; y++) {
            screen.render(xx - 8, yy + y * 8, 2 + 13 * 32, Color.get(-1, 1, 5, 445), 0);
            screen.render(xx + w * 8, yy + y * 8, 2 + 13 * 32, Color.get(-1, 1, 5, 445), 1);
        }

        if ((tickCount / 20) % 2 == 0) {
            Font.draw(msg, screen, xx, yy, Color.get(5, 333, 333, 333));
        } else {
            Font.draw(msg, screen, xx, yy, Color.get(5, 555, 555, 555));
        }
    }

    public void scheduleLevelChange(int dir) {
        pendingLevelChange = dir;
    }

    public void won() {
        wonTimer = 60 * 3;
        hasWon = true;
    }

    private boolean hasFocus() {
        return isMobileBrowser || hasFocus;
    }
}