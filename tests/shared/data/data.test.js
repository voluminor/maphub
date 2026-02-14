import { describe, it, expect } from "vitest";
import {
    jsToProtoValue,
    jsToProtoListValue,
    protoValueToJs,
    protoListValueToJs,
    protoStructToJs,
    enumToNumber,
    readProp,
    toUint8Array,
    bytesToUtf8Text,
    detectLegacyRootType,
    describeRootType,
    createTypeMismatchError,
    decodeDataFromFile,
    encodeDataToBytes,
    geoJsonToProtoObject,
    geoJsonFromProtoMessage,
    decodeCityFromJsonText,
    decodeCityFile,
} from "../../../src/js/shared/data/data.js";
import { data as DataProto } from "../../../src/js/struct/data.js";

const DT = DataProto.DataType;

// ─── jsToProtoValue / protoValueToJs roundtrip ──────────────────

describe("jsToProtoValue ↔ protoValueToJs", () => {
    it("handles null", () => {
        const pv = jsToProtoValue(null);
        expect(pv).toHaveProperty("nullValue");
        expect(protoValueToJs(pv)).toBeNull();
    });

    it("handles undefined as null", () => {
        const pv = jsToProtoValue(undefined);
        expect(protoValueToJs(pv)).toBeNull();
    });

    it("handles number", () => {
        const pv = jsToProtoValue(42);
        expect(pv).toEqual({ numberValue: 42 });
        expect(protoValueToJs(pv)).toBe(42);
    });

    it("handles float", () => {
        const pv = jsToProtoValue(3.14);
        expect(protoValueToJs(pv)).toBe(3.14);
    });

    it("handles string", () => {
        const pv = jsToProtoValue("hello");
        expect(pv).toEqual({ stringValue: "hello" });
        expect(protoValueToJs(pv)).toBe("hello");
    });

    it("handles boolean true", () => {
        const pv = jsToProtoValue(true);
        expect(pv).toEqual({ boolValue: true });
        expect(protoValueToJs(pv)).toBe(true);
    });

    it("handles boolean false", () => {
        const pv = jsToProtoValue(false);
        expect(pv).toEqual({ boolValue: false });
        expect(protoValueToJs(pv)).toBe(false);
    });

    it("handles array", () => {
        const arr = [1, "two", null];
        const pv = jsToProtoValue(arr);
        expect(pv).toHaveProperty("listValue");
        const back = protoValueToJs(pv);
        expect(back).toEqual(arr);
    });

    it("handles nested object", () => {
        const obj = { a: 1, b: "hello" };
        const pv = jsToProtoValue(obj);
        expect(pv).toHaveProperty("structValue");
        const back = protoValueToJs(pv);
        expect(back).toEqual(obj);
    });
});

// ─── jsToProtoListValue / protoListValueToJs ────────────────────

describe("jsToProtoListValue ↔ protoListValueToJs", () => {
    it("roundtrips flat array", () => {
        const arr = [1, 2, 3];
        expect(protoListValueToJs(jsToProtoListValue(arr))).toEqual(arr);
    });

    it("roundtrips mixed array", () => {
        const arr = [1, "a", true, null];
        expect(protoListValueToJs(jsToProtoListValue(arr))).toEqual(arr);
    });

    it("roundtrips nested arrays", () => {
        const arr = [[1, 2], [3, 4]];
        expect(protoListValueToJs(jsToProtoListValue(arr))).toEqual(arr);
    });

    it("returns empty array for null input", () => {
        expect(protoListValueToJs(null)).toEqual([]);
    });
});

// ─── protoStructToJs ────────────────────────────────────────────

describe("protoStructToJs", () => {
    it("converts fields to plain object", () => {
        const st = {
            fields: {
                x: { numberValue: 10 },
                y: { stringValue: "hi" },
            },
        };
        expect(protoStructToJs(st)).toEqual({ x: 10, y: "hi" });
    });

    it("returns empty object for null", () => {
        expect(protoStructToJs(null)).toEqual({});
    });

    it("returns empty object for missing fields", () => {
        expect(protoStructToJs({})).toEqual({});
    });
});

// ─── geoJsonToProtoObject / geoJsonFromProtoMessage ─────────────

