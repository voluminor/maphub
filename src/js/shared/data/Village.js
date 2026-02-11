import * as DataProto from "../../struct/data.js";
import { assertExpectedLegacyRootType, decodeDataFromFile } from "./data.js";
import * as PaletteFunc from "./palette.js";

const LEGACY_KEYS = [
    "ground", "relief", "sand", "plank",
    "roofLight", "roofStroke", "roofVariance", "roofSlope", "roofType",
    "road", "largeRoad", "smallRoad", "outlineRoads", "mergeRoads",
    "fieldLight", "fieldFurrow", "fieldVariance", "outlineFields",
    "waterShallow", "waterDeep", "waterTide", "shallowBands",
    "tree", "thicket", "treeDetails", "treeVariance", "treeShape",
    "shadowColor", "shadowLength", "shadowAngle", "lights",
    "fontHeader", "fontPopulation", "fontNumber",
    "ink", "paper", "strokeNormal", "strokeThin"
];

function isPlainObject(o) {
    return o != null && typeof o === "object" && !Array.isArray(o);
}

function hasAnyLegacyKey(obj) {
    if (!isPlainObject(obj)) return false;
    for (let i = 0; i < LEGACY_KEYS.length; i++) if (Object.prototype.hasOwnProperty.call(obj, LEGACY_KEYS[i])) return true;
    return false;
}

function hasVal(o, k) {
    return Object.prototype.hasOwnProperty.call(o, k) && o[k] != null && o[k] !== "null";
}

function parseRgb(v) {
    let rgb = PaletteFunc.hexToRgbObj(v);
    if (rgb == null) throw PaletteFunc.unknownPalette();
    return rgb;
}

function parseRgbList(v) {
    if (v == null || v === "null") return null;
    if (Array.isArray(v)) {
        let out = [];
        for (let i = 0; i < v.length; i++) out.push(parseRgb(v[i]));
        return out;
    }
    if (typeof v === "string") return [parseRgb(v)];
    throw PaletteFunc.unknownPalette();
}

function toFloatChecked(v, min, max) {
    return PaletteFunc.toFloat(v, min, max);
}

function toIntChecked(v, min, max) {
    let n = PaletteFunc.legacyInt(v);
    if (n == null) return null;
    if (n < min || n > max) throw PaletteFunc.unknownPalette();
    return n;
}

function legacyReliefToEnum(v) {
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw PaletteFunc.unknownPalette();
    let s = v.trim().toLowerCase();
    if (s === "hachures") return DataProto.data.PaletteVillageReliefType.hachures;
    if (s === "contours") return DataProto.data.PaletteVillageReliefType.contours;
    if (s === "grass") return DataProto.data.PaletteVillageReliefType.grass;
    throw PaletteFunc.unknownPalette();
}

function legacyOutlineToEnum(v) {
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw PaletteFunc.unknownPalette();
    let s = v.trim().toLowerCase();
    if (s === "hard") return DataProto.data.PaletteVillageOutlineType.hard;
    if (s === "soft") return DataProto.data.PaletteVillageOutlineType.soft;
    if (s === "none") return DataProto.data.PaletteVillageOutlineType.none;
    throw PaletteFunc.unknownPalette();
}

function legacyRoofToEnum(v) {
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw PaletteFunc.unknownPalette();
    let s = v.trim().toLowerCase();
    if (s === "gable") return DataProto.data.PaletteVillageRoofType.gable;
    if (s === "hip") return DataProto.data.PaletteVillageRoofType.hip;
    if (s === "flat") return DataProto.data.PaletteVillageRoofType.flat;
    if (s === "ruin") return DataProto.data.PaletteVillageRoofType.ruin;
    throw PaletteFunc.unknownPalette();
}

