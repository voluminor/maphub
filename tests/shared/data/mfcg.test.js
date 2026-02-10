import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    paletteProtoBytesFromObj,
    decodePaletteFile,
} from "../../../src/js/shared/data/mfcg.js";

const VALID_MFCG_JSON = {
    colorPaper: "#f5f0e6",
    colorLight: "#d4c9a8",
    colorDark: "#3a3226",
    colorRoof: "#995533",
    colorWater: "#6699bb",
    colorGreen: "#88aa44",
    colorRoad: "#ccbb99",
    colorWall: "#555544",
    colorTree: "#446633",
    colorLabel: "#221100",
    tintMethod: "Spectrum",
    tintStrength: "50",
    weathering: "20",
};

function validMfcgJsonText() {
    return JSON.stringify(VALID_MFCG_JSON);
}

// ─── paletteObjFromLegacyJsonText ───────────────────────────────

describe("MFCG: paletteObjFromLegacyJsonText", () => {
    it("parses valid JSON into proto message", () => {
        const msg = paletteObjFromLegacyJsonText(validMfcgJsonText());
        expect(msg).toBeTruthy();
        expect(msg.colors).toBeTruthy();
        expect(msg.tints).toBeTruthy();
    });

    it("parses required colors", () => {
        const msg = paletteObjFromLegacyJsonText(validMfcgJsonText());
        expect(msg.colors.paper).toEqual({ r: 245, g: 240, b: 230 });
        expect(msg.colors.light).toEqual({ r: 212, g: 201, b: 168 });
        expect(msg.colors.dark).toEqual({ r: 58, g: 50, b: 38 });
    });

    it("parses optional colors", () => {
        const msg = paletteObjFromLegacyJsonText(validMfcgJsonText());
        expect(msg.colors.roof).toEqual({ r: 153, g: 85, b: 51 });
        expect(msg.colors.water).toEqual({ r: 102, g: 153, b: 187 });
    });

    it("parses tint settings", () => {
        const msg = paletteObjFromLegacyJsonText(validMfcgJsonText());
        expect(msg.tints.strength).toBe(50);
        expect(msg.tints.weathering).toBe(20);
    });

    it("provides defaults for optional colors when missing", () => {
        const minimal = JSON.stringify({
            colorPaper: "#f5f0e6",
            colorLight: "#d4c9a8",
            colorDark: "#3a3226",
        });
        const msg = paletteObjFromLegacyJsonText(minimal);
        expect(msg.colors.paper).toBeTruthy();
        // optional colors get defaults from required ones
        expect(msg.colors.roof).toBeTruthy();
        expect(msg.colors.wall).toBeTruthy();
    });

    it("defaults tintMethod to spectrum", () => {
        const noTint = JSON.stringify({
            colorPaper: "#f5f0e6",
            colorLight: "#d4c9a8",
            colorDark: "#3a3226",
        });
        const msg = paletteObjFromLegacyJsonText(noTint);
        // tintMethod defaults to spectrum
        expect(msg.tints).toBeTruthy();
    });

    it("throws on invalid JSON", () => {
        expect(() => paletteObjFromLegacyJsonText("bad{")).toThrow("An error occurred while parsing");
    });

    it("throws on dwellings data", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify({ floors: [{}] }))).toThrow("Dwellings");
    });

    it("throws on city/village GeoJSON", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify({ type: "FeatureCollection", features: [] }))).toThrow("City/Village");
    });

    it("throws on missing required colors", () => {
        const bad = JSON.stringify({ colorPaper: "#aabbcc", colorLight: "#ddeeff" });
        expect(() => paletteObjFromLegacyJsonText(bad)).toThrow("not enough data");
    });

    it("parses different tint methods", () => {
        for (const method of ["Spectrum", "Brightness", "Overlay"]) {
            const json = JSON.stringify({ ...VALID_MFCG_JSON, tintMethod: method });
            const msg = paletteObjFromLegacyJsonText(json);
            expect(msg.tints).toBeTruthy();
        }
    });
});

// ─── paletteLegacyJsonFromObj ───────────────────────────────────

describe("MFCG: paletteLegacyJsonFromObj", () => {
    it("exports valid JSON string", () => {
        const msg = paletteObjFromLegacyJsonText(validMfcgJsonText());
        const json = paletteLegacyJsonFromObj(msg);
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it("exports all 10 color keys", () => {
        const msg = paletteObjFromLegacyJsonText(validMfcgJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        const colorKeys = ["colorPaper","colorLight","colorDark","colorRoof","colorWater","colorGreen","colorRoad","colorWall","colorTree","colorLabel"];
        for (const k of colorKeys) {
            expect(obj).toHaveProperty(k);
            expect(obj[k]).toMatch(/^#[0-9a-f]{6}$/);
        }
    });

    it("exports tint settings", () => {
        const msg = paletteObjFromLegacyJsonText(validMfcgJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(obj.tintMethod).toBe("Spectrum");
        expect(obj.tintStrength).toBe("50");
        expect(obj.weathering).toBe("20");
    });

    it("throws on null input", () => {
        expect(() => paletteLegacyJsonFromObj(null)).toThrow();
    });
});

// ─── roundtrip ──────────────────────────────────────────────────

describe("MFCG: import/export roundtrip", () => {
    it("preserves colors through roundtrip", () => {
        const msg = paletteObjFromLegacyJsonText(validMfcgJsonText());
        const parsed = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(parsed.colorPaper).toBe(VALID_MFCG_JSON.colorPaper);
        expect(parsed.colorLight).toBe(VALID_MFCG_JSON.colorLight);
        expect(parsed.colorDark).toBe(VALID_MFCG_JSON.colorDark);
        expect(parsed.colorRoof).toBe(VALID_MFCG_JSON.colorRoof);
    });

    it("re-import/export is stable", () => {
        const msg1 = paletteObjFromLegacyJsonText(validMfcgJsonText());
        const exp1 = paletteLegacyJsonFromObj(msg1);
        const msg2 = paletteObjFromLegacyJsonText(exp1);
        const exp2 = paletteLegacyJsonFromObj(msg2);
        expect(exp2).toBe(exp1);
    });
});

// ─── paletteProtoBytesFromObj ───────────────────────────────────

describe("MFCG: paletteProtoBytesFromObj", () => {
    it("returns Uint8Array", () => {
        const msg = paletteObjFromLegacyJsonText(validMfcgJsonText());
        const bytes = paletteProtoBytesFromObj(msg);
        expect(bytes).toBeInstanceOf(Uint8Array);
        expect(bytes.length).toBeGreaterThan(0);
    });

    it("proto bytes decode back via decodePaletteFile", () => {
        const msg = paletteObjFromLegacyJsonText(validMfcgJsonText());
        const bytes = paletteProtoBytesFromObj(msg);
        const decoded = decodePaletteFile("test.bin", bytes);
        expect(decoded.colors.paper).toEqual(msg.colors.paper);
        expect(decoded.colors.dark).toEqual(msg.colors.dark);
        expect(decoded.tints.strength).toBe(msg.tints.strength);
    });
});

// ─── decodePaletteFile ──────────────────────────────────────────

describe("MFCG: decodePaletteFile", () => {
    it("decodes from JSON text bytes", () => {
        const textBytes = new TextEncoder().encode(validMfcgJsonText());
        const msg = decodePaletteFile("test.json", textBytes);
        expect(msg.colors.paper).toEqual({ r: 245, g: 240, b: 230 });
    });
});
