import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        include: ["tests/**/*.test.js"],
    },
    resolve: {
        alias: {
            "../../struct/data.js": "./src/js/struct/data.js",
        },
    },
});
