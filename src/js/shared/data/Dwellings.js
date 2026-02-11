import * as DataProto from "../../struct/data.js";
import { assertExpectedLegacyRootType, decodeDataFromFile, encodeDataToBytes } from "./data.js";
import * as PaletteFunc from "./palette.js";
import * as FuncBin from "./bin-verify.js";

const COLOR_SPECS = [
    { legacy: "colorInk", proto: "ink" },
    { legacy: "colorPaper", proto: "paper" },
    { legacy: "colorFloor", proto: "floor" },
    { legacy: "colorWalls", proto: "walls" },
    { legacy: "colorProps", proto: "props" },
    { legacy: "colorWindows", proto: "windows" },
    { legacy: "colorStairs", proto: "stairs" },
    { legacy: "colorRoof", proto: "roof" },
    { legacy: "colorLabels", proto: "labels" }
];

const FLOAT_SPECS = [
    { legacy: "strNormal10", min: 0.01, max: 0.5, target: ["strokes", "normal"] },
    { legacy: "strGrid10", min: 0.01, max: 0.5, target: ["strokes", "grid"] },
    { legacy: "alphaGrid", min: 0, max: 1, target: ["misc", "alphaGrid"] },
    { legacy: "alphaAO", min: 0, max: 1, target: ["misc", "alphaAo"] },
    { legacy: "alphaLights", min: 0, max: 1, target: ["misc", "alphaLights"] }
];

const LEGACY_KEYS = [
    "colorInk", "colorPaper", "colorFloor", "colorWalls", "colorProps", "colorWindows", "colorStairs", "colorRoof", "colorLabels",
    "strNormal10", "strGrid10", "alphaGrid", "alphaAO", "alphaLights",
    "fontRoom", "hatching"
];

function isPlainObject(o) {
    return o != null && typeof o === "object" && !Array.isArray(o);
}

function normalizeRgb(rgb) {
    PaletteFunc.rgbObjToHex(rgb);
    return rgb;
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

function normalizeBool(v) {
    if (typeof v !== "boolean") throw new Error("Invalid structure - expected Palette.");
    return v;
}

function normalizeFontRoom(f) {
    if (!isPlainObject(f)) throw new Error("Invalid structure - expected Palette.");
    let face = typeof f.face === "string" ? f.face : "";
    let embedded = typeof f.embedded === "string" ? f.embedded : "";
    let size = normalizeInt(f.size, 1, 1000);
    let bold = normalizeBool(f.bold);
    let italic = normalizeBool(f.italic);
    return { face, embedded, size, bold, italic };
}

function normalizePaletteDwellingsObjLike(pdoLike) {
    if (!isPlainObject(pdoLike)) throw new Error("Invalid structure - expected Palette.");
    let c = pdoLike.colors;
    let s = pdoLike.strokes;
    let m = pdoLike.misc;
    if (!isPlainObject(c) || !isPlainObject(s) || !isPlainObject(m)) throw new Error("Invalid structure - expected Palette.");

    let colors = {};
    for (let i = 0; i < COLOR_SPECS.length; i++) {
        let k = COLOR_SPECS[i].proto;
        if (c[k] == null) throw new Error("Invalid structure - expected Palette.");
        colors[k] = normalizeRgb(c[k]);
    }

    let strokes = {
        normal: normalizeFloat(s.normal, 0.01, 0.5),
        grid: normalizeFloat(s.grid, 0.01, 0.5)
    };

    let misc = {
        alphaGrid: normalizeFloat(m.alphaGrid, 0, 1),
        alphaAo: normalizeFloat(m.alphaAo, 0, 1),
        alphaLights: normalizeFloat(m.alphaLights, 0, 1),
        fontRoom: normalizeFontRoom(m.fontRoom),
        hatching: normalizeBool(m.hatching)
    };

    let protoObj = { colors, strokes, misc };
    let err = DataProto.data.PaletteDwellingsObj.verify(protoObj);
    if (err) throw new Error("Invalid structure - expected Palette: " + err);
    return DataProto.data.PaletteDwellingsObj.fromObject(protoObj);
}

function hasAnyLegacyKey(obj) {
    if (!isPlainObject(obj)) return false;
    for (let i = 0; i < LEGACY_KEYS.length; i++) if (Object.prototype.hasOwnProperty.call(obj, LEGACY_KEYS[i])) return true;
    return false;
}

function parseLegacyFontRoom(v) {
    if (!isPlainObject(v)) throw PaletteFunc.unknownPalette();
    let face = typeof v.face === "string" ? v.face : "";
    let embedded = typeof v.embedded === "string" ? v.embedded : "";
    let size = PaletteFunc.legacyInt(v.size);
    if (size == null || size <= 0 || size > 1000) throw PaletteFunc.unknownPalette();
    let bold = v.bold === true ? true : (v.bold === false ? false : PaletteFunc.legacyBool(v.bold));
    let italic = v.italic === true ? true : (v.italic === false ? false : PaletteFunc.legacyBool(v.italic));
    if (bold == null || italic == null) throw PaletteFunc.unknownPalette();
    return { face, embedded, size: size | 0, bold, italic };
}

function paletteDwellingsObjFromLegacyJsonInternal(obj) {
    if (!isPlainObject(obj)) throw PaletteFunc.unknownPalette();
    if (Array.isArray(obj.floors) && obj.features == null) throw new Error("Dwellings, not Palette.");

    assertExpectedLegacyRootType(DataProto.data.DataType.palette_dwellings, obj);

    if (isPlainObject(obj.colors) && isPlainObject(obj.strokes) && isPlainObject(obj.misc)) {
        return normalizePaletteDwellingsObjLike(obj);
    }

    if (!hasAnyLegacyKey(obj)) throw new Error("Invalid structure - expected Palette.");

    let missing = [];

    let colors = {};
    for (let i = 0; i < COLOR_SPECS.length; i++) {
        let k = COLOR_SPECS[i].legacy;
        if (!Object.prototype.hasOwnProperty.call(obj, k) || obj[k] == null || obj[k] === "null") { missing.push(k); continue; }
        let rgb = PaletteFunc.hexToRgbObj(obj[k]);
        if (rgb == null) throw PaletteFunc.unknownPalette();
        colors[COLOR_SPECS[i].proto] = rgb;
    }

    let strokes = {};
    let misc = {};

    for (let i2 = 0; i2 < FLOAT_SPECS.length; i2++) {
        let spec = FLOAT_SPECS[i2];
        let k2 = spec.legacy;
        if (!Object.prototype.hasOwnProperty.call(obj, k2) || obj[k2] == null || obj[k2] === "null") { missing.push(k2); continue; }
        let v = PaletteFunc.toFloat(obj[k2], spec.min, spec.max);
        if (spec.target[0] === "strokes") strokes[spec.target[1]] = v;
        else misc[spec.target[1]] = v;
    }

    if (!Object.prototype.hasOwnProperty.call(obj, "hatching") || obj.hatching == null || obj.hatching === "null") missing.push("hatching");
    else misc.hatching = PaletteFunc.legacyBool(obj.hatching);

    if (!Object.prototype.hasOwnProperty.call(obj, "fontRoom") || obj.fontRoom == null || obj.fontRoom === "null") missing.push("fontRoom");
    else misc.fontRoom = parseLegacyFontRoom(obj.fontRoom);

    if (missing.length) throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));

    return normalizePaletteDwellingsObjLike({ colors, strokes, misc });
}

