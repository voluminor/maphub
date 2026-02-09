import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import path from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { StringDecoder } from "node:string_decoder";
import process from "node:process";
import { PAGES } from "../pages.config.mjs";
import { TAGS } from "../static.config.mjs";

const DIST_DIR_NAME = "dist";
const PAGES_DIR_NAME = "to";
const URL_ROOT = "/";
const URL_PAGES_PREFIX = "/to/";
const STREAM_ENCODING = "utf8";
const DOTFILE_PREFIX = ".";
const PATH_PARENT_PREFIX = "..";
const TMP_PREFIX = `.tmp-${process.pid}-`;
const SKIP_DIR_NAME = "Assets";
const PLACEHOLDER_OPEN = "{{";
const PLACEHOLDER_CLOSE = "}}";
const URL_QUERY_SEPARATOR_RE = /\?/;
const TEXT_EXTENSIONS = new Set([".html", ".css", ".js", ".json", ".webmanifest"]);
const PLACEHOLDER_RE = /{{\s*([^{}]+?)\s*}}/g;
const LOG_KEYS_LABEL = "keys:";
const LOG_DONE = (processed, skipped) =>
    `[ok] replaced in dist. processed=${processed}, skipped(binary/non-text)=${skipped}`;

function isProbablyTextFile(filePath) {
    return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function makeReplacer(dict) {
    return (input) =>
        input.replace(PLACEHOLDER_RE, (match, keyRaw) => {
            const key = String(keyRaw).trim();
            return Object.prototype.hasOwnProperty.call(dict, key) ? String(dict[key]) : match;
        });
}

function makeTmpPath(filePath) {
    return `${filePath}${TMP_PREFIX}${Date.now().toString(36)}`;
}

async function listFileUrls(dirPath) {
    const absRoot = path.resolve(dirPath);
    const out = [URL_ROOT];
    const stack = [absRoot];

    while (stack.length) {
        const currentDir = stack.pop();
        const entries = await fs.readdir(currentDir, { withFileTypes: true });

        for (const entry of entries) {
            if (entry.name.startsWith(DOTFILE_PREFIX)) continue;

            const fullAbs = path.join(currentDir, entry.name);

            if (entry.isDirectory()) {
                stack.push(fullAbs);
                continue;
            }

            if (!entry.isFile()) continue;

            const rel = path.relative(absRoot, fullAbs).split(URL_QUERY_SEPARATOR_RE, 1)[0];
            if (rel.startsWith(PATH_PARENT_PREFIX) || path.isAbsolute(rel)) continue;

            out.push(URL_ROOT + rel.split(path.sep).join(URL_ROOT));
        }
    }

    return out;
}

class ReplaceTagsTransform extends Transform {
    constructor(replaceFn) {
        super();
        this.replaceFn = replaceFn;
        this.decoder = new StringDecoder(STREAM_ENCODING);
        this.tail = "";
    }

    _transform(chunk, _enc, cb) {
        const text = this.decoder.write(chunk);
        let data = this.tail + text;

        const lastOpen = data.lastIndexOf(PLACEHOLDER_OPEN);
        const lastClose = data.lastIndexOf(PLACEHOLDER_CLOSE);

        if (lastOpen !== -1 && lastOpen > lastClose) {
            this.tail = data.slice(lastOpen);
            data = data.slice(0, lastOpen);
        } else {
            this.tail = "";
        }

        this.push(this.replaceFn(data));
        cb();
    }

    _flush(cb) {
        const rest = this.tail + this.decoder.end();
        if (rest) this.push(this.replaceFn(rest));
        cb();
    }
}

async function* walkFiles(rootDir) {
    const stack = [rootDir];

    while (stack.length) {
        const dir = stack.pop();
        const entries = await fs.readdir(dir, { withFileTypes: true });

        for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                stack.push(entryPath);
                continue;
            }

            if (entry.isFile()) yield entryPath;
        }
    }
}

async function replaceInFile(filePath, replaceFn) {
    const tmpPath = makeTmpPath(filePath);

    try {
        await pipeline(
            createReadStream(filePath),
            new ReplaceTagsTransform(replaceFn),
            createWriteStream(tmpPath),
        );
        await fs.rename(tmpPath, filePath);
    } catch (error) {
        await fs.unlink(tmpPath).catch(() => undefined);
        throw error;
    }
}

async function buildDictionary(distDir) {
    const dict = {};
    const pagesDir = path.join(distDir, PAGES_DIR_NAME);

    const entries = await fs.readdir(pagesDir, { withFileTypes: true });
    const pageFolders = entries.filter((e) => e.isDirectory()).map((e) => e.name);

    for (const folder of pageFolders) {
        const cfg = PAGES[folder];
        const upper = folder.toUpperCase();

        dict[`ADR_${upper}`] = `${URL_PAGES_PREFIX}${folder}/`;
        dict[`EMBED_PARAMETERS_JSON_${upper}`] = JSON.stringify(cfg.embedParameters);
    }

    for (const [key, value] of Object.entries(TAGS)) {
        dict[key] = value;
    }

    dict.PAGES_ARR = JSON.stringify(await listFileUrls(distDir));

    return dict;
}

async function main() {
    const distDir = path.resolve(process.cwd(), DIST_DIR_NAME);
    const dict = await buildDictionary(distDir);
    const replaceFn = makeReplacer(dict);

    let processed = 0;
    let skipped = 0;

    console.log(LOG_KEYS_LABEL, Object.keys(dict));

    for await (const filePath of walkFiles(distDir)) {
        if (!isProbablyTextFile(filePath) || path.dirname(filePath) === SKIP_DIR_NAME) {
            skipped += 1;
            continue;
        }

        await replaceInFile(filePath, replaceFn);
        processed += 1;
    }

    console.log(LOG_DONE(processed, skipped));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
