package com.mojang.ld22.save;

import com.google.gwt.json.client.JSONBoolean;
import com.google.gwt.json.client.JSONNumber;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONString;
import com.mojang.ld22.entity.Furniture;
import com.mojang.ld22.item.FurnitureItem;
import com.mojang.ld22.item.Item;
import com.mojang.ld22.item.PowerGloveItem;
import com.mojang.ld22.item.ResourceItem;
import com.mojang.ld22.item.ToolItem;
import com.mojang.ld22.item.ToolType;
import com.mojang.ld22.item.resource.Resource;

/**
 * Serializes {@link Item}s by {@code kind}, round-tripping through stable
 * name-based identifiers (Resource.name / ToolType.name / Furniture.name).
 */
public final class ItemIO {

    private ItemIO() {
    }

    public static JSONObject write(Item item) {
        JSONObject o = new JSONObject();
        if (item instanceof ResourceItem) {
            ResourceItem ri = (ResourceItem) item;
            o.put("kind", new JSONString("resource"));
            o.put("resourceName", new JSONString(ri.resource.name));
            o.put("count", new JSONNumber(ri.count));
        } else if (item instanceof ToolItem) {
            ToolItem ti = (ToolItem) item;
            o.put("kind", new JSONString("tool"));
            o.put("toolName", new JSONString(ti.type.name));
            o.put("level", new JSONNumber(ti.level));
        } else if (item instanceof FurnitureItem) {
            FurnitureItem fi = (FurnitureItem) item;
            o.put("kind", new JSONString("furniture"));
            o.put("furnitureName", new JSONString(fi.furniture.name));
            o.put("placed", JSONBoolean.getInstance(fi.placed));
        } else if (item instanceof PowerGloveItem) {
            o.put("kind", new JSONString("powerglove"));
        }
        return o;
    }

    public static Item read(JSONObject o) {
        if (o == null) return null;
        String kind = o.get("kind").isString().stringValue();
        if ("resource".equals(kind)) {
            Resource r = Resource.getByName(o.get("resourceName").isString().stringValue());
            if (r == null) return null;
            ResourceItem ri = new ResourceItem(r);
            ri.count = (int) o.get("count").isNumber().doubleValue();
            return ri;
        } else if ("tool".equals(kind)) {
            ToolType t = ToolType.getByName(o.get("toolName").isString().stringValue());
            if (t == null) return null;
            int lvl = (int) o.get("level").isNumber().doubleValue();
            return new ToolItem(t, lvl);
        } else if ("furniture".equals(kind)) {
            Furniture f = Furniture.createByName(o.get("furnitureName").isString().stringValue());
            if (f == null) return null;
            FurnitureItem fi = new FurnitureItem(f);
            fi.placed = o.get("placed").isBoolean().booleanValue();
            return fi;
        } else if ("powerglove".equals(kind)) {
            return new PowerGloveItem();
        }
        return null;
    }
}
