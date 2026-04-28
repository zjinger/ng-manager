import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { spriteErrors } from "@yinuo-ngm/errors";
import type {
    GeneratePngGroupOptions,
    GenerateSpriteResult,
    SpriteMetaFile,
    SpritesmithOptionsAlgorithm,
} from "./types";
import { detectGroupType, parseGroupSize, defaultFileSort, sortSpriteClasses } from "./detect";
import { buildLessForSprite } from "./css";
import { ensureDir, readMeta, writeMeta } from "./file";

type SpriteCoordinate = {
    filePath: string;
    x: number;
    y: number;
    width: number;
    height: number;
};

type SpritesmithResult = {
    image: Buffer;
    coordinates: SpriteCoordinate[];
    properties: { width: number; height: number };
};

type SpriteImage = {
    filePath: string;
    width: number;
    height: number;
};

type PackedSpriteItem = {
    x: number;
    y: number;
    image: SpriteImage;
};

async function readSpriteImages(srcFiles: string[]): Promise<SpriteImage[]> {
    return await Promise.all(srcFiles.map(async (filePath) => {
        const meta = await sharp(filePath).metadata();
        if (!meta.width || !meta.height) {
            throw new Error(`Cannot read PNG dimensions: ${filePath}`);
        }

        return {
            filePath,
            width: meta.width,
            height: meta.height,
        };
    }));
}

