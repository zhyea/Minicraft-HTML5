package com.mojang.ld22.save;

import com.google.gwt.json.client.JSONArray;
import com.google.gwt.json.client.JSONNull;
import com.google.gwt.json.client.JSONNumber;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONString;
import com.google.gwt.json.client.JSONValue;
import com.mojang.ld22.Game;
import com.mojang.ld22.entity.AirWizard;
import com.mojang.ld22.entity.Anvil;
import com.mojang.ld22.entity.Chest;
import com.mojang.ld22.entity.Entity;
import com.mojang.ld22.entity.Furniture;
import com.mojang.ld22.entity.Inventory;
import com.mojang.ld22.entity.ItemEntity;
import com.mojang.ld22.entity.Lantern;
import com.mojang.ld22.entity.Mob;
import com.mojang.ld22.entity.Oven;
import com.mojang.ld22.entity.Player;
import com.mojang.ld22.entity.Slime;
import com.mojang.ld22.entity.Workbench;
import com.mojang.ld22.entity.Zombie;
import com.mojang.ld22.item.Item;

/**
 * Multi-type serializer/deserializer for the entities that are persisted.
 *
 * <p>typeId assignment: 1=Player, 2=Zombie, 3=Slime, 4=AirWizard,
 * 6=Chest, 7=Workbench, 8=Anvil, 9=Furnace, 10=Oven, 11=Lantern, 12=ItemEntity.
 * (5 and 13+ reserved; {@code Spark} is intentionally never written.)
 *
 * <p>When a new serializable entity is added, it MUST be registered here with a
 * stable typeId and covered by a round-trip test.
 */
public final class EntityIO {

    private EntityIO() {
    }

    // ------------------------------------------------------------------
    // WRITE
    // ------------------------------------------------------------------

    public static JSONObject write(Entity e) {
        JSONObject o = new JSONObject();
        if (e instanceof Player) {
            o.put("typeId", new JSONNumber(1));
            writeMob((Mob) e, o);
            writePlayer((Player) e, o);
        } else if (e instanceof Zombie) {
            o.put("typeId", new JSONNumber(2));
            writeMob((Mob) e, o);
            o.put("lvl", new JSONNumber(((Zombie) e).lvl));
        } else if (e instanceof Slime) {
            o.put("typeId", new JSONNumber(3));
            writeMob((Mob) e, o);
            o.put("lvl", new JSONNumber(((Slime) e).lvl));
        } else if (e instanceof AirWizard) {
            o.put("typeId", new JSONNumber(4));
            writeMob((Mob) e, o);
        } else if (e instanceof Chest) {
            o.put("typeId", new JSONNumber(6));
            writeFurniture(e, o);
            writeInventory(((Chest) e).inventory, o);
        } else if (e instanceof Workbench) {
            o.put("typeId", new JSONNumber(7));
            writeFurniture(e, o);
        } else if (e instanceof Anvil) {
            o.put("typeId", new JSONNumber(8));
            writeFurniture(e, o);
        } else if (e instanceof Furnace) {
            o.put("typeId", new JSONNumber(9));
            writeFurniture(e, o);
        } else if (e instanceof Oven) {
            o.put("typeId", new JSONNumber(10));
            writeFurniture(e, o);
        } else if (e instanceof Lantern) {
            o.put("typeId", new JSONNumber(11));
            writeFurniture(e, o);
        } else if (e instanceof ItemEntity) {
            o.put("typeId", new JSONNumber(12));
            writeEntityBase(e, o);
            o.put("item", ItemIO.write(((ItemEntity) e).item));
            o.put("lifeTime", new JSONNumber(((ItemEntity) e).lifeTime));
            o.put("time", new JSONNumber(((ItemEntity) e).time));
        }
        return o;
    }

    private static void writeEntityBase(Entity e, JSONObject o) {
        o.put("x", new JSONNumber(e.x));
        o.put("y", new JSONNumber(e.y));
        o.put("xr", new JSONNumber(e.xr));
        o.put("yr", new JSONNumber(e.yr));
    }

    private static void writeMob(Mob m, JSONObject o) {
        writeEntityBase(m, o);
        o.put("walkDist", new JSONNumber(m.walkDist));
        o.put("dir", new JSONNumber(m.dir));
        o.put("hurtTime", new JSONNumber(m.hurtTime));
        o.put("xKnockback", new JSONNumber(m.xKnockback));
        o.put("yKnockback", new JSONNumber(m.yKnockback));
        o.put("maxHealth", new JSONNumber(m.maxHealth));
        o.put("health", new JSONNumber(m.health));
        o.put("swimTimer", new JSONNumber(m.swimTimer));
        o.put("tickTime", new JSONNumber(m.tickTime));
    }

    private static void writeFurniture(Entity e, JSONObject o) {
        writeEntityBase(e, o);
        Furniture f = (Furniture) e;
        o.put("name", new JSONString(f.name));
        o.put("col", new JSONNumber(f.col));
        o.put("sprite", new JSONNumber(f.sprite));
        o.put("pushTime", new JSONNumber(f.pushTime));
        o.put("pushDir", new JSONNumber(f.pushDir));
    }

