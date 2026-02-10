import * as DataProto from "../../struct/data.js";
import {toUint8Array, bytesToUtf8Text} from "./geo.js";
import * as PaletteFunc from "./palette.js";

const PALETTE_COLOR_KEYS = ["ground","fields","greens","foliage","roads","water","walls1","walls2","roofs1","roofs2"];
const PALETTE_LIGHTING_COLOR_KEYS = ["sky1","sky2","sun","windows"];
const PALETTE_FLOAT_SPECS = {
    sun_pos: { min: 0, max: 90, prop: "sunPosX10" },
    ambience: { min: 0, max: 1, prop: "ambienceX10" },
    lighted: { min: 0, max: 1, prop: "lightedX10" },
    pitch: { min: 0, max: 2, prop: "pitchX10" }
};

function legacyTowersToEnum(v) {
    if (v === null || v === undefined) return null;
    if (v === "null") return null;
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw new Error("Unknown data format - expected Palette.");
    if (v === "Round" || v === "round") return DataProto.data.PaletteTowerPlanType.round;
    if (v === "Square" || v === "square") return DataProto.data.PaletteTowerPlanType.square;
    throw new Error("Unknown data format - expected Palette.");
}

function legacyTreeShapeToEnum(v) {
    if (v === null || v === undefined) return null;
    if (v === "null") return null;
    if (typeof v === "number") return v;
    if (typeof v !== "string") throw new Error("Unknown data format - expected Palette.");
    if (v === "Ellipsoid" || v === "ellipsoid") return DataProto.data.PaletteTreeShapeType.ellipsoid;
    if (v === "Cone" || v === "cone") return DataProto.data.PaletteTreeShapeType.cone;
    throw new Error("Unknown data format - expected Palette.");
}

export function paletteViewerObjFromLegacyJsonText(text) {
    let obj = null;
    try { obj = JSON.parse(text); } catch (e) { throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e))); }

    if (obj != null && typeof obj === "object" && Array.isArray(obj.floors) && obj.features == null) {
        throw new Error("These are Dwellings, not Palette.");
    }
    if (obj != null && typeof obj === "object" && obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
        throw new Error("These are City/Village, not Palette.");
    }
    if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
        throw new Error("Unknown data format - expected Palette.");
    }

    let missing = [];

    let colors = {};
    for (let i = 0; i < PALETTE_COLOR_KEYS.length; i++) {
        let k = PALETTE_COLOR_KEYS[i];
        if (!Object.prototype.hasOwnProperty.call(obj, k) || obj[k] == null || obj[k] === "null") { missing.push(k); continue; }
        let rgb = PaletteFunc.hexToRgbObj(obj[k]);
        if (rgb == null) throw new Error("Unknown data format - expected Palette.");
        colors[k] = rgb;
    }

    let lighting = {};
    for (let j = 0; j < PALETTE_LIGHTING_COLOR_KEYS.length; j++) {
        let k2 = PALETTE_LIGHTING_COLOR_KEYS[j];
        if (!Object.prototype.hasOwnProperty.call(obj, k2) || obj[k2] == null || obj[k2] === "null") { missing.push(k2); continue; }
        let rgb2 = PaletteFunc.hexToRgbObj(obj[k2]);
        if (rgb2 == null) throw new Error("Unknown data format - expected Palette.");
        lighting[k2] = rgb2;
    }

    for (let k3 in PALETTE_FLOAT_SPECS) {
        let spec = PALETTE_FLOAT_SPECS[k3];
        if (!Object.prototype.hasOwnProperty.call(obj, k3) || obj[k3] == null || obj[k3] === "null") { missing.push(k3); continue; }
        lighting[spec.prop] = PaletteFunc.toX10Float(obj[k3], spec.min, spec.max);
    }

    let shapes = {};
    if (!Object.prototype.hasOwnProperty.call(obj, "roofedTowers") || obj.roofedTowers == null || obj.roofedTowers === "null") missing.push("roofedTowers");
    else shapes.roofedTowers = PaletteFunc.legacyBool(obj.roofedTowers);

    if (!Object.prototype.hasOwnProperty.call(obj, "towers") || obj.towers == null || obj.towers === "null") missing.push("towers");
    else shapes.towers = legacyTowersToEnum(obj.towers);

    if (!Object.prototype.hasOwnProperty.call(obj, "tree_shape") || obj.tree_shape == null || obj.tree_shape === "null") missing.push("tree_shape");
    else shapes.treeShape = legacyTreeShapeToEnum(obj.tree_shape);

    if (!Object.prototype.hasOwnProperty.call(obj, "pitch") || obj.pitch == null || obj.pitch === "null") missing.push("pitch");
    else shapes.pitchX10 = PaletteFunc.toX10Float(obj.pitch, "pitch");

    if (missing.length) {
        throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));
    }

    let protoObj = { colors: colors, lighting: lighting, shapes: shapes };
    let err = DataProto.data.PaletteViewerObj.verify(protoObj);
    if (err) throw new Error("Unknown data format - expected Palette: " + err);
    return DataProto.data.PaletteViewerObj.fromObject(protoObj);
}

