import { defineConfig } from "vite";
import fs from "node:fs";
import path from "node:path";
import * as process from "node:process";
import { viteStaticCopy } from "vite-plugin-static-copy";

function collectHtmlInputs(rootDir) {
    const inputs = {};

    const rootIndex = path.resolve(rootDir, "index.html");
    if (fs.existsSync(rootIndex)) inputs["index"] = rootIndex;

    const pagesDir = path.resolve(rootDir, "to");
    if (!fs.existsSync(pagesDir)) return inputs;

    const walk = (dir) => {
        for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
            const full = path.resolve(dir, ent.name);
            if (ent.isDirectory()) walk(full);
            else if (ent.isFile() && ent.name === "index.html") {
                const rel = path.relative(rootDir, full).split(path.sep).join("/");
                const key = rel.replace(/\.html$/i, "");
                inputs[key] = full;
            }
        }
    };

    walk(pagesDir);
    return inputs;
}

function directoryIndexPlugin() {
    const rewrite = (req, _res, next) => {
        const original = req.url || "/";
        const [pathname, qs] = original.split("?", 2);
        if (pathname.endsWith("/") && !pathname.includes(".")) {
            req.url = pathname + "index.html" + (qs ? `?${qs}` : "");
        }
        next();
    };

    return {
        name: "directory-index",
        configureServer(server) {
            server.middlewares.use(rewrite);
        },
        configurePreviewServer(server) {
            server.middlewares.use(rewrite);
        },
    };
}

export default defineConfig(() => {
    const viteRoot = path.resolve(process.cwd(), "src");

    const inputs = collectHtmlInputs(viteRoot);
    if (Object.keys(inputs).length === 0) {
        inputs.index = path.resolve(viteRoot, "index.html");
    }

    return {
        base: "/",
        root: "./src",
        publicDir: "../public",
        plugins: [
            directoryIndexPlugin(),
            viteStaticCopy({
                targets: [
                    { src: "js/*", dest: "js" },
                ],
            }),
        ],
        build: {
            outDir: "../dist",
            emptyOutDir: true,
            minify: "esbuild",
            rollupOptions: {
                input: inputs,
            },
        },
    };
});
