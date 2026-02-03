import * as fs from "fs";

/**
 * Read JSON file safely.
 * - ENOENT → fallback
 * - JSON parse error / invalid shape → fallback
 */
export function readJsonOrDefault<T>(file: string, fallback: T): T {
    try {
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw);
        return parsed ?? fallback;
    } catch {
        return fallback;
    }
}


/** * Read JSON file safely.
 * - ENOENT → null
 * - JSON parse error / invalid shape → null
 */
export function readJsonOrNull<T>(file: string): T | null {
    try {
        const raw = fs.readFileSync(file, "utf-8");
        const parsed = JSON.parse(raw);
        return parsed ?? null;
    } catch {
        return null;
    }
}