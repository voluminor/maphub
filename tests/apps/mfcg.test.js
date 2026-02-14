import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
} from "../../src/js/shared/data/mfcg.js";
import { decodeCityFile } from "../../src/js/shared/data/data.js";
import { readTestBytes, readTestJson } from "../helpers/data-test-utils.js";

const paletteLegacy = readTestJson("vanilla/mfcg/PaletteMfcgObj.json");
const geoLegacy = readTestJson("1.1.2/mfcg/GeoObj.json");

describe("MFCG app data", () => {
    it("exports all legacy palette fields", () => {
        const msg = paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy));
        const exported = JSON.parse(paletteLegacyJsonFromObj(msg));
        for (const key of Object.keys(paletteLegacy)) expect(exported).toHaveProperty(key);
    });

    it("imports palette JSON and PB", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy))).not.toThrow();
        const pb = readTestBytes("1.1.2/mfcg/PaletteMfcgObj.pb");
        expect(() => decodePaletteFile("palette.pb", pb)).not.toThrow();
    });

    it("imports geo JSON and PB", () => {
        expect(() => decodeCityFile("geo.json", JSON.stringify(geoLegacy))).not.toThrow();
        const pb = readTestBytes("1.1.2/mfcg/GeoObj.pb");
        expect(() => decodeCityFile("geo.pb", pb)).not.toThrow();
    });

    it("rejects geo data when palette is expected", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify(geoLegacy))).toThrow(/uploaded|expected/i);
    });

    it("rejects palette data when geo is expected", () => {
        expect(() => decodeCityFile("palette.json", JSON.stringify(paletteLegacy))).toThrow(/uploaded|expected/i);
    });
});