function legacyTreeShapeToEnum(v) {
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw PaletteFunc.unknownPalette();
    let s = v.trim().toLowerCase();
    if (s === "cotton") return DataProto.data.PaletteVillageTreeShapeType.cotton;
    if (s === "conifer") return DataProto.data.PaletteVillageTreeShapeType.conifer;
    if (s === "palm") return DataProto.data.PaletteVillageTreeShapeType.palm;
    throw PaletteFunc.unknownPalette();
}

function parseFont(v) {
    if (!isPlainObject(v)) throw PaletteFunc.unknownPalette();
    let size = toIntChecked(v.size, 1, 1000);
    let bold = typeof v.bold === "boolean" ? v.bold : PaletteFunc.legacyBool(v.bold);
    let italic = typeof v.italic === "boolean" ? v.italic : PaletteFunc.legacyBool(v.italic);
    let embedded = typeof v.embedded === "string" ? v.embedded : null;
    if (size == null || bold == null || italic == null || embedded == null || embedded === "null") throw PaletteFunc.unknownPalette();

    let out = { size: size | 0, bold: bold === true, italic: italic === true, embedded: embedded };
    if (v.face != null && v.face !== "null") {
        if (typeof v.face !== "string") throw PaletteFunc.unknownPalette();
        if (v.face.trim() !== "") out.face = v.face;
    }
    return out;
}

function normalizeRgb(rgb) {
    PaletteFunc.rgbObjToHex(rgb);
    return rgb;
}

function normalizeRgbList(arr) {
    if (!Array.isArray(arr) || arr.length === 0) throw new Error("Invalid structure - expected Palette.");
    let out = [];
    for (let i = 0; i < arr.length; i++) out.push(normalizeRgb(arr[i]));
    return out;
}

function normalizeBool(v) {
    if (typeof v !== "boolean") throw new Error("Invalid structure - expected Palette.");
    return v;
}

function normalizeInt(v, min, max) {
    if (typeof v !== "number" || !Number.isFinite(v) || (v | 0) !== v) throw new Error("Invalid structure - expected Palette.");
    let n = v | 0;
    if (n < min || n > max) throw new Error("Invalid structure - expected Palette.");
    return n;
}

function normalizeFloat(v, min, max) {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("Invalid structure - expected Palette.");
    if (v < min || v > max) throw new Error("Invalid structure - expected Palette.");
    return v;
}

function normalizeFont(f) {
    if (!isPlainObject(f)) throw new Error("Invalid structure - expected Palette.");
    let size = normalizeInt(f.size, 1, 1000);
    let bold = normalizeBool(f.bold);
    let italic = normalizeBool(f.italic);
    let embedded = typeof f.embedded === "string" ? f.embedded : null;
    if (embedded == null) throw new Error("Invalid structure - expected Palette.");
    let out = { size, bold, italic, embedded };
    if (f.face != null && typeof f.face === "string" && f.face.trim() !== "") out.face = f.face;
    return out;
}