async function runSharpSprite(srcFiles: string[], algorithm: SpritesmithOptionsAlgorithm): Promise<SpritesmithResult> {
    const images = await readSpriteImages(srcFiles);
    const packed = layoutSpriteImages(images, algorithm);

    const coordinates: SpriteCoordinate[] = [];
    const composites = packed.items.map((item) => {
        const { image } = item;
        coordinates.push({
            filePath: image.filePath,
            x: item.x,
            y: item.y,
            width: image.width,
            height: image.height,
        });

        return {
            input: image.filePath,
            left: item.x,
            top: item.y,
        };
    });

    const image = await sharp({
        create: {
            width: packed.width,
            height: packed.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
    })
        .composite(composites)
        .png()
        .toBuffer();

    return {
        image,
        coordinates,
        properties: { width: packed.width, height: packed.height },
    };
}

function layoutSpriteImages(
    images: SpriteImage[],
    algorithm: SpritesmithOptionsAlgorithm,
): { width: number; height: number; items: PackedSpriteItem[] } {
    if (algorithm === "left-right") {
        return layoutLeftRight(images);
    }

    if (algorithm === "top-down") {
        return layoutTopDown(images);
    }

    if (algorithm === "diagonal") {
        return layoutDiagonal(images);
    }

    return layoutRows(images);
}

function layoutLeftRight(images: SpriteImage[]) {
    let x = 0;
    let height = 0;
    const items = images.map((image) => {
        const item = { image, x, y: 0 };
        x += image.width;
        height = Math.max(height, image.height);
        return item;
    });

    return { width: x, height, items };
}

function layoutTopDown(images: SpriteImage[]) {
    let y = 0;
    let width = 0;
    const items = images.map((image) => {
        const item = { image, x: 0, y };
        y += image.height;
        width = Math.max(width, image.width);
        return item;
    });

    return { width, height: y, items };
}

function layoutDiagonal(images: SpriteImage[]) {
    let x = 0;
    let y = 0;
    let width = 0;
    let height = 0;
    const items = images.map((image) => {
        const item = { image, x, y };
        width = Math.max(width, x + image.width);
        height = Math.max(height, y + image.height);
        x += image.width;
        y += image.height;
        return item;
    });

    return { width, height, items };
}

function layoutRows(images: SpriteImage[]) {
    const totalArea = images.reduce((sum, image) => sum + image.width * image.height, 0);
    const maxWidth = images.reduce((max, image) => Math.max(max, image.width), 0);
    const targetWidth = Math.max(maxWidth, Math.ceil(Math.sqrt(totalArea)));

    let x = 0;
    let y = 0;
    let rowHeight = 0;
    let width = 0;
    const items: PackedSpriteItem[] = [];

    images.forEach((image) => {
        if (x > 0 && x + image.width > targetWidth) {
            x = 0;
            y += rowHeight;
            rowHeight = 0;
        }

        items.push({ image, x, y });
        x += image.width;
        rowHeight = Math.max(rowHeight, image.height);
        width = Math.max(width, x);
    });

    return {
        width,
        height: y + rowHeight,
        items,
    };
}

export async function generatePngGroup(opts: GeneratePngGroupOptions): Promise<GenerateSpriteResult> {
    const type = detectGroupType(opts.groupDir);
    if (type === "mixed") {
        throw spriteErrors.groupMixed(opts.group);
    }
    if (type === "empty") {
        throw spriteErrors.groupEmpty(opts.group);
    }
    if (type === "svg") {
        throw spriteErrors.groupInvalidType(opts.group, "svg-only");
    }

    const {
        group,
        groupDir,
        outDir,
        spriteFileName = `${group}.png`,
        spriteUrl,
        css,
        cache,
        spritesmith,
    } = opts;

    ensureDir(outDir);

    const spritePath = path.join(outDir, spriteFileName);

    const metaSuffix = cache?.metaSuffix ?? ".meta.json";
    const metaPath = path.join(outDir, `${group}${metaSuffix}`);

    const persistLess = cache?.persistLess ?? true;
    const lessPath = persistLess ? path.join(outDir, `${group}.less`) : undefined;

    // ---------- cache hit ----------
    const forceRefresh = cache?.forceRefresh ?? false;
    const cacheEnabled = cache?.enabled ?? true;

    if (cacheEnabled && !forceRefresh && fs.existsSync(spritePath) && fs.existsSync(metaPath)) {
        const meta = readMeta(metaPath) as SpriteMetaFile;
        sortSpriteClasses(meta.classes);

        const resultBase = {
            mode: "png" as const,
            group,
            type,
            spritePath,
            spriteUrl,
            classes: meta.classes,
            tileWidth: meta.tileWidth,
            tileHeight: meta.tileHeight,
            spriteWidth: meta.spriteWidth,
            spriteHeight: meta.spriteHeight,
            metaPath,
            lessPath,
            lessText: "",
        };

        const lessText = buildLessForSprite({ group, spriteUrl, classes: meta.classes }, css);
        if (persistLess && lessPath) fs.writeFileSync(lessPath, lessText, "utf-8");

        return { ...resultBase, lessText };
    }

    // ---------- rebuild ----------
    const filter = opts.filter || ((f: string) => f.toLowerCase().endsWith(".png"));
    const sort = opts.sort || defaultFileSort;

    const files = fs.readdirSync(groupDir)
        .filter(filter)
        .sort(sort)
        .map((f) => path.join(groupDir, f));

    if (!files.length) {
        throw spriteErrors.groupEmpty(group);
    }

    const algorithm = spritesmith?.algorithm || "binary-tree";
    const res = await runSharpSprite(files, algorithm);

    fs.writeFileSync(spritePath, res.image);

    const { width: tileWidth, height: tileHeight } = parseGroupSize(group);
    const prefix = css?.prefix || "sl";
    const classes = res.coordinates.map((coord) => {
        const base = path.basename(coord.filePath, ".png");
        const sizeStr = coord.width === coord.height ? `${coord.width}` : `${coord.width}-${coord.height}`;
        const className = `${prefix}-${sizeStr}-${base}`;
        return {
            name: base,
            className,
            x: coord.x,
            y: coord.y,
            width: coord.width,
            height: coord.height,
        };
    });

    sortSpriteClasses(classes);

    const meta: SpriteMetaFile = {
        mode: "png",
        group,
        tileWidth,
        tileHeight,
        spriteWidth: res.properties.width,
        spriteHeight: res.properties.height,
        classes,
    };

    writeMeta(metaPath, meta);

    const lessText = buildLessForSprite({ group, spriteUrl, classes }, css);

    if (persistLess && lessPath) fs.writeFileSync(lessPath, lessText, "utf-8");

    return {
        mode: "png",
        group,
        type,
        spritePath,
        spriteUrl,
        classes,
        tileWidth,
        tileHeight,
        spriteWidth: res.properties.width,
        spriteHeight: res.properties.height,
        metaPath,
        lessPath,
        lessText,
    };
}
