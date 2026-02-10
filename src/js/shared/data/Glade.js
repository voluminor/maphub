import * as DataProto from "../../struct/data.js";
import { toUint8Array, bytesToUtf8Text } from "./geo.js";
import * as PaletteFunc from "./palette.js";

export const fileExt = "gl";

function intToRgbObj(n) {
    n = (n | 0) >>> 0;
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbObjToHex(o) {
    return PaletteFunc.rgbObjToHex(o);
}

function parseColor(v, fallbackInt) {
    if (v === null || v === undefined || v === "null") return intToRgbObj(fallbackInt);
    if (typeof v === "number") return intToRgbObj(v);
    if (typeof v === "string") {
        const rgb = PaletteFunc.hexToRgbObj(v);
        if (rgb) return rgb;
        const s = v.trim();
        if (s.startsWith("0x")) {
            const n = parseInt(s.slice(2), 16);
            if (Number.isFinite(n)) return intToRgbObj(n);
        }
        const n2 = parseInt(s, 10);
        if (Number.isFinite(n2)) return intToRgbObj(n2);
    }
    if (typeof v === "object") {
        const r = v?.r, g = v?.g, b = v?.b;
        if (typeof r === "number" && typeof g === "number" && typeof b === "number") return { r: r | 0, g: g | 0, b: b | 0 };
    }
    throw PaletteFunc.unknownPalette("color");
}

function parseFloatNum(v, fallback) {
    if (v === null || v === undefined || v === "null") return fallback;
    if (typeof v === "number") return Number.isFinite(v) ? v : fallback;
    if (typeof v === "string") {
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : fallback;
    }
    return fallback;
}

function parseIntNum(v, fallback) {
    if (v === null || v === undefined || v === "null") return fallback;
    if (typeof v === "number") return Number.isFinite(v) ? (v | 0) : fallback;
    if (typeof v === "string") {
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? (n | 0) : fallback;
    }
    return fallback;
}

function clampInt(n, min, max) {
    n = n | 0;
    if (n < min) return min;
    if (n > max) return max;
    return n;
}

function toX10(n, min, max, fallback) {
    const v = parseFloatNum(n, fallback);
    const clamped = Math.min(max, Math.max(min, v));
    return Math.round(clamped * 10);
}

function toX100(n, min, max, fallback) {
    const v = parseFloatNum(n, fallback);
    const clamped = Math.min(max, Math.max(min, v));
    return Math.round(clamped * 100);
}

function getProp(obj, key) {
    if (obj && typeof obj === "object") {
        if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
        const snake = key.replace(/[A-Z]/g, m => "_" + m.toLowerCase());
        if (Object.prototype.hasOwnProperty.call(obj, snake)) return obj[snake];
    }
    return undefined;
}

function defaults() {
    return {
        ground: 10269317,
        ink: 66054,
        marks: null,
        tree: [6258538],
        treeDetails: null,
        treeVariance: 0.2,
        treeBands: 3,
        treeShape: "Cotton",
        thicket: null,
        water: 4491468,
        shallow: null,
        sand: null,
        shadowColor: 9869742,
        shadowLength: 1,
        shadowAngle: 60,
        strokeNormal: 1,
        strokeThin: 0.5,
        strokeGrid: 0.3,
        grassLength: 8,
        road: 13418915,
        roadOutline: null,
        roadWidth: 0.5,
        roadWiggle: 0.5
    };
}

function paletteGladeObjFromLegacyJsonData(obj) {
    if (obj == null || typeof obj !== "object" || Array.isArray(obj)) throw PaletteFunc.unknownPalette("expected object");

    const d = defaults();

    const inkRgb = parseColor(getProp(obj, "ink"), d.ink);
    const marksRgb = parseColor(getProp(obj, "marks"), ((inkRgb.r << 16) | (inkRgb.g << 8) | inkRgb.b));
    const treeRaw = getProp(obj, "tree");
    let treeArr = [];
    if (Array.isArray(treeRaw)) {
        for (let i = 0; i < treeRaw.length; i++) treeArr.push(parseColor(treeRaw[i], d.tree[0]));
    } else if (treeRaw != null) {
        treeArr.push(parseColor(treeRaw, d.tree[0]));
    }
    if (treeArr.length === 0) treeArr = [intToRgbObj(d.tree[0])];

    const tree0Int = (treeArr[0].r << 16) | (treeArr[0].g << 8) | treeArr[0].b;

    const groundRgb = parseColor(getProp(obj, "ground"), d.ground);
    const treeDetailsRgb = parseColor(getProp(obj, "treeDetails"), ((inkRgb.r << 16) | (inkRgb.g << 8) | inkRgb.b));
    const thicketRgb = parseColor(getProp(obj, "thicket"), tree0Int);

    const waterDeepRgb = parseColor(getProp(obj, "water"), d.water);
    const shallowRgb = parseColor(getProp(obj, "shallow"), ((waterDeepRgb.r << 16) | (waterDeepRgb.g << 8) | waterDeepRgb.b));
    const sandRgb = parseColor(getProp(obj, "sand"), ((inkRgb.r << 16) | (inkRgb.g << 8) | inkRgb.b));

    const shadowColorRgb = parseColor(getProp(obj, "shadowColor"), d.shadowColor);

    const roadRgb = parseColor(getProp(obj, "road"), d.road);
    const roadOutlineRgb = parseColor(getProp(obj, "roadOutline"), ((inkRgb.r << 16) | (inkRgb.g << 8) | inkRgb.b));

    const treeVarianceX100 = toX100(getProp(obj, "treeVariance"), 0, 1, d.treeVariance);
    const treeBands = clampInt(parseIntNum(getProp(obj, "treeBands"), d.treeBands), 2, 5);
    const treeShape = (() => {
        const v = getProp(obj, "treeShape");
        if (typeof v === "string" && v.length) return v;
        return d.treeShape;
    })();

    const shadowLengthX10 = toX10(getProp(obj, "shadowLength"), 0, 3, d.shadowLength);

    let angle = parseIntNum(getProp(obj, "shadowAngle"), 361);
    if (angle === 361) angle = parseIntNum(getProp(obj, "shadowDir"), d.shadowAngle);
    angle = clampInt(angle, 0, 360);

    const strokeNormalX10 = toX10(getProp(obj, "strokeNormal"), 0.1, 10, d.strokeNormal);
    const strokeThinX10 = toX10(getProp(obj, "strokeThin"), 0.1, 10, d.strokeThin);
    const strokeGridX10 = toX10(getProp(obj, "strokeGrid"), 0.1, 10, d.strokeGrid);

    const grassLength = clampInt(parseIntNum(getProp(obj, "grassLength"), d.grassLength), 0, 9999);

    const roadWidthX100 = toX100(getProp(obj, "roadWidth"), 0, 1, d.roadWidth);
    const roadWiggleX100 = toX100(getProp(obj, "roadWiggle"), 0, 1, d.roadWiggle);

    return {
        colors: {
            ground: groundRgb,
            ink: inkRgb,
            marks: marksRgb,
            tree: treeArr,
            treeDetails: treeDetailsRgb,
            thicket: thicketRgb,
            waterDeep: waterDeepRgb,
            waterShallow: shallowRgb,
            sand: sandRgb,
            shadowColor: shadowColorRgb,
            road: roadRgb,
            roadOutline: roadOutlineRgb
        },
        trees: {
            varianceX100: treeVarianceX100,
            bands: treeBands,
            shape: treeShape
        },
        shadow: {
            lengthX10: shadowLengthX10,
            angleDeg: angle
        },
        strokes: {
            normalX10: strokeNormalX10,
            thinX10: strokeThinX10,
            gridX10: strokeGridX10
        },
        misc: {
            grassLength: grassLength,
            roadWidthX100: roadWidthX100,
            roadWiggleX100: roadWiggleX100
        }
    };
}

export function paletteObjFromLegacyJsonText(text) {
    let obj;
    try {
        obj = JSON.parse(text);
    } catch (e) {
        throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e)));
    }
    const protoObj = paletteGladeObjFromLegacyJsonData(obj);
    const err = DataProto.data.PaletteGladeObj.verify(protoObj);
    if (err) throw PaletteFunc.unknownPalette(err);
    return DataProto.data.PaletteGladeObj.fromObject(protoObj);
}

