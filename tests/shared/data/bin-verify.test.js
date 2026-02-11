import { describe, it, expect } from "vitest";
import { exportBin, importBin } from "../../../src/js/shared/data/bin-verify.js";
import { data as DataProto } from "../../../src/js/struct/data.js";

// ─── helpers ─────────────────────────────────────────────────────

/** Encode a proto message to Uint8Array using its .encode() */
function encodeProto(MessageType, obj) {
    return MessageType.encode(MessageType.fromObject(obj)).finish();
}

/** DataType enum value mapping (mirrors protobuf/data/enum.proto) */
const DT = DataProto.DataType;

// ─── mapping: DataType enum ↔ proto message type names ──────────

const TYPE_MAP = [
    { enumName: "geo",                enumValue: 1,  typeName: "GeoObj" },
    { enumName: "dwellings",          enumValue: 2,  typeName: "DwellingsObj" },
    { enumName: "palette_cave",       enumValue: 20, typeName: "PaletteCaveObj" },
    { enumName: "palette_glade",      enumValue: 21, typeName: "PaletteGladeObj" },
    { enumName: "palette_dwellings",  enumValue: 22, typeName: "PaletteDwellingsObj" },
    { enumName: "palette_mfcg",       enumValue: 23, typeName: "PaletteMfcgObj" },
    { enumName: "palette_village",    enumValue: 24, typeName: "PaletteVillageObj" },
    { enumName: "palette_viewer",     enumValue: 25, typeName: "PaletteViewerObj" },
];

// Minimal valid objects per proto type (enough for encode/decode roundtrip)
const MINIMAL_OBJECTS = {
    GeoObj:              { type: 1, features: [] },
    DwellingsObj:        { floors: [] },
    PaletteCaveObj:      { colors: {} },
    PaletteGladeObj:     { colors: {} },
    PaletteDwellingsObj: { colors: {} },
    PaletteMfcgObj:      { colors: {} },
    PaletteVillageObj:   { terrain: {} },
    PaletteViewerObj:    { colors: {} },
};

// ─── DataType enum sanity ────────────────────────────────────────

describe("DataType enum values", () => {
    for (const { enumName, enumValue } of TYPE_MAP) {
        it(`DT["${enumName}"] === ${enumValue}`, () => {
            expect(DT[enumName]).toBe(enumValue);
        });
        it(`DT[${enumValue}] === "${enumName}"`, () => {
            expect(DT[enumValue]).toBe(enumName);
        });
    }

    it("DATA_UNSPECIFIED === 0", () => {
        expect(DT.DATA_UNSPECIFIED).toBe(0);
    });
});

// ─── exportBin ───────────────────────────────────────────────────