describe("geoJsonToProtoObject ↔ geoJsonFromProtoMessage", () => {
    it("converts GeoJSON to proto-ready object", () => {
        const input = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: "roads",
                    generator: "mfcg",
                    properties: { road_width: 2 },
                    geometry: {
                        type: "LineString",
                        coordinates: [[1, 2], [3, 4]],
                    },
                },
            ],
        };

        const protoObj = geoJsonToProtoObject(input);
        expect(protoObj.type).toBe(DataProto.GeoType.FeatureCollection);
        expect(protoObj.features[0].type).toBe(DataProto.GeoType.Feature);
        expect(protoObj.features[0].id).toBe(DataProto.GeoFeatureType.roads);
        expect(protoObj.features[0].generator).toBe(DataProto.GeoGeneratorType.mfcg);
        expect(protoObj.features[0].roadWidth).toBe(2);
        expect(protoListValueToJs(protoObj.features[0].geometry.coordinates)).toEqual([[1, 2], [3, 4]]);
    });

    it("converts proto message back to GeoJSON", () => {
        const msg = {
            type: DataProto.GeoType.FeatureCollection,
            id: DataProto.GeoFeatureType.values,
            generator: DataProto.GeoGeneratorType.mfcg,
            features: [],
        };

        const json = geoJsonFromProtoMessage(msg);
        expect(json.type).toBe("FeatureCollection");
        expect(json.id).toBe("values");
        expect(json.generator).toBe("mfcg");
    });
});

// ─── enumToNumber ───────────────────────────────────────────────

describe("enumToNumber", () => {
    const testEnum = { Foo: 0, Bar: 1, Baz: 2 };

    it("returns numeric value as-is", () => {
        expect(enumToNumber(testEnum, 1, null)).toBe(1);
    });

    it("resolves string enum key", () => {
        expect(enumToNumber(testEnum, "Bar", null)).toBe(1);
    });

    it("returns null for null input", () => {
        expect(enumToNumber(testEnum, null, null)).toBeNull();
    });

    it("returns null for undefined input", () => {
        expect(enumToNumber(testEnum, undefined, null)).toBeNull();
    });

    it("returns fallback on unknown key", () => {
        expect(enumToNumber(testEnum, "Unknown", 99)).toBe(99);
    });

    it("throws on unknown key with no fallback", () => {
        expect(() => enumToNumber(testEnum, "Unknown", null)).toThrow();
    });

    it('returns null for "hood" special case', () => {
        expect(enumToNumber(testEnum, "hood", null)).toBeNull();
    });

    it('returns null for "hoods" special case', () => {
        expect(enumToNumber(testEnum, "hoods", null)).toBeNull();
    });
});

// ─── readProp ───────────────────────────────────────────────────

describe("readProp", () => {
    it("reads direct camelCase prop", () => {
        expect(readProp({ roadWidth: 5 }, "roadWidth")).toBe(5);
    });

    it("reads snake_case equivalent", () => {
        expect(readProp({ road_width: 5 }, "roadWidth")).toBe(5);
    });

    it("reads from node.properties", () => {
        expect(readProp({ properties: { roadWidth: 5 } }, "roadWidth")).toBe(5);
    });

    it("reads snake_case from node.properties", () => {
        expect(readProp({ properties: { road_width: 5 } }, "roadWidth")).toBe(5);
    });

    it("returns null for null node", () => {
        expect(readProp(null, "x")).toBeNull();
    });

    it("returns null for missing key", () => {
        expect(readProp({ a: 1 }, "b")).toBeNull();
    });

    it("prefers direct over properties", () => {
        expect(readProp({ x: 1, properties: { x: 2 } }, "x")).toBe(1);
    });
});

// ─── toUint8Array ───────────────────────────────────────────────

describe("toUint8Array", () => {
    it("returns null for null", () => {
        expect(toUint8Array(null)).toBeNull();
    });

    it("returns Uint8Array as-is", () => {
        const u = new Uint8Array([1, 2, 3]);
        expect(toUint8Array(u)).toBe(u);
    });

    it("converts ArrayBuffer", () => {
        const ab = new Uint8Array([4, 5, 6]).buffer;
        const result = toUint8Array(ab);
        expect(result).toBeInstanceOf(Uint8Array);
        expect([...result]).toEqual([4, 5, 6]);
    });

    it("converts DataView", () => {
        const ab = new Uint8Array([7, 8, 9]).buffer;
        const dv = new DataView(ab);
        const result = toUint8Array(dv);
        expect(result).toBeInstanceOf(Uint8Array);
        expect([...result]).toEqual([7, 8, 9]);
    });

    it("extracts .b property if Uint8Array", () => {
        const u = new Uint8Array([10, 11]);
        expect(toUint8Array({ b: u })).toBe(u);
    });
});