function fromX10(v) {
    return PaletteFunc.fromX10Float(v);
}

function fromX100(v) {
    return PaletteFunc.fromX100Float(v);
}

export function legacyJsonFromPaletteObj(p) {
    const m = DataProto.data.PaletteGladeObj.fromObject(p);

    const c = m.colors || {};
    const t = m.trees || {};
    const s = m.shadow || {};
    const st = m.strokes || {};
    const ms = m.misc || {};

    const out = {};

    out.thicket = rgbObjToHex(c.thicket || intToRgbObj(6258538));
    out.ground = rgbObjToHex(c.ground || intToRgbObj(10269317));
    out.ink = rgbObjToHex(c.ink || intToRgbObj(66054));
    out.marks = rgbObjToHex(c.marks || c.ink || intToRgbObj(66054));

    const treeArr = Array.isArray(c.tree) && c.tree.length ? c.tree : [intToRgbObj(6258538)];
    out.tree = treeArr.map(rgbObjToHex);

    out.treeDetails = rgbObjToHex(c.treeDetails || c.ink || intToRgbObj(66054));
    out.treeVariance = fromX100(t.varianceX100 != null ? t.varianceX100 : Math.round(0.2 * 100));
    out.treeBands = String(t.bands != null ? (t.bands | 0) : 3);
    out.treeShape = (t.shape != null && String(t.shape).length) ? String(t.shape) : "Cotton";

    out.water = rgbObjToHex(c.waterDeep || intToRgbObj(4491468));
    out.shallow = rgbObjToHex(c.waterShallow || c.waterDeep || intToRgbObj(4491468));
    out.sand = rgbObjToHex(c.sand || c.ink || intToRgbObj(66054));

    out.shadowColor = rgbObjToHex(c.shadowColor || intToRgbObj(9869742));
    out.shadowLength = fromX10(s.lengthX10 != null ? s.lengthX10 : Math.round(1 * 10));
    out.shadowAngle = String(s.angleDeg != null ? (s.angleDeg | 0) : 60);

    out.road = rgbObjToHex(c.road || intToRgbObj(13418915));
    out.roadOutline = rgbObjToHex(c.roadOutline || c.ink || intToRgbObj(66054));
    out.roadWidth = fromX100(ms.roadWidthX100 != null ? ms.roadWidthX100 : Math.round(0.5 * 100));
    out.roadWiggle = fromX100(ms.roadWiggleX100 != null ? ms.roadWiggleX100 : Math.round(0.5 * 100));

    out.strokeNormal = fromX10(st.normalX10 != null ? st.normalX10 : Math.round(1 * 10));
    out.strokeThin = fromX10(st.thinX10 != null ? st.thinX10 : Math.round(0.5 * 10));
    out.strokeGrid = fromX10(st.gridX10 != null ? st.gridX10 : Math.round(0.3 * 10));

    out.grassLength = String(ms.grassLength != null ? (ms.grassLength | 0) : 8);

    return JSON.stringify(out, null, "  ");
}

