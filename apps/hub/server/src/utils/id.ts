import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 16);

export function genId(prefix?: string): string {
    return prefix ? `${prefix}_${nanoid()}` : nanoid();
}