import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const FILE_ENCODING = 'utf8';

const TOOL_PBJS = 'pbjs';
const TOOL_PBJS_WIN_SUFFIX = '.cmd';
const TOOL_PBJS_CLI_PACKAGE = 'protobufjs-cli';

const DIR_NODE_MODULES = 'node_modules';
const DIR_BIN = '.bin';
const DIR_TOOL_BIN = 'bin';

const DIR_PROTOBUF = 'protobuf';
const DIR_PROTOBUFJS = 'protobufjs';
const DIR_SRC = 'src';
const DIR_JS = 'js';
const DIR_STRUCT = 'struct';

const EXT_PROTO = '.proto';
const EXT_JS = '.js';
const SUFFIX_TMP = '.tmp';

const DEFAULT_PACKAGE_NAME = 'default';

const PBJS_TARGET = 'static-module';
const PBJS_WRAPPER = 'es6';

const PBJS_FLAG_ES6 = '--es6';
const PBJS_FLAG_NO_CREATE = '--no-create';
const PBJS_FLAG_NO_DELIMITED = '--no-delimited';
const PBJS_FLAG_NO_COMMENTS = '--no-comments';
const PBJS_FLAG_NO_BEAUTIFY = '--no-beautify';
const PBJS_FLAG_OUT = '-o';
const PBJS_FLAG_PROTO_PATH = '-p';
const PBJS_FLAG_TARGET = '-t';
const PBJS_FLAG_WRAPPER = '-w';

const IMPORT_MINIMAL_RE = /^import \* as \$protobuf from ["']protobufjs\/minimal["'];/m;
const IMPORT_MINIMAL_PATCH =
    'import * as $protobufImport from "protobufjs/minimal.js";\nconst $protobuf = $protobufImport.default ?? $protobufImport;';

const PACKAGE_RE = /^\s*package\s+([A-Za-z0-9_.]+)\s*;/m;

const SAFE_FILE_NAME_RE = /[^A-Za-z0-9_]+/g;
const SAFE_FILE_NAME_REPLACEMENT = '__';

const LOG_PROTO_DIR_MISSING = 'Proto directory not found:';
const LOG_NO_PROTO_FILES = 'No .proto files found. Nothing to generate.';
const LOG_FOUND = 'Found .proto files:';
const LOG_PACKAGES = 'Packages:';
const LOG_PROTO_DIR = 'PROTO_DIR:';
const LOG_OUT_DIR = 'OUT_DIR:';
const LOG_GENERATING = 'Generating per package...';
const LOG_DONE = 'Done.';

const ERR_PBJS_NOT_FOUND =
    'pbjs executable not found. Install dependencies with: npm i -D protobufjs protobufjs-cli';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = resolve(__dirname, '..');
const PROTO_DIR = resolve(join(PROJECT_ROOT, DIR_PROTOBUF));
const OUT_DIR = resolve(join(PROJECT_ROOT, DIR_SRC, DIR_JS, DIR_STRUCT));

function fail(message, code = 1) {
    process.stderr.write(`${message}\n`);
    process.exit(code);
}

function collectProtoFiles(rootDir) {
    const out = [];
    const stack = [rootDir];

    while (stack.length) {
        const dir = stack.pop();
        const entries = readdirSync(dir, { withFileTypes: true });

        for (const ent of entries) {
            const fullPath = join(dir, ent.name);
            if (ent.isDirectory()) {
                stack.push(fullPath);
                continue;
            }
            if (ent.isFile() && extname(ent.name).toLowerCase() === EXT_PROTO) {
                out.push(fullPath);
            }
        }
    }

    out.sort();
    return out;
}

function resolvePbjs() {
    const isWin = process.platform === 'win32';
    const binName = isWin ? `${TOOL_PBJS}${TOOL_PBJS_WIN_SUFFIX}` : TOOL_PBJS;
    const binPath = join(PROJECT_ROOT, DIR_NODE_MODULES, DIR_BIN, binName);

    if (existsSync(binPath)) {
        return { cmd: binPath, prefix: [] };
    }

    const cliBinDir = join(PROJECT_ROOT, DIR_NODE_MODULES, TOOL_PBJS_CLI_PACKAGE, DIR_TOOL_BIN);
    const p1 = join(cliBinDir, TOOL_PBJS);
    const p2 = join(cliBinDir, `${TOOL_PBJS}${EXT_JS}`);

    if (existsSync(p1)) return { cmd: process.execPath, prefix: [p1] };
    if (existsSync(p2)) return { cmd: process.execPath, prefix: [p2] };

    fail(ERR_PBJS_NOT_FOUND);
}

function runPbjs(pbjs, args) {
    const res = spawnSync(pbjs.cmd, [...pbjs.prefix, ...args], { stdio: 'inherit' });
    if (res.error) throw res.error;
    if (typeof res.status === 'number' && res.status !== 0) process.exit(res.status);
}

function readProtoPackageName(protoFile) {
    const text = readFileSync(protoFile, FILE_ENCODING);
    const m = text.match(PACKAGE_RE);
    return m ? m[1] : DEFAULT_PACKAGE_NAME;
}

function toSafeFileBaseName(packageName) {
    return packageName.replace(SAFE_FILE_NAME_RE, SAFE_FILE_NAME_REPLACEMENT);
}

function patchMinimalImport(code) {
    return code.replace(IMPORT_MINIMAL_RE, IMPORT_MINIMAL_PATCH);
}

function buildJsonHelpers() {
    return `

const JSON_OPTIONS = Object.freeze({
  longs: String,
  enums: String,
  bytes: String,
  defaults: true,
  arrays: true,
  objects: true,
  oneofs: true,
  json: true,
});

export { JSON_OPTIONS };

export function decodeJSON(Type, json) {
  const obj = typeof json === "string" ? JSON.parse(json) : json;
  return Type.fromObject(obj);
}

export function encodeJSON(Type, message, space = 0) {
  const obj = Type.toObject(message, JSON_OPTIONS);
  return JSON.stringify(obj, null, space);
}

export function toJSONObject(Type, message) {
  return Type.toObject(message, JSON_OPTIONS);
}
`;
}

function buildAttachJsonMethods(packageName) {
    const defaultPkg = JSON.stringify(DEFAULT_PACKAGE_NAME);
    const pkg = JSON.stringify(packageName);

    return `

function __getNamespace(root, path) {
  if (!path || path === ${defaultPkg}) return root;
  return path.split(".").reduce((acc, key) => (acc && acc[key]) ? acc[key] : null, root);
}

function __attachJsonMethods(ns) {
  if (!ns || (typeof ns !== "object" && typeof ns !== "function")) return;

  for (const v of Object.values(ns)) {
    if (!v) continue;

    if (typeof v === "function") {
      const isMessage =
        typeof v.encode === "function" &&
        typeof v.decode === "function" &&
        typeof v.fromObject === "function" &&
        typeof v.toObject === "function";

      if (isMessage) {
        if (!v.decodeJSON) v.decodeJSON = (json) => decodeJSON(v, json);
        if (!v.encodeJSON) v.encodeJSON = (message, space = 0) => encodeJSON(v, message, space);
        if (!v.toJSONObject) v.toJSONObject = (message) => toJSONObject(v, message);

        if (v.prototype && !v.prototype.toJSON) {
          v.prototype.toJSON = function toJSON() { return toJSONObject(v, this); };
        }
      }
      continue;
    }

    if (typeof v === "object") __attachJsonMethods(v);
  }
}

const __pkg = __getNamespace($root, ${pkg});
__attachJsonMethods(__pkg);
`;
}

function ensureCleanDir(dir) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
}

