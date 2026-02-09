import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import * as process from "node:process";
import * as esbuild from "esbuild";

const CWD = process.cwd();

const DIST_DIR_NAME = "dist";
const JS_DIR_NAME = "js";

const JS_EXT = ".js";
const UTF8 = "utf8";

const VENDOR_GLOBAL_NAME = "__vendor";
const VENDOR_BUNDLE_FILE = "vendor.globals.min.js";
const VENDOR_ENTRY_SOURCEFILE = "vendor-globals.entry.js";

const ESBUILD_TARGET = "es2018";

const ALWAYS_VENDOR = new Set(["howler", "pako", "file-saver"]);

const SRC_JS_DIR = path.resolve(CWD, DIST_DIR_NAME, JS_DIR_NAME);
const OUT_JS_DIR = SRC_JS_DIR;

const ERR_MISSING_DIR_PREFIX = "Missing directory:";

const IMPORT_FROM_RE = /^\s*import\s+([\s\S]*?)\s+from\s+["']([^"']+)["']\s*;?\s*$/gm;
const IMPORT_SIDE_RE = /^\s*import\s+["']([^"']+)["']\s*;?\s*$/gm;

function isMinifiedJsFile(filePath) {
    return filePath.endsWith(".min.js") || filePath.endsWith("-min.js");
}

function isBareSpecifier(spec) {
    if (!spec) return false;
    if (spec.startsWith("./") || spec.startsWith("../") || spec.startsWith("/")) return false;
    if (/^[a-zA-Z]+:/.test(spec)) return false;
    return true;
}

function addBareImportsFromCode(code, specSet) {
    for (const m of code.matchAll(IMPORT_FROM_RE)) {
        const spec = m[2];
        if (isBareSpecifier(spec)) specSet.add(spec);
    }
    for (const m of code.matchAll(IMPORT_SIDE_RE)) {
        const spec = m[1];
        if (isBareSpecifier(spec)) specSet.add(spec);
    }
}

function parseImportClause(raw) {
    const clause = raw.trim();
    let def = null;
    let ns = null;
    let named = null;

    if (clause.startsWith("{")) {
        named = clause;
        return { def, ns, named };
    }

    if (clause.startsWith("*")) {
        const m = clause.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
        if (m) ns = m[1];
        return { def, ns, named };
    }

    const parts = clause.split(",");
    def = parts[0]?.trim() || null;

    if (parts.length > 1) {
        const rest = parts.slice(1).join(",").trim();
        if (rest.startsWith("{")) named = rest;
        else if (rest.startsWith("*")) {
            const m = rest.match(/^\*\s+as\s+([A-Za-z_$][\w$]*)$/);
            if (m) ns = m[1];
        }
    }

    return { def, ns, named };
}

function splitNamed(namedWithBraces) {
    const inside = namedWithBraces.trim().replace(/^\{\s*/, "").replace(/\s*\}$/, "");
    if (!inside.trim()) return [];
    return inside.split(",").map((s) => s.trim()).filter(Boolean);
}

function buildNamedDecls(namedWithBraces, gExpr) {
    const items = splitNamed(namedWithBraces);
    const destructured = [];
    const lines = [];

    for (const it of items) {
        let m = it.match(/^default\s+as\s+([A-Za-z_$][\w$]*)$/);
        if (m) {
            const v = m[1];
            lines.push(`const ${v} = (${gExpr}.default ?? ${gExpr});`);
            continue;
        }

        m = it.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
        if (m) {
            destructured.push(`${m[1]}: ${m[2]}`);
            continue;
        }

        m = it.match(/^([A-Za-z_$][\w$]*)$/);
        if (m) destructured.push(m[1]);
    }

    if (destructured.length) {
        lines.push(`const { ${destructured.join(", ")} } = ${gExpr};`);
    }

    return lines;
}

function extraGlobalAssignments(spec, localVar) {
    if (spec === "howler") {
        return `globalThis.Howl = ${localVar}.Howl;\nglobalThis.Howler = ${localVar}.Howler;`;
    }
    if (spec === "pako") {
        return `globalThis.pako = ${localVar};`;
    }
    if (spec === "file-saver") {
        return `globalThis.saveAs = ${localVar}.saveAs ?? ${localVar}.default?.saveAs ?? ${localVar}.default ?? ${localVar};`;
    }
    return "";
}