// ─── bytesToUtf8Text ────────────────────────────────────────────

describe("bytesToUtf8Text", () => {
    it("returns string input as-is", () => {
        expect(bytesToUtf8Text("hello")).toBe("hello");
    });

    it("decodes Uint8Array to UTF-8", () => {
        const bytes = new TextEncoder().encode("мир");
        expect(bytesToUtf8Text(bytes)).toBe("мир");
    });

    it("decodes ArrayBuffer", () => {
        const bytes = new TextEncoder().encode("test").buffer;
        expect(bytesToUtf8Text(bytes)).toBe("test");
    });

    it("returns empty string for empty-ish input", () => {
        expect(bytesToUtf8Text(null)).toBe("");
    });
});

// ─── detectLegacyRootType ──────────────────────────────────────

describe("detectLegacyRootType", () => {
    it("detects GeoObj as DataType.geo", () => {
        expect(detectLegacyRootType({ type: "FeatureCollection", features: [] })).toBe(DT.geo);
    });

    it("detects DwellingsObj as DataType.dwellings", () => {
        expect(detectLegacyRootType({ floors: [{}] })).toBe(DT.dwellings);
    });

    it("detects PaletteCaveObj as DataType.palette_cave", () => {
        expect(detectLegacyRootType({ colors: {}, shadow: {}, strokes: {}, hatching: {} })).toBe(DT.palette_cave);
    });

    it("detects PaletteDwellingsObj as DataType.palette_dwellings", () => {
        expect(detectLegacyRootType({ colors: {}, misc: {}, strokes: {} })).toBe(DT.palette_dwellings);
    });

    it("detects PaletteViewerObj by key", () => {
        expect(detectLegacyRootType({ walls1: "#000" })).toBe(DT.palette_viewer);
    });

    it("detects PaletteVillageObj by key", () => {
        expect(detectLegacyRootType({ roofLight: "#000" })).toBe(DT.palette_village);
    });

    it("detects PaletteGladeObj by key", () => {
        expect(detectLegacyRootType({ thicket: "#000" })).toBe(DT.palette_glade);
    });

    it("detects PaletteMfcgObj by key", () => {
        expect(detectLegacyRootType({ colorLight: "#000" })).toBe(DT.palette_mfcg);
    });

    it("returns null for unrecognized object", () => {
        expect(detectLegacyRootType({ unknownKey: 1 })).toBeNull();
    });

    it("returns null for null", () => {
        expect(detectLegacyRootType(null)).toBeNull();
    });

    it("returns null for non-object", () => {
        expect(detectLegacyRootType("string")).toBeNull();
    });
});

// ─── describeRootType ──────────────────────────────────────────

describe("describeRootType", () => {
    it("returns label and kind for DataType.geo", () => {
        const d = describeRootType(DT.geo);
        expect(d.label).toBe("City/Village");
        expect(d.kind).toBe("data");
    });

    it("returns label and kind for DataType.palette_cave", () => {
        const d = describeRootType(DT.palette_cave);
        expect(d.label).toBe("Cave");
        expect(d.kind).toBe("styles");
    });

    it("returns fallback for unknown type", () => {
        const d = describeRootType(999);
        expect(d.label).toBe("999");
        expect(d.kind).toBe("data");
    });
});

// ─── createTypeMismatchError ───────────────────────────────────

describe("createTypeMismatchError", () => {
    it("creates error for data type mismatch", () => {
        const err = createTypeMismatchError(DT.geo, DT.dwellings);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("City/Village");
        expect(err.message).toContain("Dwellings");
    });

    it("creates error for styles type mismatch", () => {
        const err = createTypeMismatchError(DT.palette_cave, DT.palette_mfcg);
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("Cave styles");
        expect(err.message).toContain("MFCG styles");
    });
});

// ─── decodeCityFromJsonText / decodeCityFile ────────────────────

