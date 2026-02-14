import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
} from "../../src/js/shared/data/Village.js";
import { readTestBytes, readTestJson } from "../helpers/data-test-utils.js";

const paletteLegacy = readTestJson("vanilla/Village/PaletteVillageObj.json");
const wrongPalette = readTestJson("vanilla/mfcg/PaletteMfcgObj.json");

describe("Village app palette", () => {
    it("exports all legacy village palette fields", () => {
        const msg = paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy));
        const exported = JSON.parse(paletteLegacyJsonFromObj(msg));
        for (const key of Object.keys(paletteLegacy)) expect(exported).toHaveProperty(key);
    });

    it("imports village palette JSON and PB", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy))).not.toThrow();
        const pb = readTestBytes("1.1.2/Village/PaletteVillageObj.pb");
        expect(() => decodePaletteFile("palette.pb", pb)).not.toThrow();
    });

    it("rejects mfcg palette when village palette is expected", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify(wrongPalette))).toThrow(/uploaded|expected/i);
    });
});
