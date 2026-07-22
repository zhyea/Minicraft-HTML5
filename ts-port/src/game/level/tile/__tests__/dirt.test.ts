// @vitest-environment jsdom
//
// A real `Level` is required to exercise DirtTile.interact() faithfully, and
// `Level` transitively imports `Game` (via Player). The project pins engine
// tests to the default node env, so we opt this single file into jsdom using
// the documented `// @vitest-environment` pragma (see vite.config.ts).
import { describe, it, expect, beforeAll } from 'vitest';
import { Tile } from '../Tile';
import { Level } from '../../Level';
import { Player } from '../../../entity/Player';
import { ToolItem } from '../../../item/ToolItem';
import { ToolType } from '../../../item/ToolType';
import { ItemEntity } from '../../../entity/ItemEntity';
import { ResourceItem } from '../../../item/ResourceItem';
import { Resource } from '../../../item/resource/Resource';
import { installTiles } from '../registry';
import { installResources } from '../../../item/resource/registry';

beforeAll(() => {
  // Tile / Resource statics are null until these run; interact() reads them.
  installTiles();
  installResources();
});

/** Build a fresh Player. Game/InputHandler are never dereferenced by the code
 *  under test (only Player.payStamina is used), so lightweight stubs are safe.
 *  Stamina defaults to maxStamina (10), which covers the cost (4 - level). */
function makePlayer(): Player {
  return new Player(null as unknown as any, null as unknown as any, false);
}

function makeLevel(): Level {
  return Level.fromSave(16, 16, 0, new Uint8Array(16 * 16), new Uint8Array(16 * 16));
}

describe('DirtTile.interact (P1-B: dig / till directly)', () => {
  it('digs a hole with a shovel and drops a dirt resource', () => {
    const level = makeLevel();
    const x = 3;
    const y = 4;
    level.setTile(x, y, Tile.dirt, 0);

    const player = makePlayer();
    const shovel = new ToolItem(ToolType.shovel, 0);

    const result = Tile.dirt.interact(level, x, y, player, shovel, 0);

    expect(result).toBe(true);
    expect(level.getTile(x, y)).toBe(Tile.hole);
    const dropped = level.entities.find(
      (e) => e instanceof ItemEntity && (e as ItemEntity).item.resource === Resource.dirt,
    );
    expect(dropped).toBeDefined();
  });

  it('tills to farmland with a hoe', () => {
    const level = makeLevel();
    const x = 5;
    const y = 6;
    level.setTile(x, y, Tile.dirt, 0);

    const player = makePlayer();
    const hoe = new ToolItem(ToolType.hoe, 0);

    const result = Tile.dirt.interact(level, x, y, player, hoe, 0);

    expect(result).toBe(true);
    expect(level.getTile(x, y)).toBe(Tile.farmland);
  });

  it('is a no-op for a non-tool item (returns false, tile unchanged)', () => {
    const level = makeLevel();
    const x = 7;
    const y = 8;
    level.setTile(x, y, Tile.dirt, 0);

    const player = makePlayer();
    const notATool = new ResourceItem(Resource.dirt, 1); // an Item, but not a ToolItem

    const result = Tile.dirt.interact(level, x, y, player, notATool, 0);

    expect(result).toBe(false);
    expect(level.getTile(x, y)).toBe(Tile.dirt);
  });
});
