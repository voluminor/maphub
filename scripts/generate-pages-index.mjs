import fs from "node:fs/promises";
import path from "node:path";
import * as process from "node:process";
import { PAGES } from "../pages.config.mjs";

const DIST_DIR_NAME = "dist";
const SRC_DIR_NAME = "src";
const DIST_DIR_CANDIDATES = [DIST_DIR_NAME, path.join(SRC_DIR_NAME, DIST_DIR_NAME)];

const PAGES_SUBDIR_NAME = "to";
const OUTPUT_FILENAME = "index.html";

const TEMPLATE_RELATIVE_PATH = path.join(
    "scripts",
    "templates",
    "page-index.template.html"
);
const TEXT_ENCODING = "utf8";

const JS_BASE = "../../js";
const FONTS_BASE = "../../fonts";
const JS_EXTENSION = ".js";

const PLACEHOLDERS = {
    TITLE: "{{TITLE}}",
    APP_ID: "{{APP_ID}}",
    APP_JS: "{{APP_JS}}",
    JS_BASE: "{{JS_BASE}}",
    LZMA_SCRIPTS: "{{LZMA_SCRIPTS}}",
    FONTS_CSS: "{{FONTS_CSS}}",
};

const CONFIG_PLACEHOLDER_RE = /{{([A-Z0-9_.]+)}}/g;

const LZMA_WORKER_FILE = "lzma_worker-min.js";
const LZMA_LIB_FILE = "lzma-d-min.js";
const SCRIPT_TYPE = "text/javascript";

const FONT_FORMAT = "woff";
const FONT_WEIGHT = "normal";
const FONT_STYLE = "normal";

const LOG_OK_PREFIX = "[ok] pages index.html generated: ";

const OR_SEPARATOR = " or ";
const WILDCARD_SUFFIX = "/*";

const ERR_DIST_NOT_FOUND_PREFIX = "Dist directory not found. Expected: ";
const ERR_PAGES_DIR_NOT_FOUND_PREFIX = "Pages directory not found: ";
const ERR_PAGES_DIR_NOT_FOUND_EXPECTED_PREFIX =
    ". Expected a directory with pages at ";
const ERR_NO_PAGE_FOLDERS_PREFIX = "No page folders found in ";
const ERR_NO_PAGE_FOLDERS_SUFFIX = ". Nothing to generate.";
const ERR_MISSING_PAGE_CONFIG_PREFIX =
    "No config found for page folder ";
const ERR_INVALID_PAGE_CONFIG_PREFIX =
    "Invalid config for page folder ";
const ERR_INVALID_PAGE_CONFIG_SUFFIX =
    ". Expected embedParameters.meta.name_app and embedParameters.meta.name_file.";

const ERR_CONFIG_PLACEHOLDER_UNRESOLVED_PREFIX =
    "Unresolved config placeholder: ";
const ERR_CONFIG_PLACEHOLDER_NON_STRING_PREFIX =
    "Config placeholder value is not a string: ";

async function statIfExists(targetPath) {
    try {
        return await fs.stat(targetPath);
    } catch {
        return null;
    }
}

async function resolveDistDir(cwd) {
    for (const rel of DIST_DIR_CANDIDATES) {
        const abs = path.resolve(cwd, rel);
        const st = await statIfExists(abs);
        if (st?.isDirectory()) return abs;
    }

    const expected = DIST_DIR_CANDIDATES.map((p) => path.resolve(cwd, p)).join(
        OR_SEPARATOR
    );
    throw new Error(`${ERR_DIST_NOT_FOUND_PREFIX}${expected}`);
}

async function resolvePagesDir(distDir) {
    const pagesDir = path.join(distDir, PAGES_SUBDIR_NAME);
    const st = await statIfExists(pagesDir);
    if (!st?.isDirectory()) {
        const expected = `${pagesDir}${WILDCARD_SUFFIX}`;
        throw new Error(
            `${ERR_PAGES_DIR_NOT_FOUND_PREFIX}${pagesDir}${ERR_PAGES_DIR_NOT_FOUND_EXPECTED_PREFIX}${expected}`
        );
    }
    return pagesDir;
}

function makeFontsCss(fonts, fontsBase) {
    return (fonts ?? [])
        .map(
            (f) => `    @font-face {
      font-family: '${f.family}';
      src: url('${fontsBase}/${f.file}') format('${FONT_FORMAT}');
      font-weight: ${FONT_WEIGHT};
      font-style: ${FONT_STYLE};
    }`
        )
        .join("\n\n");
}