describe("decodeCityFromJsonText", () => {
    it("accepts minimal FeatureCollection GeoJSON", () => {
        const text = JSON.stringify({ type: "FeatureCollection", features: [] });
        const obj = decodeCityFromJsonText(text);
        expect(obj.type).toBe("FeatureCollection");
    });

    it("throws on malformed JSON", () => {
        expect(() => decodeCityFromJsonText("{bad")).toThrow("An error occurred while parsing");
    });
});

describe("decodeCityFile", () => {
    it("preserves hood generator override in values feature", () => {
        const city = {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    id: "values",
                    generator: "hood",
                    geometry: { type: "LineString", coordinates: [[0, 0], [1, 1]] },
                },
            ],
        };
        const bytes = new TextEncoder().encode(JSON.stringify(city));
        const out = decodeCityFile("city.json", bytes);
        expect(out.features[0].generator).toBe("hood");
    });
});

// ─── decodeDataFromFile with DataType ──────────────────────────

describe("decodeDataFromFile", () => {
    it("decodes JSON via legacy parser", () => {
        const jsonText = JSON.stringify({ type: "FeatureCollection", features: [] });
        const bytes = new TextEncoder().encode(jsonText);
        const parser = (text) => JSON.parse(text);
        const result = decodeDataFromFile(DT.geo, parser, bytes);
        expect(result.type).toBe("FeatureCollection");
    });

    it("decodes proto binary for matching type", () => {
        const msg = DataProto.PaletteCaveObj.fromObject({ colors: {} });
        const protoBytes = DataProto.PaletteCaveObj.encode(msg).finish();
        const result = decodeDataFromFile(DT.palette_cave, () => { throw new Error("not JSON"); }, protoBytes);
        expect(result).toBeTruthy();
    });

    it("throws on invalid data", () => {
        expect(() => decodeDataFromFile(DT.geo, () => { throw new Error("not JSON"); }, new Uint8Array([0, 0, 0, 0, 0]))).toThrow();
    });

    it("throws on unknown bin-verify data type", () => {
        const frame = encodeDataToBytes(999, new Uint8Array([1, 2, 3]));
        expect(() => decodeDataFromFile(DT.geo, () => { throw new Error("not JSON"); }, frame))
            .toThrow("unknown data type");
    });
});

// ─── encodeDataToBytes / decodeDataFromFile bin-verify roundtrip ─

describe("encodeDataToBytes / decodeDataFromFile bin-verify roundtrip", () => {
    it("roundtrips proto via bin-verify frame", () => {
        const msg = DataProto.PaletteCaveObj.fromObject({ colors: {} });
        const raw = DataProto.PaletteCaveObj.encode(msg).finish();
        const frame = encodeDataToBytes(DT.palette_cave, raw);
        expect(frame).toBeInstanceOf(ArrayBuffer);
        expect(frame.byteLength).toBe(raw.length + 8);
        const decoded = decodeDataFromFile(DT.palette_cave, () => { throw new Error("not JSON"); }, frame);
        expect(decoded).toBeTruthy();
    });

    it("throws type mismatch for mismatched bin-verify frame", () => {
        const msg = DataProto.PaletteCaveObj.fromObject({ colors: {} });
        const raw = DataProto.PaletteCaveObj.encode(msg).finish();
        const frame = encodeDataToBytes(DT.palette_cave, raw);
        expect(() => decodeDataFromFile(DT.palette_mfcg, () => { throw new Error("not JSON"); }, frame)).toThrow("You uploaded");
    });

    it("falls back to raw proto decode on CRC mismatch", () => {
        const msg = DataProto.PaletteCaveObj.fromObject({ colors: {} });
        const raw = DataProto.PaletteCaveObj.encode(msg).finish();
        const decoded = decodeDataFromFile(DT.palette_cave, () => { throw new Error("not JSON"); }, raw);
        expect(decoded).toBeTruthy();
    });

    it("throws on corrupted bin-verify frame", () => {
        const msg = DataProto.PaletteCaveObj.fromObject({ colors: {} });
        const raw = DataProto.PaletteCaveObj.encode(msg).finish();
        const frame = encodeDataToBytes(DT.palette_cave, raw);
        const u8 = new Uint8Array(frame);
        u8[5] ^= 0xFF;
        expect(() => decodeDataFromFile(DT.palette_cave, () => { throw new Error("not JSON"); }, frame)).toThrow();
    });
});
