import fs from "node:fs";
import path from "node:path";
import Spritesmith from "spritesmith";
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

type SpritesmithResult = {
    image: Buffer;
    coordinates: Record<string, { x: number; y: number; width: number; height: number }>;
    properties: { width: number; height: number };
};



async function runSpritesmith(srcFiles: string[], algorithm: SpritesmithOptionsAlgorithm): Promise<SpritesmithResult> {
    return await new Promise((resolve, reject) => {
        Spritesmith.run({ src: srcFiles, algorithm }, (err, res) => {
            if (err) return reject(err);
            resolve(res as SpritesmithResult);
        });
    });
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
    const res = await runSpritesmith(files, algorithm);

    fs.writeFileSync(spritePath, res.image);

    const { width: tileWidth, height: tileHeight } = parseGroupSize(group);
    const prefix = css?.prefix || "sl";
    const classes = Object.entries(res.coordinates).map(([filePath, info]) => {
        const base = path.basename(filePath, ".png");
        const sizeStr = info.width === info.height ? `${info.width}` : `${info.width}-${info.height}`;
        const className = `${prefix}-${sizeStr}-${base}`;
        return {
            name: base,
            className,
            x: info.x,
            y: info.y,
            width: info.width,
            height: info.height,
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
