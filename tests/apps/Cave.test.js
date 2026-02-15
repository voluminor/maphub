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
    const caveJsonFile = findFirstFile(
        files,
        (file) =>
            file.relPath.includes("/Cave/") &&
            (file.name === "PaletteCaveObj.json" || file.name.endsWith(".palette.cv.json"))
    );
    const gladeJsonFile = findFileByName(files, "PaletteGladeObj.json");
    const cavePbFile = findFirstFile(
        files,
        (file) => file.relPath.includes("/Cave/") && file.name.endsWith(".pb")
    );
    const gladePbFile = findFileByName(files, "PaletteGladeObj.pb");

    describe(`Cave app palettes (${version})`, () => {
        it("exports all legacy cave palette fields", () => {
            if (!caveJsonFile) return;
            const caveLegacy = readTestJson(caveJsonFile.relPath);
            const msg = cavePaletteFromText(JSON.stringify(caveLegacy));
            const exported = JSON.parse(cavePaletteToText(msg));
            for (const key of Object.keys(caveLegacy)) expect(exported).toHaveProperty(key);
        });

        it("imports cave palette JSON and PB", () => {
            if (!caveJsonFile) return;
            const caveLegacy = readTestJson(caveJsonFile.relPath);
            expect(() => cavePaletteFromText(JSON.stringify(caveLegacy))).not.toThrow();
            if (!cavePbFile) return;
            const pb = readTestBytes(cavePbFile.relPath);
            expect(() => decodeCavePalette("cave.pb", pb)).not.toThrow();
        });

        it("rejects glade palette when cave palette is expected", () => {
            if (!caveJsonFile || !gladeJsonFile) return;
            const gladeLegacy = readTestJson(gladeJsonFile.relPath);
            expect(() => cavePaletteFromText(JSON.stringify(gladeLegacy))).toThrow(/uploaded|expected/i);
        });

        it("exports all legacy glade palette fields", () => {
            if (!gladeJsonFile) return;
            const gladeLegacy = readTestJson(gladeJsonFile.relPath);
            const msg = gladePaletteFromText(JSON.stringify(gladeLegacy));
            const exported = JSON.parse(gladePaletteToText(msg));
            for (const key of Object.keys(gladeLegacy)) expect(exported).toHaveProperty(key);
        });

        it("imports glade palette JSON and PB", () => {
            if (!gladeJsonFile) return;
            const gladeLegacy = readTestJson(gladeJsonFile.relPath);
            expect(() => gladePaletteFromText(JSON.stringify(gladeLegacy))).not.toThrow();
            if (!gladePbFile) return;
            const pb = readTestBytes(gladePbFile.relPath);
            expect(() => decodeGladePalette("glade.pb", pb)).not.toThrow();
        });

        it("rejects cave palette when glade palette is expected", () => {
            if (!caveJsonFile || !gladeJsonFile) return;
            const caveLegacy = readTestJson(caveJsonFile.relPath);
            expect(() => gladePaletteFromText(JSON.stringify(caveLegacy))).toThrow(/uploaded|expected/i);
        });
    });
}
