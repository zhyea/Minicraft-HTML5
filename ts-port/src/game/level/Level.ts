/**
 * Port of level/Level.java.
 *
 * Faithful render/tick/add/remove logic. Mob spawning is restored: trySpawn()
 * is a faithful port of Java `Level.trySpawn(int)`, and tick() calls it once
 * per tick (trySpawn(1)) exactly as the original does. Game.startNewGame()
 * floods each level to its density cap (the original used trySpawn(5000)),
 * so the world is populated from the first frame rather than staying empty.
 */
import type { Screen } from '../../engine/Screen';
import { Tile } from './tile/Tile';
import { LevelGen } from './levelgen/LevelGen';
import type { Entity } from '../entity/Entity';
import type { Mob } from '../entity/Mob';
import { Player } from '../entity/Player';
import { AirWizard } from '../entity/AirWizard';
import { Zombie } from '../entity/Zombie';
import { Slime } from '../entity/Slime';

export class Level {
  public w: number;
  public h: number;

  public tiles: Uint8Array;
  public data: Uint8Array;
  public entitiesInTiles: Entity[][];

  public grassColor = 141;
  public dirtColor = 322;
  public sandColor = 550;
  private depth: number;
  public monsterDensity = 8;

  public entities: Entity[] = [];
  public player: Player | null = null;

  private spriteSorter = (e0: Entity, e1: Entity): number => {
    if (e1.y < e0.y) return 1;
    if (e1.y > e0.y) return -1;
    return 0;
  };

