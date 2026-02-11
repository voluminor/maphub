import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
} from "../../../src/js/shared/data/Viewer.js";

const VALID_VIEWER_JSON = {
    ground: "#88aa66",
    fields: "#aacc88",
    greens: "#669944",
    foliage: "#557733",
    roads: "#ccbb99",
    water: "#6699bb",
    walls1: "#998877",
    walls2: "#776655",
    roofs1: "#aa6633",
    roofs2: "#884422",
    sky1: "#aaccee",
    sky2: "#88aadd",
    sun: "#ffeecc",
    windows: "#ffcc66",
    sun_pos: "45",
    ambience: "0.5",
    lighted: "0.7",
    pitch: "1.0",
    roofedTowers: "true",
    towers: "Round",
    tree_shape: "Ellipsoid",
};

function validViewerJsonText() {
    return JSON.stringify(VALID_VIEWER_JSON);
}

// ─── paletteObjFromLegacyJsonText ───────────────────────────────

describe("Viewer: paletteObjFromLegacyJsonText", () => {
    it("parses valid JSON into proto message", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        expect(msg).toBeTruthy();
        expect(msg.colors).toBeTruthy();
        expect(msg.lighting).toBeTruthy();
        expect(msg.shapes).toBeTruthy();
    });

    it("parses 10 main colors", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        expect(msg.colors.ground).toEqual({ r: 136, g: 170, b: 102 });
        expect(msg.colors.water).toEqual({ r: 102, g: 153, b: 187 });
        expect(msg.colors.roofs1).toEqual({ r: 170, g: 102, b: 51 });
    });

    it("parses 4 lighting colors", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        expect(msg.lighting.sky1).toEqual({ r: 170, g: 204, b: 238 });
        expect(msg.lighting.sun).toEqual({ r: 255, g: 238, b: 204 });
    });

    it("parses lighting float params", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        expect(msg.lighting.sunPos).toBeCloseTo(45);
        expect(msg.lighting.ambience).toBeCloseTo(0.5);
        expect(msg.lighting.lighted).toBeCloseTo(0.7);
    });

    it("parses shape params", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        expect(msg.shapes.roofedTowers).toBe(true);
    });

    it("throws on invalid JSON", () => {
        expect(() => paletteObjFromLegacyJsonText("nope{")).toThrow("An error occurred while parsing");
    });

    it("throws on dwellings data", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify({ floors: [{}] }))).toThrow("Dwellings");
    });

    it("throws on city/village GeoJSON", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify({ type: "FeatureCollection", features: [] }))).toThrow("City/Village");
    });

    it("throws on missing required fields", () => {
        const partial = JSON.stringify({ ground: "#aabbcc" });
        expect(() => paletteObjFromLegacyJsonText(partial)).toThrow("not enough data");
    });

    it("parses tower enum values", () => {
        for (const v of ["Round", "Square"]) {
            const json = JSON.stringify({ ...VALID_VIEWER_JSON, towers: v });
            expect(() => paletteObjFromLegacyJsonText(json)).not.toThrow();
        }
    });

    it("parses tree shape enum values", () => {
        for (const v of ["Ellipsoid", "Cone"]) {
            const json = JSON.stringify({ ...VALID_VIEWER_JSON, tree_shape: v });
            expect(() => paletteObjFromLegacyJsonText(json)).not.toThrow();
        }
    });
});

// ─── paletteLegacyJsonFromObj ───────────────────────────────────

describe("Viewer: paletteLegacyJsonFromObj", () => {
    it("exports valid JSON string", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        const json = paletteLegacyJsonFromObj(msg);
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it("exports all 10 map colors as hex", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        const colorKeys = ["ground","fields","greens","foliage","roads","water","walls1","walls2","roofs1","roofs2"];
        for (const k of colorKeys) {
            expect(obj[k]).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it("exports 4 lighting colors as hex", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        for (const k of ["sky1","sky2","sun","windows"]) {
            expect(obj[k]).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it("exports lighting floats as strings", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(parseFloat(obj.sun_pos)).toBeCloseTo(45);
        expect(parseFloat(obj.ambience)).toBeCloseTo(0.5);
    });

    it("exports roofedTowers as string boolean", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(obj.roofedTowers).toBe("true");
    });

    it("exports towers as capitalized string", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(["Round", "Square"]).toContain(obj.towers);
    });

    it("exports tree_shape as capitalized string", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(["Ellipsoid", "Cone"]).toContain(obj.tree_shape);
    });

    it("throws on null input", () => {
        expect(() => paletteLegacyJsonFromObj(null)).toThrow();
    });
});

// ─── roundtrip ──────────────────────────────────────────────────

describe("Viewer: import/export roundtrip", () => {
    it("preserves colors through roundtrip", () => {
        const msg = paletteObjFromLegacyJsonText(validViewerJsonText());
        const parsed = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(parsed.ground).toBe(VALID_VIEWER_JSON.ground);
        expect(parsed.water).toBe(VALID_VIEWER_JSON.water);
        expect(parsed.roofs1).toBe(VALID_VIEWER_JSON.roofs1);
    });

    it("re-import/export is stable", () => {
        const msg1 = paletteObjFromLegacyJsonText(validViewerJsonText());
        const exp1 = paletteLegacyJsonFromObj(msg1);
        const msg2 = paletteObjFromLegacyJsonText(exp1);
        const exp2 = paletteLegacyJsonFromObj(msg2);
        expect(exp2).toBe(exp1);
    });
});

// ─── decodePaletteFile ──────────────────────────────────────────

describe("Viewer: decodePaletteFile", () => {
    it("decodes from JSON text bytes", () => {
        const textBytes = new TextEncoder().encode(validViewerJsonText());
        const msg = decodePaletteFile("test.json", textBytes);
        expect(msg.colors.ground).toEqual({ r: 136, g: 170, b: 102 });
    });
});
