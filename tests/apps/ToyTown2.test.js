import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
} from "../../src/js/shared/data/Viewer.js";
import { decodeCityFile } from "../../src/js/shared/data/data.js";
import { readTestBytes, readTestJson } from "../helpers/data-test-utils.js";

const paletteLegacy = readTestJson("vanilla/ToyTown2/PaletteViewerObj.json");
const geoLegacy = readTestJson("vanilla/Village/GeoObj.json");
const wrongPalette = readTestJson("vanilla/Village/PaletteVillageObj.json");

describe("ToyTown2 app data", () => {
    it("exports all legacy viewer palette fields", () => {
        const msg = paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy));
        const exported = JSON.parse(paletteLegacyJsonFromObj(msg));
        for (const key of Object.keys(paletteLegacy)) expect(exported).toHaveProperty(key);
    });

    it("imports viewer palette JSON", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy))).not.toThrow();
    });

    it("imports geo JSON and PB", () => {
        expect(() => decodeCityFile("geo.json", JSON.stringify(geoLegacy))).not.toThrow();
        const pb = readTestBytes("1.1.2/Village/GeoObj.pb");
        expect(() => decodeCityFile("geo.pb", pb)).not.toThrow();
    });

    it("accepts cave palette PB without type wrapper", () => {
        const pb = readTestBytes("1.1.2/ToyTown2/PaletteCaveObj.pb");
        expect(() => decodePaletteFile("palette.pb", pb)).not.toThrow();
    });

    it("rejects village palette when viewer palette is expected", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify(wrongPalette))).toThrow(/uploaded|expected/i);
    });
});
