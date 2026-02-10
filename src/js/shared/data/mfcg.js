import * as DataProto from "../../struct/data.js";
import { toUint8Array, bytesToUtf8Text } from "./geo.js";
import * as PaletteFunc from "./palette.js";

const LEGACY_KEYS = [
    "colorPaper","colorLight","colorDark","colorRoof","colorWater","colorGreen","colorRoad","colorWall","colorTree","colorLabel",
    "tintMethod","tintStrength","weathering"
];

const REQUIRED_MIN_KEYS = ["colorPaper","colorLight","colorDark"];

function hasAnyLegacyKey(obj) {
    if (obj == null || typeof obj !== "object" || Array.isArray(obj)) return false;
    for (let i = 0; i < LEGACY_KEYS.length; i++) if (Object.prototype.hasOwnProperty.call(obj, LEGACY_KEYS[i])) return true;
    return false;
}

function legacyTintMethodToEnum(v) {
    if (v === null || v === undefined) return null;
    if (v === "null") return null;
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw PaletteFunc.unknownPalette();
    let s = v.trim().toLowerCase();
    if (s === "spectrum") return DataProto.data.PaletteMfcgTintMethodType.spectrum;
    if (s === "brightness") return DataProto.data.PaletteMfcgTintMethodType.brightness;
    if (s === "overlay") return DataProto.data.PaletteMfcgTintMethodType.overlay;
    throw PaletteFunc.unknownPalette();
}

function enumToLegacyTintMethod(v) {
    if (v === DataProto.data.PaletteMfcgTintMethodType.brightness) return "Brightness";
    if (v === DataProto.data.PaletteMfcgTintMethodType.overlay) return "Overlay";
    return "Spectrum";
}

function legacyIntRange(v, min, max) {
    let n = PaletteFunc.legacyInt(v);
    if (n == null) return null;
    if (n < min || n > max) throw PaletteFunc.unknownPalette();
    return n;
}

function needKey(obj, k, missing) {
    if (!Object.prototype.hasOwnProperty.call(obj, k) || obj[k] == null || obj[k] === "null") missing.push(k);
}

function pickRgb(obj, key) {
    if (!Object.prototype.hasOwnProperty.call(obj, key) || obj[key] == null || obj[key] === "null") return null;
    let rgb = PaletteFunc.hexToRgbObj(obj[key]);
    if (rgb == null) throw PaletteFunc.unknownPalette();
    return rgb;
}

function normalizePaletteMfcgObjLike(pmoLike) {
    let c = pmoLike?.colors || null;
    let t = pmoLike?.tints || null;

    let paper = c?.paper || null;
    let light = c?.light || null;
    let dark = c?.dark || null;

    if (paper == null || light == null || dark == null) {
        let missing = [];
        if (paper == null) missing.push("colorPaper");
        if (light == null) missing.push("colorLight");
        if (dark == null) missing.push("colorDark");
        throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));
    }

    let roof = c?.roof || light;
    let water = c?.water || paper;
    let green = c?.green || paper;
    let road = c?.road || paper;
    let wall = c?.wall || dark;
    let tree = c?.tree || dark;
    let label = c?.label || dark;

    let method = t?.method;
    if (method == null || method === DataProto.data.PaletteMfcgTintMethodType.PALETTE_MFCG_TINT_METHOD_UNSPECIFIED) {
        method = DataProto.data.PaletteMfcgTintMethodType.spectrum;
    }

    let strength = t?.strength;
    if (strength == null) strength = 50;
    strength = strength | 0;
    if (strength < 0 || strength > 100) throw PaletteFunc.unknownPalette();

    let weathering = t?.weathering;
    if (weathering == null) weathering = 20;
    weathering = weathering | 0;
    if (weathering < 0 || weathering > 100) throw PaletteFunc.unknownPalette();

    let protoObj = {
        colors: { paper, light, dark, roof, water, green, road, wall, tree, label },
        tints: { method, strength, weathering }
    };

    let err = DataProto.data.PaletteMfcgObj.verify(protoObj);
    if (err) throw new Error("Invalid structure - expected Palette: " + err);
    return DataProto.data.PaletteMfcgObj.fromObject(protoObj);
}

