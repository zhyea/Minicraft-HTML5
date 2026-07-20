package com.mojang.ld22.save;

import com.google.gwt.storage.client.Storage;

/**
 * Thin wrapper around the browser {@code localStorage} (via GWT's
 * {@link Storage}) and a pure-Java Base64 codec.
 *
 * <p>Why a pure-Java Base64 codec instead of JSNI {@code btoa/atob}? This
 * module's {@code user.agent} set includes {@code ie9}, which does NOT implement
 * {@code btoa/atob}. A JSNI implementation would silently break on that agent.
 * A hand-written Base64 encoder/decoder compiles cleanly under GWT 2.4, runs on
 * every supported agent, and keeps the tiles/data payload compact (the ADR-2
 * "JSON container + Base64" format) without any {@code // 需本地编译验证}
 * JSNI surface.
 */
public final class SaveStore {

    private static final String KEY = "minicraft.save";

    private static final String B64_ALPHABET =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    private SaveStore() {
    }

    private static Storage storage() {
        // Returns null when localStorage is unavailable (private mode, quota,
        // or unsupported browser). Callers must handle a null return.
        return Storage.getIfSupported();
    }

    public static boolean hasSave() {
        Storage s = storage();
        return s != null && s.getItem(KEY) != null;
    }

    /** Persist the JSON string. Silently no-ops if storage is unavailable. */
    public static void save(String json) {
        Storage s = storage();
        if (s != null) s.setItem(KEY, json);
    }

    /** Returns the stored JSON, or null if absent/unavailable. */
    public static String load() {
        Storage s = storage();
        return s == null ? null : s.getItem(KEY);
    }

    /** Remove any stored save. */
    public static void clear() {
        Storage s = storage();
        if (s != null) s.removeItem(KEY);
    }

    // ---------------------------------------------------------------------
    // Pure-Java Base64 (RFC 4648). No JSNI, GWT 2.4 safe.
    // ---------------------------------------------------------------------

    public static String base64Encode(byte[] data) {
        if (data == null || data.length == 0) return "";
        StringBuilder sb = new StringBuilder((data.length + 2) / 3 * 4);
        int len = data.length;
        int i = 0;
        while (i + 2 < len) {
            int n = (data[i] & 0xff) << 16 | (data[i + 1] & 0xff) << 8 | (data[i + 2] & 0xff);
            sb.append(B64_ALPHABET.charAt((n >> 18) & 0x3f));
            sb.append(B64_ALPHABET.charAt((n >> 12) & 0x3f));
            sb.append(B64_ALPHABET.charAt((n >> 6) & 0x3f));
            sb.append(B64_ALPHABET.charAt(n & 0x3f));
            i += 3;
        }
        int rem = len - i;
        if (rem == 1) {
            int n = (data[i] & 0xff) << 16;
            sb.append(B64_ALPHABET.charAt((n >> 18) & 0x3f));
            sb.append(B64_ALPHABET.charAt((n >> 12) & 0x3f));
            sb.append("==");
        } else if (rem == 2) {
            int n = ((data[i] & 0xff) << 16) | ((data[i + 1] & 0xff) << 8);
            sb.append(B64_ALPHABET.charAt((n >> 18) & 0x3f));
            sb.append(B64_ALPHABET.charAt((n >> 12) & 0x3f));
            sb.append(B64_ALPHABET.charAt((n >> 6) & 0x3f));
            sb.append("=");
        }
        return sb.toString();
    }

    public static byte[] base64Decode(String s) {
        if (s == null) return new byte[0];
        int len = s.length();
        int pad = 0;
        if (len > 0 && s.charAt(len - 1) == '=') pad++;
        if (len > 1 && s.charAt(len - 2) == '=') pad++;
        int outLen = len / 4 * 3 - pad;
        if (outLen < 0) outLen = 0;
        byte[] out = new byte[outLen];
        int oi = 0;
        int i = 0;
        while (i + 4 <= len) {
            int c0 = b64val(s.charAt(i));
            int c1 = b64val(s.charAt(i + 1));
            int c2 = s.charAt(i + 2) == '=' ? 0 : b64val(s.charAt(i + 2));
            int c3 = s.charAt(i + 3) == '=' ? 0 : b64val(s.charAt(i + 3));
            int n = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
            out[oi++] = (byte) (n >> 16);
            if (oi < outLen) out[oi++] = (byte) (n >> 8);
            if (oi < outLen) out[oi++] = (byte) n;
            i += 4;
        }
        return out;
    }

    private static int b64val(char c) {
        if (c >= 'A' && c <= 'Z') return c - 'A';
        if (c >= 'a' && c <= 'z') return c - 'a' + 26;
        if (c >= '0' && c <= '9') return c - '0' + 52;
        if (c == '+') return 62;
        if (c == '/') return 63;
        return 0;
    }
}
