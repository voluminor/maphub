import * as DataProto from "../../struct/data.js";
import {toUint8Array, bytesToUtf8Text} from "./geo.js";
import * as PaletteFunc from "./palette.js";

function looksLikePaletteCaveObj(m) {
    let c = m?.colors;
    if (PaletteFunc.hexToRgbObj(PaletteFunc.rgbObjToHex(c?.page)) == null) return false;
    if (PaletteFunc.hexToRgbObj(PaletteFunc.rgbObjToHex(c?.floor)) == null) return false;
    if (PaletteFunc.hexToRgbObj(PaletteFunc.rgbObjToHex(c?.water)) == null) return false;
    if (PaletteFunc.hexToRgbObj(PaletteFunc.rgbObjToHex(c?.ink)) == null) return false;

    let sh = m?.shadow;
    if (typeof sh?.shadeAlphaX10 !== "number") return false;
    if (typeof sh?.shadowAlphaX10 !== "number") return false;
    if (typeof sh?.shadowDistX10 !== "number") return false;

    let st = m?.strokes;
    if (typeof st?.wallX10 !== "number") return false;
    if (typeof st?.detailX10 !== "number") return false;
    if (typeof st?.hatchX10 !== "number") return false;
    if (typeof st?.gridX10 !== "number") return false;

    let h = m?.hatching;
    if (typeof h?.strokes !== "number") return false;
    if (typeof h?.sizeX10 !== "number") return false;
    if (typeof h?.distanceX10 !== "number") return false;
    if (typeof h?.stonesX10 !== "number") return false;

    return true;
}

export function paletteCaveObjFromLegacyJsonText(text) {

    let obj = null;
    try {
        obj = JSON.parse(text);
    } catch (e) {
        throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e)));
    }

    if (obj != null && typeof obj === "object" && Array.isArray(obj.floors) && obj.features == null) {
        throw new Error("These are Dwellings, not Palette.");
    }

    if (obj != null && typeof obj === "object" && obj.type === "FeatureCollection" && Array.isArray(obj.features)) {
        throw new Error("These are City/Village, not Palette.");
    }

    if (obj == null || typeof obj !== "object" || Array.isArray(obj)) throw PaletteFunc.unknownPalette("null/not-object/array");

    let keys = [
        "colorPage","colorFloor","colorWater","colorInk",
        "shadeAlpha","shadowAlpha","shadowDist",
        "strokeWall","strokeDetail","strokeHatch","strokeGrid",
        "hatchingStrokes","hatchingSize","hatchingDistance","hatchingStones"
    ];

    let hasAny = false;
    for (let i = 0; i < keys.length; i++) if (Object.prototype.hasOwnProperty.call(obj, keys[i])) { hasAny = true; break; }
    if (!hasAny) throw PaletteFunc.unknownPalette("no has any");

    let missing = [];

    function need(k) { missing.push(k); }

    let page = PaletteFunc.hexToRgbObj(obj.colorPage); if (page == null) need("colorPage");
    let floor = PaletteFunc.hexToRgbObj(obj.colorFloor); if (floor == null) need("colorFloor");
    let water = PaletteFunc.hexToRgbObj(obj.colorWater); if (water == null) need("colorWater");
    let ink = PaletteFunc.hexToRgbObj(obj.colorInk); if (ink == null) need("colorInk");

    let shadeAlphaX10 = PaletteFunc.toX10Float(obj.shadeAlpha, 0, 1); if (shadeAlphaX10 == null) need("shadeAlpha");
    let shadowAlphaX10 = PaletteFunc.toX10Float(obj.shadowAlpha, 0, 1); if (shadowAlphaX10 == null) need("shadowAlpha");
    let shadowDistX10 = PaletteFunc.toX10Float(obj.shadowDist, 0, 5); if (shadowDistX10 == null) need("shadowDist");

    let wallX10 = PaletteFunc.toX10Float(obj.strokeWall, 0.1, 10); if (wallX10 == null) need("strokeWall");
    let detailX10 = PaletteFunc.toX10Float(obj.strokeDetail, 0.1, 10); if (detailX10 == null) need("strokeDetail");
    let hatchX10 = PaletteFunc.toX10Float(obj.strokeHatch, 0.1, 10); if (hatchX10 == null) need("strokeHatch");
    let gridX10 = PaletteFunc.toX10Float(obj.strokeGrid, 0.1, 10); if (gridX10 == null) need("strokeGrid");

    let hatchStrokes = PaletteFunc.legacyInt(obj.hatchingStrokes); if (hatchStrokes == null) need("hatchingStrokes"); else if (hatchStrokes < 2 || hatchStrokes > 5) throw PaletteFunc.unknownPalette();
    let hatchSizeX10 = PaletteFunc.toX10Float(obj.hatchingSize, 0.1, 1); if (hatchSizeX10 == null) need("hatchingSize");
    let hatchDistX10 = PaletteFunc.toX10Float(obj.hatchingDistance, 0, 1); if (hatchDistX10 == null) need("hatchingDistance");
    let hatchStonesX10 = PaletteFunc.toX10Float(obj.hatchingStones, 0, 1); if (hatchStonesX10 == null) need("hatchingStones");

    if (missing.length) throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));

    let protoObj = {
        colors: { page, floor, water, ink },
        shadow: { shadeAlphaX10, shadowAlphaX10, shadowDistX10 },
        strokes: { wallX10, detailX10, hatchX10, gridX10 },
        hatching: { strokes: hatchStrokes, sizeX10: hatchSizeX10, distanceX10: hatchDistX10, stonesX10: hatchStonesX10 }
    };

    let err = DataProto.data.PaletteCaveObj.verify(protoObj);
    if (err) throw PaletteFunc.unknownPalette(err);

    let msg = DataProto.data.PaletteCaveObj.fromObject(protoObj);
    if (!looksLikePaletteCaveObj(msg)) throw PaletteFunc.unknownPalette("not looks-like PaletteCaveObj in paletteCaveObjFromLegacyJsonText");
    return msg;
}

