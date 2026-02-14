import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
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