function normalizePaletteVillageObjLike(pLike) {
    if (!isPlainObject(pLike)) throw new Error("Invalid structure - expected Palette.");

    let t = pLike.terrain;
    let h = pLike.houses;
    let r = pLike.roads;
    let f = pLike.fields;
    let w = pLike.water;
    let tr = pLike.trees;
    let l = pLike.lighting;
    let tx = pLike.text;
    let m = pLike.misc;

    if (!isPlainObject(t) || !isPlainObject(h) || !isPlainObject(r) || !isPlainObject(f) || !isPlainObject(w) || !isPlainObject(tr) || !isPlainObject(l) || !isPlainObject(tx) || !isPlainObject(m)) {
        throw new Error("Invalid structure - expected Palette.");
    }

    let terrain = {
        ground: normalizeRgbList(t.ground),
        relief: normalizeInt(t.relief, -2147483648, 2147483647),
        sand: normalizeRgb(t.sand),
        plank: normalizeRgb(t.plank)
    };

    let houses = {
        roofLight: normalizeRgbList(h.roofLight),
        roofStroke: normalizeRgb(h.roofStroke),
        roofVariance: normalizeFloat(h.roofVariance, 0, 1),
        roofSlope: normalizeFloat(h.roofSlope, 0, 1),
        roofType: normalizeInt(h.roofType, -2147483648, 2147483647)
    };

    let roads = {
        road: normalizeRgb(r.road),
        largeRoad: normalizeFloat(r.largeRoad, 0, 8),
        smallRoad: normalizeFloat(r.smallRoad, 0, 8),
        outlineRoads: normalizeInt(r.outlineRoads, -2147483648, 2147483647),
        mergeRoads: normalizeBool(r.mergeRoads)
    };

    let fields = {
        fieldLight: normalizeRgbList(f.fieldLight),
        fieldFurrow: normalizeRgb(f.fieldFurrow),
        fieldVariance: normalizeFloat(f.fieldVariance, 0, 1),
        outlineFields: normalizeInt(f.outlineFields, -2147483648, 2147483647)
    };

    let water = {
        waterShallow: normalizeRgb(w.waterShallow),
        waterDeep: normalizeRgb(w.waterDeep),
        waterTide: normalizeRgb(w.waterTide),
        shallowBands: normalizeInt(w.shallowBands, 0, 10)
    };

    let trees = {
        tree: normalizeRgbList(tr.tree),
        thicket: normalizeRgb(tr.thicket),
        treeDetails: normalizeRgb(tr.treeDetails),
        treeVariance: normalizeFloat(tr.treeVariance, 0, 1),
        treeShape: normalizeInt(tr.treeShape, -2147483648, 2147483647)
    };

    let lighting = {
        shadowColor: normalizeRgb(l.shadowColor),
        shadowLength: normalizeFloat(l.shadowLength, 0, 4),
        shadowAngleDeg: normalizeInt(l.shadowAngleDeg, 0, 360),
        lights: normalizeRgb(l.lights)
    };

    let text = {
        fontHeader: normalizeFont(tx.fontHeader),
        fontPopulation: normalizeFont(tx.fontPopulation),
        fontNumber: normalizeFont(tx.fontNumber)
    };

    let misc = {
        ink: normalizeRgb(m.ink),
        paper: normalizeRgb(m.paper),
        strokeNormal: normalizeFloat(m.strokeNormal, 0.1, 4),
        strokeThin: normalizeFloat(m.strokeThin, 0.1, 4)
    };

    let protoObj = { terrain, houses, roads, fields, water, trees, lighting, text, misc };
    let err = DataProto.data.PaletteVillageObj.verify(protoObj);
    if (err) throw new Error("Invalid structure - expected Palette: " + err);
    return DataProto.data.PaletteVillageObj.fromObject(protoObj);
}

function fontToLegacy(f) {
    if (f == null) throw new Error("Invalid structure - expected Palette.");
    return {
        face: f.face != null && String(f.face).trim() !== "" ? f.face : null,
        size: f.size,
        bold: f.bold === true,
        italic: f.italic === true,
        embedded: f.embedded
    };
}

function rgbListToHex(list) {
    if (!Array.isArray(list) || list.length === 0) throw new Error("Invalid structure - expected Palette.");
    let out = [];
    for (let i = 0; i < list.length; i++) out.push(PaletteFunc.rgbObjToHex(list[i]));
    return out;
}

function enumToLegacyRelief(e) {
    if (e === DataProto.data.PaletteVillageReliefType.hachures) return "Hachures";
    if (e === DataProto.data.PaletteVillageReliefType.contours) return "Contours";
    if (e === DataProto.data.PaletteVillageReliefType.grass) return "Grass";
    throw new Error("Invalid structure - expected Palette.");
}

function enumToLegacyOutline(e) {
    if (e === DataProto.data.PaletteVillageOutlineType.hard) return "Hard";
    if (e === DataProto.data.PaletteVillageOutlineType.soft) return "Soft";
    if (e === DataProto.data.PaletteVillageOutlineType.none) return "None";
    throw new Error("Invalid structure - expected Palette.");
}

