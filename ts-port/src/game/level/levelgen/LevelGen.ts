/**
 * Port of level/levelgen/LevelGen.java — diamond-square noise + tile assembly.
 *
 * Uses Math.random() directly, exactly like the GWT source (which also calls
 * Math.random()). All generated tile ids reference the Tile registry.
 */
import { Tile } from '../tile/Tile';

export class LevelGen {
  public values: number[];
  private w: number;
  private h: number;

  private static getRandomDouble(): number {
    return Math.random();
  }

  private static getRandomInt(max: number): number {
    return Math.floor(Math.random() * max);
  }

  constructor(w: number, h: number, featureSize: number) {
    this.w = w;
    this.h = h;
    this.values = new Array(w * h).fill(0);

    for (let y = 0; y < w; y += featureSize) {
      for (let x = 0; x < w; x += featureSize) {
        this.setSample(x, y, LevelGen.getRandomDouble() * 2 - 1);
      }
    }

    let stepSize = featureSize;
    let scale = 1.0 / w;
    let scaleMod = 1;
    do {
      const halfStep = stepSize / 2;
      for (let y = 0; y < w; y += stepSize) {
        for (let x = 0; x < w; x += stepSize) {
          const a = this.sample(x, y);
          const b = this.sample(x + stepSize, y);
          const c = this.sample(x, y + stepSize);
          const d = this.sample(x + stepSize, y + stepSize);
          const e = (a + b + c + d) / 4.0 + (LevelGen.getRandomDouble() * 2 - 1) * stepSize * scale;
          this.setSample(x + halfStep, y + halfStep, e);
        }
      }
      for (let y = 0; y < w; y += stepSize) {
        for (let x = 0; x < w; x += stepSize) {
          const a = this.sample(x, y);
          const b = this.sample(x + stepSize, y);
          const c = this.sample(x, y + stepSize);
          const d = this.sample(x + halfStep, y + halfStep);
          const e = this.sample(x + halfStep, y - halfStep);
          const f = this.sample(x - halfStep, y + halfStep);
          const H = (a + b + d + e) / 4.0 + (LevelGen.getRandomDouble() * 2 - 1) * stepSize * scale * 0.5;
          const g = (a + c + d + f) / 4.0 + (LevelGen.getRandomDouble() * 2 - 1) * stepSize * scale * 0.5;
          this.setSample(x + halfStep, y, H);
          this.setSample(x, y + halfStep, g);
        }
      }
      stepSize /= 2;
      scale *= scaleMod + 0.8;
      scaleMod *= 0.3;
    } while (stepSize > 1);
  }

  private sample(x: number, y: number): number {
    return this.values[(x & (this.w - 1)) + (y & (this.h - 1)) * this.w];
  }

  private setSample(x: number, y: number, value: number): void {
    this.values[(x & (this.w - 1)) + (y & (this.h - 1)) * this.w] = value;
  }

