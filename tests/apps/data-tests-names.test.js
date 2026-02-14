import { describe, it, expect } from "vitest";
import { listDataFiles } from "../helpers/data-test-utils.js";

const ALLOWED_BY_FOLDER = {
    Cave: [
        /^PaletteCaveObj\.json$/,
        /^PaletteGladeObj\.json$/,
        /^PaletteCaveObj\.pb$/,
        /^PaletteGladeObj\.pb$/,
    ],
    Dwellings: [
        /^PaletteDwellingsObj\.json$/,
        /^PaletteDwellingsObj\.pb$/,
        /^DwellingsObj\.json$/,
        /^DwellingsObj\.pb$/,
    ],
    mfcg: [
        /^PaletteMfcgObj\.json$/,
        /^PaletteMfcgObj\.pb$/,
        /^GeoObj\.json$/,
        /^GeoObj\.pb$/,
    ],
    ToyTown2: [
        /^PaletteViewerObj\.json$/,
        /^PaletteViewerObj\.pb$/,
    ],
    Village: [
        /^PaletteVillageObj\.json$/,
        /^PaletteVillageObj\.pb$/,
        /^GeoObj\.json$/,
        /^GeoObj\.pb$/,
    ],
};

function folderFromRelPath(relPath) {
    const parts = relPath.split("/");
    return parts.length >= 2 ? parts[1] : null;
}

function isAllowedFile(folder, name) {
    const patterns = ALLOWED_BY_FOLDER[folder];
    if (!patterns) return true;
    return patterns.some((re) => re.test(name));
}

describe("data_tests file names", () => {
    it("uses only allowed file names for known folders", () => {
        const files = listDataFiles();
        const invalid = [];
        for (const file of files) {
            const folder = folderFromRelPath(file.relPath);
            if (!folder) continue;
            if (!isAllowedFile(folder, file.name)) invalid.push(file.relPath);
        }
        expect(invalid).toEqual([]);
    });
});