function enumToLegacyRoof(e) {
    if (e === DataProto.data.PaletteVillageRoofType.gable) return "Gable";
    if (e === DataProto.data.PaletteVillageRoofType.hip) return "Hip";
    if (e === DataProto.data.PaletteVillageRoofType.flat) return "Flat";
    if (e === DataProto.data.PaletteVillageRoofType.ruin) return "Ruin";
    throw new Error("Invalid structure - expected Palette.");
}

function enumToLegacyTreeShape(e) {
    if (e === DataProto.data.PaletteVillageTreeShapeType.cotton) return "Cotton";
    if (e === DataProto.data.PaletteVillageTreeShapeType.conifer) return "Conifer";
    if (e === DataProto.data.PaletteVillageTreeShapeType.palm) return "Palm";
    throw new Error("Invalid structure - expected Palette.");
}

export function paletteObjFromLegacyJsonText(text) {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e))); }

    assertExpectedLegacyRootType(DataProto.data.DataType.palette_village, obj);

    if (isPlainObject(obj) && isPlainObject(obj.terrain) && isPlainObject(obj.houses) && isPlainObject(obj.roads) && isPlainObject(obj.fields) && isPlainObject(obj.water) && isPlainObject(obj.trees) && isPlainObject(obj.lighting) && isPlainObject(obj.text) && isPlainObject(obj.misc)) {
        return normalizePaletteVillageObjLike(obj);
    }

    if (!isPlainObject(obj)) throw new Error("Invalid structure - expected Palette.");
    if (!hasAnyLegacyKey(obj)) throw new Error("Invalid structure - expected Palette.");

    let missing = [];

    let terrain = {};
    if (!hasVal(obj, "ground")) missing.push("ground"); else {
        let g = parseRgbList(obj.ground);
        if (g == null || g.length === 0) missing.push("ground"); else terrain.ground = g;
    }
    if (!hasVal(obj, "relief")) missing.push("relief"); else terrain.relief = legacyReliefToEnum(obj.relief);
    if (!hasVal(obj, "sand")) missing.push("sand"); else terrain.sand = parseRgb(obj.sand);
    if (!hasVal(obj, "plank")) missing.push("plank"); else terrain.plank = parseRgb(obj.plank);

    let houses = {};
    if (!hasVal(obj, "roofLight")) missing.push("roofLight"); else {
        let r = parseRgbList(obj.roofLight);
        if (r == null || r.length === 0) missing.push("roofLight"); else houses.roofLight = r;
    }
    if (!hasVal(obj, "roofStroke")) missing.push("roofStroke"); else houses.roofStroke = parseRgb(obj.roofStroke);
    if (!hasVal(obj, "roofVariance")) missing.push("roofVariance"); else houses.roofVariance = toFloatChecked(obj.roofVariance, 0, 1);
    if (!hasVal(obj, "roofSlope")) missing.push("roofSlope"); else houses.roofSlope = toFloatChecked(obj.roofSlope, 0, 1);
    if (!hasVal(obj, "roofType")) missing.push("roofType"); else houses.roofType = legacyRoofToEnum(obj.roofType);

    let roads = {};
    if (!hasVal(obj, "road")) missing.push("road"); else roads.road = parseRgb(obj.road);
    if (!hasVal(obj, "largeRoad")) missing.push("largeRoad"); else roads.largeRoad = toFloatChecked(obj.largeRoad, 0, 8);
    if (!hasVal(obj, "smallRoad")) missing.push("smallRoad"); else roads.smallRoad = toFloatChecked(obj.smallRoad, 0, 8);
    if (!hasVal(obj, "outlineRoads")) missing.push("outlineRoads"); else roads.outlineRoads = legacyOutlineToEnum(obj.outlineRoads);
    if (!hasVal(obj, "mergeRoads")) missing.push("mergeRoads"); else roads.mergeRoads = PaletteFunc.legacyBool(obj.mergeRoads);

    let fields = {};
    if (!hasVal(obj, "fieldLight")) missing.push("fieldLight"); else {
        let fl = parseRgbList(obj.fieldLight);
        if (fl == null || fl.length === 0) missing.push("fieldLight"); else fields.fieldLight = fl;
    }
    if (!hasVal(obj, "fieldFurrow")) missing.push("fieldFurrow"); else fields.fieldFurrow = parseRgb(obj.fieldFurrow);
    if (!hasVal(obj, "fieldVariance")) missing.push("fieldVariance"); else fields.fieldVariance = toFloatChecked(obj.fieldVariance, 0, 1);
    if (!hasVal(obj, "outlineFields")) missing.push("outlineFields"); else fields.outlineFields = legacyOutlineToEnum(obj.outlineFields);

    let water = {};
    if (!hasVal(obj, "waterShallow")) missing.push("waterShallow"); else water.waterShallow = parseRgb(obj.waterShallow);
    if (!hasVal(obj, "waterDeep")) missing.push("waterDeep"); else water.waterDeep = parseRgb(obj.waterDeep);
    if (!hasVal(obj, "waterTide")) missing.push("waterTide"); else water.waterTide = parseRgb(obj.waterTide);
    if (!hasVal(obj, "shallowBands")) missing.push("shallowBands"); else water.shallowBands = toIntChecked(obj.shallowBands, 0, 10);

    let trees = {};
    if (!hasVal(obj, "tree")) missing.push("tree"); else {
        let tr = parseRgbList(obj.tree);
        if (tr == null || tr.length === 0) missing.push("tree"); else trees.tree = tr;
    }
    if (!hasVal(obj, "thicket")) missing.push("thicket"); else trees.thicket = parseRgb(obj.thicket);
    if (!hasVal(obj, "treeDetails")) missing.push("treeDetails"); else trees.treeDetails = parseRgb(obj.treeDetails);
    if (!hasVal(obj, "treeVariance")) missing.push("treeVariance"); else trees.treeVariance = toFloatChecked(obj.treeVariance, 0, 1);
    if (!hasVal(obj, "treeShape")) missing.push("treeShape"); else trees.treeShape = legacyTreeShapeToEnum(obj.treeShape);

    let lighting = {};
    if (!hasVal(obj, "shadowColor")) missing.push("shadowColor"); else lighting.shadowColor = parseRgb(obj.shadowColor);
    if (!hasVal(obj, "shadowLength")) missing.push("shadowLength"); else lighting.shadowLength = toFloatChecked(obj.shadowLength, 0, 4);
    if (!hasVal(obj, "shadowAngle")) missing.push("shadowAngle"); else lighting.shadowAngleDeg = toIntChecked(obj.shadowAngle, 0, 360);
    if (!hasVal(obj, "lights")) missing.push("lights"); else lighting.lights = parseRgb(obj.lights);

    let textObj = {};
    if (!hasVal(obj, "fontHeader")) missing.push("fontHeader"); else textObj.fontHeader = parseFont(obj.fontHeader);
    if (!hasVal(obj, "fontPopulation")) missing.push("fontPopulation"); else textObj.fontPopulation = parseFont(obj.fontPopulation);
    if (!hasVal(obj, "fontNumber")) missing.push("fontNumber"); else textObj.fontNumber = parseFont(obj.fontNumber);

    let misc = {};
    if (!hasVal(obj, "ink")) missing.push("ink"); else misc.ink = parseRgb(obj.ink);
    if (!hasVal(obj, "paper")) missing.push("paper"); else misc.paper = parseRgb(obj.paper);
    if (!hasVal(obj, "strokeNormal")) missing.push("strokeNormal"); else misc.strokeNormal = toFloatChecked(obj.strokeNormal, 0.1, 4);
    if (!hasVal(obj, "strokeThin")) missing.push("strokeThin"); else misc.strokeThin = toFloatChecked(obj.strokeThin, 0.1, 4);

    if (missing.length) throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));

    return normalizePaletteVillageObjLike({ terrain, houses, roads, fields, water, trees, lighting, text: textObj, misc });
}

