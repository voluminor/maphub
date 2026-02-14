import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText as cavePaletteFromText,
    paletteLegacyJsonFromObj as cavePaletteToText,
    decodePaletteFile as decodeCavePalette,
} from "../../src/js/shared/data/Cave.js";
import {
    paletteObjFromLegacyJsonText as gladePaletteFromText,
    paletteLegacyJsonFromObj as gladePaletteToText,
    decodePaletteFile as decodeGladePalette,
} from "../../src/js/shared/data/Glade.js";
import { readTestBytes, readTestJson } from "../helpers/data-test-utils.js";

const caveLegacy = readTestJson("vanilla/Cave/PaletteCaveObj.json");
const gladeLegacy = readTestJson("vanilla/Cave/PaletteGladeObj.json");

describe("Cave app palettes", () => {
    it("exports all legacy cave palette fields", () => {
        const msg = cavePaletteFromText(JSON.stringify(caveLegacy));
        const exported = JSON.parse(cavePaletteToText(msg));
        for (const key of Object.keys(caveLegacy)) expect(exported).toHaveProperty(key);
    });

    it("imports cave palette JSON and PB", () => {
        expect(() => cavePaletteFromText(JSON.stringify(caveLegacy))).not.toThrow();
        const pb = readTestBytes("1.1.2/Cave/cave_tan_antiquewhite.palette.cv.pb");
        expect(() => decodeCavePalette("cave.pb", pb)).not.toThrow();
    });

    it("rejects glade palette when cave palette is expected", () => {
        expect(() => cavePaletteFromText(JSON.stringify(gladeLegacy))).toThrow(/uploaded|expected/i);
    });

    it("exports all legacy glade palette fields", () => {
        const msg = gladePaletteFromText(JSON.stringify(gladeLegacy));
        const exported = JSON.parse(gladePaletteToText(msg));
        for (const key of Object.keys(gladeLegacy)) expect(exported).toHaveProperty(key);
    });

    it("imports glade palette JSON and PB", () => {
        expect(() => gladePaletteFromText(JSON.stringify(gladeLegacy))).not.toThrow();
        const pb = readTestBytes("1.1.2/ToyTown2/PaletteGladeObj.pb");
        expect(() => decodeGladePalette("glade.pb", pb)).not.toThrow();
    });

    it("rejects cave palette when glade palette is expected", () => {
        expect(() => gladePaletteFromText(JSON.stringify(caveLegacy))).toThrow(/uploaded|expected/i);
    });
});