export function paletteObjFromLegacyJsonText(text) {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e))); }
    return paletteDwellingsObjFromLegacyJsonInternal(obj);
}

export function paletteDwellingsObjFromLegacyJson(obj) {
    return paletteDwellingsObjFromLegacyJsonInternal(obj);
}

export function paletteLegacyJsonFromObj(pdo) {
    let n = normalizePaletteDwellingsObjLike(pdo);
    let c = n.colors;
    let s = n.strokes;
    let m = n.misc;

    let out = {};

    out.colorInk = PaletteFunc.rgbObjToHex(c.ink);
    out.colorPaper = PaletteFunc.rgbObjToHex(c.paper);
    out.colorFloor = PaletteFunc.rgbObjToHex(c.floor);
    out.colorWalls = PaletteFunc.rgbObjToHex(c.walls);
    out.colorProps = PaletteFunc.rgbObjToHex(c.props);
    out.colorWindows = PaletteFunc.rgbObjToHex(c.windows);
    out.colorStairs = PaletteFunc.rgbObjToHex(c.stairs);
    out.colorRoof = PaletteFunc.rgbObjToHex(c.roof);
    out.colorLabels = PaletteFunc.rgbObjToHex(c.labels);

    out.strNormal10 = PaletteFunc.fromFloat(s.normal);
    out.strGrid10 = PaletteFunc.fromFloat(s.grid);

    out.alphaGrid = PaletteFunc.fromFloat(m.alphaGrid);
    out.alphaAO = PaletteFunc.fromFloat(m.alphaAo);
    out.alphaLights = PaletteFunc.fromFloat(m.alphaLights);

    out.fontRoom = {
        face: m.fontRoom.face,
        size: m.fontRoom.size,
        bold: m.fontRoom.bold === true,
        italic: m.fontRoom.italic === true,
        embedded: m.fontRoom.embedded
    };

    out.hatching = m.hatching === true ? "true" : "false";

    return JSON.stringify(out, null, "  ");
}

export function paletteProtoBytesFromObj(pdo) {
    let n = normalizePaletteDwellingsObjLike(pdo);
    let raw = DataProto.data.PaletteDwellingsObj.encode(n).finish();
    return encodeDataToBytes(DataProto.data.DataType.palette_dwellings, raw);
}

export function decodePaletteFile(name, data) {
    let msg = decodeDataFromFile(DataProto.data.DataType.palette_dwellings, paletteObjFromLegacyJsonText, data);
    return normalizePaletteDwellingsObjLike(msg);
}