    private static void writePlayer(Player p, JSONObject o) {
        writeInventory(p.inventory, o);
        o.put("attackItem", p.attackItem == null ? JSONNull.getInstance() : ItemIO.write(p.attackItem));
        o.put("activeItem", p.activeItem == null ? JSONNull.getInstance() : ItemIO.write(p.activeItem));
        o.put("stamina", new JSONNumber(p.stamina));
        o.put("staminaRecharge", new JSONNumber(p.staminaRecharge));
        o.put("staminaRechargeDelay", new JSONNumber(p.staminaRechargeDelay));
        o.put("score", new JSONNumber(p.score));
        o.put("maxStamina", new JSONNumber(p.maxStamina));
        o.put("invulnerableTime", new JSONNumber(p.invulnerableTime));
    }

    private static void writeInventory(Inventory inv, JSONObject o) {
        JSONArray arr = new JSONArray();
        for (int i = 0; i < inv.items.size(); i++) {
            arr.set(i, ItemIO.write(inv.items.get(i)));
        }
        o.put("inventory", arr);
    }

    // ------------------------------------------------------------------
    // READ
    // ------------------------------------------------------------------

    public static Entity read(JSONObject o, Game game) {
        if (o == null) return null;
        int typeId = (int) o.get("typeId").isNumber().doubleValue();
        switch (typeId) {
            case 1: {
                Player p = new Player(game, game.input, false); // do NOT re-seed starting items
                readMob(p, o);
                readPlayer(p, o);
                return p;
            }
            case 2: {
                Zombie z = new Zombie(1);
                readMob(z, o);
                z.lvl = (int) o.get("lvl").isNumber().doubleValue();
                return z;
            }
            case 3: {
                Slime s = new Slime(1);
                readMob(s, o);
                s.lvl = (int) o.get("lvl").isNumber().doubleValue();
                return s;
            }
            case 4: {
                AirWizard a = new AirWizard();
                readMob(a, o);
                return a;
            }
            case 6: {
                Chest c = new Chest();
                readFurniture(c, o);
                readInventory(c.inventory, o);
                return c;
            }
            case 7:
                return new Workbench();
            case 8:
                return new Anvil();
            case 9:
                return new Furnace();
            case 10:
                return new Oven();
            case 11:
                return new Lantern();
            case 12: {
                Item it = ItemIO.read(o.get("item").isObject());
                if (it == null) return null; // unresolvable drop item: skip this entity
                ItemEntity ie = new ItemEntity(it, 0, 0);
                readEntityBase(ie, o);
                ie.lifeTime = (int) o.get("lifeTime").isNumber().doubleValue();
                ie.time = (int) o.get("time").isNumber().doubleValue();
                return ie;
            }
            default:
                return null;
        }
    }

    private static void readEntityBase(Entity e, JSONObject o) {
        e.x = (int) o.get("x").isNumber().doubleValue();
        e.y = (int) o.get("y").isNumber().doubleValue();
        e.xr = (int) o.get("xr").isNumber().doubleValue();
        e.yr = (int) o.get("yr").isNumber().doubleValue();
    }

    private static void readMob(Mob m, JSONObject o) {
        readEntityBase(m, o);
        m.walkDist = (int) o.get("walkDist").isNumber().doubleValue();
        m.dir = (int) o.get("dir").isNumber().doubleValue();
        m.hurtTime = (int) o.get("hurtTime").isNumber().doubleValue();
        m.xKnockback = (int) o.get("xKnockback").isNumber().doubleValue();
        m.yKnockback = (int) o.get("yKnockback").isNumber().doubleValue();
        m.maxHealth = (int) o.get("maxHealth").isNumber().doubleValue();
        m.health = (int) o.get("health").isNumber().doubleValue();
        m.swimTimer = (int) o.get("swimTimer").isNumber().doubleValue();
        m.tickTime = (int) o.get("tickTime").isNumber().doubleValue();
    }

    private static void readFurniture(Furniture f, JSONObject o) {
        readEntityBase(f, o);
        f.name = o.get("name").isString().stringValue();
        f.col = (int) o.get("col").isNumber().doubleValue();
        f.sprite = (int) o.get("sprite").isNumber().doubleValue();
        f.pushTime = (int) o.get("pushTime").isNumber().doubleValue();
        f.pushDir = (int) o.get("pushDir").isNumber().doubleValue();
    }

    private static void readPlayer(Player p, JSONObject o) {
        readInventory(p.inventory, o);
        JSONValue atk = o.get("attackItem");
        p.attackItem = (atk == null || atk.isNull() != null) ? null : ItemIO.read(atk.isObject());
        JSONValue act = o.get("activeItem");
        p.activeItem = (act == null || act.isNull() != null) ? null : ItemIO.read(act.isObject());
        p.stamina = (int) o.get("stamina").isNumber().doubleValue();
        p.staminaRecharge = (int) o.get("staminaRecharge").isNumber().doubleValue();
        p.staminaRechargeDelay = (int) o.get("staminaRechargeDelay").isNumber().doubleValue();
        p.score = (int) o.get("score").isNumber().doubleValue();
        p.maxStamina = (int) o.get("maxStamina").isNumber().doubleValue();
        p.invulnerableTime = (int) o.get("invulnerableTime").isNumber().doubleValue();
    }

    private static void readInventory(Inventory inv, JSONObject o) {
        JSONArray arr = o.get("inventory").isArray();
        if (arr == null) return;
        for (int i = 0; i < arr.size(); i++) {
            JSONValue v = arr.get(i);
            if (v == null || v.isNull() != null) continue;
            Item it = ItemIO.read(v.isObject());
            if (it != null) inv.items.add(it); // add directly: preserve order & stacks
        }
    }
}