  public static createAndValidateTopMap(w: number, h: number): [Uint8Array, Uint8Array] {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = LevelGen.createTopMap(w, h);
      const count = new Array(256).fill(0);
      for (let i = 0; i < w * h; i++) count[result[0][i] & 0xff]++;
      if (count[Tile.rock.id & 0xff] < 100) continue;
      if (count[Tile.sand.id & 0xff] < 100) continue;
      if (count[Tile.grass.id & 0xff] < 100) continue;
      if (count[Tile.tree.id & 0xff] < 100) continue;
      if (count[Tile.stairsDown.id & 0xff] < 2) continue;
      return result;
    }
  }

  public static createAndValidateUndergroundMap(w: number, h: number, depth: number): [Uint8Array, Uint8Array] {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = LevelGen.createUndergroundMap(w, h, depth);
      const count = new Array(256).fill(0);
      for (let i = 0; i < w * h; i++) count[result[0][i] & 0xff]++;
      if (count[Tile.rock.id & 0xff] < 100) continue;
      if (count[Tile.dirt.id & 0xff] < 100) continue;
      if (count[(Tile.ironOre.id & 0xff) + depth - 1] < 20) continue;
      if (depth < 3 && count[Tile.stairsDown.id & 0xff] < 2) continue;
      return result;
    }
  }

  public static createAndValidateSkyMap(w: number, h: number): [Uint8Array, Uint8Array] {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = LevelGen.createSkyMap(w, h);
      const count = new Array(256).fill(0);
      for (let i = 0; i < w * h; i++) count[result[0][i] & 0xff]++;
      if (count[Tile.cloud.id & 0xff] < 2000) continue;
      if (count[Tile.stairsDown.id & 0xff] < 2) continue;
      return result;
    }
  }

  private static createTopMap(w: number, h: number): [Uint8Array, Uint8Array] {
    const mnoise1 = new LevelGen(w, h, 16);
    const mnoise2 = new LevelGen(w, h, 16);
    const mnoise3 = new LevelGen(w, h, 16);
    const noise1 = new LevelGen(w, h, 32);
    const noise2 = new LevelGen(w, h, 32);

    const map = new Uint8Array(w * h);
    const data = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = x + y * w;
        const val = Math.abs(noise1.values[i] - noise2.values[i]) * 3 - 2;
        const mval = Math.abs(mnoise1.values[i] - mnoise2.values[i]);
        const mval2 = Math.abs(mval - mnoise3.values[i]) * 3 - 2;
        let xd = x / (w - 1.0) * 2 - 1;
        let yd = y / (h - 1.0) * 2 - 1;
        if (xd < 0) xd = -xd;
        if (yd < 0) yd = -yd;
        let dist = xd >= yd ? xd : yd;
        dist = dist * dist * dist * dist;
        dist = dist * dist * dist * dist;
        const v = val + 1 - dist * 20;

        if (v < -0.5) map[i] = Tile.water.id;
        else if (v > 0.5 && mval2 < -1.5) map[i] = Tile.rock.id;
        else map[i] = Tile.grass.id;
      }
    }

    for (let i = 0; i < (w * h) / 2800; i++) {
      const xs = LevelGen.getRandomInt(w);
      const ys = LevelGen.getRandomInt(h);
      for (let k = 0; k < 10; k++) {
        const x = xs + LevelGen.getRandomInt(21) - 10;
        const y = ys + LevelGen.getRandomInt(21) - 10;
        for (let j = 0; j < 100; j++) {
          const xo = x + LevelGen.getRandomInt(5) - LevelGen.getRandomInt(5);
          const yo = y + LevelGen.getRandomInt(5) - LevelGen.getRandomInt(5);
          for (let yy = yo - 1; yy <= yo + 1; yy++) {
            for (let xx = xo - 1; xx <= xo + 1; xx++) {
              if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
                if (map[xx + yy * w] === Tile.grass.id) map[xx + yy * w] = Tile.sand.id;
              }
            }
          }
        }
      }
    }

    for (let i = 0; i < (w * h) / 400; i++) {
      const x = LevelGen.getRandomInt(w);
      const y = LevelGen.getRandomInt(h);
      for (let j = 0; j < 200; j++) {
        const xx = x + LevelGen.getRandomInt(15) - LevelGen.getRandomInt(15);
        const yy = y + LevelGen.getRandomInt(15) - LevelGen.getRandomInt(15);
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
          if (map[xx + yy * w] === Tile.grass.id) map[xx + yy * w] = Tile.tree.id;
        }
      }
    }

    for (let i = 0; i < (w * h) / 400; i++) {
      const x = LevelGen.getRandomInt(w);
      const y = LevelGen.getRandomInt(h);
      const col = LevelGen.getRandomInt(4);
      for (let j = 0; j < 30; j++) {
        const xx = x + LevelGen.getRandomInt(5) - LevelGen.getRandomInt(5);
        const yy = y + LevelGen.getRandomInt(5) - LevelGen.getRandomInt(5);
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
          if (map[xx + yy * w] === Tile.grass.id) {
            map[xx + yy * w] = Tile.flower.id;
            data[xx + yy * w] = (col + LevelGen.getRandomInt(4) * 16) & 0xff;
          }
        }
      }
    }

    for (let i = 0; i < (w * h) / 100; i++) {
      const xx = LevelGen.getRandomInt(w);
      const yy = LevelGen.getRandomInt(h);
      if (xx >= 0 && yy >= 0 && xx < w && yy < h) {
        if (map[xx + yy * w] === Tile.sand.id) map[xx + yy * w] = Tile.cactus.id;
      }
    }

    let count = 0;
    stairsLoop: for (let i = 0; i < (w * h) / 100; i++) {
      const x = LevelGen.getRandomInt(w - 2) + 1;
      const y = LevelGen.getRandomInt(h - 2) + 1;
      for (let yy = y - 1; yy <= y + 1; yy++) {
        for (let xx = x - 1; xx <= x + 1; xx++) {
          if (map[xx + yy * w] !== Tile.rock.id) continue stairsLoop;
        }
      }
      map[x + y * w] = Tile.stairsDown.id;
      count++;
      if (count === 4) break;
    }

    return [map, data];
  }

  private static createUndergroundMap(w: number, h: number, depth: number): [Uint8Array, Uint8Array] {
    const mnoise1 = new LevelGen(w, h, 16);
    const mnoise2 = new LevelGen(w, h, 16);
    const mnoise3 = new LevelGen(w, h, 16);
    const nnoise1 = new LevelGen(w, h, 16);
    const nnoise2 = new LevelGen(w, h, 16);
    const nnoise3 = new LevelGen(w, h, 16);
    const wnoise3 = new LevelGen(w, h, 16);
    const noise1 = new LevelGen(w, h, 32);
    const noise2 = new LevelGen(w, h, 32);

    const map = new Uint8Array(w * h);
    const data = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = x + y * w;
        const val = Math.abs(noise1.values[i] - noise2.values[i]) * 3 - 2;
        const mval = Math.abs(mnoise1.values[i] - mnoise2.values[i]);
        const mval2 = Math.abs(mval - mnoise3.values[i]) * 3 - 2;
        const nval = Math.abs(nnoise1.values[i] - nnoise2.values[i]);
        const nval2 = Math.abs(nval - nnoise3.values[i]) * 3 - 2;
        const wval2 = Math.abs(nval2 - wnoise3.values[i]) * 3 - 2;

        let xd = x / (w - 1.0) * 2 - 1;
        let yd = y / (h - 1.0) * 2 - 1;
        if (xd < 0) xd = -xd;
        if (yd < 0) yd = -yd;
        let dist = xd >= yd ? xd : yd;
        dist = dist * dist * dist * dist;
        dist = dist * dist * dist * dist;
        const v = val + 1 - dist * 20;

        if (v > -2 && wval2 < -2.0 + (depth / 2) * 3) {
          map[i] = depth > 2 ? Tile.lava.id : Tile.water.id;
        } else if (v > -2 && (mval2 < -1.7 || nval2 < -1.4)) {
          map[i] = Tile.dirt.id;
        } else {
          map[i] = Tile.rock.id;
        }
      }
    }

    {
      const r = 2;
      for (let i = 0; i < (w * h) / 400; i++) {
        const x = LevelGen.getRandomInt(w);
        const y = LevelGen.getRandomInt(h);
        for (let j = 0; j < 30; j++) {
          const xx = x + LevelGen.getRandomInt(5) - LevelGen.getRandomInt(5);
          const yy = y + LevelGen.getRandomInt(5) - LevelGen.getRandomInt(5);
          if (xx >= r && yy >= r && xx < w - r && yy < h - r) {
            if (map[xx + yy * w] === Tile.rock.id) {
              map[xx + yy * w] = ((Tile.ironOre.id & 0xff) + depth - 1) & 0xff;
            }
          }
        }
      }
    }

    if (depth < 3) {
      let cnt = 0;
      stairsLoop: for (let i = 0; i < (w * h) / 100; i++) {
        const x = LevelGen.getRandomInt(w - 20) + 10;
        const y = LevelGen.getRandomInt(h - 20) + 10;
        for (let yy = y - 1; yy <= y + 1; yy++) {
          for (let xx = x - 1; xx <= x + 1; xx++) {
            if (map[xx + yy * w] !== Tile.rock.id) continue stairsLoop;
          }
        }
        map[x + y * w] = Tile.stairsDown.id;
        cnt++;
        if (cnt === 4) break;
      }
    }

    return [map, data];
  }

  private static createSkyMap(w: number, h: number): [Uint8Array, Uint8Array] {
    const noise1 = new LevelGen(w, h, 8);
    const noise2 = new LevelGen(w, h, 8);

    const map = new Uint8Array(w * h);
    const data = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = x + y * w;
        const val = Math.abs(noise1.values[i] - noise2.values[i]) * 3 - 2;
        let xd = x / (w - 1.0) * 2 - 1;
        let yd = y / (h - 1.0) * 2 - 1;
        if (xd < 0) xd = -xd;
        if (yd < 0) yd = -yd;
        let dist = xd >= yd ? xd : yd;
        dist = dist * dist * dist * dist;
        dist = dist * dist * dist * dist;
        const v = -val * 1 - 2.2;
        const vv = v + 1 - dist * 20;
        if (vv < -0.25) map[i] = Tile.infiniteFall.id;
        else map[i] = Tile.cloud.id;
      }
    }

    stairsLoopC: for (let i = 0; i < (w * h) / 50; i++) {
      const x = LevelGen.getRandomInt(w - 2) + 1;
      const y = LevelGen.getRandomInt(h - 2) + 1;
      for (let yy = y - 1; yy <= y + 1; yy++) {
        for (let xx = x - 1; xx <= x + 1; xx++) {
          if (map[xx + yy * w] !== Tile.cloud.id) continue stairsLoopC;
        }
      }
      map[x + y * w] = Tile.cloudCactus.id;
    }

    let count = 0;
    stairsLoopD: for (let i = 0; i < w * h; i++) {
      const x = LevelGen.getRandomInt(w - 2) + 1;
      const y = LevelGen.getRandomInt(h - 2) + 1;
      for (let yy = y - 1; yy <= y + 1; yy++) {
        for (let xx = x - 1; xx <= x + 1; xx++) {
          if (map[xx + yy * w] !== Tile.cloud.id) continue stairsLoopD;
        }
      }
      map[x + y * w] = Tile.stairsDown.id;
      count++;
      if (count === 2) break;
    }

    return [map, data];
  }
}
