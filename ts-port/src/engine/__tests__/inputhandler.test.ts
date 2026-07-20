import { describe, it, expect } from 'vitest';
import { Key } from '../InputHandler';

/**
 * Key state machine (port of InputHandler.Key).
 *
 * Behaviour mirrors the GWT original:
 *   - `down`    reflects the physical key state.
 *   - `presses` increments on every keydown edge *and* on OS key-repeat.
 *   - `clicked` is true for exactly (presses - absorbs) ticks after a press,
 *     then false until the next press is consumed.
 * The Key class is DOM-free so it can be unit-tested under vitest's node env.
 */
describe('Key state machine', () => {
  it('toggles down and counts presses on edges', () => {
    const k = new Key(0);
    expect(k.down).toBe(false);
    expect(k.presses).toBe(0);

    k.toggle(true);
    expect(k.down).toBe(true);
    expect(k.presses).toBe(1);

    // Already down: another keydown (OS repeat) still bumps the press count,
    // matching GWT's per-event increment.
    k.toggle(true);
    expect(k.presses).toBe(2);

    k.toggle(false);
    expect(k.down).toBe(false);

    k.toggle(true);
    expect(k.presses).toBe(3);
  });

  it('clicked is true for exactly (presses - absorbs) ticks, then false', () => {
    const k = new Key(1);
    k.toggle(false);
    k.toggle(true); // press #1
    k.toggle(false);
    k.toggle(true); // press #2
    expect(k.presses).toBe(2);

    k.tick();
    expect(k.clicked).toBe(true); // absorbs 0 -> 1
    k.tick();
    expect(k.clicked).toBe(true); // absorbs 1 -> 2
    k.tick();
    expect(k.clicked).toBe(false); // absorbs 2 == presses
  });
});
