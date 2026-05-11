import { gzipSync } from "node:zlib";

export function calcGzipSize(buffer: Buffer): number {
    return gzipSync(buffer).length;
}
