import * as DataProto from "../../struct/data.js";
import { decodeDataFromFile } from "./data.js";
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

export function paletteObjFromLegacyJsonText(text) {

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
    if (!looksLikePaletteCaveObj(msg)) throw PaletteFunc.unknownPalette("not looks-like PaletteCaveObj in paletteObjFromLegacyJsonText");
    return msg;
}

export function paletteLegacyJsonFromObj(m) {
    if (!looksLikePaletteCaveObj(m)) throw PaletteFunc.unknownPalette("not looks-like PaletteCaveObj in paletteLegacyJsonFromObj");

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

export function paletteProtoBytesFromObj(m) {
    if (!looksLikePaletteCaveObj(m)) throw PaletteFunc.unknownPalette("not looks-like PaletteCaveObj in paletteProtoBytesFromObj");
    return DataProto.data.PaletteCaveObj.encode(m).finish();
}

export function decodePaletteFile(name, data) {
    return decodeDataFromFile("PaletteCaveObj", paletteObjFromLegacyJsonText, data);
}

