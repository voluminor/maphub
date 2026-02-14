import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
    decodeDwellingsFile,
} from "../../src/js/shared/data/Dwellings.js";
import { readTestBytes, readTestJson } from "../helpers/data-test-utils.js";

const paletteLegacy = readTestJson("1.1.2/Dwellings/PaletteDwellingsObj.json");
const dwellingsLegacy = readTestJson("1.1.2/Dwellings/DwellingsObj.json");

describe("Dwellings app data", () => {
    it("exports all legacy palette fields", () => {
        const msg = paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy));
        const exported = JSON.parse(paletteLegacyJsonFromObj(msg));
        for (const key of Object.keys(paletteLegacy)) expect(exported).toHaveProperty(key);
    });

    it("imports palette JSON and PB", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy))).not.toThrow();
        const pb = readTestBytes("1.1.2/Dwellings/PaletteDwellingsObj.pb");
        expect(() => decodePaletteFile("palette.pb", pb)).not.toThrow();
    });

    it("imports dwellings JSON and PB", () => {
        expect(() => decodeDwellingsFile("dwellings.json", JSON.stringify(dwellingsLegacy))).not.toThrow();
        const pb = readTestBytes("1.1.2/Dwellings/DwellingsObj.pb");
        expect(() => decodeDwellingsFile("dwellings.pb", pb)).not.toThrow();
    });

    it("rejects dwellings data when palette is expected", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify(dwellingsLegacy))).toThrow(/uploaded|expected|dwellings|palette/i);
    });

    it("rejects palette data when dwellings are expected", () => {
        expect(() => decodeDwellingsFile("palette.json", JSON.stringify(paletteLegacy))).toThrow(/uploaded|expected/i);
    });
});
