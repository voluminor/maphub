import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as process from "node:process";

const DIST_DIR_NAME = "dist";
const DIST_DIR_PATH = path.resolve(DIST_DIR_NAME);

const EXCLUDED_BASENAMES = new Set(["sw.js", "rapidoc-min.js"]);

const TEXT_FILE_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs"]);
const SKIP_HASH_EXTENSIONS = new Set([".html", ".map"]);

const HASH_ALGORITHM = "sha256";
const HASH_DIGEST_ENCODING = "hex";
const HASH_HEX_LENGTH = 8;

const ENCODING_UTF8 = "utf8";
const REGEX_FLAGS_GLOBAL = "g";

const URL_SEPARATOR = "/";
const RELATIVE_PREFIX = "./";
const HASH_QUERY_SEPARATOR = "?";

const REGEX_ESCAPE_PATTERN = /[.*+?^${}()|[\]\\]/g;
const REGEX_ESCAPE_REPLACEMENT = "\\$&";
const REGEX_AFTER_PATH_GUARD = "(?![0-9A-Za-z._?#])";

const ERROR_DIST_MISSING = 'dist directory not found. Run "vite build" first.';
const LOG_DONE = (count) => `OK: added query-hash in ${count} file(s).`;

if (!fs.existsSync(DIST_DIR_PATH)) {
    console.error(ERROR_DIST_MISSING);
    process.exit(1);
}

function collectFiles(rootDir) {
    const result = [];
    const stack = [rootDir];

    while (stack.length) {
        const dir = stack.pop();
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            if (EXCLUDED_BASENAMES.has(entry.name)) continue;

            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }

            if (entry.isFile()) result.push(fullPath);
        }
    }

    return result;
}

function sha256HexSuffix(buffer) {
    const hex = crypto
        .createHash(HASH_ALGORITHM)
        .update(buffer)
        .digest(HASH_DIGEST_ENCODING);

    return hex.slice(-HASH_HEX_LENGTH);
}

function escapeRegExp(value) {
    return value.replace(REGEX_ESCAPE_PATTERN, REGEX_ESCAPE_REPLACEMENT);
}

function buildHashMap(rootDir, absoluteFiles) {
    const map = new Map();

    for (const absPath of absoluteFiles) {
        const relPath = path
            .relative(rootDir, absPath)
            .split(path.sep)
            .join(URL_SEPARATOR);

        const ext = path.extname(relPath).toLowerCase();
        if (SKIP_HASH_EXTENSIONS.has(ext)) continue;

        const hash = sha256HexSuffix(fs.readFileSync(absPath));

        map.set(URL_SEPARATOR + relPath, hash);
        map.set(relPath, hash);
        map.set(RELATIVE_PREFIX + relPath, hash);
    }

    return map;
}

function buildReplacementRules(hashMap) {
    const keys = [...hashMap.keys()].sort((a, b) => b.length - a.length);

    return keys.map((key) => {
        const hash = hashMap.get(key);
        const pattern = `${escapeRegExp(key)}${REGEX_AFTER_PATH_GUARD}`;

        return {
            key,
            regex: new RegExp(pattern, REGEX_FLAGS_GLOBAL),
            replacement: `${key}${HASH_QUERY_SEPARATOR}${hash}`,
        };
    });
}

function rewriteTextFiles(absoluteFiles, rules) {
    let touched = 0;

    for (const absPath of absoluteFiles) {
        const ext = path.extname(absPath).toLowerCase();
        if (!TEXT_FILE_EXTENSIONS.has(ext)) continue;

        let original;
        try {
            original = fs.readFileSync(absPath, ENCODING_UTF8);
        } catch {
            continue;
        }

        let updated = original;

        for (const rule of rules) {
            if (!updated.includes(rule.key)) continue;

            const next = updated.replace(rule.regex, rule.replacement);
            if (next !== updated) updated = next;
        }

        if (updated !== original) {
            fs.writeFileSync(absPath, updated, ENCODING_UTF8);
            touched += 1;
        }
    }

    return touched;
}

const allFiles = collectFiles(DIST_DIR_PATH);
const hashMap = buildHashMap(DIST_DIR_PATH, allFiles);
const rules = buildReplacementRules(hashMap);
const touched = rewriteTextFiles(allFiles, rules);

console.log(LOG_DONE(touched));
