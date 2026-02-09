import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DIST_DIR_NAME = "dist";
const IMG_DIR_NAME = "img";

const SOURCE_ICON_FILE_NAME = "ico_simply.png";

const OUTPUT_ICON_192 = "icon-192.png";
const OUTPUT_ICON_512 = "icon-512.png";
const OUTPUT_ICON_192_MASKABLE = "icon-192-maskable.png";
const OUTPUT_ICON_512_MASKABLE = "icon-512-maskable.png";
const OUTPUT_APPLE_TOUCH_ICON = "apple-touch-icon.png";

const IMAGE_FORMAT = "png";
const RESIZE_FIT = "contain";
const COMPOSITE_GRAVITY = "center";

const FILE_NOT_FOUND_CODE = "ENOENT";

const ERROR_PREFIX_SOURCE_MISSING = "Source icon file was not found:";
const ERROR_PREFIX_SOURCE_READ_FAILED = "Failed to read source icon file:";
const ERROR_SUFFIX_POSITIVE_INT = "must be a positive integer";
const ERROR_SUFFIX_POSITIVE_NUMBER = "must be a positive number";

const OUTPUT_ICON_FILES = [
    { size: 192, fileName: OUTPUT_ICON_192, innerScale: 1 },
    { size: 512, fileName: OUTPUT_ICON_512, innerScale: 1 },
    { size: 192, fileName: OUTPUT_ICON_192_MASKABLE, innerScale: 0.8 },
    { size: 512, fileName: OUTPUT_ICON_512_MASKABLE, innerScale: 0.8 },
    { size: 180, fileName: OUTPUT_APPLE_TOUCH_ICON, innerScale: 1 }
];

const TRANSPARENT_BG = { r: 0, g: 0, b: 0, alpha: 0 };

const OUTPUT_DIR = path.resolve(DIST_DIR_NAME, IMG_DIR_NAME);
const SOURCE_ICON_PATH = path.join(OUTPUT_DIR, SOURCE_ICON_FILE_NAME);

const assertFinitePositiveInt = (value, name) => {
    if (!Number.isFinite(value) || value <= 0 || Math.floor(value) !== value) {
        throw new Error(`${name} ${ERROR_SUFFIX_POSITIVE_INT}`);
    }
};

const assertFinitePositiveNumber = (value, name) => {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${name} ${ERROR_SUFFIX_POSITIVE_NUMBER}`);
    }
};

const readSourceIcon = async () => {
    try {
        return await fs.readFile(SOURCE_ICON_PATH);
    } catch (err) {
        const code = err && typeof err === "object" && "code" in err ? err.code : null;
        const prefix = code === FILE_NOT_FOUND_CODE ? ERROR_PREFIX_SOURCE_MISSING : ERROR_PREFIX_SOURCE_READ_FAILED;
        throw new Error(`${prefix} ${SOURCE_ICON_PATH}`);
    }
};

const makeSquareIcon = async (sourceBuffer, size, fileName, innerScale) => {
    assertFinitePositiveInt(size, "size");
    assertFinitePositiveNumber(innerScale, "innerScale");

    const innerSize = Math.max(1, Math.round(size * innerScale));

    const resized = await sharp(sourceBuffer)
        .resize(innerSize, innerSize, { fit: RESIZE_FIT, background: TRANSPARENT_BG })
        [IMAGE_FORMAT]()
        .toBuffer();

    const outputPath = path.join(OUTPUT_DIR, fileName);

    await sharp({
        create: { width: size, height: size, channels: 4, background: TRANSPARENT_BG }
    })
        .composite([{ input: resized, gravity: COMPOSITE_GRAVITY }])
        [IMAGE_FORMAT]()
        .toFile(outputPath);
};

await fs.mkdir(OUTPUT_DIR, { recursive: true });

const sourceBuffer = await readSourceIcon();

for (const job of OUTPUT_ICON_FILES) {
    await makeSquareIcon(sourceBuffer, job.size, job.fileName, job.innerScale);
}
