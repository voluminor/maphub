import * as DataProto from "../../struct/data.js";
import { assertExpectedLegacyRootType, decodeDataFromFile } from "./data.js";
import * as PaletteFunc from "./palette.js";

const LEGACY_KEYS = [
    "ink", "marks", "tree", "ground", "treeDetails", "thicket",
    "water", "shallow", "sand",
    "shadowColor", "shadowLength", "shadowAngle", "shadowDir",
    "road", "roadOutline",
    "treeVariance", "treeBands", "treeShape",
    "strokeNormal", "strokeThin", "strokeGrid",
    "grassLength", "roadWidth", "roadWiggle"
];

function isPlainObject(o) {
    return o != null && typeof o === "object" && !Array.isArray(o);
}

function getProp(obj, key) {
    if (obj && typeof obj === "object") {
        if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
        let snake = key.replace(/[A-Z]/g, m => "_" + m.toLowerCase());
        if (Object.prototype.hasOwnProperty.call(obj, snake)) return obj[snake];
    }
    return undefined;
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

function normalizeFloat(v, min, max) {
    if (typeof v !== "number" || !Number.isFinite(v)) throw new Error("Invalid structure - expected Palette.");
    if (v < min || v > max) throw new Error("Invalid structure - expected Palette.");
    return v;
}

function normalizeInt(v, min, max) {
    if (typeof v !== "number" || !Number.isFinite(v) || (v | 0) !== v) throw new Error("Invalid structure - expected Palette.");
    let n = v | 0;
    if (n < min || n > max) throw new Error("Invalid structure - expected Palette.");
    return n;
}

function normalizePaletteGladeObjLike(pLike) {
    if (!isPlainObject(pLike)) throw new Error("Invalid structure - expected Palette.");

    let c = pLike.colors;
    let t = pLike.trees;
    let sh = pLike.shadow;
    let st = pLike.strokes;
    let ms = pLike.misc;

    if (!isPlainObject(c) || !isPlainObject(t) || !isPlainObject(sh) || !isPlainObject(st) || !isPlainObject(ms)) {
        throw new Error("Invalid structure - expected Palette.");
    }

    let ink = c.ink;
    let ground = c.ground;
    let thicket = c.thicket;
    let tree = c.tree;
    let waterDeep = c.waterDeep;
    let shadowColor = c.shadowColor;
    let road = c.road;

    if (ink == null || ground == null || thicket == null || tree == null || waterDeep == null || shadowColor == null || road == null) {
        throw new Error("Invalid structure - expected Palette.");
    }

    let colors = {
        ink: normalizeRgb(ink),
        ground: normalizeRgb(ground),
        thicket: normalizeRgb(thicket),
        tree: normalizeRgbList(tree),
        waterDeep: normalizeRgb(waterDeep),
        shadowColor: normalizeRgb(shadowColor),
        road: normalizeRgb(road)
    };

    colors.marks = normalizeRgb(c.marks != null ? c.marks : colors.ink);
    colors.treeDetails = normalizeRgb(c.treeDetails != null ? c.treeDetails : colors.ink);
    colors.waterShallow = normalizeRgb(c.waterShallow != null ? c.waterShallow : colors.waterDeep);
    colors.sand = normalizeRgb(c.sand != null ? c.sand : colors.ink);
    colors.roadOutline = normalizeRgb(c.roadOutline != null ? c.roadOutline : colors.ink);

    let trees = {
        variance: normalizeFloat(t.variance, 0, 1),
        bands: t.bands == null ? 3 : normalizeInt(t.bands, 0, 100),
        shape: typeof t.shape === "string" && t.shape.trim() !== "" ? t.shape : "Cotton"
    };

    let shadow = {
        length: normalizeFloat(sh.length, 0, 3),
        angleDeg: sh.angleDeg == null ? 0 : normalizeInt(sh.angleDeg, 0, 360)
    };

    let strokes = {
        normal: normalizeFloat(st.normal, 0.1, 10),
        thin: normalizeFloat(st.thin, 0.1, 10),
        grid: normalizeFloat(st.grid, 0.1, 10)
    };

    let misc = {
        grassLength: ms.grassLength == null ? 10 : normalizeInt(ms.grassLength, 0, 1000),
        roadWidth: ms.roadWidth == null ? 0.5 : normalizeFloat(ms.roadWidth, 0, 1),
        roadWiggle: ms.roadWiggle == null ? 0.5 : normalizeFloat(ms.roadWiggle, 0, 1)
    };

    let protoObj = { colors, trees, shadow, strokes, misc };
    let err = DataProto.data.PaletteGladeObj.verify(protoObj);
    if (err) throw new Error("Invalid structure - expected Palette: " + err);
    return DataProto.data.PaletteGladeObj.fromObject(protoObj);
}

function hasAnyLegacyKey(obj) {
    if (!isPlainObject(obj)) return false;
    for (let i = 0; i < LEGACY_KEYS.length; i++) if (Object.prototype.hasOwnProperty.call(obj, LEGACY_KEYS[i])) return true;
    return false;
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

export function paletteObjFromLegacyJsonText(text) {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e))); }

    assertExpectedLegacyRootType(DataProto.data.DataType.palette_glade, obj);

    if (isPlainObject(obj) && isPlainObject(obj.colors) && isPlainObject(obj.trees) && isPlainObject(obj.shadow) && isPlainObject(obj.strokes) && isPlainObject(obj.misc)) {
        return normalizePaletteGladeObjLike(obj);
    }

    if (!isPlainObject(obj)) throw new Error("Invalid structure - expected Palette.");
    if (!hasAnyLegacyKey(obj)) throw new Error("Invalid structure - expected Palette.");

    let missing = [];

    let inkV = getProp(obj, "ink");
    let groundV = getProp(obj, "ground");
    let thicketV = getProp(obj, "thicket");
    let treeV = getProp(obj, "tree");
    let waterV = getProp(obj, "water");
    let shadowColorV = getProp(obj, "shadowColor");
    let roadV = getProp(obj, "road");

    if (inkV == null || inkV === "null") missing.push("ink");
    if (groundV == null || groundV === "null") missing.push("ground");
    if (thicketV == null || thicketV === "null") missing.push("thicket");
    if (treeV == null || treeV === "null") missing.push("tree");
    if (waterV == null || waterV === "null") missing.push("water");
    if (shadowColorV == null || shadowColorV === "null") missing.push("shadowColor");
    if (roadV == null || roadV === "null") missing.push("road");

    let treeVarianceV = getProp(obj, "treeVariance");
    let treeBandsV = getProp(obj, "treeBands");
    let shadowLengthV = getProp(obj, "shadowLength");
    let strokeNormalV = getProp(obj, "strokeNormal");
    let strokeThinV = getProp(obj, "strokeThin");
    let strokeGridV = getProp(obj, "strokeGrid");

    if (treeVarianceV == null || treeVarianceV === "null") missing.push("treeVariance");
    if (treeBandsV == null || treeBandsV === "null") missing.push("treeBands");
    if (shadowLengthV == null || shadowLengthV === "null") missing.push("shadowLength");
    if (strokeNormalV == null || strokeNormalV === "null") missing.push("strokeNormal");
    if (strokeThinV == null || strokeThinV === "null") missing.push("strokeThin");
    if (strokeGridV == null || strokeGridV === "null") missing.push("strokeGrid");

    let grassLengthV = getProp(obj, "grassLength");
    if (grassLengthV == null || grassLengthV === "null") missing.push("grassLength");

    if (missing.length) throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));

    let ink = parseRgb(inkV);
    let ground = parseRgb(groundV);
    let thicket = parseRgb(thicketV);
    let tree = parseRgbList(treeV);
    if (tree == null || tree.length === 0) throw PaletteFunc.unknownPalette();
    let waterDeep = parseRgb(waterV);
    let shadowColor = parseRgb(shadowColorV);
    let road = parseRgb(roadV);

    let marksRaw = getProp(obj, "marks");
    let marks = marksRaw != null && marksRaw !== "null" ? parseRgb(marksRaw) : ink;

    let treeDetailsRaw = getProp(obj, "treeDetails");
    let treeDetails = treeDetailsRaw != null && treeDetailsRaw !== "null" ? parseRgb(treeDetailsRaw) : ink;

    let shallowRaw = getProp(obj, "shallow");
    let waterShallow = shallowRaw != null && shallowRaw !== "null" ? parseRgb(shallowRaw) : waterDeep;

    let sandRaw = getProp(obj, "sand");
    let sand = sandRaw != null && sandRaw !== "null" ? parseRgb(sandRaw) : ink;

    let roadOutlineRaw = getProp(obj, "roadOutline");
    let roadOutline = roadOutlineRaw != null && roadOutlineRaw !== "null" ? parseRgb(roadOutlineRaw) : ink;

    let treeVariance = PaletteFunc.toFloat(treeVarianceV, 0, 1);
    let treeBands = PaletteFunc.legacyInt(treeBandsV);
    if (treeBands == null) throw PaletteFunc.unknownPalette();

    let treeShapeRaw = getProp(obj, "treeShape");
    let treeShape = typeof treeShapeRaw === "string" && treeShapeRaw.trim() !== "" ? treeShapeRaw : "Cotton";

    let shadowLength = PaletteFunc.toFloat(shadowLengthV, 0, 3);

    let angleRaw = getProp(obj, "shadowAngle");
    let dirRaw = getProp(obj, "shadowDir");
    let angle1 = PaletteFunc.legacyInt(angleRaw);
    let angle2 = PaletteFunc.legacyInt(dirRaw);
    let angle = 0;
    if (angle1 != null && angle1 > 0) angle = angle1;
    else if (angle2 != null && angle2 > 0) angle = angle2;

    let strokeNormal = PaletteFunc.toFloat(strokeNormalV, 0.1, 10);
    let strokeThin = PaletteFunc.toFloat(strokeThinV, 0.1, 10);
    let strokeGrid = PaletteFunc.toFloat(strokeGridV, 0.1, 10);

    let grassLength = PaletteFunc.legacyInt(grassLengthV);
    if (grassLength == null) throw PaletteFunc.unknownPalette();

    let roadWidth = PaletteFunc.toFloat(getProp(obj, "roadWidth"), 0, 1);
    let roadWiggle = PaletteFunc.toFloat(getProp(obj, "roadWiggle"), 0, 1);

    let protoObj = {
        colors: {
            ground,
            ink,
            marks,
            tree,
            treeDetails,
            thicket,
            waterDeep,
            waterShallow,
            sand,
            shadowColor,
            road,
            roadOutline
        },
        trees: {
            variance: treeVariance,
            bands: treeBands | 0,
            shape: treeShape
        },
        shadow: {
            length: shadowLength,
            angleDeg: angle
        },
        strokes: {
            normal: strokeNormal,
            thin: strokeThin,
            grid: strokeGrid
        },
        misc: {
            grassLength: grassLength | 0,
            roadWidth: roadWidth,
            roadWiggle: roadWiggle
        }
    };

    return normalizePaletteGladeObjLike(protoObj);
}

