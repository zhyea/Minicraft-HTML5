/**
 * Port of InputHandler.java.
 *
 * The Key state machine mirrors the GWT original exactly:
 *   - down:    held state (true while the physical key is down)
 *   - presses: monotonically increasing count of fresh presses
 *   - absorbs: number of presses the game has consumed
 *   - clicked: true for exactly one tick after a fresh press (presses>absorbs)
 *
 * InputHandler attaches keydown/keyup listeners on `window` in a browser. The
 * Key class and the keycode mapping are DOM-free so they can be unit-tested in
 * Node; the listener wiring is guarded by a `typeof window` check.
 *
 * Mapping (layout-independent via KeyboardEvent.code, with a keyCode fallback):
 *   up      : ArrowUp / KeyW
 *   down    : ArrowDown / KeyS
 *   left    : ArrowLeft / KeyA
 *   right   : ArrowRight / KeyD
 *   attack  : KeyC
 *   menu    : KeyX / Enter
 */
export class Key {
  public presses = 0;
  public absorbs = 0;
  public down = false;
  public clicked = false;
  /** Logical key id (0..5) — kept for parity with the GWT `Key` class. */
  constructor(public readonly id: number) {}

  /** Reflect a physical key transition. */
  public toggle(pressed: boolean): void {
    if (pressed !== this.down) {
      this.down = pressed;
    }
    if (pressed) {
      this.presses++;
    }
  }

  /** Called once per game tick. Derives `clicked` from the press/consume ratio. */
  public tick(): void {
    if (this.absorbs < this.presses) {
      this.absorbs++;
      this.clicked = true;
    } else {
      this.clicked = false;
    }
  }

  /**
   * Mark every recorded press as already consumed, so the next `tick()` reports
   * `clicked === false`. Used by the menu bridge to swallow a keypress that a
   * Vue menu already handled (e.g. closing on X) so the game loop does not
   * re-trigger the same action on the following frame.
   */
  public absorb(): void {
    this.absorbs = this.presses;
  }
}

type KeyName = 'up' | 'down' | 'left' | 'right' | 'attack' | 'menu';

const KEYMAP_CODE: Record<string, KeyName> = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyC: 'attack',
  KeyX: 'menu',
  Enter: 'menu',
};

// Legacy keyCode fallback (some embedded webviews still report keyCode).
const KEYMAP_KEYCODE: Record<number, KeyName> = {
  38: 'up',
  87: 'up',
  40: 'down',
  83: 'down',
  37: 'left',
  65: 'left',
  39: 'right',
  68: 'right',
  67: 'attack',
  88: 'menu',
  13: 'menu',
};

export class InputHandler {
  /** All keys, for batch ticking. */
  public readonly keys: Key[] = [];

  public up: Key;
  public down: Key;
  public left: Key;
  public right: Key;
  public attack: Key;
  public menu: Key;

  private byName: Record<KeyName, Key>;

  constructor() {
    this.up = new Key(0);
    this.down = new Key(1);
    this.left = new Key(2);
    this.right = new Key(3);
    this.attack = new Key(4);
    this.menu = new Key(5);

    this.keys.push(this.up, this.down, this.left, this.right, this.attack, this.menu);
    this.byName = {
      up: this.up,
      down: this.down,
      left: this.left,
      right: this.right,
      attack: this.attack,
      menu: this.menu,
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
    }
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const name = KEYMAP_CODE[e.code] ?? KEYMAP_KEYCODE[e.keyCode];
    if (name) {
      e.preventDefault();
      this.byName[name].toggle(true);
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    const name = KEYMAP_CODE[e.code] ?? KEYMAP_KEYCODE[e.keyCode];
    if (name) {
      e.preventDefault();
      this.byName[name].toggle(false);
    }
  };

  /** Advance every key state machine by one tick (call from Game.tick). */
  public tick(): void {
    for (const k of this.keys) k.tick();
  }

  /** Force all keys to the released state (used on focus loss in the original). */
  public releaseAll(): void {
    for (const k of this.keys) k.down = false;
  }

  public dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
    }
  }
}
