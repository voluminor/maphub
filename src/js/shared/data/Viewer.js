import * as DataProto from "../../struct/data.js";
import { assertExpectedLegacyRootType, decodeDataFromFile } from "./data.js";
import * as PaletteFunc from "./palette.js";

const COLOR_KEYS = ["ground", "fields", "greens", "foliage", "roads", "water", "walls1", "walls2", "roofs1", "roofs2"];
const LIGHTING_COLOR_KEYS = ["sky1", "sky2", "sun", "windows"];
const LEGACY_KEYS = [
    "ground", "fields", "greens", "foliage", "roads", "water", "walls1", "walls2", "roofs1", "roofs2",
    "sky1", "sky2", "sun", "windows",
    "sun_pos", "ambience", "lighted",
    "roofedTowers", "towers", "tree_shape", "pitch"
];

function isPlainObject(o) {
    return o != null && typeof o === "object" && !Array.isArray(o);
}

function normalizeRgb(rgb) {
    PaletteFunc.rgbObjToHex(rgb);
    return rgb;
}

function normalizeBool(v) {
    if (typeof v !== "boolean") throw new Error("Invalid structure - expected Palette.");
    return v;
}

function normalizeEnumInt(v) {
    if (typeof v !== "number" || !Number.isFinite(v) || (v | 0) !== v) throw new Error("Invalid structure - expected Palette.");
    return v | 0;
}

function normalizeFloat(v, min, max) {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("Invalid structure - expected Palette.");
    if (v < min || v > max) throw new Error("Invalid structure - expected Palette.");
    return v;
}

function normalizePaletteViewerObjLike(pvoLike) {
    if (!isPlainObject(pvoLike)) throw new Error("Invalid structure - expected Palette.");
    let c = pvoLike.colors;
    let l = pvoLike.lighting;
    let s = pvoLike.shapes;
    if (!isPlainObject(c) || !isPlainObject(l) || !isPlainObject(s)) throw new Error("Invalid structure - expected Palette.");

    let colors = {};
    for (let i = 0; i < COLOR_KEYS.length; i++) {
        let k = COLOR_KEYS[i];
        if (c[k] == null) throw new Error("Invalid structure - expected Palette.");
        colors[k] = normalizeRgb(c[k]);
    }

    let lighting = {};
    for (let j = 0; j < LIGHTING_COLOR_KEYS.length; j++) {
        let k2 = LIGHTING_COLOR_KEYS[j];
        if (l[k2] == null) throw new Error("Invalid structure - expected Palette.");
        lighting[k2] = normalizeRgb(l[k2]);
    }

    lighting.sunPos = normalizeFloat(l.sunPos, 0, 90);
    lighting.ambience = normalizeFloat(l.ambience, 0, 1);
    lighting.lighted = normalizeFloat(l.lighted, 0, 1);

    let shapes = {
        roofedTowers: normalizeBool(s.roofedTowers),
        towers: normalizeEnumInt(s.towers),
        treeShape: normalizeEnumInt(s.treeShape),
        pitch: normalizeFloat(s.pitch, 0, 2)
    };

    let protoObj = { colors, lighting, shapes };
    let err = DataProto.data.PaletteViewerObj.verify(protoObj);
    if (err) throw new Error("Invalid structure - expected Palette: " + err);
    return DataProto.data.PaletteViewerObj.fromObject(protoObj);
}

function hasAnyLegacyKey(obj) {
    if (!isPlainObject(obj)) return false;
    for (let i = 0; i < LEGACY_KEYS.length; i++) if (Object.prototype.hasOwnProperty.call(obj, LEGACY_KEYS[i])) return true;
    return false;
}

function legacyTowersToEnum(v) {
    if (v === null || v === undefined) return null;
    if (v === "null") return null;
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw PaletteFunc.unknownPalette();
    let s = v.trim().toLowerCase();
    if (s === "round") return DataProto.data.PaletteTowerPlanType.round;
    if (s === "square") return DataProto.data.PaletteTowerPlanType.square;
    throw PaletteFunc.unknownPalette();
}

function legacyTreeShapeToEnum(v) {
    if (v === null || v === undefined) return null;
    if (v === "null") return null;
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw PaletteFunc.unknownPalette();
    let s = v.trim().toLowerCase();
    if (s === "ellipsoid") return DataProto.data.PaletteTreeShapeType.ellipsoid;
    if (s === "cone") return DataProto.data.PaletteTreeShapeType.cone;
    throw PaletteFunc.unknownPalette();
}