export function paletteLegacyJsonFromPaletteViewerObj(pvo) {
    let c = pvo?.colors, l = pvo?.lighting, s = pvo?.shapes;
    if (c == null || l == null || s == null) throw new Error("Unknown data format - expected Palette.");
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

    out.sun_pos = PaletteFunc.fromX10Float(l.sunPosX10);
    out.ambience = PaletteFunc.fromX10Float(l.ambienceX10);
    out.lighted = PaletteFunc.fromX10Float(l.lightedX10);

    out.pitch = PaletteFunc.fromX10Float(s.pitchX10);
    out.roofedTowers = s.roofedTowers === true ? "true" : "false";

    out.towers = s.towers === DataProto.data.PaletteTowerPlanType.square ? "Square" : "Round";
    out.tree_shape = s.treeShape === DataProto.data.PaletteTreeShapeType.cone ? "Cone" : "Ellipsoid";

    return JSON.stringify(out, null, "  ");
}

export function paletteProtoBytesFromPaletteViewerObj(pvo) {
    return DataProto.data.PaletteViewerObj.encode(pvo).finish();
}

function looksLikePaletteViewerObj(m) {
    if (m == null || m.colors == null || m.lighting == null || m.shapes == null) return false;

    function okRgb(x) {
        return (
            x != null &&
            x.r != null && x.g != null && x.b != null &&
            x.r >= 0 && x.r <= 255 &&
            x.g >= 0 && x.g <= 255 &&
            x.b >= 0 && x.b <= 255
        );
    }

    for (let i = 0; i < PALETTE_COLOR_KEYS.length; i++) if (!okRgb(m.colors[PALETTE_COLOR_KEYS[i]])) return false;
    for (let j = 0; j < PALETTE_LIGHTING_COLOR_KEYS.length; j++) if (!okRgb(m.lighting[PALETTE_LIGHTING_COLOR_KEYS[j]])) return false;

    if (m.lighting.sunPosX10 == null || m.lighting.sunPosX10 < 0 || m.lighting.sunPosX10 > 900) return false;
    if (m.lighting.ambienceX10 == null || m.lighting.ambienceX10 < 0 || m.lighting.ambienceX10 > 10) return false;
    if (m.lighting.lightedX10 == null || m.lighting.lightedX10 < 0 || m.lighting.lightedX10 > 10) return false;

    if (m.shapes.pitchX10 == null || m.shapes.pitchX10 < 0 || m.shapes.pitchX10 > 20) return false;
    if (m.shapes.roofedTowers == null) return false;
    if (m.shapes.towers == null || m.shapes.towers === DataProto.data.PaletteTowerPlanType.PALETTE_TOWER_PLAN_UNSPECIFIED) return false;
    if (m.shapes.treeShape == null || m.shapes.treeShape === DataProto.data.PaletteTreeShapeType.PALETTE_TREE_SHAPE_UNSPECIFIED) return false;

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

    let pal = tryDecode(DataProto.data.PaletteViewerObj, b);
    if (pal.msg != null) {
        if (looksLikePaletteViewerObj(pal.msg)) return pal.msg;

        let city = tryDecode(DataProto.data.GeoObj, b);
        if (city.msg != null) throw new Error("These are City/Village, not Palette.");

        let dwell = tryDecode(DataProto.data.DwellingsObj, b);
        if (dwell.msg != null) throw new Error("These are Dwellings, not Palette.");

        throw new Error("Unknown data format - expected Palette: " + lastErr);
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
        return paletteViewerObjFromLegacyJsonText(text);
    } catch (e) {
        let msg = e && e.message ? e.message : String(e);
        if (msg.indexOf("Unknown data format") === 0) throw e;
        if (msg.indexOf("These are ") === 0) throw e;
        throw new Error("An error occurred while parsing: " + msg);
    }
}

export function decodePaletteFile(name, data) {
    let ext = "";
    if (name != null) {
        let parts = String(name).split(".");
        if (parts.length > 1) ext = String(parts.pop()).toLowerCase();
    }
    if (ext === "pb") return decodePaletteFromProtoBytes(data);
    let text = bytesToUtf8Text(data);
    return decodePaletteFromJsonText(text);
}

