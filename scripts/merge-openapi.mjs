import fs from "node:fs/promises";
import path from "node:path";

const DIR_DIST = "dist";
const DIR_TO = "to";
const FILE_OPENAPI = "openapi.json";
const ENCODING_UTF8 = "utf8";

const OPENAPI_DEFAULT_VERSION = "3.0.0";
const INFO_TITLE = "{{NAME_FULL}} | API";
const INFO_VERSION = "1.0.0";

const URL_ROOT_PREFIX = "/to";
const REF_COMPONENTS_PREFIX = "#/components/";
const NS_SEPARATOR = "_";
const PATH_CONFLICT_SUFFIX = "__";
const JSON_INDENT = 2;

const ROOT_DIR = path.resolve(process.cwd(), DIR_DIST, DIR_TO);
const ROOT_OPENAPI_PATH = path.join(ROOT_DIR, FILE_OPENAPI);

const stableStringify = (value) => {
    const seen = new WeakSet();
    const walk = (x) => {
        if (!x || typeof x !== "object") return x;
        if (seen.has(x)) return x;
        seen.add(x);

        if (Array.isArray(x)) return x.map(walk);

        const out = {};
        for (const key of Object.keys(x).sort()) out[key] = walk(x[key]);
        return out;
    };
    return JSON.stringify(walk(value));
};

const writeJson = async (filePath, value) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(value, null, JSON_INDENT));
};

const walkOpenApiFiles = async (dir, out) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await walkOpenApiFiles(fullPath, out);
            continue;
        }
        if (entry.isFile() && entry.name === FILE_OPENAPI) out.push(fullPath);
    }
    return out;
};

const replaceRefsInPlace = (value, replacements) => {
    if (typeof value === "string") {
        let s = value;
        for (const [from, to] of replacements) {
            if (s.includes(from)) s = s.split(from).join(to);
        }
        return s;
    }

    if (!value || typeof value !== "object") return value;

    if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) value[i] = replaceRefsInPlace(value[i], replacements);
        return value;
    }

    for (const key of Object.keys(value)) value[key] = replaceRefsInPlace(value[key], replacements);
    return value;
};

const mergeUniqueArray = (base, incoming) => {
    const a = Array.isArray(base) ? base.slice() : [];
    const b = Array.isArray(incoming) ? incoming : [];
    if (!b.length) return a;

    const seen = new Set(a.map((x) => stableStringify(x)));
    for (const item of b) {
        const k = stableStringify(item);
        if (!seen.has(k)) {
            seen.add(k);
            a.push(item);
        }
    }
    return a;
};

const emptyCombinedSpec = () => ({
    openapi: OPENAPI_DEFAULT_VERSION,
    info: { title: INFO_TITLE, version: INFO_VERSION },
    paths: {},
});

const combinedSpecTemplate = () => ({
    openapi: OPENAPI_DEFAULT_VERSION,
    info: { title: INFO_TITLE, version: INFO_VERSION },
    paths: {},
    components: {},
});

const toUrlPrefix = (relativeDir) => {
    if (!relativeDir) return "";
    const unix = relativeDir.split(path.sep).join("/");
    return `${URL_ROOT_PREFIX}/${unix}`;
};

const toNamespace = (relativeDir) => {
    if (!relativeDir) return "root";
    return relativeDir.split(path.sep).join(NS_SEPARATOR);
};

const resolvePathWithPrefix = (urlPrefix, originalPathKey) => {
    let p = originalPathKey.startsWith("/") ? originalPathKey : `/${originalPathKey}`;
    if (!urlPrefix) return p;
    if (p === urlPrefix || p.startsWith(`${urlPrefix}/`)) return p;
    return `${urlPrefix}${p}`;
};

const mergeSpecs = async () => {
    await fs.mkdir(ROOT_DIR, { recursive: true });

    const allOpenApiFiles = await walkOpenApiFiles(ROOT_DIR, []);
    const files = allOpenApiFiles.filter((p) => path.resolve(p) !== path.resolve(ROOT_OPENAPI_PATH));

    if (!files.length) {
        await writeJson(ROOT_OPENAPI_PATH, emptyCombinedSpec());
        return;
    }

    const combined = combinedSpecTemplate();
    let openapiVersionSet = false;

    for (const filePath of files) {
        const rawText = await fs.readFile(filePath, ENCODING_UTF8);
        const spec = JSON.parse(rawText);

        if (!openapiVersionSet && spec && typeof spec.openapi === "string" && spec.openapi.length) {
            combined.openapi = spec.openapi;
            openapiVersionSet = true;
        }

        const relativeDir = path.relative(ROOT_DIR, path.dirname(filePath));
        const urlPrefix = toUrlPrefix(relativeDir);
        const ns = toNamespace(relativeDir);

        combined.servers = mergeUniqueArray(combined.servers, spec.servers);
        combined.tags = mergeUniqueArray(combined.tags, spec.tags);
        combined.security = mergeUniqueArray(combined.security, spec.security);

        const refReplacements = [];
        const srcComponents = spec.components && typeof spec.components === "object" ? spec.components : {};

        for (const section of Object.keys(srcComponents)) {
            const srcSection =
                srcComponents[section] && typeof srcComponents[section] === "object" ? srcComponents[section] : {};
            if (!combined.components[section]) combined.components[section] = {};
            const dstSection = combined.components[section];

            for (const key of Object.keys(srcSection)) {
                if (!(key in dstSection)) continue;

                const incoming = srcSection[key];
                if (stableStringify(dstSection[key]) === stableStringify(incoming)) continue;

                const base = `${ns}${NS_SEPARATOR}${key}`;
                let nextKey = base;
                let i = 2;
                while (nextKey in dstSection || nextKey in srcSection) nextKey = `${base}${NS_SEPARATOR}${i++}`;

                refReplacements.push([
                    `${REF_COMPONENTS_PREFIX}${section}/${key}`,
                    `${REF_COMPONENTS_PREFIX}${section}/${nextKey}`,
                ]);

                srcSection[nextKey] = incoming;
                delete srcSection[key];
            }
        }

        if (refReplacements.length) replaceRefsInPlace(spec, refReplacements);

        if (spec.components && typeof spec.components === "object") {
            for (const section of Object.keys(spec.components)) {
                if (!combined.components[section]) combined.components[section] = {};
                Object.assign(combined.components[section], spec.components[section]);
            }
        }

        const srcPaths = spec.paths && typeof spec.paths === "object" ? spec.paths : {};
        for (const key of Object.keys(srcPaths)) {
            const targetPath = resolvePathWithPrefix(urlPrefix, key);

            if (targetPath in combined.paths) {
                if (stableStringify(combined.paths[targetPath]) === stableStringify(srcPaths[key])) continue;

                let i = 2;
                let alt = `${targetPath}${PATH_CONFLICT_SUFFIX}${i}`;
                while (alt in combined.paths) alt = `${targetPath}${PATH_CONFLICT_SUFFIX}${++i}`;
                combined.paths[alt] = srcPaths[key];
            } else {
                combined.paths[targetPath] = srcPaths[key];
            }
        }
    }

    await writeJson(ROOT_OPENAPI_PATH, combined);

    await Promise.all(
        files.map(async (p) => {
            try {
                await fs.unlink(p);
            } catch {}
        })
    );
};

mergeSpecs().catch((err) => {
    console.error(err);
    process.exit(1);
});
