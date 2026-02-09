import js from "@eslint/js";
import globals from "globals";
import {defineConfig} from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs}"],
        plugins: {js},
        extends: ["js/recommended"],
        languageOptions: {globals: globals.browser}
    },
    {
        ignores: [
            "public/js/**",
            "dist/**",
            "src/js/struct/**",
            ".idea/**",
            "_run/**",

            "src/js/Cave.js",
            "src/js/Dwellings.js",
            "src/js/mfcg.js",
            "src/js/ToyTown2.js",
            "src/js/Village.js",
        ],
    },
]);