export function paletteObjFromLegacyJsonText(text) {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e))); }

    assertExpectedLegacyRootType("PaletteViewerObj", obj);

    if (isPlainObject(obj) && isPlainObject(obj.colors) && isPlainObject(obj.lighting) && isPlainObject(obj.shapes)) {
        return normalizePaletteViewerObjLike(obj);
    }

    if (!isPlainObject(obj)) throw new Error("Invalid structure - expected Palette.");
    if (!hasAnyLegacyKey(obj)) throw new Error("Invalid structure - expected Palette.");

    let missing = [];

    let colors = {};
    for (let i = 0; i < COLOR_KEYS.length; i++) {
        let k = COLOR_KEYS[i];
        if (!Object.prototype.hasOwnProperty.call(obj, k) || obj[k] == null || obj[k] === "null") { missing.push(k); continue; }
        let rgb = PaletteFunc.hexToRgbObj(obj[k]);
        if (rgb == null) throw PaletteFunc.unknownPalette();
        colors[k] = rgb;
    }

    let lighting = {};
    for (let j = 0; j < LIGHTING_COLOR_KEYS.length; j++) {
        let k2 = LIGHTING_COLOR_KEYS[j];
        if (!Object.prototype.hasOwnProperty.call(obj, k2) || obj[k2] == null || obj[k2] === "null") { missing.push(k2); continue; }
        let rgb2 = PaletteFunc.hexToRgbObj(obj[k2]);
        if (rgb2 == null) throw PaletteFunc.unknownPalette();
        lighting[k2] = rgb2;
    }

    if (!Object.prototype.hasOwnProperty.call(obj, "sun_pos") || obj.sun_pos == null || obj.sun_pos === "null") missing.push("sun_pos");
    else lighting.sunPos = PaletteFunc.toFloat(obj.sun_pos, 0, 90);

    if (!Object.prototype.hasOwnProperty.call(obj, "ambience") || obj.ambience == null || obj.ambience === "null") missing.push("ambience");
    else lighting.ambience = PaletteFunc.toFloat(obj.ambience, 0, 1);

    if (!Object.prototype.hasOwnProperty.call(obj, "lighted") || obj.lighted == null || obj.lighted === "null") missing.push("lighted");
    else lighting.lighted = PaletteFunc.toFloat(obj.lighted, 0, 1);

    let shapes = {};

    if (!Object.prototype.hasOwnProperty.call(obj, "roofedTowers") || obj.roofedTowers == null || obj.roofedTowers === "null") missing.push("roofedTowers");
    else shapes.roofedTowers = PaletteFunc.legacyBool(obj.roofedTowers);

    if (!Object.prototype.hasOwnProperty.call(obj, "towers") || obj.towers == null || obj.towers === "null") missing.push("towers");
    else shapes.towers = legacyTowersToEnum(obj.towers);

    if (!Object.prototype.hasOwnProperty.call(obj, "tree_shape") || obj.tree_shape == null || obj.tree_shape === "null") missing.push("tree_shape");
    else shapes.treeShape = legacyTreeShapeToEnum(obj.tree_shape);

    if (!Object.prototype.hasOwnProperty.call(obj, "pitch") || obj.pitch == null || obj.pitch === "null") missing.push("pitch");
    else shapes.pitch = PaletteFunc.toFloat(obj.pitch, 0, 2);

    if (missing.length) throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));

    return normalizePaletteViewerObjLike({ colors, lighting, shapes });
}

export function paletteLegacyJsonFromObj(pvo) {
    let n = normalizePaletteViewerObjLike(pvo);
    let c = n.colors;
    let l = n.lighting;
    let s = n.shapes;

    let out = {};

    out.ground = PaletteFunc.rgbObjToHex(c.ground);
    out.fields = PaletteFunc.rgbObjToHex(c.fields);
    out.greens = PaletteFunc.rgbObjToHex(c.greens);
    out.foliage = PaletteFunc.rgbObjToHex(c.foliage);
    out.roads = PaletteFunc.rgbObjToHex(c.roads);
    out.water = PaletteFunc.rgbObjToHex(c.water);
    out.walls1 = PaletteFunc.rgbObjToHex(c.walls1);
    out.walls2 = PaletteFunc.rgbObjToHex(c.walls2);
    out.roofs1 = PaletteFunc.rgbObjToHex(c.roofs1);
    out.roofs2 = PaletteFunc.rgbObjToHex(c.roofs2);

    out.sky1 = PaletteFunc.rgbObjToHex(l.sky1);
    out.sky2 = PaletteFunc.rgbObjToHex(l.sky2);
    out.sun = PaletteFunc.rgbObjToHex(l.sun);
    out.windows = PaletteFunc.rgbObjToHex(l.windows);

    out.sun_pos = PaletteFunc.fromFloat(l.sunPos);
    out.ambience = PaletteFunc.fromFloat(l.ambience);
    out.lighted = PaletteFunc.fromFloat(l.lighted);

    out.pitch = PaletteFunc.fromFloat(s.pitch);
    out.roofedTowers = s.roofedTowers === true ? "true" : "false";

    out.towers = s.towers === DataProto.data.PaletteTowerPlanType.square ? "Square" : "Round";
    out.tree_shape = s.treeShape === DataProto.data.PaletteTreeShapeType.cone ? "Cone" : "Ellipsoid";

    return JSON.stringify(out, null, "  ");
}

export function paletteProtoBytesFromObj(pvo) {
    let n = normalizePaletteViewerObjLike(pvo);
    return DataProto.data.PaletteViewerObj.encode(n).finish();
}

export function decodePaletteFile(name, data) {
    let msg = decodeDataFromFile("PaletteViewerObj", paletteObjFromLegacyJsonText, data);
    return normalizePaletteViewerObjLike(msg);
}
