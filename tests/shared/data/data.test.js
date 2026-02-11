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
} from "../../../src/js/shared/data/data.js";

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
