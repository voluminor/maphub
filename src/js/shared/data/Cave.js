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
    if (typeof sh?.shadeAlpha !== "number") return false;
    if (typeof sh?.shadowAlpha !== "number") return false;
    if (typeof sh?.shadowDist !== "number") return false;

    let st = m?.strokes;
    if (typeof st?.wall !== "number") return false;
    if (typeof st?.detail !== "number") return false;
    if (typeof st?.hatch !== "number") return false;
    if (typeof st?.grid !== "number") return false;

    let h = m?.hatching;
    if (typeof h?.strokes !== "number") return false;
    if (typeof h?.size !== "number") return false;
    if (typeof h?.distance !== "number") return false;
    if (typeof h?.stones !== "number") return false;

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

    let shadeAlpha = PaletteFunc.toFloat(obj.shadeAlpha, 0, 1); if (shadeAlpha == null) need("shadeAlpha");
    let shadowAlpha = PaletteFunc.toFloat(obj.shadowAlpha, 0, 1); if (shadowAlpha == null) need("shadowAlpha");
    let shadowDist = PaletteFunc.toFloat(obj.shadowDist, 0, 5); if (shadowDist == null) need("shadowDist");

    let wall = PaletteFunc.toFloat(obj.strokeWall, 0.1, 10); if (wall == null) need("strokeWall");
    let detail = PaletteFunc.toFloat(obj.strokeDetail, 0.1, 10); if (detail == null) need("strokeDetail");
    let hatch = PaletteFunc.toFloat(obj.strokeHatch, 0.1, 10); if (hatch == null) need("strokeHatch");
    let grid = PaletteFunc.toFloat(obj.strokeGrid, 0.1, 10); if (grid == null) need("strokeGrid");

    let hatchStrokes = PaletteFunc.legacyInt(obj.hatchingStrokes); if (hatchStrokes == null) need("hatchingStrokes"); else if (hatchStrokes < 2 || hatchStrokes > 5) throw PaletteFunc.unknownPalette();
    let hatchSize = PaletteFunc.toFloat(obj.hatchingSize, 0.1, 1); if (hatchSize == null) need("hatchingSize");
    let hatchDist = PaletteFunc.toFloat(obj.hatchingDistance, 0, 1); if (hatchDist == null) need("hatchingDistance");
    let hatchStones = PaletteFunc.toFloat(obj.hatchingStones, 0, 1); if (hatchStones == null) need("hatchingStones");

    if (missing.length) throw new Error("Palette has valid fields, but not enough data to apply: " + missing.join(", "));

    let protoObj = {
        colors: { page, floor, water, ink },
        shadow: { shadeAlpha, shadowAlpha, shadowDist },
        strokes: { wall, detail, hatch, grid },
        hatching: { strokes: hatchStrokes, size: hatchSize, distance: hatchDist, stones: hatchStones }
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

    out.shadeAlpha = PaletteFunc.fromFloat(m.shadow.shadeAlpha);
    out.shadowAlpha = PaletteFunc.fromFloat(m.shadow.shadowAlpha);
    out.shadowDist = PaletteFunc.fromFloat(m.shadow.shadowDist);

    out.strokeWall = PaletteFunc.fromFloat(m.strokes.wall);
    out.strokeDetail = PaletteFunc.fromFloat(m.strokes.detail);
    out.strokeHatch = PaletteFunc.fromFloat(m.strokes.hatch);
    out.strokeGrid = PaletteFunc.fromFloat(m.strokes.grid);

    out.hatchingStrokes = String(m.hatching.strokes);
    out.hatchingSize = PaletteFunc.fromFloat(m.hatching.size);
    out.hatchingDistance = PaletteFunc.fromFloat(m.hatching.distance);
    out.hatchingStones = PaletteFunc.fromFloat(m.hatching.stones);

    return JSON.stringify(out, null, "  ");
}

export function paletteProtoBytesFromObj(m) {
    return DataProto.data.PaletteCaveObj.encode(m).finish();
}

export function decodePaletteFile(name, data) {
    return decodeDataFromFile("PaletteCaveObj", paletteObjFromLegacyJsonText, data);
}

