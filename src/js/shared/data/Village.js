import * as DataProto from "../../struct/data.js";
import { decodeDataFromFile } from "./data.js";
import * as PaletteFunc from "./palette.js";

function hasVal(o, k) {
    return Object.prototype.hasOwnProperty.call(o, k) && o[k] != null && o[k] !== "null";
}

function parseRgb(v) {
    let rgb = PaletteFunc.hexToRgbObj(v);
    if (rgb == null) throw new Error("Invalid palette structure.");
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
    throw new Error("Invalid palette structure.");
}

function toChecked(v, min, max) {
    let n = PaletteFunc.toFloat(v, min, max);
    if (n == null) return null;
    if (typeof min === "number" && n < Math.round(min * 10)) throw new Error("Invalid palette structure.");
    if (typeof max === "number" && n > Math.round(max * 10)) throw new Error("Invalid palette structure.");
    return n;
}

function toIntChecked(v, min, max) {
    let n = PaletteFunc.legacyInt(v);
    if (n == null) return null;
    if (typeof min === "number" && n < min) throw new Error("Invalid palette structure.");
    if (typeof max === "number" && n > max) throw new Error("Invalid palette structure.");
    return n;
}

function toBoolChecked(v) {
    return PaletteFunc.legacyBool(v);
}

function legacyReliefToEnum(v) {
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw new Error("Invalid palette structure.");
    let s = v.trim().toLowerCase();
    if (s === "hachures") return DataProto.data.PaletteVillageReliefType.hachures;
    if (s === "contours") return DataProto.data.PaletteVillageReliefType.contours;
    if (s === "grass") return DataProto.data.PaletteVillageReliefType.grass;
    throw new Error("Invalid palette structure.");
}

function legacyOutlineToEnum(v) {
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw new Error("Invalid palette structure.");
    let s = v.trim().toLowerCase();
    if (s === "hard") return DataProto.data.PaletteVillageOutlineType.hard;
    if (s === "soft") return DataProto.data.PaletteVillageOutlineType.soft;
    if (s === "none") return DataProto.data.PaletteVillageOutlineType.none;
    throw new Error("Invalid palette structure.");
}

function legacyRoofToEnum(v) {
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw new Error("Invalid palette structure.");
    let s = v.trim().toLowerCase();
    if (s === "gable") return DataProto.data.PaletteVillageRoofType.gable;
    if (s === "hip") return DataProto.data.PaletteVillageRoofType.hip;
    if (s === "flat") return DataProto.data.PaletteVillageRoofType.flat;
    if (s === "ruin") return DataProto.data.PaletteVillageRoofType.ruin;
    throw new Error("Invalid palette structure.");
}

function legacyTreeShapeToEnum(v) {
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw new Error("Invalid palette structure.");
    let s = v.trim().toLowerCase();
    if (s === "cotton") return DataProto.data.PaletteVillageTreeShapeType.cotton;
    if (s === "conifer") return DataProto.data.PaletteVillageTreeShapeType.conifer;
    if (s === "palm") return DataProto.data.PaletteVillageTreeShapeType.palm;
    throw new Error("Invalid palette structure.");
}

function parseFont(v) {
    if (v == null || typeof v !== "object" || Array.isArray(v)) throw new Error("Invalid palette structure.");
    let size = toIntChecked(v.size, 1, 1000);
    let bold = typeof v.bold === "boolean" ? v.bold : toBoolChecked(v.bold);
    let italic = typeof v.italic === "boolean" ? v.italic : toBoolChecked(v.italic);
    let embedded = typeof v.embedded === "string" ? v.embedded : null;
    if (size == null || bold == null || italic == null || embedded == null || embedded === "null") throw new Error("Invalid palette structure.");

    let out = { size: size, bold: bold, italic: italic, embedded: embedded };
    if (v.face != null && v.face !== "null") {
        if (typeof v.face !== "string") throw new Error("Invalid palette structure.");
        if (v.face.trim() !== "") out.face = v.face;
    }
    return out;
}

function fontToLegacy(f) {
    if (f == null) throw new Error("Invalid palette structure.");
    return {
        face: f.face != null && String(f.face).trim() !== "" ? f.face : null,
        size: f.size,
        bold: f.bold === true,
        italic: f.italic === true,
        embedded: f.embedded
    };
}

function rgbListToHex(list) {
    if (!Array.isArray(list) || list.length === 0) throw new Error("Invalid palette structure.");
    let out = [];
    for (let i = 0; i < list.length; i++) out.push(PaletteFunc.rgbObjToHex(list[i]));
    return out;
}

function enumToLegacyRelief(e) {
    if (e === DataProto.data.PaletteVillageReliefType.hachures) return "Hachures";
    if (e === DataProto.data.PaletteVillageReliefType.contours) return "Contours";
    if (e === DataProto.data.PaletteVillageReliefType.grass) return "Grass";
    throw new Error("Invalid palette structure.");
}

function enumToLegacyOutline(e) {
    if (e === DataProto.data.PaletteVillageOutlineType.hard) return "Hard";
    if (e === DataProto.data.PaletteVillageOutlineType.soft) return "Soft";
    if (e === DataProto.data.PaletteVillageOutlineType.none) return "None";
    throw new Error("Invalid palette structure.");
}

function enumToLegacyRoof(e) {
    if (e === DataProto.data.PaletteVillageRoofType.gable) return "Gable";
    if (e === DataProto.data.PaletteVillageRoofType.hip) return "Hip";
    if (e === DataProto.data.PaletteVillageRoofType.flat) return "Flat";
    if (e === DataProto.data.PaletteVillageRoofType.ruin) return "Ruin";
    throw new Error("Invalid palette structure.");
}