function stripLengthDelimited(buf) {
    let pos = 0, len = 0, shift = 0;
    while (pos < buf.length && shift < 35) {
        const c = buf[pos++];
        len |= (c & 127) << shift;
        if ((c & 128) === 0) break;
        shift += 7;
    }
    if (pos <= 0 || pos >= buf.length) return null;
    if (len <= 0 || pos + len > buf.length) return null;
    return buf.subarray(pos, pos + len);
}

function tryDecode(MessageType, buf) {
    try { return { msg: MessageType.decode(buf), err: null }; } catch (e) {}
    const inner = stripLengthDelimited(buf);
    if (inner != null) {
        try { return { msg: MessageType.decode(inner), err: null }; } catch (e2) {}
    }
    return { msg: null, err: new Error("decode failed") };
}

export function decodePaletteFile(name, data) {
    const lower = typeof name === "string" ? name.toLowerCase() : "";
    if (lower.endsWith(".json")) return paletteObjFromLegacyJsonText(bytesToUtf8Text(data));
    if (lower.endsWith(".pb")) return decodePaletteFromProtoBytes(data);

    try {
        return decodePaletteFromProtoBytes(data);
    } catch (e) {
        return paletteObjFromLegacyJsonText(bytesToUtf8Text(data));
    }
}

function decodePaletteFromProtoBytes(bytes) {
    const b = toUint8Array(bytes);
    if (b == null) throw new Error("illegal buffer");

    const gl = tryDecode(DataProto.data.PaletteGladeObj, b);
    if (gl.msg != null) return gl.msg;

    const cave = tryDecode(DataProto.data.PaletteCaveObj, b);
    if (cave.msg != null) {
        const c = cave.msg.colors || {};
        const ink = c.ink || intToRgbObj(66054);
        const floor = c.floor || intToRgbObj(6258538);
        const water = c.water || intToRgbObj(4491468);
        const page = c.page || intToRgbObj(10269317);

        const converted = {
            colors: {
                ground: page,
                ink: ink,
                marks: ink,
                tree: [floor],
                treeDetails: ink,
                thicket: floor,
                waterDeep: water,
                waterShallow: water,
                sand: ink,
                shadowColor: intToRgbObj(9869742),
                road: floor,
                roadOutline: ink
            },
            trees: { varianceX100: Math.round(0.2 * 100), bands: 3, shape: "Cotton" },
            shadow: { lengthX10: Math.round(1 * 10), angleDeg: 60 },
            strokes: { normalX10: Math.round(1 * 10), thinX10: Math.round(0.5 * 10), gridX10: Math.round(0.3 * 10) },
            misc: { grassLength: 8, roadWidthX100: Math.round(0.5 * 100), roadWiggleX100: Math.round(0.5 * 100) }
        };

        const err = DataProto.data.PaletteGladeObj.verify(converted);
        if (err) throw PaletteFunc.unknownPalette(err);
        return DataProto.data.PaletteGladeObj.fromObject(converted);
    }

    throw PaletteFunc.unknownPalette("expected Glade palette");
}

export function protoBytesFromPaletteObj(p) {
    const msg = DataProto.data.PaletteGladeObj.fromObject(p);
    return DataProto.data.PaletteGladeObj.encode(msg).finish();
}


export function decodePaletteCaveFile(name, data) {
    return decodePaletteFile(name, data);
}

export function paletteLegacyJsonFromPaletteCaveObj(p) {
    return legacyJsonFromPaletteObj(p);
}