export function paletteMfcgObjFromLegacyJsonText(text) {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e))); }

    if (obj != null && typeof obj === "object" && Array.isArray(obj.floors) && obj.features == null) {
        throw new Error("These are Dwellings, not Palette.");
    }
    if (obj != null && typeof obj === "object" && obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
        throw new Error("These are City/Village, not Palette.");
    }
    if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
        throw new Error("Invalid structure - expected Palette.");
    }
    if (!hasAnyLegacyKey(obj)) {
        throw new Error("Invalid structure - expected Palette.");
    }

    let missing = [];
    for (let i = 0; i < REQUIRED_MIN_KEYS.length; i++) needKey(obj, REQUIRED_MIN_KEYS[i], missing);
    if (missing.length) throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));

    let paper = pickRgb(obj, "colorPaper");
    let light = pickRgb(obj, "colorLight");
    let dark = pickRgb(obj, "colorDark");

    let roof = pickRgb(obj, "colorRoof");
    let water = pickRgb(obj, "colorWater");
    let green = pickRgb(obj, "colorGreen");
    let road = pickRgb(obj, "colorRoad");
    let wall = pickRgb(obj, "colorWall");
    let tree = pickRgb(obj, "colorTree");
    let label = pickRgb(obj, "colorLabel");

    let method = legacyTintMethodToEnum(obj.tintMethod);
    if (method == null || method === DataProto.data.PaletteMfcgTintMethodType.PALETTE_MFCG_TINT_METHOD_UNSPECIFIED) {
        method = DataProto.data.PaletteMfcgTintMethodType.spectrum;
    }

    let strength = legacyIntRange(obj.tintStrength, 0, 100);
    if (strength == null) strength = 50;

    let weathering = legacyIntRange(obj.weathering, 0, 100);
    if (weathering == null) weathering = 20;

    let pmoLike = {
        colors: {
            paper, light, dark,
            roof: roof || null,
            water: water || null,
            green: green || null,
            road: road || null,
            wall: wall || null,
            tree: tree || null,
            label: label || null
        },
        tints: { method, strength, weathering }
    };

    return normalizePaletteMfcgObjLike(pmoLike);
}

export function paletteLegacyJsonFromPaletteMfcgObj(pmo) {
    let n = normalizePaletteMfcgObjLike(pmo);
    let c = n.colors;
    let t = n.tints;

    let out = {};
    out.colorPaper = PaletteFunc.rgbObjToHex(c.paper);
    out.colorLight = PaletteFunc.rgbObjToHex(c.light);
    out.colorDark = PaletteFunc.rgbObjToHex(c.dark);
    out.colorRoof = PaletteFunc.rgbObjToHex(c.roof);
    out.colorWater = PaletteFunc.rgbObjToHex(c.water);
    out.colorGreen = PaletteFunc.rgbObjToHex(c.green);
    out.colorRoad = PaletteFunc.rgbObjToHex(c.road);
    out.colorWall = PaletteFunc.rgbObjToHex(c.wall);
    out.colorTree = PaletteFunc.rgbObjToHex(c.tree);
    out.colorLabel = PaletteFunc.rgbObjToHex(c.label);

    out.tintMethod = enumToLegacyTintMethod(t.method);
    out.tintStrength = String((t.strength | 0));
    out.weathering = String((t.weathering | 0));

    return JSON.stringify(out, null, "  ");
}

export function paletteProtoBytesFromPaletteMfcgObj(pmo) {
    let n = normalizePaletteMfcgObjLike(pmo);
    return DataProto.data.PaletteMfcgObj.encode(n).finish();
}