  constructor(w: number, h: number, level: number, parentLevel: Level | null, skipGen = false) {
    // dirtColor / monsterDensity rules apply for BOTH fresh worlds and
    // fromSave() rebuilds, so they run before the skipGen early-return.
    if (level < 0) this.dirtColor = 222;
    if (level === 1) this.dirtColor = 444;
    this.depth = level;
    this.w = w;
    this.h = h;

    if (skipGen) {
      // fromSave() path: tiles/data are supplied by the caller, no generation,
      // no AirWizard spawn. Build only the (empty) entity buckets.
      this.tiles = new Uint8Array(w * h);
      this.data = new Uint8Array(w * h);
      this.entitiesInTiles = new Array(w * h);
      for (let i = 0; i < w * h; i++) this.entitiesInTiles[i] = [];
      if (level < 0 || level === 1) this.monsterDensity = 4;
      return;
    }

    let maps: [Uint8Array, Uint8Array];

    if (level === 0) maps = LevelGen.createAndValidateTopMap(w, h);
    else if (level < 0) {
      maps = LevelGen.createAndValidateUndergroundMap(w, h, -level);
      this.monsterDensity = 4;
    } else {
      maps = LevelGen.createAndValidateSkyMap(w, h);
      this.monsterDensity = 4;
    }

    this.tiles = maps[0];
    this.data = maps[1];

    if (parentLevel != null) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (parentLevel.getTile(x, y) === Tile.stairsDown) {
            this.setTile(x, y, Tile.stairsUp, 0);
            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1], [1, -1], [1, 1]]) {
              this.setTile(x + dx, y + dy, this.depth === 0 ? Tile.hardRock : Tile.dirt, 0);
            }
          }
        }
      }
    }

    this.entitiesInTiles = new Array(w * h);
    for (let i = 0; i < w * h; i++) this.entitiesInTiles[i] = [];

    // Sky level (level === 1) spawns the AirWizard boss, exactly as Java.
    if (level === 1) {
      const aw = new AirWizard();
      aw.x = w * 8;
      aw.y = h * 8;
      this.add(aw);
    }
  }

  /**
   * Rebuild a Level from saved tiles/data WITHOUT regenerating the world and
   * WITHOUT auto-spawning the AirWizard (a surviving boss, if any, is restored
   * by SaveManager via the entity list). dirtColor/monsterDensity are recomputed
   * from `level` using the exact same rules as the normal constructor.
   */
  public static fromSave(
    w: number,
    h: number,
    level: number,
    tiles: Uint8Array,
    data: Uint8Array,
  ): Level {
    const l = new Level(w, h, level, null, true);
    l.depth = level; // private, but reachable within the class
    l.tiles = tiles;
    l.data = data;
    return l;
  }

  public renderBackground(screen: Screen, xScroll: number, yScroll: number): void {
    const xo = xScroll >> 4;
    const yo = yScroll >> 4;
    const w = (screen.w + 15) >> 4;
    const h = (screen.h + 15) >> 4;
    screen.setOffset(xScroll, yScroll);
    for (let y = yo; y <= h + yo; y++) {
      for (let x = xo; x <= w + xo; x++) {
        this.getTile(x, y).render(screen, this, x, y);
      }
    }
    screen.setOffset(0, 0);
  }

  private rowSprites: Entity[] = [];

  public renderSprites(screen: Screen, xScroll: number, yScroll: number): void {
    const xo = xScroll >> 4;
    const yo = yScroll >> 4;
    const w = (screen.w + 15) >> 4;
    const h = (screen.h + 15) >> 4;

    screen.setOffset(xScroll, yScroll);
    for (let y = yo; y <= h + yo; y++) {
      for (let x = xo; x <= w + xo; x++) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        const list = this.entitiesInTiles[x + y * this.w];
        for (const e of list) this.rowSprites.push(e);
      }
      if (this.rowSprites.length > 0) {
        this.rowSprites.sort(this.spriteSorter);
        for (const e of this.rowSprites) e.render(screen);
        this.rowSprites.length = 0;
      }
    }
    screen.setOffset(0, 0);
  }

  public renderLight(screen: Screen, xScroll: number, yScroll: number): void {
    const xo = xScroll >> 4;
    const yo = yScroll >> 4;
    const w = (screen.w + 15) >> 4;
    const h = (screen.h + 15) >> 4;

    screen.setOffset(xScroll, yScroll);
    const r = 4;
    for (let y = yo - r; y <= h + yo + r; y++) {
      for (let x = xo - r; x <= w + xo + r; x++) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        for (const e of this.entitiesInTiles[x + y * this.w]) {
          const lr = e.getLightRadius();
          if (lr > 0) screen.renderLight(e.x - 1, e.y - 4, lr * 8);
        }
        const lr = this.getTile(x, y).getLightRadius(this, x, y);
        if (lr > 0) screen.renderLight(x * 16 + 8, y * 16 + 8, lr * 8);
      }
    }
    screen.setOffset(0, 0);
  }

  public getTile(x: number, y: number): Tile {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return Tile.rock;
    return Tile.tiles[this.tiles[x + y * this.w]] ?? Tile.rock;
  }

  public setTile(x: number, y: number, t: Tile, dataVal: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.tiles[x + y * this.w] = t.id;
    this.data[x + y * this.w] = dataVal & 0xff;
  }

  public getData(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[x + y * this.w] & 0xff;
  }

  public setData(x: number, y: number, val: number): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.data[x + y * this.w] = val & 0xff;
  }

  public add(entity: Entity): void {
    if (entity instanceof Player) {
      this.player = entity;
    }
    entity.removed = false;
    this.entities.push(entity);
    entity.init(this);
    this.insertEntity(entity.x >> 4, entity.y >> 4, entity);
  }

  public remove(e: Entity): void {
    const idx = this.entities.indexOf(e);
    if (idx >= 0) this.entities.splice(idx, 1);
    const xto = e.x >> 4;
    const yto = e.y >> 4;
    this.removeEntity(xto, yto, e);
  }

  private insertEntity(x: number, y: number, e: Entity): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.entitiesInTiles[x + y * this.w].push(e);
  }

  private removeEntity(x: number, y: number, e: Entity): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const list = this.entitiesInTiles[x + y * this.w];
    const idx = list.indexOf(e);
    if (idx >= 0) list.splice(idx, 1);
  }

  /**
   * Faithful port of Java `Level.trySpawn(int count)`: attempt to spawn `count`
   * random mobs (Slime or Zombie) at a legal start position. The mob level
   * scales with depth — surface stays lvl 1, deeper caves reach up to (-depth)+1,
   * and the sky is always lvl 4. Mob.findStartPos() self-limits density against
   * level.monsterDensity, so this never floods a level past its cap.
   */
  public trySpawn(count: number): void {
    for (let i = 0; i < count; i++) {
      let mob: Mob;

      let minLevel = 1;
      let maxLevel = 1;
      if (this.depth < 0) {
        maxLevel = -this.depth + 1;
      }
      if (this.depth > 0) {
        minLevel = 4;
        maxLevel = 4;
      }

      const lvl = Math.floor(Math.random() * (maxLevel - minLevel + 1)) + minLevel;
      if (Math.floor(Math.random() * 2) === 0) {
        mob = new Slime(lvl);
      } else {
        mob = new Zombie(lvl);
      }

      if (mob.findStartPos(this)) {
        this.add(mob);
      }
    }
  }

  public tick(): void {
    this.trySpawn(1);

    for (let i = 0; i < (this.w * this.h) / 50; i++) {
      const xt = Math.floor(Math.random() * this.w);
      const yt = Math.floor(Math.random() * this.h);
      this.getTile(xt, yt).tick(this, xt, yt);
    }
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      const xto = e.x >> 4;
      const yto = e.y >> 4;
      e.tick();
      if (e.removed) {
        this.entities.splice(i--, 1);
        this.removeEntity(xto, yto, e);
      } else {
        const xt = e.x >> 4;
        const yt = e.y >> 4;
        if (xto !== xt || yto !== yt) {
          this.removeEntity(xto, yto, e);
          this.insertEntity(xt, yt, e);
        }
      }
    }
  }

  public getEntities(x0: number, y0: number, x1: number, y1: number): Entity[] {
    const result: Entity[] = [];
    const xt0 = (x0 >> 4) - 1;
    const yt0 = (y0 >> 4) - 1;
    const xt1 = (x1 >> 4) + 1;
    const yt1 = (y1 >> 4) + 1;
    for (let y = yt0; y <= yt1; y++) {
      for (let x = xt0; x <= xt1; x++) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) continue;
        for (const e of this.entitiesInTiles[x + y * this.w]) {
          if (e.intersects(x0, y0, x1, y1)) result.push(e);
        }
      }
    }
    return result;
  }
}