function enumToLegacyTreeShape(e) {
    if (e === DataProto.data.PaletteVillageTreeShapeType.cotton) return "Cotton";
    if (e === DataProto.data.PaletteVillageTreeShapeType.conifer) return "Conifer";
    if (e === DataProto.data.PaletteVillageTreeShapeType.palm) return "Palm";
    throw new Error("Invalid palette structure.");
}

export function paletteObjFromLegacyJsonText(text) {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e))); }

    if (obj != null && typeof obj === "object" && Array.isArray(obj.floors) && obj.features == null) throw new Error("These are Dwellings, not Palette.");
    if (obj != null && typeof obj === "object" && obj.type === "FeatureCollection" && Array.isArray(obj.features)) throw new Error("These are City/Village, not Palette.");

    if (obj == null || typeof obj !== "object" || Array.isArray(obj)) throw new Error("Invalid palette structure.");

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
    if (!hasVal(obj, "roofVariance")) missing.push("roofVariance"); else houses.roofVariance = toChecked(obj.roofVariance, 0, 1);
    if (!hasVal(obj, "roofSlope")) missing.push("roofSlope"); else houses.roofSlope = toChecked(obj.roofSlope, 0, 1);
    if (!hasVal(obj, "roofType")) missing.push("roofType"); else houses.roofType = legacyRoofToEnum(obj.roofType);

    let roads = {};
    if (!hasVal(obj, "road")) missing.push("road"); else roads.road = parseRgb(obj.road);
    if (!hasVal(obj, "largeRoad")) missing.push("largeRoad"); else roads.largeRoad = toChecked(obj.largeRoad, 0, 8);
    if (!hasVal(obj, "smallRoad")) missing.push("smallRoad"); else roads.smallRoad = toChecked(obj.smallRoad, 0, 8);
    if (!hasVal(obj, "outlineRoads")) missing.push("outlineRoads"); else roads.outlineRoads = legacyOutlineToEnum(obj.outlineRoads);
    if (!hasVal(obj, "mergeRoads")) missing.push("mergeRoads"); else roads.mergeRoads = toBoolChecked(obj.mergeRoads);

    let fields = {};
    if (!hasVal(obj, "fieldLight")) missing.push("fieldLight"); else {
        let fl = parseRgbList(obj.fieldLight);
        if (fl == null || fl.length === 0) missing.push("fieldLight"); else fields.fieldLight = fl;
    }
    if (!hasVal(obj, "fieldFurrow")) missing.push("fieldFurrow"); else fields.fieldFurrow = parseRgb(obj.fieldFurrow);
    if (!hasVal(obj, "fieldVariance")) missing.push("fieldVariance"); else fields.fieldVariance = toChecked(obj.fieldVariance, 0, 1);
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
    if (!hasVal(obj, "treeVariance")) missing.push("treeVariance"); else trees.treeVariance = toChecked(obj.treeVariance, 0, 1);
    if (!hasVal(obj, "treeShape")) missing.push("treeShape"); else trees.treeShape = legacyTreeShapeToEnum(obj.treeShape);

    let lighting = {};
    if (!hasVal(obj, "shadowColor")) missing.push("shadowColor"); else lighting.shadowColor = parseRgb(obj.shadowColor);
    if (!hasVal(obj, "shadowLength")) missing.push("shadowLength"); else lighting.shadowLength = toChecked(obj.shadowLength, 0, 4);
    if (!hasVal(obj, "shadowAngle")) missing.push("shadowAngle"); else lighting.shadowAngleDeg = toIntChecked(obj.shadowAngle, 0, 360);
    if (!hasVal(obj, "lights")) missing.push("lights"); else lighting.lights = parseRgb(obj.lights);

    let textObj = {};
    if (!hasVal(obj, "fontHeader")) missing.push("fontHeader"); else textObj.fontHeader = parseFont(obj.fontHeader);
    if (!hasVal(obj, "fontPopulation")) missing.push("fontPopulation"); else textObj.fontPopulation = parseFont(obj.fontPopulation);
    if (!hasVal(obj, "fontNumber")) missing.push("fontNumber"); else textObj.fontNumber = parseFont(obj.fontNumber);

    let misc = {};
    if (!hasVal(obj, "ink")) missing.push("ink"); else misc.ink = parseRgb(obj.ink);
    if (!hasVal(obj, "paper")) missing.push("paper"); else misc.paper = parseRgb(obj.paper);
    if (!hasVal(obj, "strokeNormal")) missing.push("strokeNormal"); else misc.strokeNormal = toChecked(obj.strokeNormal, 0.1, 4);
    if (!hasVal(obj, "strokeThin")) missing.push("strokeThin"); else misc.strokeThin = toChecked(obj.strokeThin, 0.1, 4);

    if (missing.length) throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));

    let protoObj = { terrain: terrain, houses: houses, roads: roads, fields: fields, water: water, trees: trees, lighting: lighting, text: textObj, misc: misc };
    let err = DataProto.data.PaletteVillageObj.verify(protoObj);
    if (err) throw new Error("Invalid palette structure: " + err);
    return DataProto.data.PaletteVillageObj.fromObject(protoObj);
}

export function paletteLegacyJsonFromObj(p) {
    let t = p?.terrain, h = p?.houses, r = p?.roads, f = p?.fields, w = p?.water, tr = p?.trees, l = p?.lighting, tx = p?.text, m = p?.misc;
    if (t == null || h == null || r == null || f == null || w == null || tr == null || l == null || tx == null || m == null) throw new Error("Invalid palette structure.");

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

export function decodePaletteFile(name, data) {
    return decodeDataFromFile("PaletteVillageObj", paletteObjFromLegacyJsonText, data);
}
