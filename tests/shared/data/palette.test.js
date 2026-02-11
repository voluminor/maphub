import { describe, it, expect } from "vitest";
import {
    unknownPalette,
    rgbObjToHex,
    hexToRgbObj,
    legacyBool,
    legacyInt,
    toFloat,
    fromFloat,
} from "../../../src/js/shared/data/palette.js";

// ─── rgbObjToHex ────────────────────────────────────────────────

describe("rgbObjToHex", () => {
    it("converts black", () => {
        expect(rgbObjToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
    });

    it("converts white", () => {
        expect(rgbObjToHex({ r: 255, g: 255, b: 255 })).toBe("#ffffff");
    });

    it("converts arbitrary color", () => {
        expect(rgbObjToHex({ r: 170, g: 187, b: 0 })).toBe("#aabb00");
    });

    it("pads single-digit channels", () => {
        expect(rgbObjToHex({ r: 1, g: 2, b: 3 })).toBe("#010203");
    });

    it("throws on missing channels", () => {
        expect(() => rgbObjToHex({ r: 0, g: 0 })).toThrow();
    });

    it("throws on out-of-range values", () => {
        expect(() => rgbObjToHex({ r: 256, g: 0, b: 0 })).toThrow();
        expect(() => rgbObjToHex({ r: -1, g: 0, b: 0 })).toThrow();
    });

    it("throws on non-number channels", () => {
        expect(() => rgbObjToHex({ r: "ff", g: 0, b: 0 })).toThrow();
    });
});

// ─── hexToRgbObj ────────────────────────────────────────────────

describe("hexToRgbObj", () => {
    it("parses 6-digit hex", () => {
        expect(hexToRgbObj("#aabb00")).toEqual({ r: 170, g: 187, b: 0 });
    });

    it("parses 3-digit hex", () => {
        expect(hexToRgbObj("#abc")).toEqual({ r: 170, g: 187, b: 204 });
    });

    it("handles whitespace around value", () => {
        expect(hexToRgbObj("  #ff0000  ")).toEqual({ r: 255, g: 0, b: 0 });
    });

    it("returns null for non-string", () => {
        expect(hexToRgbObj(123)).toBeNull();
        expect(hexToRgbObj(null)).toBeNull();
        expect(hexToRgbObj(undefined)).toBeNull();
    });

    it('returns null for "null" string', () => {
        expect(hexToRgbObj("null")).toBeNull();
    });

    it("returns null for string without #", () => {
        expect(hexToRgbObj("aabbcc")).toBeNull();
    });

    it("returns null for invalid length", () => {
        expect(hexToRgbObj("#abcd")).toBeNull();
    });
});

// ─── rgbObjToHex ↔ hexToRgbObj roundtrip ─────────────────────

describe("hex ↔ rgb roundtrip", () => {
    const samples = [
        { r: 0, g: 0, b: 0 },
        { r: 255, g: 255, b: 255 },
        { r: 18, g: 52, b: 86 },
        { r: 200, g: 100, b: 50 },
    ];

    for (const rgb of samples) {
        it(`roundtrip for (${rgb.r}, ${rgb.g}, ${rgb.b})`, () => {
            expect(hexToRgbObj(rgbObjToHex(rgb))).toEqual(rgb);
        });
    }
});

// ─── legacyBool ────────────────────────────────────────────────

describe("legacyBool", () => {
    it("parses boolean true", () => expect(legacyBool(true)).toBe(true));
    it("parses boolean false", () => expect(legacyBool(false)).toBe(false));
    it('parses string "true"', () => expect(legacyBool("true")).toBe(true));
    it('parses string "false"', () => expect(legacyBool("false")).toBe(false));
    it("returns null for null", () => expect(legacyBool(null)).toBeNull());
    it("returns null for undefined", () => expect(legacyBool(undefined)).toBeNull());
    it('returns null for "null"', () => expect(legacyBool("null")).toBeNull());
    it("throws on invalid string", () => expect(() => legacyBool("yes")).toThrow());
});

// ─── legacyInt ─────────────────────────────────────────────────

describe("legacyInt", () => {
    it("returns number as int", () => expect(legacyInt(42)).toBe(42));
    it("truncates float", () => expect(legacyInt(3.9)).toBe(3));
    it("parses string int", () => expect(legacyInt("7")).toBe(7));
    it("returns null for null", () => expect(legacyInt(null)).toBeNull());
    it("returns null for undefined", () => expect(legacyInt(undefined)).toBeNull());
    it('returns null for "null"', () => expect(legacyInt("null")).toBeNull());
    it("returns null for NaN input", () => expect(legacyInt(NaN)).toBeNull());
    it("returns null for Infinity", () => expect(legacyInt(Infinity)).toBeNull());
    it("returns null for non-numeric string", () => expect(legacyInt("abc")).toBeNull());
});

// ─── toFloat ───────────────────────────────────────────────────

describe("toFloat", () => {
    it("parses a number in range", () => expect(toFloat(0.5, 0, 1)).toBe(0.5));
    it("parses a string number in range", () => expect(toFloat("0.75", 0, 1)).toBe(0.75));
    it("returns null for null", () => expect(toFloat(null, 0, 1)).toBeNull());
    it("returns null for undefined", () => expect(toFloat(undefined, 0, 1)).toBeNull());
    it('returns null for "null"', () => expect(toFloat("null", 0, 1)).toBeNull());
    it("accepts boundary min", () => expect(toFloat(0, 0, 1)).toBe(0));
    it("accepts boundary max", () => expect(toFloat(1, 0, 1)).toBe(1));
    it("throws on below min", () => expect(() => toFloat(-0.1, 0, 1)).toThrow());
    it("throws on above max", () => expect(() => toFloat(1.1, 0, 1)).toThrow());
    it("throws on NaN string", () => expect(() => toFloat("abc", 0, 1)).toThrow());
});

// ─── fromFloat ─────────────────────────────────────────────────

describe("fromFloat", () => {
    it('returns "null" for null', () => expect(fromFloat(null)).toBe("null"));
    it('returns "null" for undefined', () => expect(fromFloat(undefined)).toBe("null"));
    it("passes through strings", () => expect(fromFloat("already")).toBe("already"));
    it("formats integer-like floats", () => expect(fromFloat(1.0)).toBe("1.0"));
    it("trims trailing zeros", () => expect(fromFloat(0.5)).toBe("0.5"));
    it("keeps up to 4 decimal places", () => expect(fromFloat(0.12345)).toBe("0.1235"));
    it("formats 0", () => expect(fromFloat(0)).toBe("0.0"));
    it("formats NaN as string", () => expect(fromFloat(NaN)).toBe("NaN"));
});

// ─── unknownPalette ────────────────────────────────────────────

describe("unknownPalette", () => {
    it("returns Error with default message", () => {
        const e = unknownPalette();
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toBe("Unknown data format - expected Palette.");
    });

    it("returns Error with custom detail", () => {
        const e = unknownPalette("bad field");
        expect(e).toBeInstanceOf(Error);
        expect(e.message).toContain("bad field");
    });
});
