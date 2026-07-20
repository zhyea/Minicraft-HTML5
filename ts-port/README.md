# Minicraft HTML5 — TS Port (Phase 0 Vertical Slice)

A faithful **vertical slice** port of the GWT Minicraft source
(`src/com/mojang/ld22/...`) into a runnable **Vite + Vue 3 + TypeScript** project,
built to validate the proposed architecture end-to-end:

> Canvas pixel rendering + TypeScript fixed-60-tick game loop + Vue menu overlay + keyboard input.

This is **Phase 0 only**: surface level (depth 0) + one underground level (depth -1),
a Player + 1 Zombie, and the TitleMenu as the single Vue menu. CJK canvas fonts,
audio, and save/load are intentionally out of scope for the slice.

## Quick start

```bash
# from this directory (ts-port/)
npm install
npm run dev        # http://localhost:5173 — pick "开始游戏" to start
```

Other scripts:

```bash
npm run typecheck  # tsc --noEmit
npm run test       # vitest run (unit tests)
npm run build      # vite build -> dist/
npm run preview    # serve the production build
```

## Controls

| Action        | Keys                     |
| ------------- | ------------------------ |
| Move          | Arrow keys / WASD        |
| Attack / dig  | `C`                      |
| Menu / confirm| `X` or `Enter`           |

Navigate the title menu with ↑/↓ (or W/S) and confirm with `X`/`Enter` or a mouse click.

## Architecture

```
src/
  main.ts                 # Vue bootstrap -> mounts App into #app
  ui/
    App.vue               # owns <canvas id="game"> + mounts TitleMenu overlay
    menus/TitleMenu.vue   # THE only Vue menu (keyboard + mouse nav)
  game/
    state.ts              # reactive bridge: currentMenu / selectedIndex / started
    Game.ts               # 60-tick loop, levels, player, renderer binding
    level/
      Level.ts
      levelgen/LevelGen.ts
      tile/...            # Tile registry + Grass/Rock/Water/Tree/... tiles
    entity/...            # Entity, Mob, Player, Zombie
  engine/                 # DOM-free, unit-tested core
    Screen.ts             # software pixel buffer (palette *indices*)
    SpriteSheet.ts        # 8192 compressed ints -> 256x256 pixels
    Color.ts              # 4-shade-digit -> 32-bit selector
    palette.ts            # 6x6x6 (256) RGB palette + index->RGB expansion
    Renderer.ts           # Screen indices -> RGBA -> canvas (integer CSS scale)
    InputHandler.ts       # Key state machine + window listeners
    Sprite.ts, Rand.ts
  engine/__tests__/       # vitest unit tests (excluded from tsc)
```

### Rendering pipeline

1. Game logic draws tiles/entities as **palette indices** (0..255) into
   `Screen.pixels` (a `Uint8ClampedArray`) — the isomorphic replacement for the
   GWT `CanvasPixelArray`.
2. `Renderer.blit()` expands each index through the 256-colour `palette` into
   RGBA inside a fixed 160×120 `ImageData`, then `putImageData`.
3. Display scaling is pure CSS: the canvas backing store stays 160×120 while the
   element is stretched by the largest integer factor that fits the viewport, with
   `image-rendering: pixelated`.

### Why a tile registry?

GWT declares `public static Tile grass = new GrassTile(0)` as class-field
initialisers. Porting that directly creates an ES-module circular-init hazard
(subclasses extend `Tile`, and `Tile`'s statics would construct those subclasses).
`installTiles()` in `src/game/level/tile/registry.ts` performs registration once,
called from the `Game` constructor.

## Tests

`npm run test` runs vitest with the default `node` environment (the engine is
DOM-free):

- `Color.get` / `Color.get1` shading math
- `SpriteSheet` decompress → exactly `256*256` pixels, all 2-bit
- `palette` 256-entry build + `paletteToRGBA` index→RGB (transparent sentinel)
- `Key` press/absorb/clicked state machine

## Notes / deviations

- `LevelGen` lives under `src/game/level/levelgen/` (organisational subfolder),
  imported accordingly — functionally identical to the spec's flat path.
- The canvas element is created inside `App.vue` (rather than `index.html`) so the
  `Renderer` can bind it after Vue mounts the template; this is equivalent to the
  spec's `<canvas id="game">` requirement.
- Continuous enemy spawning is disabled; the slice places exactly one Zombie.
