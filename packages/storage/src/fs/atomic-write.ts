import * as fs from "fs";
import { ensureDir } from "./ensure-dir";

/**
 * Atomic write text file:
 * write `<file>.tmp` then rename.
 */
export function atomicWrite(file: string, content: string): void {
    ensureDir(file);
    const tmp = `${file}.tmp.${process.pid}.${Date.now()}`;
    fs.writeFileSync(tmp, content, "utf-8");
    fs.renameSync(tmp, file);
}


export async function writeJsonAtomic(file: string, data: any, space = 2): Promise<void> {
    const text = JSON.stringify(data, null, space);
    await atomicWrite(file, text);
}


