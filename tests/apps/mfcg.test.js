import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
} from "../../src/js/shared/data/mfcg.js";
import { decodeCityFile } from "../../src/js/shared/data/data.js";
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
    const paletteJsonFile = findFileByName(files, "PaletteMfcgObj.json");
    const palettePbFile = findFileByName(files, "PaletteMfcgObj.pb");
    const geoJsonFile = findFirstFile(files, (file) => file.name === "GeoObj.json" && file.relPath.includes("/mfcg/"));
    const geoPbFile = findFirstFile(files, (file) => file.name === "GeoObj.pb" && file.relPath.includes("/mfcg/"));

    describe(`MFCG app data (${version})`, () => {
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

        it("imports geo JSON and PB", () => {
            if (!geoJsonFile) return;
            const geoLegacy = readTestJson(geoJsonFile.relPath);
            expect(() => decodeCityFile("geo.json", JSON.stringify(geoLegacy))).not.toThrow();
            if (!geoPbFile) return;
            const pb = readTestBytes(geoPbFile.relPath);
            expect(() => decodeCityFile("geo.pb", pb)).not.toThrow();
        });

        it("rejects geo data when palette is expected", () => {
            if (!paletteJsonFile || !geoJsonFile) return;
            const geoLegacy = readTestJson(geoJsonFile.relPath);
            expect(() => paletteObjFromLegacyJsonText(JSON.stringify(geoLegacy))).toThrow(/uploaded|expected/i);
        });

        it("rejects palette data when geo is expected", () => {
            if (!paletteJsonFile || !geoJsonFile) return;
            const paletteLegacy = readTestJson(paletteJsonFile.relPath);
            expect(() => decodeCityFile("palette.json", JSON.stringify(paletteLegacy))).toThrow(/uploaded|expected/i);
        });
    });
}
