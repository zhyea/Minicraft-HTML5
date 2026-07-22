/**
 * Port of sound/Sound.java — real-time synthesized SFX via the Web Audio API.
 *
 * The original Java class loaded binary .mp3 assets through GWT's SoundController.
 * The TS port ships NO audio binaries, so every effect is synthesized procedurally
 * from oscillators + noise bursts. Fully self-contained, zero external files.
 *
 * The API mirrors the original's static shape:
 *   Sound.init()              — create the shared AudioContext + master bus (idempotent)
 *   Sound.ensure()            — resume the context on the first user gesture (autoplay policy)
 *   Sound.play('monsterHurt') — fire-and-forget the named effect
 *
 * Robustness (required for the test/build gates):
 *   - In any environment without Web Audio (jsdom, node, headless), every method is a
 *     silent no-op and NEVER throws.
 *   - AudioContext construction is wrapped in try/catch; on failure we degrade silently.
 *   - So importing this module or calling play() can never crash a unit test or build.
 */

const GLOBAL: any = typeof globalThis !== 'undefined' ? globalThis : {};

/** Global output ceiling so synthesized effects stay at a comfortable level. */
const MASTER_VOLUME = 0.3;

type Builder = (ctx: AudioContext, dest: AudioNode, t0: number) => void;

export class Sound {
  private static ctx: AudioContext | null = null;
  private static master: GainNode | null = null;
  private static supported = false;
  private static bootstrapped = false;
  private static resumeListenerAttached = false;

  /** Create the shared context + master gain. Idempotent; safe before any gesture. */
  public static init(): void {
    if (Sound.bootstrapped) return;
    Sound.bootstrapped = true;

    const AC = Sound.getAudioContextCtor();
    if (!AC) {
      Sound.supported = false;
      return;
    }
    try {
      Sound.ctx = new AC();
      Sound.master = Sound.ctx.createGain();
      Sound.master.gain.value = MASTER_VOLUME;
      Sound.master.connect(Sound.ctx.destination);
      Sound.supported = true;
    } catch {
      Sound.ctx = null;
      Sound.master = null;
      Sound.supported = false;
    }
  }

  /**
   * Lazily resume the AudioContext. Browsers create it "suspended" until a user
   * gesture; this wires a one-time keydown/click listener on document that resumes
   * it on first interaction. Idempotent — the listener is attached at most once,
   * and the call is cheap enough to sit on every playback.
   */
  public static ensure(): void {
    Sound.init();
    if (!Sound.supported || !Sound.ctx) return;
    if (Sound.ctx.state === 'running') return;

    Sound.resumeContext();

    if (!Sound.resumeListenerAttached && typeof document !== 'undefined') {
      Sound.resumeListenerAttached = true;
      const handler = (): void => {
        Sound.resumeContext();
        document.removeEventListener('keydown', handler);
        document.removeEventListener('click', handler);
      };
      document.addEventListener('keydown', handler);
      document.addEventListener('click', handler);
    }
  }

  /** Play a named effect. Returns silently (no throw) when unsupported or unknown. */
  public static play(name: string): void {
    Sound.ensure();
    if (!Sound.supported || !Sound.ctx || !Sound.master) return;
    const build = SOUNDS[name];
    if (!build) return;
    try {
      build(Sound.ctx, Sound.master, Sound.ctx.currentTime);
    } catch {
      /* synthesis error — ignore, never break gameplay */
    }
  }

  // ---- internals ----------------------------------------------------------

  private static resumeContext(): void {
    if (!Sound.ctx || Sound.ctx.state === 'running') return;
    try {
      // resume() may reject if called outside a gesture; swallow harmlessly.
      void Sound.ctx.resume().catch(() => {});
    } catch {
      /* no-op */
    }
  }

  private static getAudioContextCtor(): (new () => AudioContext) | null {
    const Ctor = GLOBAL.AudioContext || GLOBAL.webkitAudioContext;
    return typeof Ctor === 'function' ? (Ctor as new () => AudioContext) : null;
  }
}

// ---- synthesis graph ------------------------------------------------------

/** One oscillator with a frequency glide + gain envelope. */
function tone(ctx: AudioContext, dest: AudioNode, t0: number, o: {
  type: OscillatorType;
  f0: number;
  f1: number;
  dur: number;
  peak: number;
  attack?: number;
}): void {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  const attack = o.attack ?? 0.005;

  osc.type = o.type;
  osc.frequency.setValueAtTime(o.f0, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t0 + o.dur);

  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);

  osc.connect(g).connect(dest);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.02);
}

/** A filtered white-noise burst (for rumble / impact texture). */
function noise(ctx: AudioContext, dest: AudioNode, t0: number, o: {
  dur: number;
  peak: number;
  lp: number;
}): void {
  const len = Math.floor(ctx.sampleRate * o.dur);
  if (len <= 0) return;
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;

  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = o.lp;

  const g = ctx.createGain();
  g.gain.setValueAtTime(o.peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);

  src.connect(filt).connect(g).connect(dest);
  src.start(t0);
  src.stop(t0 + o.dur + 0.02);
}

/**
 * The effect library, keyed by the original Java sound names. Each builder is a
 * short, recognizable blip — deliberately NOT realistic, just identifiable.
 */
const SOUNDS: Record<string, Builder> = {
  // Monster takes a hit: short square-wave downward chirp.
  monsterHurt: (ctx, dest, t0) =>
    tone(ctx, dest, t0, { type: 'square', f0: 440, f1: 150, dur: 0.14, peak: 0.5 }),

  // Player takes a hit: lower, duller tone.
  playerHurt: (ctx, dest, t0) =>
    tone(ctx, dest, t0, { type: 'triangle', f0: 320, f1: 110, dur: 0.22, peak: 0.6 }),

  // Player dies: long descending sweep.
  playerDeath: (ctx, dest, t0) =>
    tone(ctx, dest, t0, { type: 'sawtooth', f0: 600, f1: 60, dur: 0.9, peak: 0.6 }),

  // Boss dies: low rumble + noise boom.
  bossdeath: (ctx, dest, t0) => {
    tone(ctx, dest, t0, { type: 'sine', f0: 90, f1: 40, dur: 1.2, peak: 0.7 });
    noise(ctx, dest, t0, { dur: 1.0, peak: 0.25, lp: 400 });
  },

  // Item pickup: quick rising blip.
  pickup: (ctx, dest, t0) =>
    tone(ctx, dest, t0, { type: 'sine', f0: 660, f1: 990, dur: 0.12, peak: 0.4 }),

  // Craft success: two-note chime.
  craft: (ctx, dest, t0) => {
    tone(ctx, dest, t0, { type: 'square', f0: 520, f1: 520, dur: 0.1, peak: 0.3 });
    tone(ctx, dest, t0 + 0.1, { type: 'square', f0: 780, f1: 780, dur: 0.14, peak: 0.3 });
  },

  // Generic test beep.
  test: (ctx, dest, t0) =>
    tone(ctx, dest, t0, { type: 'sine', f0: 440, f1: 440, dur: 0.2, peak: 0.4 }),

  // Eating: short, light two-note "nom" blip — bright sine, quick rise, so a
  // successful bite reads as a positive, satisfying cue without being harsh.
  eat: (ctx, dest, t0) => {
    tone(ctx, dest, t0, { type: 'sine', f0: 520, f1: 680, dur: 0.07, peak: 0.35 });
    tone(ctx, dest, t0 + 0.08, { type: 'sine', f0: 760, f1: 920, dur: 0.09, peak: 0.35 });
  },
};
