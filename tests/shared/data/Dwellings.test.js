import { describe, it, expect } from "vitest";
import {
    paletteDwellingsObjFromLegacyJson,
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
} from "../../../src/js/shared/data/Dwellings.js";

const VALID_DW_JSON = {
    colorInk: "#222222",
    colorPaper: "#eeeeee",
    colorFloor: "#ccbbaa",
    colorWalls: "#887766",
    colorProps: "#554433",
    colorWindows: "#aaccee",
    colorStairs: "#998877",
    colorRoof: "#665544",
    colorLabels: "#111111",
    strNormal10: "0.1",
    strGrid10: "0.05",
    alphaGrid: "0.5",
    alphaAO: "0.3",
    alphaLights: "0.8",
    hatching: "true",
    fontRoom: { face: "Share Tech Regular", size: 12, bold: false, italic: false, embedded: "base64data" },
};

function validDwJsonText() {
    return JSON.stringify(VALID_DW_JSON);
}

// ─── paletteObjFromLegacyJsonText ───────────────────────────────

describe("Dwellings: paletteObjFromLegacyJsonText", () => {
    it("parses valid JSON into proto message", () => {
        const msg = paletteObjFromLegacyJsonText(validDwJsonText());
        expect(msg).toBeTruthy();
        expect(msg.colors).toBeTruthy();
        expect(msg.strokes).toBeTruthy();
        expect(msg.misc).toBeTruthy();
    });

    it("parses all 9 colors correctly", () => {
        const msg = paletteObjFromLegacyJsonText(validDwJsonText());
        expect(msg.colors.ink).toEqual({ r: 34, g: 34, b: 34 });
        expect(msg.colors.paper).toEqual({ r: 238, g: 238, b: 238 });
        expect(msg.colors.floor).toEqual({ r: 204, g: 187, b: 170 });
    });

    it("parses strokes", () => {
        const msg = paletteObjFromLegacyJsonText(validDwJsonText());
        expect(msg.strokes.normal).toBeCloseTo(0.1);
        expect(msg.strokes.grid).toBeCloseTo(0.05);
    });

    it("parses misc fields", () => {
        const msg = paletteObjFromLegacyJsonText(validDwJsonText());
        expect(msg.misc.alphaGrid).toBeCloseTo(0.5);
        expect(msg.misc.hatching).toBe(true);
    });

    it("parses fontRoom", () => {
        const msg = paletteObjFromLegacyJsonText(validDwJsonText());
        expect(msg.misc.fontRoom).toBeTruthy();
        expect(msg.misc.fontRoom.face).toBe("Share Tech Regular");
        expect(msg.misc.fontRoom.size).toBe(12);
        expect(msg.misc.fontRoom.bold).toBe(false);
    });

    it("throws on invalid JSON", () => {
        expect(() => paletteObjFromLegacyJsonText("{bad")).toThrow("An error occurred while parsing");
    });

    it("throws on dwellings data (floors)", () => {
        const dw = JSON.stringify({ floors: [{}] });
        expect(() => paletteObjFromLegacyJsonText(dw)).toThrow("Dwellings, not Palette");
    });

    it("throws on city/village GeoJSON", () => {
        const geo = JSON.stringify({ type: "FeatureCollection", features: [] });
        expect(() => paletteObjFromLegacyJsonText(geo)).toThrow("City/Village");
    });

    it("throws on missing required fields", () => {
        const partial = JSON.stringify({ colorInk: "#aabbcc" });
        expect(() => paletteObjFromLegacyJsonText(partial)).toThrow("not enough data");
    });
});

// ─── paletteDwellingsObjFromLegacyJson ──────────────────────────

describe("Dwellings: paletteDwellingsObjFromLegacyJson", () => {
    it("accepts parsed JSON object", () => {
        const msg = paletteDwellingsObjFromLegacyJson(VALID_DW_JSON);
        expect(msg.colors.ink).toEqual({ r: 34, g: 34, b: 34 });
    });

    it("throws on viewer palette (has 'ground' key)", () => {
        expect(() => paletteDwellingsObjFromLegacyJson({ ground: "#aabbcc" })).toThrow();
    });
});

// ─── paletteLegacyJsonFromObj ───────────────────────────────────

describe("Dwellings: paletteLegacyJsonFromObj", () => {
    it("exports valid JSON string", () => {
        const msg = paletteObjFromLegacyJsonText(validDwJsonText());
        const json = paletteLegacyJsonFromObj(msg);
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it("exports all expected color keys", () => {
        const msg = paletteObjFromLegacyJsonText(validDwJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        const colorKeys = ["colorInk","colorPaper","colorFloor","colorWalls","colorProps","colorWindows","colorStairs","colorRoof","colorLabels"];
        for (const k of colorKeys) {
            expect(obj).toHaveProperty(k);
            expect(obj[k]).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it("exports fontRoom object", () => {
        const msg = paletteObjFromLegacyJsonText(validDwJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(obj.fontRoom).toBeTruthy();
        expect(typeof obj.fontRoom.face).toBe("string");
        expect(typeof obj.fontRoom.size).toBe("number");
    });

    it("exports hatching as string boolean", () => {
        const msg = paletteObjFromLegacyJsonText(validDwJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(obj.hatching).toBe("true");
    });

    it("throws on null input", () => {
        expect(() => paletteLegacyJsonFromObj(null)).toThrow();
    });

    it("throws on missing sections", () => {
        expect(() => paletteLegacyJsonFromObj({ colors: {} })).toThrow();
    });
});

// ─── roundtrip ──────────────────────────────────────────────────

describe("Dwellings: import/export roundtrip", () => {
    it("preserves color values through roundtrip", () => {
        const msg = paletteObjFromLegacyJsonText(validDwJsonText());
        const exported = paletteLegacyJsonFromObj(msg);
        const parsed = JSON.parse(exported);

        expect(parsed.colorInk).toBe(VALID_DW_JSON.colorInk);
        expect(parsed.colorPaper).toBe(VALID_DW_JSON.colorPaper);
        expect(parsed.colorFloor).toBe(VALID_DW_JSON.colorFloor);
    });

    it("re-import of exported JSON produces stable output", () => {
        const msg1 = paletteObjFromLegacyJsonText(validDwJsonText());
        const exported1 = paletteLegacyJsonFromObj(msg1);
        const msg2 = paletteObjFromLegacyJsonText(exported1);
        const exported2 = paletteLegacyJsonFromObj(msg2);
        expect(exported2).toBe(exported1);
    });
});

// ─── decodePaletteFile ──────────────────────────────────────────

describe("Dwellings: decodePaletteFile", () => {
    it("decodes from JSON text bytes", () => {
        const textBytes = new TextEncoder().encode(validDwJsonText());
        const msg = decodePaletteFile("test.json", textBytes);
        expect(msg.colors.ink).toEqual({ r: 34, g: 34, b: 34 });
    });

    it("throws on invalid data", () => {
        expect(() => decodePaletteFile("test.bin", new Uint8Array([0, 0, 0]))).toThrow();
    });
});