function makeLzmaScripts(include, jsBase) {
    if (!include) return "";
    return [
        `<script type="${SCRIPT_TYPE}" src="${jsBase}/${LZMA_WORKER_FILE}"></script>`,
        `<script type="${SCRIPT_TYPE}" src="${jsBase}/${LZMA_LIB_FILE}"></script>`,
    ].join("\n  ");
}

function assertPageConfig(folder, cfg) {
    if (!cfg) {
        throw new Error(`${ERR_MISSING_PAGE_CONFIG_PREFIX}"${folder}" in PAGES.`);
    }
    const meta = cfg?.embedParameters?.meta;
    if (!meta?.name_app || !meta?.name_file) {
        throw new Error(
            `${ERR_INVALID_PAGE_CONFIG_PREFIX}"${folder}"${ERR_INVALID_PAGE_CONFIG_SUFFIX}`
        );
    }
    return meta;
}

function applyTemplate(template, replacements) {
    let out = template;
    for (const [placeholder, value] of Object.entries(replacements)) {
        out = out.replaceAll(placeholder, value);
    }
    return out;
}

function getByPath(root, parts) {
    let cur = root;
    for (const p of parts) {
        if (cur == null || typeof cur !== "object") return undefined;
        if (!Object.prototype.hasOwnProperty.call(cur, p)) return undefined;
        cur = cur[p];
    }
    return cur;
}

function makeConfigReplacements(template, embedParameters) {
    const seen = new Set();
    const out = {};
    for (const m of template.matchAll(CONFIG_PLACEHOLDER_RE)) {
        const placeholder = m[0];
        const name = m[1];
        if (!name.includes(".")) continue;
        if (seen.has(placeholder)) continue;
        seen.add(placeholder);

        const pathParts = name.split(".").map((p) => p.toLowerCase());
        const value = getByPath(embedParameters, pathParts);

        if (value == null) {
            const msg = `${ERR_CONFIG_PLACEHOLDER_UNRESOLVED_PREFIX}"${placeholder}" -> embedParameters.${pathParts.join(".")}`;
            console.error(msg);
            throw new Error(msg);
        }
        if (typeof value !== "string") {
            const msg = `${ERR_CONFIG_PLACEHOLDER_NON_STRING_PREFIX}"${placeholder}" -> embedParameters.${pathParts.join(".")} (${typeof value})`;
            console.error(msg);
            throw new Error(msg);
        }

        out[placeholder] = value;
    }
    return out;
}

async function main() {
    const cwd = process.cwd();
    const distDir = await resolveDistDir(cwd);
    const pagesDir = await resolvePagesDir(distDir);

    const templatePath = path.resolve(cwd, TEMPLATE_RELATIVE_PATH);
    const template = await fs.readFile(templatePath, TEXT_ENCODING);

    const entries = await fs.readdir(pagesDir, { withFileTypes: true });
    const pageFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    if (pageFolders.length === 0) {
        throw new Error(
            `${ERR_NO_PAGE_FOLDERS_PREFIX}${pagesDir}${ERR_NO_PAGE_FOLDERS_SUFFIX}`
        );
    }

    await Promise.all(
        pageFolders.map(async (folder) => {
            const cfg = PAGES[folder];
            const meta = assertPageConfig(folder, cfg);

            const html = applyTemplate(template, {
                [PLACEHOLDERS.TITLE]: meta.name_app,
                [PLACEHOLDERS.APP_ID]: meta.name_file,
                [PLACEHOLDERS.APP_JS]: `${meta.name_file}${JS_EXTENSION}`,
                [PLACEHOLDERS.JS_BASE]: JS_BASE,
                [PLACEHOLDERS.LZMA_SCRIPTS]: makeLzmaScripts(cfg.includeLzma, JS_BASE),
                [PLACEHOLDERS.FONTS_CSS]: makeFontsCss(cfg.fonts, FONTS_BASE),
                ...makeConfigReplacements(template, cfg.embedParameters),
            });

            const outPath = path.join(pagesDir, folder, OUTPUT_FILENAME);
            await fs.writeFile(outPath, html, TEXT_ENCODING);
        })
    );

    console.log(`${LOG_OK_PREFIX}${pageFolders.length}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
