import { describe, it, expect } from "vitest";
import {
    paletteObjFromLegacyJsonText,
    paletteLegacyJsonFromObj,
    decodePaletteFile,
} from "../../../src/js/shared/data/Village.js";

const VALID_VILLAGE_JSON = {
    ground: ["#88aa66", "#77aa55"],
    relief: "Hachures",
    sand: "#ddcc99",
    plank: "#aa8866",

    roofLight: ["#cc7744", "#bb6633"],
    roofStroke: "#554433",
    roofVariance: "0.3",
    roofSlope: "0.5",
    roofType: "Gable",

    road: "#ccbb99",
    largeRoad: "4.0",
    smallRoad: "2.0",
    outlineRoads: "Hard",
    mergeRoads: "true",

    fieldLight: ["#aacc44", "#99bb33"],
    fieldFurrow: "#887744",
    fieldVariance: "0.4",
    outlineFields: "Soft",

    waterShallow: "#88bbdd",
    waterDeep: "#5588aa",
    waterTide: "#aaddff",
    shallowBands: "3",

    tree: ["#446633", "#557744"],
    thicket: "#335522",
    treeDetails: "#223311",
    treeVariance: "0.5",
    treeShape: "Cotton",

    shadowColor: "#333333",
    shadowLength: "2.0",
    shadowAngle: "135",
    lights: "#ffeecc",

    fontHeader: { face: "Arial", size: 16, bold: true, italic: false, embedded: "base64header" },
    fontPopulation: { face: "Arial", size: 12, bold: false, italic: false, embedded: "base64pop" },
    fontNumber: { face: "Arial", size: 10, bold: false, italic: true, embedded: "base64num" },

    ink: "#222222",
    paper: "#ffeedd",
    strokeNormal: "1.0",
    strokeThin: "0.5",
};

function validVillageJsonText() {
    return JSON.stringify(VALID_VILLAGE_JSON);
}

// ─── paletteObjFromLegacyJsonText ───────────────────────────────

describe("Village: paletteObjFromLegacyJsonText", () => {
    it("parses valid JSON into proto message", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        expect(msg).toBeTruthy();
        expect(msg.terrain).toBeTruthy();
        expect(msg.houses).toBeTruthy();
        expect(msg.roads).toBeTruthy();
        expect(msg.fields).toBeTruthy();
        expect(msg.water).toBeTruthy();
        expect(msg.trees).toBeTruthy();
        expect(msg.lighting).toBeTruthy();
        expect(msg.text).toBeTruthy();
        expect(msg.misc).toBeTruthy();
    });

    it("parses terrain colors as rgb list", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        expect(msg.terrain.ground).toHaveLength(2);
        expect(msg.terrain.ground[0]).toEqual({ r: 136, g: 170, b: 102 });
    });

    it("parses terrain enums", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        // relief is an enum, should be a number
        expect(typeof msg.terrain.relief).toBe("number");
    });

    it("parses house settings", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        expect(msg.houses.roofLight).toHaveLength(2);
        expect(msg.houses.roofVariance).toBeCloseTo(0.3);
        expect(typeof msg.houses.roofType).toBe("number");
    });

    it("parses road settings", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        expect(msg.roads.road).toEqual({ r: 204, g: 187, b: 153 });
        expect(msg.roads.largeRoad).toBeCloseTo(4.0);
        expect(msg.roads.mergeRoads).toBe(true);
    });

    it("parses field settings", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        expect(msg.fields.fieldLight).toHaveLength(2);
        expect(msg.fields.fieldVariance).toBeCloseTo(0.4);
    });

    it("parses water settings", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        expect(msg.water.waterShallow).toEqual({ r: 136, g: 187, b: 221 });
        expect(msg.water.shallowBands).toBe(3);
    });

    it("parses tree settings", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        expect(msg.trees.tree).toHaveLength(2);
        expect(msg.trees.treeVariance).toBeCloseTo(0.5);
    });

    it("parses lighting settings", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        expect(msg.lighting.shadowColor).toEqual({ r: 51, g: 51, b: 51 });
        expect(msg.lighting.shadowLength).toBeCloseTo(2.0);
        expect(msg.lighting.shadowAngleDeg).toBe(135);
    });

    it("parses font settings", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        expect(msg.text.fontHeader.face).toBe("Arial");
        expect(msg.text.fontHeader.size).toBe(16);
        expect(msg.text.fontHeader.bold).toBe(true);
    });

    it("parses misc settings", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        expect(msg.misc.ink).toEqual({ r: 34, g: 34, b: 34 });
        expect(msg.misc.strokeNormal).toBeCloseTo(1.0);
    });

    it("throws on invalid JSON", () => {
        expect(() => paletteObjFromLegacyJsonText("bad")).toThrow("An error occurred while parsing");
    });

    it("throws on dwellings data", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify({ floors: [{}] }))).toThrow("Dwellings");
    });

    it("throws on city/village GeoJSON", () => {
        expect(() => paletteObjFromLegacyJsonText(JSON.stringify({ type: "FeatureCollection", features: [] }))).toThrow("City/Village");
    });

    it("throws on missing fields", () => {
        const partial = JSON.stringify({ ground: ["#aabbcc"], relief: "Hachures" });
        expect(() => paletteObjFromLegacyJsonText(partial)).toThrow("not enough data");
    });

    it("parses all relief enum values", () => {
        for (const v of ["Hachures", "Contours", "Grass"]) {
            const json = JSON.stringify({ ...VALID_VILLAGE_JSON, relief: v });
            expect(() => paletteObjFromLegacyJsonText(json)).not.toThrow();
        }
    });

    it("parses all roof type enum values", () => {
        for (const v of ["Gable", "Hip", "Flat", "Ruin"]) {
            const json = JSON.stringify({ ...VALID_VILLAGE_JSON, roofType: v });
            expect(() => paletteObjFromLegacyJsonText(json)).not.toThrow();
        }
    });

    it("parses all tree shape enum values", () => {
        for (const v of ["Cotton", "Conifer", "Palm"]) {
            const json = JSON.stringify({ ...VALID_VILLAGE_JSON, treeShape: v });
            expect(() => paletteObjFromLegacyJsonText(json)).not.toThrow();
        }
    });
});

