import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import * as process from "node:process";

const CWD = process.cwd();

const DIR_DIST = "dist";
const DIR_SRC = "src";
const DIR_PUBLIC = "public";
const DIR_LANGUAGES = "languages";

const FILE_ENCODING = "utf8";
const OUTPUT_FILE_NAME = "languages.json";
const JSON_EXTENSION = ".json";
const DOTFILE_PREFIX = ".";
const SORT_LOCALE = "en";
const JOIN_SEPARATOR = ", ";
const TYPE_OBJECT = "object";

const DIST_DIR_CANDIDATES = [
    path.resolve(CWD, DIR_DIST),
    path.resolve(CWD, DIR_SRC, DIR_DIST),
];

const LANGUAGES_DIR_CANDIDATES = [
    path.resolve(CWD, DIR_LANGUAGES),
    path.resolve(CWD, DIR_SRC, DIR_LANGUAGES),
    path.resolve(CWD, DIR_PUBLIC, DIR_LANGUAGES),
];

const ERR_DIST_NOT_FOUND = "dist directory was not found. Expected one of: ";
const ERR_LANG_NOT_FOUND =
    "languages directory was not found. Expected one of: ";
const ERR_NO_JSON_FILES = "No *.json files found in languages directory: ";
const ERR_JSON_PARSE = "Invalid JSON file: ";
const LOG_OK_PREFIX = "[ok]";
const LOG_MERGED = "Languages merged";

function isExistingDirectory(absPath) {
    try {
        return fssync.statSync(absPath).isDirectory();
    } catch {
        return false;
    }
}

function pickFirstExistingDir(candidates) {
    for (const absPath of candidates) {
        if (isExistingDirectory(absPath)) return absPath;
    }
    return null;
}

function looksLikeWrappedLanguageObject(value, langKey) {
    if (!value || typeof value !== TYPE_OBJECT || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    if (keys.length !== 1) return false;
    if (keys[0] !== langKey) return false;
    const inner = value[langKey];
    return !!inner && typeof inner === TYPE_OBJECT && !Array.isArray(inner);
}

async function readJson(filePath) {
    const raw = await fs.readFile(filePath, FILE_ENCODING);
    try {
        return JSON.parse(raw);
    } catch (cause) {
        throw new Error(`${ERR_JSON_PARSE}${filePath}`, { cause });
    }
}

async function main() {
    const languagesDir = pickFirstExistingDir(LANGUAGES_DIR_CANDIDATES);
    if (!languagesDir) {
        throw new Error(
            `${ERR_LANG_NOT_FOUND}${LANGUAGES_DIR_CANDIDATES.join(JOIN_SEPARATOR)}`
        );
    }

    const distDir = pickFirstExistingDir(DIST_DIR_CANDIDATES);
    if (!distDir) {
        throw new Error(
            `${ERR_DIST_NOT_FOUND}${DIST_DIR_CANDIDATES.join(JOIN_SEPARATOR)}`
        );
    }

    const outPath = path.join(distDir, OUTPUT_FILE_NAME);

    const entries = await fs.readdir(languagesDir, { withFileTypes: true });
    const jsonFiles = entries
        .filter(
            (e) =>
                e.isFile() &&
                !e.name.startsWith(DOTFILE_PREFIX) &&
                e.name.toLowerCase().endsWith(JSON_EXTENSION)
        )
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b, SORT_LOCALE));

    if (jsonFiles.length === 0) {
        throw new Error(`${ERR_NO_JSON_FILES}${languagesDir}`);
    }

    const merged = {};

    for (const fileName of jsonFiles) {
        const langKey = path.basename(fileName, JSON_EXTENSION);
        const filePath = path.join(languagesDir, fileName);

        const data = await readJson(filePath);

        merged[langKey] = looksLikeWrappedLanguageObject(data, langKey)
            ? data[langKey]
            : data;
    }

    await fs.mkdir(path.dirname(outPath), { recursive: true });
    await fs.writeFile(outPath, `${JSON.stringify(merged, null, 2)}\n`, FILE_ENCODING);

    console.log(`${LOG_OK_PREFIX} ${LOG_MERGED}: ${jsonFiles.length} -> ${outPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
