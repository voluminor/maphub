import * as DataProto from "../struct/data.js";

export function jsToProtoValue(v) {
    if (v === null || v === undefined) return { nullValue: 0 };
    if (Array.isArray(v)) return { listValue: jsToProtoListValue(v) };
    if (typeof v === "number") return { numberValue: v };
    if (typeof v === "string") return { stringValue: v };
    if (typeof v === "boolean") return { boolValue: v };
    if (typeof v === "object") {
        let fields = {};
        for (let k in v) if (Object.prototype.hasOwnProperty.call(v, k)) fields[k] = jsToProtoValue(v[k]);
        return { structValue: { fields: fields } };
    }
    return { stringValue: String(v) };
}

export function jsToProtoListValue(arr) {
    return { values: arr.map(jsToProtoValue) };
}

export function enumToNumber(enumObj, v, fallback) {
    if (v === null || v === undefined) return null;
    if (typeof v === "number") return v;
    let n = enumObj[v];
    if (typeof n === "number") return n;
    if (fallback !== null && fallback !== undefined) return fallback;
    if (v === "hood" || v === "hoods") return null;
    throw new Error(String(v));
}

export function readProp(node, key) {
    if (node == null) return null;
    if (Object.prototype.hasOwnProperty.call(node, key) && node[key] != null) return node[key];
    let snake = key.replace(/[A-Z]/g, function (m) { return "_" + m.toLowerCase(); });
    if (Object.prototype.hasOwnProperty.call(node, snake) && node[snake] != null) return node[snake];
    if (node.properties != null && typeof node.properties === "object") {
        if (Object.prototype.hasOwnProperty.call(node.properties, key) && node.properties[key] != null) return node.properties[key];
        if (Object.prototype.hasOwnProperty.call(node.properties, snake) && node.properties[snake] != null) return node.properties[snake];
    }
    return null;
}

export function geoJsonToProtoObject(node) {
    if (node == null || typeof node !== "object") return null;
    let out = {};
    let t = readProp(node, "type");
    if (t != null) out.type = enumToNumber(DataProto.data.GeoType, t, null);
    let id = readProp(node, "id");
    if (id != null) out.id = enumToNumber(DataProto.data.GeoFeatureType, id, null);
    let width = readProp(node, "width");
    if (width != null) out.width = width;
    let name = readProp(node, "name");
    if (name != null) out.name = name;
    let roadWidth = readProp(node, "roadWidth");
    if (roadWidth != null) out.roadWidth = roadWidth;
    let riverWidth = readProp(node, "riverWidth");
    if (riverWidth != null) out.riverWidth = riverWidth;
    let towerRadius = readProp(node, "towerRadius");
    if (towerRadius != null) out.towerRadius = towerRadius;
    let wallThickness = readProp(node, "wallThickness");
    if (wallThickness != null) out.wallThickness = wallThickness;
    let generator = readProp(node, "generator");
    if (generator != null) out.generator = enumToNumber(DataProto.data.GeoGeneratorType, generator, null);
    let version = readProp(node, "version");
    if (version != null) out.version = version;
    if (Array.isArray(node.features)) out.features = node.features.map(geoJsonToProtoObject);
    if (Array.isArray(node.geometries)) out.geometries = node.geometries.map(geoJsonToProtoObject);
    if (node.geometry != null) out.geometry = geoJsonToProtoObject(node.geometry);
    if (node.coordinates != null) {
        if (Array.isArray(node.coordinates)) out.coordinates = jsToProtoListValue(node.coordinates);
        else out.coordinates = node.coordinates;
    }
    return out;
}

export function protoValueToJs(v) {
    if (v == null) return null;
    if (Object.prototype.hasOwnProperty.call(v, "numberValue")) return v.numberValue;
    if (Object.prototype.hasOwnProperty.call(v, "stringValue")) return v.stringValue;
    if (Object.prototype.hasOwnProperty.call(v, "boolValue")) return v.boolValue;
    if (Object.prototype.hasOwnProperty.call(v, "nullValue")) return null;
    if (v.listValue != null) return protoListValueToJs(v.listValue);
    if (v.structValue != null) return protoStructToJs(v.structValue);
    return null;
}

export function protoListValueToJs(lv) {
    let arr = [];
    if (lv != null && Array.isArray(lv.values))
        for (let i = 0; i < lv.values.length; i++) arr.push(protoValueToJs(lv.values[i]));
    return arr;
}

export function protoStructToJs(st) {
    let obj = {};
    if (st != null && st.fields != null)
        for (let k in st.fields) if (Object.prototype.hasOwnProperty.call(st.fields, k)) obj[k] = protoValueToJs(st.fields[k]);
    return obj;
}