// ─── paletteLegacyJsonFromObj ───────────────────────────────────

describe("Village: paletteLegacyJsonFromObj", () => {
    it("exports valid JSON string", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        const json = paletteLegacyJsonFromObj(msg);
        expect(() => JSON.parse(json)).not.toThrow();
    });

    it("exports ground as hex array", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(Array.isArray(obj.ground)).toBe(true);
        expect(obj.ground.length).toBe(2);
        expect(obj.ground[0]).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("exports single colors as hex", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(obj.sand).toMatch(/^#[0-9a-f]{6}$/);
        expect(obj.road).toMatch(/^#[0-9a-f]{6}$/);
        expect(obj.ink).toMatch(/^#[0-9a-f]{6}$/);
    });

    it("exports enums as capitalized strings", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(obj.relief).toBe("Hachures");
        expect(obj.roofType).toBe("Gable");
        expect(obj.treeShape).toBe("Cotton");
        expect(["Hard","Soft","None"]).toContain(obj.outlineRoads);
        expect(["Hard","Soft","None"]).toContain(obj.outlineFields);
    });

    it("exports booleans as string", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(obj.mergeRoads).toBe("true");
    });

    it("exports font objects", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(obj.fontHeader).toBeTruthy();
        expect(typeof obj.fontHeader.size).toBe("number");
        expect(typeof obj.fontHeader.bold).toBe("boolean");
        expect(typeof obj.fontHeader.embedded).toBe("string");
    });

    it("exports float values as strings", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        const obj = JSON.parse(paletteLegacyJsonFromObj(msg));
        expect(parseFloat(obj.strokeNormal)).toBeCloseTo(1.0);
        expect(parseFloat(obj.strokeThin)).toBeCloseTo(0.5);
        expect(parseFloat(obj.largeRoad)).toBeCloseTo(4.0);
    });

    it("throws on null input", () => {
        expect(() => paletteLegacyJsonFromObj(null)).toThrow();
    });

    it("throws on missing sub-objects", () => {
        expect(() => paletteLegacyJsonFromObj({ terrain: {} })).toThrow();
    });
});

// ─── roundtrip ──────────────────────────────────────────────────

describe("Village: import/export roundtrip", () => {
    it("preserves key values through roundtrip", () => {
        const msg = paletteObjFromLegacyJsonText(validVillageJsonText());
        const parsed = JSON.parse(paletteLegacyJsonFromObj(msg));

        expect(parsed.ground).toEqual(VALID_VILLAGE_JSON.ground);
        expect(parsed.relief).toBe(VALID_VILLAGE_JSON.relief);
        expect(parsed.sand).toBe(VALID_VILLAGE_JSON.sand);
        expect(parsed.road).toBe(VALID_VILLAGE_JSON.road);
        expect(parsed.ink).toBe(VALID_VILLAGE_JSON.ink);
        expect(parsed.paper).toBe(VALID_VILLAGE_JSON.paper);
        expect(parsed.roofType).toBe(VALID_VILLAGE_JSON.roofType);
        expect(parsed.treeShape).toBe(VALID_VILLAGE_JSON.treeShape);
        expect(parsed.mergeRoads).toBe(VALID_VILLAGE_JSON.mergeRoads);
    });

    it("re-import/export is stable", () => {
        const msg1 = paletteObjFromLegacyJsonText(validVillageJsonText());
        const exp1 = paletteLegacyJsonFromObj(msg1);
        const msg2 = paletteObjFromLegacyJsonText(exp1);
        const exp2 = paletteLegacyJsonFromObj(msg2);
        expect(exp2).toBe(exp1);
    });
});

// ─── decodePaletteFile ──────────────────────────────────────────

describe("Village: decodePaletteFile", () => {
    it("decodes from JSON text bytes", () => {
        const textBytes = new TextEncoder().encode(validVillageJsonText());
        const msg = decodePaletteFile("test.json", textBytes);
        expect(msg.terrain.ground).toHaveLength(2);
        expect(msg.misc.ink).toEqual({ r: 34, g: 34, b: 34 });
    });
});
