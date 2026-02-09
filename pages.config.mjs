import * as ParamsProto from "./src/js/struct/params.js";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

const pkg = require("./package.json");

function addURL(url="", isLocal=true){
    return {
        url: url,
        type: isLocal? ParamsProto.params.RoutAdrType.local : ParamsProto.params.RoutAdrType.global
    };
}

function baseEmbedParameters(
    params = {
        global: {
            build: "",
            ver_app: "",
            name_file: "",
            name_app: "",
            name_package: "",
        },
        conf: {
            antialiasing: 4,
            background: 0,
            frame_rate: 30,
        },
        about:{
            text: "",
        },
    }
    ) {
    return {
        routes: {
            primary_source: addURL(pkg.primary_source, false),
            github: addURL(pkg.github, false),

            homepage: addURL("/"),
            cave: addURL("/to/cave/"),
            dwellings: addURL("/to/dwellings/"),
            mfcg: addURL("/to/mfcg/"),
            village: addURL("/to/village/"),
            viewer: addURL("/to/viewer/"),
        },
        flags: {},
        meta: {
            param: {
                allow_high_dpi: true,
                always_on_top: false,
                borderless: false,
                hidden: false,
                maximized: false,
                minimized: false,
                resizable: true,
                frame_rate: params.conf.frame_rate,
                height: 0,
                width: 0,
            },
            context: {
                antialiasing: params.conf.antialiasing,
                background: params.conf.background,
                color_depth: 32,
                depth: true,
                hardware: true,
                stencil: true,
                vsync: true,
            },
            build: params.global.build,
            ver_app: params.global.ver_app,
            ver_global: pkg.version,
            name_file: params.global.name_file,
            name_company: pkg.name,
            name_app: params.global.name_app,
            name_package: params.global.name_package,

            about: {
                text: params.about.text,
                params: {
                    "Version App": params.global.ver_app,
                    "Version Global": pkg.version,
                },
                buttons: {
                    "Go to Home": addURL("/"),
                    "Go to Watabou": addURL(pkg.primary_source, false),
                },
            },
        },
    }
}

export const PAGES = {
    cave: {
        includeLzma: true,
        fonts: [
            { family: "Share Tech Regular", file: "ShareTech-Regular.woff" },
            { family: "Share Tech Mono", file: "ShareTechMono-Regular.woff" },
            { family: "Marcellus", file: "Marcellus-Regular.woff" },
        ],
        embedParameters: baseEmbedParameters({
            global: {
                build: "1181",
                ver_app: "2.1.5",
                name_file: "Cave",
                name_app: "Cave Generator",
                name_package: "cave",
            },
            conf: {
                antialiasing: 4,
                background: 2236962,
                frame_rate: 60,
            },
            about:{
                text: "A “one-page dungeon” style tool for natural locations—caves, burrows, or linked forest clearings—with quick styling, water level control, optional connecting roads, and PNG/SVG export.",
            },
        }),
    },
    viewer: {
        includeLzma: false,
        fonts: [
            { family: "Share Tech Regular", file: "ShareTech-Regular.woff" },
            { family: "Share Tech Mono", file: "ShareTechMono-Regular.woff" },
        ],
        embedParameters: baseEmbedParameters({
            global: {
                build: "36",
                ver_app: "1.2.2",
                name_file: "ToyTown2",
                name_app: "City Viewer",
                name_package: "viewer",
            },
            conf: {
                antialiasing: 4,
                background: 0,
                frame_rate: 60,
            },
            about:{
                text: "A dedicated 3D viewer: import compatible JSON/PROTO, switch view modes and lighting/styles, jump to random scenes, and export the result as an OBJ model.",
            },
        }),
    },
    mfcg: {
        includeLzma: true,
        fonts: [
            { family: "IM FELL Great Primer Roman", file: "IMFellGreatPrimer-Regular.woff" },
            { family: "Share Tech Regular", file: "ShareTech-Regular.woff" },
            { family: "Share Tech Mono", file: "ShareTechMono-Regular.woff" },
        ],
        embedParameters: baseEmbedParameters({
            global: {
                build: "2430",
                ver_app: "0.11.5",
                name_file: "mfcg",
                name_app: "Medieval Fantasy City Generator",
                name_package: "mfcg",
            },
            conf: {
                antialiasing: 0,
                background: 13419960,
                frame_rate: 60,
            },
            about:{
                text: "A highly configurable medieval city map maker with lots of controls (walls/river, outline shaping, procedural district names), standardized context menus, integrations with Dwellings and City Viewer, and PNG/SVG + JSON/PROTO export.",
            },
        }),
    },
    dwellings: {
        includeLzma: true,
        fonts: [
            { family: "Share Tech Regular", file: "ShareTech-Regular.woff" },
            { family: "Share Tech Mono", file: "ShareTechMono-Regular.woff" },
        ],
        embedParameters: baseEmbedParameters({
            global: {
                build: "3719",
                ver_app: "1.4.1",
                name_file: "Dwellings",
                name_app: "Dwellings Generator",
                name_package: "dwellings",
            },
            conf: {
                antialiasing: 0,
                background: 16777215,
                frame_rate: 60,
            },
            about:{
                text: "Generates believable floorplans from cottages to mansions and small castles, with room purposes, multi-floor layouts (plus optional basement), an editable footprint blueprint, elevation view, and PNG/SVG + JSON/PROTO export.",
            },
        }),
    },
    village: {
        includeLzma: true,
        fonts: [
            { family: "Share Tech Regular", file: "ShareTech-Regular.woff" },
            { family: "Share Tech Mono", file: "ShareTechMono-Regular.woff" },
        ],
        embedParameters: baseEmbedParameters({
            global: {
                build: "1944",
                ver_app: "1.6.6",
                name_file: "Village",
                name_app: "Village Generator",
                name_package: "village",
            },
            conf: {
                antialiasing: 4,
                background: 15790320,
                frame_rate: 30,
            },
            about:{
                text: "Builds rural settlements around winding roads: fewer houses than a city, more fields and trees. Includes terrain presets (bridges/piers when needed), relief shading, orchards/squares, integration with Dwellings and the 3D viewer, and PNG/SVG + JSON/PROTO export.",
            },
        }),
    },
};
