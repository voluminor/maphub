import * as DataProto from "../../struct/data.js";
import {toUint8Array, bytesToUtf8Text} from "./geo.js";
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
    { legacy: "strNormal10", min: 0.01, max: 0.5, target: ["strokes", "normalX100"] },
    { legacy: "strGrid10", min: 0.01, max: 0.5, target: ["strokes", "gridX100"] },
    { legacy: "alphaGrid", min: 0, max: 1, target: ["misc", "alphaGridX100"] },
    { legacy: "alphaAO", min: 0, max: 1, target: ["misc", "alphaAoX100"] },
    { legacy: "alphaLights", min: 0, max: 1, target: ["misc", "alphaLightsX100"] }
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

function okRgb(x) {
    return (
        x != null &&
        x.r != null && x.g != null && x.b != null &&
        x.r >= 0 && x.r <= 255 &&
        x.g >= 0 && x.g <= 255 &&
        x.b >= 0 && x.b <= 255
    );
}

function looksLikePaletteDwellingsObj(m) {
    if (m == null || m.colors == null || m.strokes == null || m.misc == null) return false;

    for (let i = 0; i < DW_COLOR_SPECS.length; i++) {
        if (!okRgb(m.colors[DW_COLOR_SPECS[i].proto])) return false;
    }

    if (m.strokes.normalX100 == null || m.strokes.normalX100 < 1 || m.strokes.normalX100 > 50) return false;
    if (m.strokes.gridX100 == null || m.strokes.gridX100 < 1 || m.strokes.gridX100 > 50) return false;

    if (m.misc.alphaGridX100 == null || m.misc.alphaGridX100 > 100) return false;
    if (m.misc.alphaAoX100 == null || m.misc.alphaAoX100 > 100) return false;
    if (m.misc.alphaLightsX100 == null || m.misc.alphaLightsX100 > 100) return false;

    if (m.misc.fontRoom == null) return false;
    if (m.misc.fontRoom.size == null || m.misc.fontRoom.size === 0) return false;

    if (m.misc.hatching == null) return false;

    return true;
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
        let v = PaletteFunc.toX100Float(obj[k2], s.min, s.max);
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

export function paletteDwellingsObjFromLegacyJsonText(text) {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e))); }
    return paletteDwellingsObjFromLegacyJson(obj);
}

export function paletteLegacyJsonFromPaletteDwellingsObj(pdo) {
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

    out.strNormal10 = PaletteFunc.fromX100Float(s.normalX100);
    out.strGrid10 = PaletteFunc.fromX100Float(s.gridX100);

    out.alphaGrid = PaletteFunc.fromX100Float(m.alphaGridX100);
    out.alphaAO = PaletteFunc.fromX100Float(m.alphaAoX100);
    out.alphaLights = PaletteFunc.fromX100Float(m.alphaLightsX100);

    out.fontRoom = {
        face: m.fontRoom?.face || "",
        size: m.fontRoom?.size || 0,
        bold: m.fontRoom?.bold === true,
        italic: m.fontRoom?.italic === true,
        embedded: m.fontRoom?.embedded || ""
    };

    out.hatching = m.hatching === true ? "true" : "false";

    return JSON.stringify(out, null, "  ");
}

export function paletteProtoBytesFromPaletteDwellingsObj(pdo) {
    return DataProto.data.PaletteDwellingsObj.encode(pdo).finish();
}

export function decodeDwellingsPaletteFromProtoBytes(bytes) {
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

    let pal = tryDecode(DataProto.data.PaletteDwellingsObj, b);
    if (pal.msg != null) {
        if (looksLikePaletteDwellingsObj(pal.msg)) return pal.msg;

        let city = tryDecode(DataProto.data.GeoObj, b);
        if (city.msg != null) throw new Error("These are City/Village, not Palette.");

        let dwell = tryDecode(DataProto.data.DwellingsObj, b);
        if (dwell.msg != null) throw new Error("These are Dwellings, not Palette.");

        let viewerPal = tryDecode(DataProto.data.PaletteViewerObj, b);
        if (viewerPal.msg != null) throw new Error("These are Palette (City/Village), not Palette.");

        throw new Error("Unknown data format - expected Palette: " + lastErr);
    }

    let city2 = tryDecode(DataProto.data.GeoObj, b);
    if (city2.msg != null) throw new Error("These are City/Village, not Palette.");

    let dwell2 = tryDecode(DataProto.data.DwellingsObj, b);
    if (dwell2.msg != null) throw new Error("These are Dwellings, not Palette.");

    let viewerPal2 = tryDecode(DataProto.data.PaletteViewerObj, b);
    if (viewerPal2.msg != null) throw new Error("These are Palette (City/Village), not Palette.");

    let errText = pal.err && pal.err.message ? pal.err.message : "unknown protobuf decode error";
    throw new Error("An error occurred while parsing: " + errText);
}

export function decodeDwellingsPaletteFromJsonText(text) {
    try {
        return paletteDwellingsObjFromLegacyJsonText(text);
    } catch (e) {
        let msg = e && e.message ? e.message : String(e);
        if (msg.indexOf("Unknown data format") === 0) throw e;
        if (msg.indexOf("These are ") === 0) throw e;
        throw new Error("An error occurred while parsing: " + msg);
    }
}

export function decodeDwellingsPaletteFile(name, data) {
    let ext = "";
    if (name != null) {
        let parts = String(name).split(".");
        if (parts.length > 1) ext = String(parts.pop()).toLowerCase();
    }
    if (ext === "pb") return decodeDwellingsPaletteFromProtoBytes(data);
    let text = bytesToUtf8Text(data);
    return decodeDwellingsPaletteFromJsonText(text);
}