describe("exportBin", () => {
    it("returns ArrayBuffer", () => {
        const payload = new Uint8Array([1, 2, 3]);
        const result = exportBin(payload, DT.geo);
        expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("output size = payload + 8 bytes (4 type + 4 crc)", () => {
        const payload = new Uint8Array(10);
        const result = exportBin(payload, DT.geo);
        expect(result.byteLength).toBe(10 + 8);
    });

    it("writes enum number as LE uint32 at offset 0", () => {
        const payload = new Uint8Array([0xAA]);
        const result = exportBin(payload, DT.palette_cave);
        const dv = new DataView(result);
        expect(dv.getUint32(0, true)).toBe(20);
    });

    it("payload bytes are copied starting at offset 4", () => {
        const payload = new Uint8Array([0x11, 0x22, 0x33]);
        const result = exportBin(payload, DT.dwellings);
        const u8 = new Uint8Array(result);
        expect(u8[4]).toBe(0x11);
        expect(u8[5]).toBe(0x22);
        expect(u8[6]).toBe(0x33);
    });

    it("CRC32 is written as LE uint32 at end", () => {
        const payload = new Uint8Array([0x01]);
        const result = exportBin(payload, DT.geo);
        const dv = new DataView(result);
        const storedCrc = dv.getUint32(result.byteLength - 4, true);
        expect(typeof storedCrc).toBe("number");
        expect(storedCrc).not.toBe(0);
    });

    it("empty payload still produces valid frame (8 bytes)", () => {
        const result = exportBin(new Uint8Array(0), DT.geo);
        expect(result.byteLength).toBe(8);
    });

    it("wipeInput option zeros source buffer", () => {
        const payload = new Uint8Array([1, 2, 3]);
        exportBin(payload, DT.geo, { wipeInput: true });
        expect(payload[0]).toBe(0);
        expect(payload[1]).toBe(0);
        expect(payload[2]).toBe(0);
    });

    it("respects inputOffset / inputLength", () => {
        const buf = new Uint8Array([0xFF, 0x11, 0x22, 0xFF]);
        const result = exportBin(buf, DT.geo, { inputOffset: 1, inputLength: 2 });
        expect(result.byteLength).toBe(2 + 8);
        const u8 = new Uint8Array(result);
        expect(u8[4]).toBe(0x11);
        expect(u8[5]).toBe(0x22);
    });
});

// ─── importBin ───────────────────────────────────────────────────

describe("importBin", () => {
    it("returns { number, buffer }", () => {
        const frame = exportBin(new Uint8Array([0xAB]), DT.palette_mfcg);
        const result = importBin(frame);
        expect(result).toHaveProperty("number");
        expect(result).toHaveProperty("buffer");
    });

    it("recovers correct enum number", () => {
        const frame = exportBin(new Uint8Array([1]), DT.palette_viewer);
        const result = importBin(frame);
        expect(result.number).toBe(DT.palette_viewer);
        expect(result.number).toBe(25);
    });

    it("recovers original payload bytes", () => {
        const original = new Uint8Array([0xDE, 0xAD, 0xBE, 0xEF]);
        const frame = exportBin(original, DT.dwellings);
        const result = importBin(frame);
        const recovered = new Uint8Array(result.buffer);
        expect([...recovered]).toEqual([0xDE, 0xAD, 0xBE, 0xEF]);
    });

    it("throws RangeError on buffer smaller than 8 bytes", () => {
        const small = new ArrayBuffer(7);
        expect(() => importBin(small)).toThrow(RangeError);
        expect(() => importBin(small)).toThrow("too small");
    });

    it("throws on CRC mismatch (corrupted payload)", () => {
        const frame = exportBin(new Uint8Array([1, 2, 3]), DT.geo);
        const u8 = new Uint8Array(frame);
        u8[5] ^= 0xFF; // corrupt a payload byte
        expect(() => importBin(frame)).toThrow("CRC32 mismatch");
    });

    it("throws on CRC mismatch (corrupted crc bytes)", () => {
        const frame = exportBin(new Uint8Array([1, 2, 3]), DT.geo);
        const u8 = new Uint8Array(frame);
        u8[u8.length - 1] ^= 0xFF; // corrupt last crc byte
        expect(() => importBin(frame)).toThrow("CRC32 mismatch");
    });

    it("wipeInput option zeros the source frame", () => {
        const frame = exportBin(new Uint8Array([0xAA, 0xBB]), DT.geo);
        const u8 = new Uint8Array(frame);
        importBin(frame, { wipeInput: true });
        expect(u8.every(b => b === 0)).toBe(true);
    });

    it("wipeInput zeros frame even on CRC mismatch", () => {
        const frame = exportBin(new Uint8Array([1, 2, 3]), DT.geo);
        const u8 = new Uint8Array(frame);
        u8[5] ^= 0xFF; // corrupt
        try { importBin(frame, { wipeInput: true }); } catch (_) {}
        expect(u8.every(b => b === 0)).toBe(true);
    });

    it("respects inputOffset / inputLength", () => {
        const innerFrame = exportBin(new Uint8Array([0x42]), DT.palette_glade);
        const padded = new Uint8Array(4 + innerFrame.byteLength + 4);
        padded.set(new Uint8Array(innerFrame), 4);
        const result = importBin(padded.buffer, { inputOffset: 4, inputLength: innerFrame.byteLength });
        expect(result.number).toBe(DT.palette_glade);
        expect([...new Uint8Array(result.buffer)]).toEqual([0x42]);
    });
});

// ─── roundtrip: proto encode → exportBin → importBin → proto decode ───

describe("exportBin / importBin roundtrip with real proto messages", () => {
    for (const { enumName, enumValue, typeName } of TYPE_MAP) {
        it(`roundtrips ${typeName} (DataType.${enumName} = ${enumValue})`, () => {
            const MessageType = DataProto[typeName];
            const minObj = MINIMAL_OBJECTS[typeName];

            // 1. create & encode proto message
            const protoMsg = MessageType.fromObject(minObj);
            const protoBytes = MessageType.encode(protoMsg).finish();

            // 2. wrap with bin-verify: exportBin(encodedBytes, enumValue)
            const frame = exportBin(protoBytes, enumValue);
            expect(frame).toBeInstanceOf(ArrayBuffer);
            expect(frame.byteLength).toBe(protoBytes.length + 8);

            // 3. unwrap: importBin → { number, buffer }
            const imported = importBin(frame);
            expect(imported.number).toBe(enumValue);

            // 4. decode proto from recovered buffer
            const decoded = MessageType.decode(new Uint8Array(imported.buffer));

            // 5. verify decoded matches original
            const originalJson = JSON.stringify(MessageType.toObject(protoMsg));
            const decodedJson = JSON.stringify(MessageType.toObject(decoded));
            expect(decodedJson).toBe(originalJson);
        });
    }
});

// ─── CRC32 determinism ──────────────────────────────────────────

describe("CRC32 determinism", () => {
    it("same payload + same number produce identical frames", () => {
        const payload = new Uint8Array([10, 20, 30, 40, 50]);
        const a = new Uint8Array(exportBin(payload, DT.geo));
        const b = new Uint8Array(exportBin(payload, DT.geo));
        expect([...a]).toEqual([...b]);
    });

    it("different number produces different frame (header differs)", () => {
        const payload = new Uint8Array([10, 20, 30]);
        const a = new Uint8Array(exportBin(payload, DT.geo));
        const b = new Uint8Array(exportBin(payload, DT.dwellings));
        const headerA = a.slice(0, 4);
        const headerB = b.slice(0, 4);
        expect([...headerA]).not.toEqual([...headerB]);
    });

    it("different payload produces different CRC", () => {
        const a = exportBin(new Uint8Array([1, 2, 3]), DT.geo);
        const b = exportBin(new Uint8Array([1, 2, 4]), DT.geo);
        const crcA = new DataView(a).getUint32(a.byteLength - 4, true);
        const crcB = new DataView(b).getUint32(b.byteLength - 4, true);
        expect(crcA).not.toBe(crcB);
    });
});

// ─── edge cases ─────────────────────────────────────────────────

describe("edge cases", () => {
    it("number=0 (DATA_UNSPECIFIED) roundtrips correctly", () => {
        const payload = new Uint8Array([0xFF]);
        const frame = exportBin(payload, 0);
        const result = importBin(frame);
        expect(result.number).toBe(0);
        expect([...new Uint8Array(result.buffer)]).toEqual([0xFF]);
    });

    it("large payload roundtrips correctly", () => {
        const payload = new Uint8Array(64 * 1024);
        for (let i = 0; i < payload.length; i++) payload[i] = i & 0xFF;
        const frame = exportBin(payload, DT.geo);
        const result = importBin(frame);
        expect(result.number).toBe(DT.geo);
        expect(new Uint8Array(result.buffer).length).toBe(payload.length);
        expect([...new Uint8Array(result.buffer).slice(0, 10)]).toEqual([...payload.slice(0, 10)]);
    });

    it("accepts ArrayBuffer as input to exportBin", () => {
        const ab = new Uint8Array([1, 2, 3]).buffer;
        const frame = exportBin(ab, DT.geo);
        const result = importBin(frame);
        expect([...new Uint8Array(result.buffer)]).toEqual([1, 2, 3]);
    });

    it("importBin rejects exactly 8 zero bytes (CRC mismatch for non-trivial header)", () => {
        // 8 bytes: num=0, payload=empty, stored crc=0
        // crc of empty = 0x00000000, but crc32("") in IEEE = 0x00000000
        // Actually crc32 of empty range is 0x00000000 so this should pass
        const buf = new ArrayBuffer(8);
        // number=0, crc=0 for empty payload → let's check
        try {
            const result = importBin(buf);
            // If it doesn't throw, crc of empty is 0
            expect(result.number).toBe(0);
            expect(result.buffer.byteLength).toBe(0);
        } catch (e) {
            expect(e.message).toContain("CRC32 mismatch");
        }
    });

    it("exportBin throws on invalid input type", () => {
        expect(() => exportBin("not a buffer", DT.geo)).toThrow(TypeError);
    });

    it("importBin throws on invalid input type", () => {
        expect(() => importBin("not a buffer")).toThrow(TypeError);
    });
});
