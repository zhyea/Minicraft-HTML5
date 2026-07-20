/**
 * SaveStore — the single persistence boundary for the MVP save/load loop.
 *
 * Responsibilities:
 *   - Hold the one and only save slot under the fixed key `minicraft.save`.
 *   - Encode/decode Uint8Array <-> Base64 via the native browser `btoa`/`atob`
 *     (no IE9 hacks; we target evergreen browsers + Node 18+ for vitest).
 *   - Degrade gracefully: when `localStorage` is undefined or throws (private
 *     mode / quota full / SSR), fall back to a process-wide in-memory Map so
 *     the game core and the headless test suite keep working.
 *
 * The storage backend is chosen ONCE at module load and shared by every
 * SaveStore instance. That shared backend is what lets two independent `Game`
 * instances (e.g. g1.saveGame(); g2 = new Game(); g2.loadGame();) read/write
 * the same slot, which the round-trip test relies on.
 */
const SAVE_KEY = 'minicraft.save';

/** Minimal key/value contract the rest of the module talks to. */
interface Backend {
  /** Whether a real (non-memory) store is in use — handy for diagnostics. */
  isPersistent(): boolean;
  get(): string | null;
  set(value: string): void;
  remove(): void;
}

/**
 * Pick the best available backend. Tries `localStorage` first (with a write
 * probe so a disabled/full store degrades to memory instead of throwing at
 * runtime); otherwise uses a module-scoped Map.
 */
function createBackend(): Backend {
  try {
    if (typeof localStorage !== 'undefined' && localStorage != null) {
      const probe = '__mc_save_probe__';
      localStorage.setItem(probe, '1');
      localStorage.removeItem(probe);
      return {
        isPersistent: () => true,
        get: () => localStorage.getItem(SAVE_KEY),
        set: (v: string) => localStorage.setItem(SAVE_KEY, v),
        remove: () => localStorage.removeItem(SAVE_KEY),
      };
    }
  } catch {
    // Access or probe failed — fall through to the in-memory store below.
  }

  const mem = new Map<string, string>();
  return {
    isPersistent: () => false,
    get: () => mem.get(SAVE_KEY) ?? null,
    set: (v: string) => {
      mem.set(SAVE_KEY, v);
    },
    remove: () => {
      mem.delete(SAVE_KEY);
    },
  };
}

// Module-scoped, shared by every SaveStore instance (see header note).
const backend: Backend = createBackend();

export class SaveStore {
  /** True when a save slot currently exists. Never throws. */
  public hasSave(): boolean {
    try {
      return backend.get() !== null;
    } catch {
      return false;
    }
  }

  /**
   * Persist a fully-serialised save string. A throwing backend (quota full,
   * privacy mode) is swallowed silently — the game must keep running.
   */
  public save(json: string): void {
    try {
      backend.set(json);
    } catch {
      /* silent: storage unavailable */
    }
  }

  /** Return the raw save string, or null when no slot exists. Never throws. */
  public load(): string | null {
    try {
      return backend.get();
    } catch {
      return null;
    }
  }

  /** Erase the save slot. Never throws. */
  public clear(): void {
    try {
      backend.remove();
    } catch {
      /* silent */
    }
  }

  /** True when the underlying store survives process exit (localStorage). */
  public isPersistent(): boolean {
    return backend.isPersistent();
  }

  /** Encode a byte buffer to a Base64 string (native btoa). */
  public static base64Encode(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000; // avoid arg-count limits on String.fromCharCode
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return btoa(binary);
  }

  /** Decode a Base64 string back into a byte buffer (native atob). */
  public static base64Decode(b64: string): Uint8Array {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
}
