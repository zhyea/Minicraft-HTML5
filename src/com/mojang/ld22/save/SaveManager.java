package com.mojang.ld22.save;

import com.google.gwt.json.client.JSONArray;
import com.google.gwt.json.client.JSONNumber;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONParser;
import com.google.gwt.json.client.JSONString;
import com.mojang.ld22.Game;
import com.mojang.ld22.entity.Entity;
import com.mojang.ld22.entity.Player;
import com.mojang.ld22.entity.Spark;
import com.mojang.ld22.level.Level;

/**
 * Orchestrates (de)serialization of the whole game into a single JSON document.
 *
 * <p>Document shape (see docs/architecture/save-system-plan.md §3 / 附录 A):
 * <pre>
 * {
 *   "schemaVersion": 1,
 *   "gameTime": int,
 *   "currentLevel": int,
 *   "levels": [ {depth,w,h,tiles(base64),data(base64),entities[]} x5 ],
 *   "player": { ... }
 * }
 * </pre>
 *
 * <p>Throws {@link RuntimeException} on a version mismatch or malformed JSON so
 * the caller ({@link Game#loadGame()}) can fall back to a fresh world.
 */
public final class SaveManager {

    public static final int SCHEMA_VERSION = 1;

    private SaveManager() {
    }

    public static String toJson(Game game) {
        JSONObject root = new JSONObject();
        root.put("schemaVersion", new JSONNumber(SCHEMA_VERSION));
        root.put("gameTime", new JSONNumber(game.gameTime));
        root.put("currentLevel", new JSONNumber(game.currentLevel));

        JSONArray levels = new JSONArray();
        for (int i = 0; i < 5; i++) {
            Level lv = game.levels[i];
            JSONObject lo = new JSONObject();
            lo.put("depth", new JSONNumber(lv.depth));
            lo.put("w", new JSONNumber(lv.w));
            lo.put("h", new JSONNumber(lv.h));
            lo.put("tiles", new JSONString(SaveStore.base64Encode(lv.tiles)));
            lo.put("data", new JSONString(SaveStore.base64Encode(lv.data)));

            JSONArray ents = new JSONArray();
            int idx = 0;
            for (int j = 0; j < lv.entities.size(); j++) {
                Entity e = lv.entities.get(j);
                if (e instanceof Spark) continue; // transient projectile, never persisted
                if (e instanceof Player) continue; // player is serialized at root, not per-level
                ents.set(idx++, EntityIO.write(e));
            }
            lo.put("entities", ents);
            levels.set(i, lo);
        }
        root.put("levels", levels);
        root.put("player", EntityIO.write(game.player));
        return root.toString();
    }

    public static void fromJson(Game game, String json) {
        JSONObject root = JSONParser.parseStrict(json).isObject();
        if (root == null) throw new RuntimeException("save root is not an object");

        int ver = (int) root.get("schemaVersion").isNumber().doubleValue();
        if (ver != SCHEMA_VERSION) {
            // Cross-major / unsupported version: caller discards and restarts.
            throw new RuntimeException("unsupported save schema version: " + ver);
        }

        game.gameTime = (int) root.get("gameTime").isNumber().doubleValue();
        game.currentLevel = (int) root.get("currentLevel").isNumber().doubleValue();

        JSONArray levels = root.get("levels").isArray();
        for (int i = 0; i < 5; i++) {
            JSONObject lo = levels.get(i).isObject();
            int w = (int) lo.get("w").isNumber().doubleValue();
            int h = (int) lo.get("h").isNumber().doubleValue();
            int depth = (int) lo.get("depth").isNumber().doubleValue();
            byte[] tiles = SaveStore.base64Decode(lo.get("tiles").isString().stringValue());
            byte[] data = SaveStore.base64Decode(lo.get("data").isString().stringValue());

            Level lv = Level.fromSave(w, h, depth, tiles, data);

            JSONArray ents = lo.get("entities").isArray();
            for (int j = 0; j < ents.size(); j++) {
                Entity e = EntityIO.read(ents.get(j).isObject(), game);
                if (e != null && !(e instanceof Player)) lv.add(e); // sets level/player refs + spatial hash
            }
            game.levels[i] = lv;
        }

        // Rebuild the player WITHOUT seeding starting items, then fill inventory.
        Player player = (Player) EntityIO.read(root.get("player").isObject(), game);
        game.player = player;

        // game.level / wiring is finalised by Game.loadGame() (private field).
    }
}
