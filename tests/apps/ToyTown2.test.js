import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
} from "../../src/js/shared/data/Viewer.js";
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
    const paletteJsonFile = findFirstFile(
        files,
        (file) => file.name === "PaletteViewerObj.json" && file.relPath.includes("/ToyTown2/")
    );
    const wrongPaletteFile = findFirstFile(
        files,
        (file) => file.name === "PaletteVillageObj.json" && file.relPath.includes("/Village/")
    );
    const geoJsonFile = findFirstFile(
        files,
        (file) => file.name === "GeoObj.json" && file.relPath.includes("/Village/")
    );
    const geoPbFile = findFirstFile(
        files,
        (file) => file.name === "GeoObj.pb" && file.relPath.includes("/Village/")
    );
    const cavePbFile = findFileByName(files, "PaletteCaveObj.pb");

    describe(`ToyTown2 app data (${version})`, () => {
        it("exports all legacy viewer palette fields", () => {
            if (!paletteJsonFile) return;
            const paletteLegacy = readTestJson(paletteJsonFile.relPath);
            const msg = paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy));
            const exported = JSON.parse(paletteLegacyJsonFromObj(msg));
            for (const key of Object.keys(paletteLegacy)) expect(exported).toHaveProperty(key);
        });

        it("imports viewer palette JSON", () => {
            if (!paletteJsonFile) return;
            const paletteLegacy = readTestJson(paletteJsonFile.relPath);
            expect(() => paletteObjFromLegacyJsonText(JSON.stringify(paletteLegacy))).not.toThrow();
        });

        it("imports geo JSON and PB", () => {
            if (!geoJsonFile) return;
            const geoLegacy = readTestJson(geoJsonFile.relPath);
            expect(() => decodeCityFile("geo.json", JSON.stringify(geoLegacy))).not.toThrow();
            if (!geoPbFile) return;
            const pb = readTestBytes(geoPbFile.relPath);
            expect(() => decodeCityFile("geo.pb", pb)).not.toThrow();
        });

        it("accepts cave palette PB without type wrapper", () => {
            if (!cavePbFile) return;
            const pb = readTestBytes(cavePbFile.relPath);
            expect(() => decodePaletteFile("palette.pb", pb)).not.toThrow();
        });

        it("rejects village palette when viewer palette is expected", () => {
            if (!wrongPaletteFile) return;
            const wrongPalette = readTestJson(wrongPaletteFile.relPath);
            expect(() => paletteObjFromLegacyJsonText(JSON.stringify(wrongPalette))).toThrow(/uploaded|expected/i);
        });
    });
}
