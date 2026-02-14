import { readdirSync, readFileSync } from "node:fs";
import { dirname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const dataRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "data_tests");

export function readTestJson(relPath) {
    return JSON.parse(readFileSync(resolve(dataRoot, relPath), "utf8"));
}

export function readTestText(relPath) {
    return readFileSync(resolve(dataRoot, relPath), "utf8");
}

export function readTestBytes(relPath) {
    return readFileSync(resolve(dataRoot, relPath));
}

function walkDir(root) {
    const out = [];
    const stack = [root];
    while (stack.length) {
        const dir = stack.pop();
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = resolve(dir, entry.name);
            if (entry.isDirectory()) stack.push(full);
            else out.push(full);
        }
    }
    return out;
}

export function listDataFiles() {
    const files = walkDir(dataRoot);
    return files.map((fullPath) => {
        const relPath = relative(dataRoot, fullPath);
        const parts = relPath.split(sep);
        const version = parts[0] || "unknown";
        return {
            version,
            relPath,
            name: parts[parts.length - 1],
        };
    });
}

export function groupDataFilesByVersion() {
    const files = listDataFiles();
    const grouped = {};
    for (const file of files) {
        if (!grouped[file.version]) grouped[file.version] = [];
        grouped[file.version].push(file);
    }
    return grouped;
}

export function findFileByName(files, name) {
    return files.find((file) => file.name === name) || null;
}

export function findFirstFile(files, predicate) {
    return files.find(predicate) || null;
}
