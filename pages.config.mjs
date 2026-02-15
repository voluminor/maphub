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
                text: "Create natural locations in a “one-page dungeon” style: caves, burrows, or linked forest clearings. Generate a layout fast, then tweak the style, adjust the water level, and add optional connecting roads for larger regions. Export clean PNG/SVG for play or reference, and save editable projects with JSON/PROTO import/export. Works offline as an installable app. \n\nBased on generator by watabou.",
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
                text: "Explore generated towns and cities in 3D. \nImport compatible JSON/PROTO, fly around with simple camera controls, switch rendering modes, lighting, and style presets, and jump to random scenes for quick inspiration. \nExport the result as an OBJ model for further work in external tools. Works offline as an installable app. \n\nBased on generator by watabou.",
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
                text: "Create detailed medieval-fantasy city maps in seconds. \nTweak the layout, districts, streets, walls, and waterways, then annotate the result and measure distances with line/curve tools. \nImport and continue editing saved projects (JSON/PROTO), export as PNG/SVG or editable JSON/PROTO, and open the same city in the built-in 3D viewer. Works offline as an installable app. \n\nBased on generator by watabou.",
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
                text: "Design believable building floorplans—from cottages to mansions and small castles—with smart room placement and multi-floor layouts (optional basement). Edit the footprint blueprint and labels, preview an elevation view, and export clean PNG/SVG for handouts. Save and continue later with editable JSON/PROTO import/export. Works offline as an installable app. \n\nBased on generator by watabou",
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
                text: "Generate a believable rural settlement built around winding roads: fewer houses than a city, more farms, orchards, trees, and open space. \nQuickly try terrain presets (with bridges/piers when needed), adjust the look with relief shading, and refine the layout before exporting. Import saved projects (JSON/PROTO), export as PNG/SVG or JSON/PROTO, and jump to the 3D viewer or Dwellings when you want more detail. Works offline as an installable app.\n\nBased on generator by watabou.",
            },
        }),
    },
};