async function main() {
    if (!existsSync(PROTO_DIR)) fail(`${LOG_PROTO_DIR_MISSING} ${PROTO_DIR}`);

    const protoFiles = collectProtoFiles(PROTO_DIR);
    if (protoFiles.length === 0) {
        process.stdout.write(`${LOG_NO_PROTO_FILES}\n`);
        process.exit(0);
    }

    ensureCleanDir(OUT_DIR);

    const packages = new Map();
    for (const file of protoFiles) {
        const pkg = readProtoPackageName(file);
        if (!packages.has(pkg)) packages.set(pkg, []);
        packages.get(pkg).push(file);
    }

    const includeArgs = [PBJS_FLAG_PROTO_PATH, PROTO_DIR];

    const protobufjsDir = join(PROJECT_ROOT, DIR_NODE_MODULES, DIR_PROTOBUFJS);
    if (existsSync(protobufjsDir)) includeArgs.push(PBJS_FLAG_PROTO_PATH, protobufjsDir);

    const pbjsBaseArgs = [
        PBJS_FLAG_TARGET,
        PBJS_TARGET,
        PBJS_FLAG_WRAPPER,
        PBJS_WRAPPER,
        PBJS_FLAG_ES6,
        PBJS_FLAG_NO_CREATE,
        PBJS_FLAG_NO_DELIMITED,
        PBJS_FLAG_NO_COMMENTS,
        PBJS_FLAG_NO_BEAUTIFY,
        ...includeArgs,
    ];

    process.stdout.write(`${LOG_FOUND} ${protoFiles.length}\n`);
    process.stdout.write(`${LOG_PACKAGES} ${packages.size}\n`);
    process.stdout.write(`${LOG_PROTO_DIR} ${PROTO_DIR}\n`);
    process.stdout.write(`${LOG_OUT_DIR} ${OUT_DIR}\n`);
    process.stdout.write(`${LOG_GENERATING}\n`);

    const pbjs = resolvePbjs();

    for (const [pkg, files] of [...packages.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
        files.sort();

        const base = toSafeFileBaseName(pkg);
        const outPath = join(OUT_DIR, `${base}${EXT_JS}`);
        const tmpPath = `${outPath}${SUFFIX_TMP}`;

        rmSync(tmpPath, { force: true });

        runPbjs(pbjs, [...pbjsBaseArgs, PBJS_FLAG_OUT, tmpPath, ...files]);

        const generated = readFileSync(tmpPath, FILE_ENCODING);
        const patched = patchMinimalImport(generated);
        const finalCode = `${patched}${buildJsonHelpers()}${buildAttachJsonMethods(pkg)}`;

        writeFileSync(tmpPath, finalCode, FILE_ENCODING);
        renameSync(tmpPath, outPath);

        process.stdout.write(`${pkg} -> ${outPath}\n`);
    }

    process.stdout.write(`${LOG_DONE}\n`);
}

main().catch((err) => {
    process.stderr.write(`${String(err?.stack ?? err)}\n`);
    process.exit(1);
});
