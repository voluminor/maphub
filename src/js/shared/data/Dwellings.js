import * as DataProto from "../../struct/data.js";
import { assertExpectedLegacyRootType, decodeDataFromFile, encodeDataToBytes, enumToNumber } from "./data.js";
import * as PaletteFunc from "./palette.js";

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

function dwellingsJsonToProtoObject(obj) {
    if (obj == null || typeof obj !== "object") return null;

    const src = (obj && typeof obj === "object" && obj.dwellings && typeof obj.dwellings === "object" && Array.isArray(obj.dwellings.floors))
        ? obj.dwellings
        : obj;

    const isObj = (v) => v != null && typeof v === "object" && !Array.isArray(v);

    const toEnum = (E, v, fallback) => {
        let n = enumToNumber(E, v, null);
        if (n == null && typeof v === "string") {
            const t = v.trim();
            n = enumToNumber(E, t, null);
            if (n == null) n = enumToNumber(E, t.toLowerCase(), null);
            if (n == null) n = enumToNumber(E, t.toUpperCase(), null);
        }
        if (n == null && typeof v === "number" && Number.isFinite(v)) n = v | 0;
        if (n == null || E[n] === undefined) return fallback;
        return n | 0;
    };

    const toCell = (c) => {
        if (c == null) return null;
        if (Array.isArray(c)) {
            if (c.length < 2) return null;
            return { i: (c[0] | 0), j: (c[1] | 0) };
        }
        if (isObj(c)) {
            if (c.i != null && c.j != null) return { i: (c.i | 0), j: (c.j | 0) };
            if (c.x != null && c.y != null) return { i: (c.x | 0), j: (c.y | 0) };
        }
        return null;
    };

    const toPoint = (p) => {
        if (p == null) return null;
        if (Array.isArray(p)) {
            if (p.length < 2) return null;
            const x = Number(p[0]);
            const y = Number(p[1]);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            return { x, y };
        }
        if (isObj(p)) {
            const x = Number(p.x);
            const y = Number(p.y);
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
            return { x, y };
        }
        return null;
    };

    const toEdge = (e) => {
        if (e == null) return null;
        const out = {};
        const cell = toCell(e.cell);
        if (cell) out.cell = cell;
        if (e.dir != null) out.dir = toEnum(DataProto.data.DwellingsDirectionType, e.dir, 0);
        return out;
    };

    const toLight = (l) => {
        if (l == null) return null;
        const out = {};
        const pos = toPoint(l.pos);
        if (pos) out.pos = pos;
        if (l.radius != null) out.radius = Number(l.radius);
        if (l.power != null) out.power = Number(l.power);
        if (l.on != null) out.on = !!l.on;
        return out;
    };

    const toProp = (p) => {
        if (p == null) return null;
        const out = {};
        if (p.kind != null) out.kind = toEnum(DataProto.data.DwellingsPropType, p.kind, 0);
        const pos = toPoint(p.pos);
        if (pos) out.pos = pos;
        const wall = toEdge(p.wall);
        if (wall) out.wall = wall;
        const fe = toEdge(p.fromEdge);
        if (fe) out.fromEdge = fe;
        const te = toEdge(p.toEdge);
        if (te) out.toEdge = te;
        return out;
    };

    const toPolygon = (poly) => {
        if (poly == null) return null;
        const out = {};
        const pts = Array.isArray(poly.points) ? poly.points : null;
        if (pts) {
            out.points = [];
            for (let i = 0; i < pts.length; i++) {
                const pt = toPoint(pts[i]);
                if (pt) out.points.push(pt);
            }
        }
        return out;
    };

    const toDecorGroup = (g) => {
        if (g == null) return null;
        const out = {};
        const polys = Array.isArray(g.polygons) ? g.polygons : null;
        if (polys) {
            out.polygons = [];
            for (let i = 0; i < polys.length; i++) {
                const pl = toPolygon(polys[i]);
                if (pl) out.polygons.push(pl);
            }
        }
        return out;
    };

    const out = {};

    if (src.exit != null) out.exit = toEdge(src.exit);
    if (src.spiral != null) out.spiral = toEdge(src.spiral);

    if (src.embedName != null) out.embedName = String(src.embedName);
    if (src.embedArchitecture != null) out.embedArchitecture = toEnum(DataProto.data.DwellingsArchitectureType, src.embedArchitecture, 0);

    if (Array.isArray(src.floors)) {
        out.floors = [];
        for (let fi = 0; fi < src.floors.length; fi++) {
            const fp = src.floors[fi] || {};
            const floor = { level: (fp.level | 0) };

            if (Array.isArray(fp.rooms)) {
                floor.rooms = [];
                for (let ri = 0; ri < fp.rooms.length; ri++) {
                    const rm = fp.rooms[ri] || {};
                    const room = {};

                    if (rm.name != null) room.name = String(rm.name);

                    if (Array.isArray(rm.cells)) {
                        room.cells = [];
                        for (let ci = 0; ci < rm.cells.length; ci++) {
                            const cell = toCell(rm.cells[ci]);
                            if (cell) room.cells.push(cell);
                        }
                    }

                    if (rm.embedTypeId != null) room.embedTypeId = String(rm.embedTypeId);

                    if (rm.embedLight != null) {
                        const light = toLight(rm.embedLight);
                        if (light) room.embedLight = light;
                    }

                    if (Array.isArray(rm.embedProps)) {
                        room.embedProps = [];
                        for (let pi = 0; pi < rm.embedProps.length; pi++) {
                            const pr = toProp(rm.embedProps[pi]);
                            if (pr) room.embedProps.push(pr);
                        }
                    }

                    if (Array.isArray(rm.embedDecor)) {
                        room.embedDecor = [];
                        for (let gi = 0; gi < rm.embedDecor.length; gi++) {
                            const gr = toDecorGroup(rm.embedDecor[gi]);
                            if (gr) room.embedDecor.push(gr);
                        }
                    }

                    floor.rooms.push(room);
                }
            }

            if (Array.isArray(fp.doors)) {
                floor.doors = [];
                for (let di = 0; di < fp.doors.length; di++) {
                    const d = fp.doors[di] || {};
                    const door = {};
                    if (d.edge != null) {
                        const ed = toEdge(d.edge);
                        if (ed) door.edge = ed;
                    }
                    if (d.type != null) door.type = toEnum(DataProto.data.DwellingsDoorType, d.type, 0);
                    floor.doors.push(door);
                }
            }

            if (Array.isArray(fp.windows)) {
                floor.windows = [];
                for (let wi = 0; wi < fp.windows.length; wi++) {
                    const ed = toEdge(fp.windows[wi]);
                    if (ed) floor.windows.push(ed);
                }
            }

            if (Array.isArray(fp.stairs)) {
                floor.stairs = [];
                for (let si = 0; si < fp.stairs.length; si++) {
                    const st = fp.stairs[si] || {};
                    const stair = { up: !!st.up };
                    const cell = toCell(st.cell);
                    if (cell) stair.cell = cell;
                    if (st.dir != null) stair.dir = toEnum(DataProto.data.DwellingsDirectionType, st.dir, 0);
                    if (st.embedTrapdoor != null) stair.embedTrapdoor = !!st.embedTrapdoor;
                    floor.stairs.push(stair);
                }
            }

            if (Array.isArray(fp.embedChimneys)) {
                floor.embedChimneys = [];
                for (let ci = 0; ci < fp.embedChimneys.length; ci++) {
                    const cell = toCell(fp.embedChimneys[ci]);
                    if (cell) floor.embedChimneys.push(cell);
                }
            }

            out.floors.push(floor);
        }
    }

    return out;
}

function decodeDwellingsFromJsonText(text) {
    let obj;
    try {
        obj = JSON.parse(text);
    } catch (e) {
        throw new Error("An error occurred while parsing: " + (e && e.message ? e.message : String(e)));
    }

    assertExpectedLegacyRootType(DataProto.data.DataType.dwellings, obj);

    try {
        let protoObj = dwellingsJsonToProtoObject(obj);
        let err = DataProto.data.DwellingsObj.verify(protoObj);
        if (err) throw new Error("Unknown data format - expected Dwellings: " + err);
        return DataProto.data.DwellingsObj.fromObject(protoObj);
    } catch (e2) {
        let msg = e2 && e2.message ? e2.message : String(e2);
        if (msg.indexOf("Unknown data format") === 0 || msg.indexOf("You uploaded") === 0) throw e2;
        throw new Error("An error occurred while parsing: " + msg);
    }
}

export function decodeDwellingsFile(name, data) {
    return decodeDataFromFile(DataProto.data.DataType.dwellings, decodeDwellingsFromJsonText, data);
}