function looksLikePaletteMfcgObj(m) {
    let c = m?.colors;
    let t = m?.tints;
    if (c == null || t == null) return false;

    function okRgb(x) {
        return (
            x != null &&
            x.r != null && x.g != null && x.b != null &&
            x.r >= 0 && x.r <= 255 &&
            x.g >= 0 && x.g <= 255 &&
            x.b >= 0 && x.b <= 255
        );
    }

    if (!okRgb(c.paper) || !okRgb(c.light) || !okRgb(c.dark)) return false;

    if (t.method == null || t.method === DataProto.data.PaletteMfcgTintMethodType.PALETTE_MFCG_TINT_METHOD_UNSPECIFIED) return false;

    let s = t.strength;
    let w = t.weathering;
    if (s != null && (s < 0 || s > 100)) return false;
    if (w != null && (w < 0 || w > 100)) return false;

    return true;
}

export function decodePaletteFromProtoBytes(bytes) {
    let b = toUint8Array(bytes);
    if (b == null) throw new Error("illegal buffer");

    let lastErr = null;

    function stripLengthDelimited(buf) {
        let pos = 0, len = 0, shift = 0;
        while (pos < buf.length && shift < 35) {
            let c = buf[pos++];
            len |= (c & 127) << shift;
            if ((c & 128) === 0) break;
            shift += 7;
        }
        if (pos <= 0 || pos >= buf.length) return null;
        if (len <= 0 || pos + len > buf.length) return null;
        return buf.subarray(pos, pos + len);
    }

    function tryDecode(MessageType, buf) {
        try { return { msg: MessageType.decode(buf), err: null }; } catch (e) { lastErr = e; }
        let inner = stripLengthDelimited(buf);
        if (inner != null) {
            try { return { msg: MessageType.decode(inner), err: null }; } catch (e3) { lastErr = e3; }
        }
        return { msg: null, err: lastErr };
    }

    let pal = tryDecode(DataProto.data.PaletteMfcgObj, b);
    if (pal.msg != null) {
        if (looksLikePaletteMfcgObj(pal.msg)) return normalizePaletteMfcgObjLike(pal.msg);

        let city = tryDecode(DataProto.data.GeoObj, b);
        if (city.msg != null) throw new Error("These are City/Village, not Palette.");

        let dwell = tryDecode(DataProto.data.DwellingsObj, b);
        if (dwell.msg != null) throw new Error("These are Dwellings, not Palette.");

        throw new Error("Invalid structure - expected Palette.");
    }

    let city2 = tryDecode(DataProto.data.GeoObj, b);
    if (city2.msg != null) throw new Error("These are City/Village, not Palette.");

    let dwell2 = tryDecode(DataProto.data.DwellingsObj, b);
    if (dwell2.msg != null) throw new Error("These are Dwellings, not Palette.");

    let errText = pal.err && pal.err.message ? pal.err.message : "unknown protobuf decode error";
    throw new Error("An error occurred while parsing: " + errText);
}

export function decodePaletteFromJsonText(text) {
    try {
        return paletteMfcgObjFromLegacyJsonText(text);
    } catch (e) {
        let msg = e && e.message ? e.message : String(e);
        if (msg.indexOf("Invalid structure") === 0) throw e;
        if (msg.indexOf("These are ") === 0) throw e;
        if (msg.indexOf("Palette has valid fields") === 0) throw e;
        if (msg.indexOf("Unknown data format") === 0) throw e;
        throw new Error("An error occurred while parsing: " + msg);
    }
}

export function decodePaletteFile(name, data) {
    let ext = "";
    if (name != null) {
        let parts = String(name).split(".");
        if (parts.length > 1) ext = String(parts.pop()).toLowerCase();
    }
    if (ext === "pb" || ext === "proto" || ext === "bin") return decodePaletteFromProtoBytes(data);
    let text = bytesToUtf8Text(data);
    return decodePaletteFromJsonText(text);
}
