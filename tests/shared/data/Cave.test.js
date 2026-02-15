import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    paletteProtoBytesFromObj,
    decodePaletteFile,
} from "../../../src/js/shared/data/Cave.js";

const VALID_CAVE_JSON = {
    colorPage: "#f0e4d0",
    colorFloor: "#d4c8b4",
    colorWater: "#6688aa",
    colorInk: "#332211",
    shadeAlpha: "0.3",
    shadowAlpha: "0.5",
    shadowDist: "1.0",
    strokeWall: "2.0",
    strokeDetail: "0.5",
    strokeHatch: "0.8",
    strokeGrid: "1.0",
    hatchingStrokes: "3",
    hatchingSize: "0.5",
    hatchingDistance: "0.2",
    hatchingStones: "0.4",
};

function validCaveJsonText() {
    return JSON.stringify(VALID_CAVE_JSON);
}

// ─── paletteObjFromLegacyJsonText ───────────────────────────────

describe("Cave: paletteObjFromLegacyJsonText", () => {
    it("parses valid JSON into proto message", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        expect(msg).toBeTruthy();
        expect(msg.colors).toBeTruthy();
        expect(msg.shadow).toBeTruthy();
        expect(msg.strokes).toBeTruthy();
        expect(msg.hatching).toBeTruthy();
    });

    it("accepts proto-like palette objects", () => {
        const protoLike = {
            colors: {
                page: { r: 10, g: 20, b: 30 },
                floor: { r: 40, g: 50, b: 60 },
                water: { r: 70, g: 80, b: 90 },
                ink: { r: 11, g: 22, b: 33 },
            },
            shadow: { shadeAlpha: 0.25, shadowAlpha: 0.4, shadowDist: 1.5 },
            strokes: { wall: 1.2, detail: 0.6, hatch: 0.9, grid: 1.1 },
            hatching: { strokes: 3, size: 0.4, distance: 0.3, stones: 0.2 },
        };
        const msg = paletteObjFromLegacyJsonText(JSON.stringify(protoLike));
        expect(msg.colors.page).toEqual({ r: 10, g: 20, b: 30 });
        expect(msg.shadow.shadowDist).toBeCloseTo(1.5);
        expect(msg.hatching.strokes).toBe(3);
    });

    it("parses color values correctly", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        expect(msg.colors.page).toEqual({ r: 240, g: 228, b: 208 });
        expect(msg.colors.ink).toEqual({ r: 51, g: 34, b: 17 });
    });

    it("parses shadow values correctly", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        expect(msg.shadow.shadeAlpha).toBeCloseTo(0.3);
        expect(msg.shadow.shadowAlpha).toBeCloseTo(0.5);
        expect(msg.shadow.shadowDist).toBeCloseTo(1.0);
    });

    it("parses stroke values correctly", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        expect(msg.strokes.wall).toBeCloseTo(2.0);
        expect(msg.strokes.detail).toBeCloseTo(0.5);
    });

    it("parses hatching values correctly", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        expect(msg.hatching.strokes).toBe(3);
        expect(msg.hatching.size).toBeCloseTo(0.5);
    });

    it("throws on invalid JSON text", () => {
        expect(() => paletteObjFromLegacyJsonText("{bad")).toThrow("An error occurred while parsing");
    });

    it("throws on dwellings data", () => {
        const dw = JSON.stringify({ floors: [{}] });
        expect(() => paletteObjFromLegacyJsonText(dw)).toThrow("Dwellings");
    });

    it("throws on city/village GeoJSON", () => {
        const geo = JSON.stringify({ type: "FeatureCollection", features: [] });
        expect(() => paletteObjFromLegacyJsonText(geo)).toThrow("City/Village");
    });

    it("throws on non-object", () => {
        expect(() => paletteObjFromLegacyJsonText('"hello"')).toThrow("Unknown data format");
    });

    it("throws on array", () => {
        expect(() => paletteObjFromLegacyJsonText("[]")).toThrow("Unknown data format");
    });

    it("throws on missing required fields", () => {
        const partial = JSON.stringify({ colorPage: "#aabbcc" });
        expect(() => paletteObjFromLegacyJsonText(partial)).toThrow("not enough data");
    });

    it("throws on hatching strokes out of range (below 2)", () => {
        const bad = { ...VALID_CAVE_JSON, hatchingStrokes: "1" };
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify(bad))).toThrow();
    });

    it("throws on hatching strokes out of range (above 5)", () => {
        const bad = { ...VALID_CAVE_JSON, hatchingStrokes: "6" };
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify(bad))).toThrow();
    });
});

// ─── paletteLegacyJsonFromObj ───────────────────────────────────

