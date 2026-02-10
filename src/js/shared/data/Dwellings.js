import * as DataProto from "../../struct/data.js";
import { decodeDataFromFile } from "./data.js";
import * as PaletteFunc from "./palette.js";

const DW_COLOR_SPECS = [
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

const DW_FLOAT_SPECS = [
    { legacy: "strNormal10", min: 0.01, max: 0.5, target: ["strokes", "normal"] },
    { legacy: "strGrid10", min: 0.01, max: 0.5, target: ["strokes", "grid"] },
    { legacy: "alphaGrid", min: 0, max: 1, target: ["misc", "alphaGrid"] },
    { legacy: "alphaAO", min: 0, max: 1, target: ["misc", "alphaAo"] },
    { legacy: "alphaLights", min: 0, max: 1, target: ["misc", "alphaLights"] }
];

function isPaletteViewerLegacyJson(obj) {
    return obj != null && typeof obj === "object" && !Array.isArray(obj) && Object.prototype.hasOwnProperty.call(obj, "ground");
}

function isDwellingsObjJson(obj) {
    return obj != null && typeof obj === "object" && Array.isArray(obj.floors) && obj.features == null;
}

function isCityGeoJson(obj) {
    return obj != null && typeof obj === "object" && obj.type === "FeatureCollection" && Array.isArray(obj.features);
}

export function paletteDwellingsObjFromLegacyJson(json) {
    let obj = json;

    if (isDwellingsObjJson(obj)) throw new Error("These are Dwellings, not Palette.");
    if (isCityGeoJson(obj)) throw new Error("These are City/Village, not Palette.");
    if (isPaletteViewerLegacyJson(obj)) throw new Error("These are Palette (City/Village), not Palette.");

    if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
        throw new Error("Unknown data format - expected Palette.");
    }

    let missing = [];

    let colors = {};
    for (let i = 0; i < DW_COLOR_SPECS.length; i++) {
        let k = DW_COLOR_SPECS[i].legacy;
        if (!Object.prototype.hasOwnProperty.call(obj, k) || obj[k] == null || obj[k] === "null") { missing.push(k); continue; }
        let rgb = PaletteFunc.hexToRgbObj(obj[k]);
        if (rgb == null) throw new Error("Unknown data format - expected Palette.");
        colors[DW_COLOR_SPECS[i].proto] = rgb;
    }

    let strokes = {};
    let misc = {};

    for (let i2 = 0; i2 < DW_FLOAT_SPECS.length; i2++) {
        let s = DW_FLOAT_SPECS[i2];
        let k2 = s.legacy;
        if (!Object.prototype.hasOwnProperty.call(obj, k2) || obj[k2] == null || obj[k2] === "null") { missing.push(k2); continue; }
        let v = PaletteFunc.toFloat(obj[k2], s.min, s.max);
        if (s.target[0] === "strokes") strokes[s.target[1]] = v;
        else misc[s.target[1]] = v;
    }

    if (!Object.prototype.hasOwnProperty.call(obj, "hatching") || obj.hatching == null || obj.hatching === "null") missing.push("hatching");
    else misc.hatching = PaletteFunc.legacyBool(obj.hatching);

    if (!Object.prototype.hasOwnProperty.call(obj, "fontRoom") || obj.fontRoom == null || obj.fontRoom === "null") missing.push("fontRoom");
    else {
        let f = obj.fontRoom;
        if (typeof f !== "object" || Array.isArray(f)) throw new Error("Unknown data format - expected Palette.");
        let face = typeof f.face === "string" ? f.face : "";
        let embedded = typeof f.embedded === "string" ? f.embedded : "";
        let size = typeof f.size === "number" ? (f.size | 0) : (typeof f.size === "string" ? (parseInt(f.size, 10) | 0) : 0);
        let bold = f.bold === true;
        let italic = f.italic === true;
        if (!Number.isFinite(size) || size <= 0) throw new Error("Unknown data format - expected Palette.");
        misc.fontRoom = { face, embedded, size, bold, italic };
    }

    if (missing.length) {
        throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));
    }

    let protoObj = { colors, strokes, misc };
    let err = DataProto.data.PaletteDwellingsObj.verify(protoObj);
    if (err) throw new Error("Unknown data format - expected Palette: " + err);
    return DataProto.data.PaletteDwellingsObj.fromObject(protoObj);
}

export function paletteObjFromLegacyJsonText(text) {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e))); }
    return paletteDwellingsObjFromLegacyJson(obj);
}

export function paletteLegacyJsonFromObj(pdo) {
    let c = pdo?.colors, s = pdo?.strokes, m = pdo?.misc;
    if (c == null || s == null || m == null) throw new Error("Unknown data format - expected Palette.");
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
        face: m.fontRoom?.face || "Share Tech Regular",
        size: m.fontRoom?.size || 0,
        bold: m.fontRoom?.bold === true,
        italic: m.fontRoom?.italic === true,
        embedded: m.fontRoom?.embedded || ""
    };

    out.hatching = m.hatching === true ? "true" : "false";

    return JSON.stringify(out, null, "  ");
}

export function decodePaletteFile(name, data) {
    return decodeDataFromFile("PaletteDwellingsObj", paletteObjFromLegacyJsonText, data);
}