export function paletteLegacyJsonFromPaletteCaveObj(m) {
    if (!looksLikePaletteCaveObj(m)) throw PaletteFunc.unknownPalette("not looks-like PaletteCaveObj in paletteLegacyJsonFromPaletteCaveObj");

    let out = {};
    out.colorPage = PaletteFunc.rgbObjToHex(m.colors.page);
    out.colorFloor = PaletteFunc.rgbObjToHex(m.colors.floor);
    out.colorWater = PaletteFunc.rgbObjToHex(m.colors.water);
    out.colorInk = PaletteFunc.rgbObjToHex(m.colors.ink);

    out.shadeAlpha = PaletteFunc.fromX10Float(m.shadow.shadeAlphaX10);
    out.shadowAlpha = PaletteFunc.fromX10Float(m.shadow.shadowAlphaX10);
    out.shadowDist = PaletteFunc.fromX10Float(m.shadow.shadowDistX10);

    out.strokeWall = PaletteFunc.fromX10Float(m.strokes.wallX10);
    out.strokeDetail = PaletteFunc.fromX10Float(m.strokes.detailX10);
    out.strokeHatch = PaletteFunc.fromX10Float(m.strokes.hatchX10);
    out.strokeGrid = PaletteFunc.fromX10Float(m.strokes.gridX10);

    out.hatchingStrokes = String(m.hatching.strokes);
    out.hatchingSize = PaletteFunc.fromX10Float(m.hatching.sizeX10);
    out.hatchingDistance = PaletteFunc.fromX10Float(m.hatching.distanceX10);
    out.hatchingStones = PaletteFunc.fromX10Float(m.hatching.stonesX10);

    return JSON.stringify(out, null, "  ");
}

export function paletteProtoBytesFromPaletteCaveObj(m) {
    if (!looksLikePaletteCaveObj(m)) throw PaletteFunc.unknownPalette("not looks-like PaletteCaveObj in paletteProtoBytesFromPaletteCaveObj");
    return DataProto.data.PaletteCaveObj.encode(m).finish();
}

export function decodePaletteCaveFromJsonText(text) {
    try {
        return paletteCaveObjFromLegacyJsonText(text);
    } catch (e) {
        let msg = e && e.message ? e.message : String(e);
        if (msg.indexOf("Unknown data format") === 0) throw e;
        if (msg.indexOf("These are ") === 0) throw e;
        if (msg.indexOf("Palette has valid fields") === 0) throw e;
        throw new Error("An error occurred while parsing: " + msg);
    }
}

export function decodePaletteCaveFromProtoBytes(bytes) {
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

    let pal = tryDecode(DataProto.data.PaletteCaveObj, b);
    if (pal.msg != null) {
        if (looksLikePaletteCaveObj(pal.msg)) return pal.msg;

        let city = tryDecode(DataProto.data.GeoObj, b);
        if (city.msg != null) throw new Error("These are City/Village, not Palette.");

        let dwell = tryDecode(DataProto.data.DwellingsObj, b);
        if (dwell.msg != null) throw new Error("These are Dwellings, not Palette.");

        throw PaletteFunc.unknownPalette(lastErr && lastErr.message ? lastErr.message : null);
    }

    let city2 = tryDecode(DataProto.data.GeoObj, b);
    if (city2.msg != null) throw new Error("These are City/Village, not Palette.");

    let dwell2 = tryDecode(DataProto.data.DwellingsObj, b);
    if (dwell2.msg != null) throw new Error("These are Dwellings, not Palette.");

    let errText = pal.err && pal.err.message ? pal.err.message : "unknown protobuf decode error";
    throw new Error("An error occurred while parsing: " + errText);
}

export function decodePaletteCaveFile(name, data) {
    let ext = "";
    if (name != null) {
        let parts = String(name).split(".");
        if (parts.length > 1) ext = String(parts.pop()).toLowerCase();
    }
    if (ext === "pb") return decodePaletteCaveFromProtoBytes(data);
    return decodePaletteCaveFromJsonText(bytesToUtf8Text(data));
}