function rewriteBareImports(code, usedSpecsSet) {
    code = code.replace(IMPORT_FROM_RE, (full, clause, spec) => {
        if (!isBareSpecifier(spec)) return full;

        usedSpecsSet.add(spec);

        const { def, ns, named } = parseImportClause(clause);
        const gExpr = `globalThis.${VENDOR_GLOBAL_NAME}[${JSON.stringify(spec)}]`;

        const lines = [];
        if (ns) lines.push(`const ${ns} = ${gExpr};`);
        if (def) lines.push(`const ${def} = (${gExpr}.default ?? ${gExpr});`);
        if (named) lines.push(...buildNamedDecls(named, gExpr));

        return lines.length ? lines.join("\n") : ";";
    });

    code = code.replace(IMPORT_SIDE_RE, (full, spec) => {
        if (!isBareSpecifier(spec)) return full;
        usedSpecsSet.add(spec);
        return ";";
    });

    return code;
}

async function listFilesRecursively(rootDir) {
    const out = [];
    const stack = [rootDir];

    while (stack.length) {
        const dir = stack.pop();
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const e of entries) {
            const full = path.join(dir, e.name);
            if (e.isDirectory()) stack.push(full);
            else if (e.isFile()) out.push(full);
        }
    }

    return out;
}

async function ensureDir(dirPath) {
    await fs.mkdir(dirPath, { recursive: true });
}

async function copyFileIfDifferent(src, dst) {
    if (src === dst) return;
    await ensureDir(path.dirname(dst));
    await fs.copyFile(src, dst);
}

async function minifyJsWithRewrite(sourceCode, usedSpecsSet) {
    const rewritten = rewriteBareImports(sourceCode, usedSpecsSet);

    const res = await esbuild.transform(rewritten, {
        loader: "js",
        target: ESBUILD_TARGET,
        minifyWhitespace: true,
        minifySyntax: true,
        minifyIdentifiers: false,
        legalComments: "none",
        sourcemap: false,
    });

    return res.code;
}

async function buildVendorBundle(outDir, specsSet) {
    const specs = [...specsSet].sort();
    const lines = [`globalThis.${VENDOR_GLOBAL_NAME} = globalThis.${VENDOR_GLOBAL_NAME} || {};`];

    specs.forEach((spec, i) => {
        const v = `m${i}`;
        lines.push(`import * as ${v} from ${JSON.stringify(spec)};`);
        lines.push(`globalThis.${VENDOR_GLOBAL_NAME}[${JSON.stringify(spec)}] = ${v};`);

        const extra = extraGlobalAssignments(spec, v);
        if (extra) lines.push(extra);
    });

    await ensureDir(outDir);

    await esbuild.build({
        stdin: {
            contents: lines.join("\n"),
            resolveDir: CWD,
            sourcefile: VENDOR_ENTRY_SOURCEFILE,
            loader: "js",
        },
        bundle: true,
        format: "iife",
        platform: "browser",
        target: ESBUILD_TARGET,
        minify: true,
        legalComments: "none",
        sourcemap: false,
        outfile: path.join(outDir, VENDOR_BUNDLE_FILE),
    });
}

async function main() {
    if (!fssync.existsSync(SRC_JS_DIR)) {
        throw new Error(`${ERR_MISSING_DIR_PREFIX} ${SRC_JS_DIR}. Put the JS files you want to process there.`);
    }

    await ensureDir(OUT_JS_DIR);

    const files = await listFilesRecursively(SRC_JS_DIR);

    const usedSpecs = new Set(ALWAYS_VENDOR);
    const jsCache = new Map();

    for (const file of files) {
        if (!file.endsWith(JS_EXT)) continue;
        if (isMinifiedJsFile(file)) continue;

        const code = await fs.readFile(file, UTF8);
        jsCache.set(file, code);
        addBareImportsFromCode(code, usedSpecs);
    }

    await buildVendorBundle(OUT_JS_DIR, usedSpecs);

    for (const file of files) {
        const rel = path.relative(SRC_JS_DIR, file);
        const outFile = path.join(OUT_JS_DIR, rel);

        if (!file.endsWith(JS_EXT)) {
            await copyFileIfDifferent(file, outFile);
            continue;
        }

        if (isMinifiedJsFile(file)) {
            await copyFileIfDifferent(file, outFile);
            continue;
        }

        const code = jsCache.get(file) ?? (await fs.readFile(file, UTF8));
        const minified = await minifyJsWithRewrite(code, usedSpecs);

        await ensureDir(path.dirname(outFile));
        await fs.writeFile(outFile, minified, UTF8);
    }

    console.log(`[ok] Processed static JS in: ${OUT_JS_DIR}`);
    console.log(`[ok] Vendor bundle: ${VENDOR_BUNDLE_FILE}`);
    console.log(`[ok] Vendor deps: ${[...usedSpecs].sort().join(", ")}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
