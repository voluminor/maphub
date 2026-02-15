import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    paletteProtoBytesFromObj,
    decodePaletteFile,
} from "../../../src/js/shared/data/Glade.js";

const VALID_GLADE_JSON = {
    ink: "#111111",
    marks: "#222222",
    tree: ["#333333", "#444444"],
    ground: "#555555",
    treeDetails: "#666666",
    thicket: "#777777",
    water: "#888888",
    shallow: "#999999",
    sand: "#aaaaaa",
    shadowColor: "#bbbbbb",
    shadowLength: "1.2",
    shadowAngle: "45",
    road: "#cccccc",
    roadOutline: "#dddddd",
    treeVariance: "0.4",
    treeBands: "3",
    treeShape: "Cotton",
    strokeNormal: "1.0",
    strokeThin: "0.5",
    strokeGrid: "0.25",
    grassLength: "12",
    roadWidth: "0.4",
    roadWiggle: "0.6",
};

function validGladeJsonText() {
    return JSON.stringify(VALID_GLADE_JSON);
}

// ─── paletteObjFromLegacyJsonText ───────────────────────────────

describe("Glade: paletteObjFromLegacyJsonText", () => {
    it("parses valid JSON into proto message", () => {
        const msg = paletteObjFromLegacyJsonText(validGladeJsonText());
        expect(msg).toBeTruthy();
        expect(msg.colors).toBeTruthy();
        expect(msg.trees).toBeTruthy();
        expect(msg.shadow).toBeTruthy();
        expect(msg.strokes).toBeTruthy();
        expect(msg.misc).toBeTruthy();
    });

    it("accepts proto-like palette objects with defaults", () => {
        const protoLike = {
            colors: {
                ink: { r: 1, g: 2, b: 3 },
                ground: { r: 4, g: 5, b: 6 },
                thicket: { r: 7, g: 8, b: 9 },
                tree: [{ r: 10, g: 11, b: 12 }],
                waterDeep: { r: 13, g: 14, b: 15 },
                shadowColor: { r: 16, g: 17, b: 18 },
                road: { r: 19, g: 20, b: 21 },
            },
            trees: { variance: 0.2, bands: 4, shape: "Palm" },
            shadow: { length: 1, angleDeg: 30 },
            strokes: { normal: 1, thin: 0.5, grid: 0.25 },
            misc: { grassLength: 8, roadWidth: 0.4, roadWiggle: 0.6 },
        };

        const msg = paletteObjFromLegacyJsonText(JSON.stringify(protoLike));
        expect(msg.colors.marks).toEqual({ r: 1, g: 2, b: 3 });
        expect(msg.colors.waterShallow).toEqual({ r: 13, g: 14, b: 15 });
        expect(msg.colors.roadOutline).toEqual({ r: 1, g: 2, b: 3 });
    });

    it("parses tree and stroke settings", () => {
        const msg = paletteObjFromLegacyJsonText(validGladeJsonText());
        expect(msg.trees.variance).toBeCloseTo(0.4);
        expect(msg.trees.bands).toBe(3);
        expect(msg.strokes.thin).toBeCloseTo(0.5);
    });

    it("throws on invalid JSON", () => {
        expect(() => paletteObjFromLegacyJsonText("{bad")).toThrow("An error occurred while parsing");
    });
});

// ─── paletteLegacyJsonFromObj ───────────────────────────────────

describe("Glade: paletteLegacyJsonFromObj", () => {
    it("exports valid JSON string", () => {
        const msg = paletteObjFromLegacyJsonText(validGladeJsonText());
        const json = paletteLegacyJsonFromObj(msg);
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it("exports expected hex colors", () => {
        const msg = paletteObjFromLegacyJsonText(validGladeJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(obj.ink).toMatch(/^#[0-9a-f]{6}$/);
        expect(obj.road).toMatch(/^#[0-9a-f]{6}$/);
        expect(Array.isArray(obj.tree)).toBe(true);
    });
});

// ─── roundtrip ──────────────────────────────────────────────────

describe("Glade: import/export roundtrip", () => {
    it("preserves key values through roundtrip", () => {
        const msg = paletteObjFromLegacyJsonText(validGladeJsonText());
        const parsed = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(parsed.ink).toBe(VALID_GLADE_JSON.ink);
        expect(parsed.shadowColor).toBe(VALID_GLADE_JSON.shadowColor);
        expect(parsed.treeShape).toBe(VALID_GLADE_JSON.treeShape);
    });
});

// ─── paletteProtoBytesFromObj ───────────────────────────────────

describe("Glade: paletteProtoBytesFromObj", () => {
    it("returns ArrayBuffer", () => {
        const msg = paletteObjFromLegacyJsonText(validGladeJsonText());
        const bytes = paletteProtoBytesFromObj(msg);
        expect(bytes).toBeInstanceOf(ArrayBuffer);
        expect(bytes.byteLength).toBeGreaterThan(0);
    });

    it("proto bytes decode back via decodePaletteFile", () => {
        const msg = paletteObjFromLegacyJsonText(validGladeJsonText());
        const bytes = paletteProtoBytesFromObj(msg);
        const decoded = decodePaletteFile("test.bin", bytes);
        expect(decoded.colors.ink).toEqual(msg.colors.ink);
        expect(decoded.trees.bands).toBe(msg.trees.bands);
    });
});

// ─── decodePaletteFile ──────────────────────────────────────────

describe("Glade: decodePaletteFile", () => {
    it("decodes from JSON text bytes", () => {
        const textBytes = new TextEncoder().encode(validGladeJsonText());
        const msg = decodePaletteFile("test.json", textBytes);
        expect(msg.colors.ink).toEqual({ r: 17, g: 17, b: 17 });
    });
});
