import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
    decodeDwellingsFile,
} from "../../src/js/shared/data/Dwellings.js";
import {
    findFileByName,
    groupDataFilesByVersion,
    readTestBytes,
    readTestJson,
} from "../helpers/data-test-utils.js";

const filesByVersion = groupDataFilesByVersion();

for (const version of Object.keys(filesByVersion)) {
    const files = filesByVersion[version];
    const paletteJsonFile = findFileByName(files, "PaletteDwellingsObj.json");
    const palettePbFile = findFileByName(files, "PaletteDwellingsObj.pb");
    const dwellingsJsonFile = findFileByName(files, "DwellingsObj.json");
    const dwellingsPbFile = findFileByName(files, "DwellingsObj.pb");

    describe(`Dwellings app data (${version})`, () => {
        it("exports all legacy palette fields", () => {
            if (!paletteJsonFile) return;
            const paletteLegacy = readTestJson(paletteJsonFile.relPath);
            const msg = paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy));
            const exported = JSON.parse(paletteLegacyJsonFromObj(msg));
            for (const key of Object.keys(paletteLegacy)) expect(exported).toHaveProperty(key);
        });

        it("imports palette JSON and PB", () => {
            if (!paletteJsonFile) return;
            const paletteLegacy = readTestJson(paletteJsonFile.relPath);
            expect(() => paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy))).not.toThrow();
            if (!palettePbFile) return;
            const pb = readTestBytes(palettePbFile.relPath);
            expect(() => decodePaletteFile("palette.pb", pb)).not.toThrow();
        });

        it("imports dwellings JSON and PB", () => {
            if (!dwellingsJsonFile) return;
            const dwellingsLegacy = readTestJson(dwellingsJsonFile.relPath);
            expect(() => decodeDwellingsFile("dwellings.json", JSON.stringify(dwellingsLegacy))).not.toThrow();
            if (!dwellingsPbFile) return;
            const pb = readTestBytes(dwellingsPbFile.relPath);
            expect(() => decodeDwellingsFile("dwellings.pb", pb)).not.toThrow();
        });

        it("rejects dwellings data when palette is expected", () => {
            if (!paletteJsonFile || !dwellingsJsonFile) return;
            const dwellingsLegacy = readTestJson(dwellingsJsonFile.relPath);
            expect(() => paletteObjFromLegacyJsonText(JSON.stringify(dwellingsLegacy))).toThrow(
                /uploaded|expected|dwellings|palette/i
            );
        });

        it("rejects palette data when dwellings are expected", () => {
            if (!paletteJsonFile || !dwellingsJsonFile) return;
            const paletteLegacy = readTestJson(paletteJsonFile.relPath);
            expect(() => decodeDwellingsFile("palette.json", JSON.stringify(paletteLegacy))).toThrow(/uploaded|expected/i);
        });
    });
}
