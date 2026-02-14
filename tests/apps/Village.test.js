import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
} from "../../src/js/shared/data/Village.js";
import {
    findFileByName,
    findFirstFile,
    groupDataFilesByVersion,
    readTestBytes,
    readTestJson,
} from "../helpers/data-test-utils.js";

const filesByVersion = groupDataFilesByVersion();

for (const version of Object.keys(filesByVersion)) {
    const files = filesByVersion[version];
    const paletteJsonFile = findFirstFile(
        files,
        (file) => file.name === "PaletteVillageObj.json" && file.relPath.includes("/Village/")
    );
    const palettePbFile = findFirstFile(
        files,
        (file) => file.name === "PaletteVillageObj.pb" && file.relPath.includes("/Village/")
    );
    const wrongPaletteFile = findFirstFile(
        files,
        (file) => file.name === "PaletteMfcgObj.json" && file.relPath.includes("/mfcg/")
    );

    describe(`Village app palette (${version})`, () => {
        it("exports all legacy village palette fields", () => {
            if (!paletteJsonFile) return;
            const paletteLegacy = readTestJson(paletteJsonFile.relPath);
            const msg = paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy));
            const exported = JSON.parse(paletteLegacyJsonFromObj(msg));
            for (const key of Object.keys(paletteLegacy)) expect(exported).toHaveProperty(key);
        });

        it("imports village palette JSON and PB", () => {
            if (!paletteJsonFile) return;
            const paletteLegacy = readTestJson(paletteJsonFile.relPath);
            expect(() => paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy))).not.toThrow();
            if (!palettePbFile) return;
            const pb = readTestBytes(palettePbFile.relPath);
            expect(() => decodePaletteFile("palette.pb", pb)).not.toThrow();
        });

        it("rejects mfcg palette when village palette is expected", () => {
            if (!wrongPaletteFile) return;
            const wrongPalette = readTestJson(wrongPaletteFile.relPath);
            expect(() => paletteObjFromLegacyJsonText(JSON.stringify(wrongPalette))).toThrow(/uploaded|expected/i);
        });
    });
}
