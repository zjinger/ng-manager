import * as fs from "fs";
import * as path from "path";

/**
 * Ensure parent directory of a file path exists.
 */
export function ensureDir(file: string): void {
    const dir = path.dirname(file);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}