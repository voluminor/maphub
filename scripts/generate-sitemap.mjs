import fs from "node:fs";
import path from "node:path";
import * as process from "node:process";
import { TAGS } from "../static.config.mjs";

const DIST_DIR_NAME = "dist";
const DIST_DIR_PATH = path.resolve(DIST_DIR_NAME);
const OUTPUT_FILE = path.join(DIST_DIR_PATH, "sitemap.xml");

const SITE_ORIGIN = "https://"+TAGS.HOMEPAGE;

const INDEX_BASENAME = "index.html";
const HTML_EXTENSION = ".html";

const EXCLUDED_BASENAMES = new Set(["404.html"]);

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const URLSET_OPEN =
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
const URLSET_CLOSE = "</urlset>";

const ENCODING_UTF8 = "utf8";
const URL_SEPARATOR = "/";

const ERROR_DIST_MISSING = 'dist directory not found. Run "vite build" first.';
const LOG_DONE = (count) => `OK: sitemap.xml generated with ${count} URL(s).`;

if (!fs.existsSync(DIST_DIR_PATH)) {
    console.error(ERROR_DIST_MISSING);
    process.exit(1);
}

function collectHtmlFiles(rootDir) {
    const result = [];
    const stack = [rootDir];

    while (stack.length) {
        const dir = stack.pop();
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }

            if (!entry.isFile()) continue;

            const ext = path.extname(entry.name).toLowerCase();
            if (ext !== HTML_EXTENSION) continue;
            if (EXCLUDED_BASENAMES.has(entry.name)) continue;

            result.push(fullPath);
        }
    }

    return result;
}

function toUrlPath(rootDir, absPath) {
    const relPath = path
        .relative(rootDir, absPath)
        .split(path.sep)
        .join(URL_SEPARATOR);

    if (relPath === INDEX_BASENAME) return URL_SEPARATOR;

    if (relPath.endsWith(URL_SEPARATOR + INDEX_BASENAME)) {
        return URL_SEPARATOR + relPath.slice(0, -INDEX_BASENAME.length);
    }

    return URL_SEPARATOR + relPath;
}

function lastModISO(absPath) {
    const stat = fs.statSync(absPath);
    return stat.mtime.toISOString().split("T")[0];
}

function escapeXml(value) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

function buildUrlEntry(loc, lastmod) {
    const lines = [];
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(loc)}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push("  </url>");
    return lines.join("\n");
}

function buildSitemap(rootDir) {
    const htmlFiles = collectHtmlFiles(rootDir);

    const entries = htmlFiles
        .map((absPath) => ({
            loc: SITE_ORIGIN + toUrlPath(rootDir, absPath),
            lastmod: lastModISO(absPath),
        }))
        .sort((a, b) => a.loc.localeCompare(b.loc));

    const parts = [XML_HEADER, URLSET_OPEN];

    for (const entry of entries) {
        parts.push(buildUrlEntry(entry.loc, entry.lastmod));
    }

    parts.push(URLSET_CLOSE);
    parts.push("");

    return { xml: parts.join("\n"), count: entries.length };
}

const { xml, count } = buildSitemap(DIST_DIR_PATH);

fs.writeFileSync(OUTPUT_FILE, xml, ENCODING_UTF8);

console.log(LOG_DONE(count));