export function geoJsonFromProtoMessage(m) {
    if (m == null) return null;
    let o = {};
    if (m.type != null) o.type = typeof m.type === "number" ? DataProto.data.GeoType[m.type] : m.type;
    if (m.id != null) o.id = typeof m.id === "number" ? DataProto.data.GeoFeatureType[m.id] : m.id;
    if (m.width != null) o.width = m.width;
    if (m.name != null) o.name = m.name;
    if (m.roadWidth != null) o.roadWidth = m.roadWidth;
    if (m.riverWidth != null) o.riverWidth = m.riverWidth;
    if (m.towerRadius != null) o.towerRadius = m.towerRadius;
    if (m.wallThickness != null) o.wallThickness = m.wallThickness;
    if (m.generator != null) o.generator = typeof m.generator === "number" ? DataProto.data.GeoGeneratorType[m.generator] : m.generator;
    if (m.version != null) o.version = m.version;
    if (m.features != null && m.features.length) {
        o.features = [];
        for (let i = 0; i < m.features.length; i++) o.features.push(geoJsonFromProtoMessage(m.features[i]));
    }
    if (m.geometries != null && m.geometries.length) {
        o.geometries = [];
        for (let j = 0; j < m.geometries.length; j++) o.geometries.push(geoJsonFromProtoMessage(m.geometries[j]));
    }
    if (m.geometry != null) o.geometry = geoJsonFromProtoMessage(m.geometry);
    if (m.coordinates != null) o.coordinates = protoListValueToJs(m.coordinates);
    return o;
}

export function toUint8Array(data) {
    if (data == null) return null;
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof DataView !== "undefined" && data instanceof DataView) return new Uint8Array(data.buffer);
    if (data.b instanceof Uint8Array) return data.b;
    if (data.buffer instanceof ArrayBuffer) return new Uint8Array(data.buffer);
    return null;
}

export function bytesToUtf8Text(data) {
    if (typeof data === "string") return data;
    let u = toUint8Array(data);
    if (u != null && typeof TextDecoder !== "undefined") return new TextDecoder("utf-8").decode(u);
    return data != null && typeof data.toString === "function" ? data.toString() : "";
}

export function decodeCityFromJsonText(text) {
    let obj = null;
    try {
        obj = JSON.parse(text);
    } catch (e) {
        throw new Error("An error occurred while parsing: "+ (e && e.message ? e.message : String(e)));
    }

    if (obj != null && typeof obj === "object" && Array.isArray(obj.floors) && obj.features == null) {
        throw new Error("These are Dwellings, not City/Village.");
    }

    try {
        let protoObj = geoJsonToProtoObject(obj);
        let err = DataProto.data.GeoObj.verify(protoObj);
        if (err) throw new Error("Unknown data format - expected City/Village: " + err);
        DataProto.data.GeoObj.fromObject(protoObj);
        return obj;
    } catch (e2) {
        let msgText2 = e2 && e2.message ? e2.message : String(e2);
        if (msgText2.indexOf("Unknown data format") === 0) throw e2;
        throw new Error("An error occurred while parsing: "+ msgText2);
    }
}

export function decodeCityFromProtoBytes(bytes) {
    let b = toUint8Array(bytes);
    if (b == null) throw new Error("illegal buffer");

    let lastErr = null;

    function stripLengthDelimited(buf) {
        let pos = 0, len = 0, shift = 0;
        while (pos < buf.length && shift < 35) {
            let c = buf[pos++];
            len |= (c & 127) << shift;
            if ((c & 128) === 0) break;
            shift += 7;
        }
        if (pos <= 0 || pos >= buf.length) return null;
        if (len <= 0 || pos + len > buf.length) return null;
        return buf.subarray(pos, pos + len);
    }

    function tryDecode(MessageType, buf) {
        try { return { msg: MessageType.decode(buf), err: null }; } catch (e) { lastErr = e; }
        try { return { msg: MessageType.decodeDelimited(buf), err: null }; } catch (e2) { lastErr = e2; }

        let inner = stripLengthDelimited(buf);
        if (inner != null) {
            try { return { msg: MessageType.decode(inner), err: null }; } catch (e3) { lastErr = e3; }
            try { return { msg: MessageType.decodeDelimited(inner), err: null }; } catch (e4) { lastErr = e4; }
        }
        return { msg: null, err: lastErr };
    }

    function looksLikeCityGeoJson(o) {
        return (
            o != null &&
            typeof o === "object" &&
            o.type === "FeatureCollection" &&
            Array.isArray(o.features) &&
            o.features.length > 0
        );
    }

    let geo = tryDecode(DataProto.data.GeoObj, b);
    if (geo.msg != null) {
        let cityObj = geoJsonFromProtoMessage(geo.msg);

        if (looksLikeCityGeoJson(cityObj)) {
            return cityObj;
        }

        let d1 = tryDecode(DataProto.data.DwellingsObj, b);
        if (d1.msg != null) {
            throw new Error("These are Dwellings, not City/Village.");
        }

        throw new Error("Unknown data format - expected City/Village: " + lastErr);
    }

    let dwell = tryDecode(DataProto.data.DwellingsObj, b);
    if (dwell.msg != null) {
        throw new Error("These are Dwellings, not City/Village.");
    }

    let errText = geo.err && geo.err.message ? geo.err.message : "unknown protobuf decode error";
    throw new Error("An error occurred while parsing: " + errText);
}

export function decodeCityFile(name, data) {
    let ext = "";
    if (name != null) {
        let parts = String(name).split(".");
        if (parts.length > 1) ext = String(parts.pop()).toLowerCase();
    }
    if (ext === "proto" || ext === "pb" || ext === "bin") return decodeCityFromProtoBytes(data);
    let text = bytesToUtf8Text(data);
    return decodeCityFromJsonText(text);
}