describe("Cave: paletteLegacyJsonFromObj", () => {
    it("exports valid JSON string", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        const json = paletteLegacyJsonFromObj(msg);
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it("exports all expected keys", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        const expected = Object.keys(VALID_CAVE_JSON);
        for (const k of expected) {
            expect(obj).toHaveProperty(k);
        }
    });

    it("exports colors as hex strings", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(obj.colorPage).toMatch(/^#[0-9a-f]{6}$/);
        expect(obj.colorFloor).toMatch(/^#[0-9a-f]{6}$/);
        expect(obj.colorWater).toMatch(/^#[0-9a-f]{6}$/);
        expect(obj.colorInk).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("exports floats as string numbers", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(parseFloat(obj.shadeAlpha)).toBeCloseTo(0.3);
        expect(parseFloat(obj.strokeWall)).toBeCloseTo(2.0);
    });

    it("throws on invalid input (missing colors)", () => {
        expect(() => paletteLegacyJsonFromObj({})).toThrow();
    });
});

// ─── roundtrip: JSON text → import → export → parse ────────────

describe("Cave: import/export roundtrip", () => {
    it("produces matching output after roundtrip", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        const exported = paletteLegacyJsonFromObj(msg);
        const parsed = JSON.parse(exported);
        const original = VALID_CAVE_JSON;

        expect(parsed.colorPage).toBe(original.colorPage);
        expect(parsed.colorFloor).toBe(original.colorFloor);
        expect(parsed.colorWater).toBe(original.colorWater);
        expect(parsed.colorInk).toBe(original.colorInk);
        expect(parseFloat(parsed.shadeAlpha)).toBeCloseTo(parseFloat(original.shadeAlpha));
        expect(parseFloat(parsed.shadowAlpha)).toBeCloseTo(parseFloat(original.shadowAlpha));
        expect(parseFloat(parsed.shadowDist)).toBeCloseTo(parseFloat(original.shadowDist));
        expect(parseFloat(parsed.strokeWall)).toBeCloseTo(parseFloat(original.strokeWall));
        expect(parseFloat(parsed.strokeDetail)).toBeCloseTo(parseFloat(original.strokeDetail));
        expect(parseFloat(parsed.strokeHatch)).toBeCloseTo(parseFloat(original.strokeHatch));
        expect(parseFloat(parsed.strokeGrid)).toBeCloseTo(parseFloat(original.strokeGrid));
        expect(parsed.hatchingStrokes).toBe(original.hatchingStrokes);
        expect(parseFloat(parsed.hatchingSize)).toBeCloseTo(parseFloat(original.hatchingSize));
        expect(parseFloat(parsed.hatchingDistance)).toBeCloseTo(parseFloat(original.hatchingDistance));
        expect(parseFloat(parsed.hatchingStones)).toBeCloseTo(parseFloat(original.hatchingStones));
    });

    it("re-import of exported JSON produces same message", () => {
        const msg1 = paletteObjFromLegacyJsonText(validCaveJsonText());
        const exported = paletteLegacyJsonFromObj(msg1);
        const msg2 = paletteObjFromLegacyJsonText(exported);
        const reExported = paletteLegacyJsonFromObj(msg2);
        expect(reExported).toBe(exported);
    });
});

// ─── paletteProtoBytesFromObj ───────────────────────────────────

describe("Cave: paletteProtoBytesFromObj", () => {
    it("returns ArrayBuffer", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        const bytes = paletteProtoBytesFromObj(msg);
        expect(bytes).toBeInstanceOf(ArrayBuffer);
        expect(bytes.byteLength).toBeGreaterThan(0);
    });

    it("proto bytes can be decoded back via decodePaletteFile", () => {
        const msg = paletteObjFromLegacyJsonText(validCaveJsonText());
        const bytes = paletteProtoBytesFromObj(msg);
        const decoded = decodePaletteFile("test.bin", bytes);
        expect(decoded.colors.page).toEqual(msg.colors.page);
        expect(decoded.shadow.shadeAlpha).toBeCloseTo(msg.shadow.shadeAlpha);
        expect(decoded.hatching.strokes).toBe(msg.hatching.strokes);
    });
});

// ─── decodePaletteFile ──────────────────────────────────────────

describe("Cave: decodePaletteFile", () => {
    it("decodes from JSON text bytes", () => {
        const textBytes = new TextEncoder().encode(validCaveJsonText());
        const msg = decodePaletteFile("test.json", textBytes);
        expect(msg.colors.page).toEqual({ r: 240, g: 228, b: 208 });
    });

    it("decodes from JSON string", () => {
        const msg = decodePaletteFile("test.json", validCaveJsonText());
        expect(msg.colors).toBeTruthy();
    });

    it("throws on invalid data", () => {
        const bad = new Uint8Array([0, 0, 0, 0, 0]);
        expect(() => decodePaletteFile("test.bin", bad)).toThrow();
    });
});