export function paletteLegacyJsonFromObj(p) {
    let n = normalizePaletteVillageObjLike(p);
    let t = n.terrain, h = n.houses, r = n.roads, f = n.fields, w = n.water, tr = n.trees, l = n.lighting, tx = n.text, m = n.misc;

    let out = {};

    out.ground = rgbListToHex(t.ground);
    out.relief = enumToLegacyRelief(t.relief);
    out.sand = PaletteFunc.rgbObjToHex(t.sand);
    out.plank = PaletteFunc.rgbObjToHex(t.plank);

    out.roofLight = rgbListToHex(h.roofLight);
    out.roofStroke = PaletteFunc.rgbObjToHex(h.roofStroke);
    out.roofVariance = PaletteFunc.fromFloat(h.roofVariance);
    out.roofSlope = PaletteFunc.fromFloat(h.roofSlope);
    out.roofType = enumToLegacyRoof(h.roofType);

    out.road = PaletteFunc.rgbObjToHex(r.road);
    out.largeRoad = PaletteFunc.fromFloat(r.largeRoad);
    out.smallRoad = PaletteFunc.fromFloat(r.smallRoad);
    out.outlineRoads = enumToLegacyOutline(r.outlineRoads);
    out.mergeRoads = r.mergeRoads === true ? "true" : "false";

    out.fieldLight = rgbListToHex(f.fieldLight);
    out.fieldFurrow = PaletteFunc.rgbObjToHex(f.fieldFurrow);
    out.fieldVariance = PaletteFunc.fromFloat(f.fieldVariance);
    out.outlineFields = enumToLegacyOutline(f.outlineFields);

    out.waterShallow = PaletteFunc.rgbObjToHex(w.waterShallow);
    out.waterDeep = PaletteFunc.rgbObjToHex(w.waterDeep);
    out.waterTide = PaletteFunc.rgbObjToHex(w.waterTide);
    out.shallowBands = String(w.shallowBands);

    out.tree = rgbListToHex(tr.tree);
    out.thicket = PaletteFunc.rgbObjToHex(tr.thicket);
    out.treeDetails = PaletteFunc.rgbObjToHex(tr.treeDetails);
    out.treeVariance = PaletteFunc.fromFloat(tr.treeVariance);
    out.treeShape = enumToLegacyTreeShape(tr.treeShape);

    out.shadowColor = PaletteFunc.rgbObjToHex(l.shadowColor);
    out.shadowLength = PaletteFunc.fromFloat(l.shadowLength);
    out.shadowAngle = String(l.shadowAngleDeg);
    out.lights = PaletteFunc.rgbObjToHex(l.lights);

    out.fontHeader = fontToLegacy(tx.fontHeader);
    out.fontPopulation = fontToLegacy(tx.fontPopulation);
    out.fontNumber = fontToLegacy(tx.fontNumber);

    out.ink = PaletteFunc.rgbObjToHex(m.ink);
    out.paper = PaletteFunc.rgbObjToHex(m.paper);
    out.strokeNormal = PaletteFunc.fromFloat(m.strokeNormal);
    out.strokeThin = PaletteFunc.fromFloat(m.strokeThin);

    return JSON.stringify(out, null, "  ");
}

export function paletteProtoBytesFromObj(p) {
    let n = normalizePaletteVillageObjLike(p);
    return DataProto.data.PaletteVillageObj.encode(n).finish();
}

export function decodePaletteFile(name, data) {
    let msg = decodeDataFromFile(DataProto.data.DataType.palette_village, paletteObjFromLegacyJsonText, data);
    return normalizePaletteVillageObjLike(msg);
}
