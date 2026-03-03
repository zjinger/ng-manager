import fs from "node:fs";
import path from "node:path";
import { SpriteMetaFile, SvgMetaFile } from "./types";

function ensureDir(dir: string) {
    fs.mkdirSync(dir, { recursive: true });
}

function readMeta(metaPath: string): SpriteMetaFile | SvgMetaFile {
    const raw = fs.readFileSync(metaPath, "utf-8");
    return JSON.parse(raw) as SpriteMetaFile | SvgMetaFile;
}

function writeMeta(metaPath: string, meta: SpriteMetaFile | SvgMetaFile) {
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf-8");
}

export { ensureDir, readMeta, writeMeta };