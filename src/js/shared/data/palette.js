export function unknownPalette(msg) {
    return new Error(msg ? ("Unknown data format - expected Palette: " + msg) : "Unknown data format - expected Palette.");
}

export function rgbObjToHex(rgb) {
    let r = rgb?.r, g = rgb?.g, b = rgb?.b;
    if (typeof r !== "number" || typeof g !== "number" || typeof b !== "number") throw new Error("Unknown data format rgb - not number.");
    if (r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) throw new Error("Unknown data format rgb - by outside.");
    let n = (r << 16) | (g << 8) | b;
    return "#" + n.toString(16).padStart(6, "0");
}

export function hexToRgbObj(v) {
    if (typeof v !== "string") return null;
    if (v === "null") return null;
    let s = v.trim();
    if (s.charAt(0) !== "#") return null;
    s = s.substring(1);
    if (s.length === 3) s = s.charAt(0)+s.charAt(0) + s.charAt(1)+s.charAt(1) + s.charAt(2)+s.charAt(2);
    if (s.length !== 6) return null;
    let n = parseInt(s, 16);
    if (!Number.isFinite(n)) return null;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function legacyBool(v) {
    if (v === null || v === undefined) return null;
    if (v === "null") return null;
    if (typeof v === "boolean") return v;
    if (typeof v === "string") {
        if (v === "true") return true;
        if (v === "false") return false;
    }
    throw new Error("Unknown data format bool - val:"+v);
}

export function legacyInt(v) {
    if (v == null) return null;
    if (typeof v === "number") return Number.isFinite(v) ? (v | 0) : null;
    if (typeof v === "string") {
        if (v === "null") return null;
        let n = parseInt(v, 10);
        return Number.isFinite(n) ? (n | 0) : null;
    }
    return null;
}

export function toX10Float(v, min, max) {
    if (v === null || v === undefined) return null;
    if (v === "null") return null;
    let n = typeof v === "number" ? v : (typeof v === "string" ? parseFloat(v) : NaN);
    if (!Number.isFinite(n)) throw unknownPalette("toX10Float - min:"+min+" max:"+max+" val:"+v);
    return Math.round(n * 10);
}

export function fromX10Float(v) {
    if (v === null || v === undefined) return "null";
    let n = v / 10;
    let s = String(n);
    if (s.indexOf(".") === -1) s += ".0";
    return s;
}