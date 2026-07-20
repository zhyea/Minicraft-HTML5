/**
 * Minimal RNG used to replace Java's `java.util.Random` in the ported logic.
 *
 * It is a 32-bit linear-congruential generator — close enough to Java's 48-bit
 * generator for visual variety (water shimmer, spawn scatter, tile transitions)
 * and, crucially, supports `setSeed` so WaterTile's deterministic shimmer is
 * preserved. World generation in LevelGen uses Math.random() directly (matches
 * the GWT source, which also calls Math.random()).
 */
export class Rand {
  private seed: number;

  constructor(seed?: number) {
    this.seed = (seed ?? (Date.now() & 0xffffffff)) >>> 0;
  }

  setSeed(s: number): void {
    this.seed = (s ^ 0x5deece66d) >>> 0;
  }

  /** Next float in [0, 1). */
  next(): number {
    // 32-bit LCG step.
    this.seed = (Math.imul(this.seed, 0x5deece66d) + 0xb) >>> 0;
    return (this.seed >>> 8) / 0x100000000;
  }

  nextInt(bound: number): number {
    if (bound <= 0) return 0;
    return Math.floor(this.next() * bound);
  }

  nextBoolean(): boolean {
    return this.next() < 0.5;
  }

  /** Standard normal via Box-Muller — mirrors java.util.Random.nextGaussian(). */
  nextGaussian(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = this.next();
    while (v === 0) v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
}