export function paletteLegacyJsonFromObj(p) {
    let m = normalizePaletteGladeObjLike(p);

    let c = m.colors;
    let t = m.trees;
    let s = m.shadow;
    let st = m.strokes;
    let ms = m.misc;

    let out = {};

    out.thicket = PaletteFunc.rgbObjToHex(c.thicket);
    out.ground = PaletteFunc.rgbObjToHex(c.ground);
    out.ink = PaletteFunc.rgbObjToHex(c.ink);
    out.marks = PaletteFunc.rgbObjToHex(c.marks);

    out.tree = c.tree.map(PaletteFunc.rgbObjToHex);
    out.treeDetails = PaletteFunc.rgbObjToHex(c.treeDetails);
    out.treeVariance = PaletteFunc.fromFloat(t.variance);
    out.treeBands = String(t.bands | 0);
    out.treeShape = t.shape;

    out.water = PaletteFunc.rgbObjToHex(c.waterDeep);
    out.shallow = PaletteFunc.rgbObjToHex(c.waterShallow);
    out.sand = PaletteFunc.rgbObjToHex(c.sand);

    out.shadowColor = PaletteFunc.rgbObjToHex(c.shadowColor);
    out.shadowLength = PaletteFunc.fromFloat(s.length);
    out.shadowAngle = String(s.angleDeg | 0);

    out.road = PaletteFunc.rgbObjToHex(c.road);
    out.roadOutline = PaletteFunc.rgbObjToHex(c.roadOutline);
    out.roadWidth = PaletteFunc.fromFloat(ms.roadWidth);
    out.roadWiggle = PaletteFunc.fromFloat(ms.roadWiggle);

    out.strokeNormal = PaletteFunc.fromFloat(st.normal);
    out.strokeThin = PaletteFunc.fromFloat(st.thin);
    out.strokeGrid = PaletteFunc.fromFloat(st.grid);

    out.grassLength = String(ms.grassLength | 0);

    return JSON.stringify(out, null, "  ");
}

export function paletteProtoBytesFromObj(m) {
    let n = normalizePaletteGladeObjLike(m);
    return DataProto.data.PaletteGladeObj.encode(n).finish();
}

export function decodePaletteFile(name, data) {
    let msg = decodeDataFromFile(DataProto.data.DataType.palette_glade, paletteObjFromLegacyJsonText, data);
    return normalizePaletteGladeObjLike(msg);
}
