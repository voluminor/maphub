const LITTLE_ENDIAN = true;

const CRC_TABLE = (function makeCrcTable() {
    const table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
        let c = i;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[i] = c >>> 0;
    }
    return table;
})();

function crc32IEEE(u8, start = 0, end = u8.length) {
    let crc = 0xFFFFFFFF;
    for (let i = start; i < end; i++) {
        crc = CRC_TABLE[(crc ^ u8[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function toU8(input, byteOffset, byteLength) {
    if (input && typeof input === "object" && input.buffer instanceof ArrayBuffer) {
        const off = (byteOffset != null) ? byteOffset : (input.byteOffset >>> 0);
        const len = (byteLength != null) ? byteLength : (input.byteLength >>> 0);
        return new Uint8Array(input.buffer, off, len);
    }
    if (input instanceof ArrayBuffer) {
        const off = (byteOffset != null) ? (byteOffset >>> 0) : 0;
        const len = (byteLength != null) ? (byteLength >>> 0) : (input.byteLength - off);
        return new Uint8Array(input, off, len);
    }
    throw new TypeError("Expected ArrayBuffer or Uint8Array/Buffer (ArrayBufferView).");
}

function wipeBytes(input, byteOffset, byteLength) {
    try {
        const u8 = toU8(input, byteOffset, byteLength);
        u8.fill(0);
        return true;
    } catch (_) {
        return false;
    }
}

function pack(input, number, opts) {
    const inputOffset = opts && opts.inputOffset;
    const inputLength = opts && opts.inputLength;

    const payload = toU8(input, inputOffset, inputLength);
    const payloadLen = payload.length;

    const num = (number >>> 0);
    const crc = crc32IEEE(payload, 0, payloadLen);

    const out = new ArrayBuffer(payloadLen + 8);
    const dv = new DataView(out);

    dv.setUint32(0, num, LITTLE_ENDIAN);
    new Uint8Array(out, 4, payloadLen).set(payload);

    dv.setUint32(4 + payloadLen, crc, LITTLE_ENDIAN);

    if (opts && opts.wipeInput) {
        payload.fill(0);
    }

    return out;
}

function unpack(input, opts) {
    const inputOffset = opts && opts.inputOffset;
    const inputLength = opts && opts.inputLength;

    const frame = toU8(input, inputOffset, inputLength);
    const n = frame.length;

    if (n < 8) {
        throw new RangeError("The buffer is too small: a minimum of 8 bytes is required.");
    }

    const dv = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);

    const num = dv.getUint32(0, LITTLE_ENDIAN);
    const storedCrc = dv.getUint32(n - 4, LITTLE_ENDIAN);

    const bodyStart = 4;
    const bodyEnd = n - 4;

    const calcCrc = crc32IEEE(frame, bodyStart, bodyEnd);

    if (calcCrc !== storedCrc) {
        if (opts && opts.wipeInput) frame.fill(0);
        throw new Error("CRC32 mismatch");
    }

    const bodyCopy = frame.slice(bodyStart, bodyEnd);
    const bodyBuffer = bodyCopy.buffer;

    if (opts && opts.wipeInput) {
        frame.fill(0);
    }

    return { number: num, buffer: bodyBuffer };
}

