import * as DataProto from "../../struct/data.js";
import { decodeDataFromFile } from "./data.js";
import * as PaletteFunc from "./palette.js";

function getProp(obj, key) {
    if (obj && typeof obj === "object") {
        if (Object.prototype.hasOwnProperty.call(obj, key)) return obj[key];
        const snake = key.replace(/[A-Z]/g, m => "_" + m.toLowerCase());
        if (Object.prototype.hasOwnProperty.call(obj, snake)) return obj[snake];
    }
    return undefined;
}

function paletteGladeObjFromLegacyJsonData(obj) {
    if (obj == null || typeof obj !== "object" || Array.isArray(obj)) throw PaletteFunc.unknownPalette("expected object");

    const inkRgb = PaletteFunc.hexToRgbObj(getProp(obj, "ink"));
    const marksRgb = PaletteFunc.hexToRgbObj(getProp(obj, "marks"));
    const treeRaw = getProp(obj, "tree");
    let treeArr = [];
    if (Array.isArray(treeRaw)) {
        for (let i = 0; i < treeRaw.length; i++) treeArr.push(PaletteFunc.hexToRgbObj(treeRaw[i]));
    } else if (treeRaw != null) {
        treeArr.push(PaletteFunc.hexToRgbObj(treeRaw));
    }

    const groundRgb = PaletteFunc.hexToRgbObj(getProp(obj, "ground"));
    const treeDetailsRgb = PaletteFunc.hexToRgbObj(getProp(obj, "treeDetails"));
    const thicketRgb = PaletteFunc.hexToRgbObj(getProp(obj, "thicket"));

    const waterDeepRgb = PaletteFunc.hexToRgbObj(getProp(obj, "water"));
    const shallowRgb = PaletteFunc.hexToRgbObj(getProp(obj, "shallow"));
    const sandRgb = PaletteFunc.hexToRgbObj(getProp(obj, "sand"));

    const shadowColorRgb = PaletteFunc.hexToRgbObj(getProp(obj, "shadowColor"));

    const roadRgb = PaletteFunc.hexToRgbObj(getProp(obj, "road"));
    const roadOutlineRgb = PaletteFunc.hexToRgbObj(getProp(obj, "roadOutline"));

    const treeVariance = PaletteFunc.toFloat(getProp(obj, "treeVariance"), 0, 1);
    const treeBands = PaletteFunc.legacyInt(getProp(obj, "treeBands"));
    const treeShape = (() => {
        const v = getProp(obj, "treeShape");
        if (typeof v === "string" && v.length) return v;
        return d.treeShape;
    })();

    const shadowLength = PaletteFunc.toFloat(getProp(obj, "shadowLength"), 0, 3);
    
    let angle2 = PaletteFunc.legacyInt(getProp(obj, "shadowDir"));
    let angle1 = PaletteFunc.legacyInt(getProp(obj, "shadowAngle"));
    let angle = 0;
    if(angle1 > 0 || angle2 > 0){
        if (angle1 > 0){angle = angle1;}
        if (angle2 > 0){angle = angle2;}
    }

    const strokeNormal = PaletteFunc.toFloat(getProp(obj, "strokeNormal"), 0.1, 10);
    const strokeThin = PaletteFunc.toFloat(getProp(obj, "strokeThin"), 0.1, 10);
    const strokeGrid = PaletteFunc.toFloat(getProp(obj, "strokeGrid"), 0.1, 10);

    const grassLength = PaletteFunc.legacyInt(getProp(obj, "grassLength"));

    const roadWidth = PaletteFunc.toFloat(getProp(obj, "roadWidth"), 0, 1);
    const roadWiggle = PaletteFunc.toFloat(getProp(obj, "roadWiggle"), 0, 1);

    return {
        colors: {
            ground: groundRgb,
            ink: inkRgb,
            marks: marksRgb,
            tree: treeArr,
            treeDetails: treeDetailsRgb,
            thicket: thicketRgb,
            waterDeep: waterDeepRgb,
            waterShallow: shallowRgb,
            sand: sandRgb,
            shadowColor: shadowColorRgb,
            road: roadRgb,
            roadOutline: roadOutlineRgb
        },
        trees: {
            variance: treeVariance,
            bands: treeBands,
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
            grassLength: grassLength,
            roadWidth: roadWidth,
            roadWiggle: roadWiggle
        }
    };
}

export function paletteObjFromLegacyJsonText(text) {
    let obj;
    try {
        obj = JSON.parse(text);
    } catch (e) {
        throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e)));
    }
    const protoObj = paletteGladeObjFromLegacyJsonData(obj);
    const err = DataProto.data.PaletteGladeObj.verify(protoObj);
    if (err) throw PaletteFunc.unknownPalette(err);
    return DataProto.data.PaletteGladeObj.fromObject(protoObj);
}

export function paletteLegacyJsonFromObj(p) {
    const m = DataProto.data.PaletteGladeObj.fromObject(p);

    const c = m.colors || {};
    const t = m.trees || {};
    const s = m.shadow || {};
    const st = m.strokes || {};
    const ms = m.misc || {};

    const out = {};

    out.thicket = PaletteFunc.rgbObjToHex(c.thicket);
    out.ground = PaletteFunc.rgbObjToHex(c.ground);
    out.ink = PaletteFunc.rgbObjToHex(c.ink );
    out.marks = PaletteFunc.rgbObjToHex(c.marks || c.ink);

    const treeArr = Array.isArray(c.tree) && c.tree.length ? c.tree : [];
    out.tree = treeArr.map(PaletteFunc.rgbObjToHex);

    out.treeDetails = PaletteFunc.rgbObjToHex(c.treeDetails || c.ink );
    out.treeVariance = PaletteFunc.fromFloat(t.variance);
    out.treeBands = String(t.bands != null ? (t.bands | 0) : 3);
    out.treeShape = (t.shape != null && String(t.shape).length) ? String(t.shape) : "Cotton";

    out.water = PaletteFunc.rgbObjToHex(c.waterDeep );
    out.shallow = PaletteFunc.rgbObjToHex(c.waterShallow || c.waterDeep );
    out.sand = PaletteFunc.rgbObjToHex(c.sand || c.ink );

    out.shadowColor = PaletteFunc.rgbObjToHex(c.shadowColor );
    out.shadowLength = PaletteFunc.fromFloat(s.length);
    out.shadowAngle = String(s.angleDeg );

    out.road = PaletteFunc.rgbObjToHex(c.road);
    out.roadOutline = PaletteFunc.rgbObjToHex(c.roadOutline || c.ink);
    out.roadWidth = PaletteFunc.fromFloat(ms.roadWidth );
    out.roadWiggle = PaletteFunc.fromFloat(ms.roadWiggle );

    out.strokeNormal = PaletteFunc.fromFloat(st.normal);
    out.strokeThin = PaletteFunc.fromFloat(st.thin );
    out.strokeGrid = PaletteFunc.fromFloat(st.grid);

    out.grassLength = String(ms.grassLength);

    return JSON.stringify(out, null, "  ");
}

export function decodePaletteFile(name, data) {
    return decodeDataFromFile("PaletteGladeObj", paletteObjFromLegacyJsonText, data);
}

export function paletteProtoBytesFromObj(m) {
    return DataProto.data.PaletteGladeObj.encode(m).finish();
}