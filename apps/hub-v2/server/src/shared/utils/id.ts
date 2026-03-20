import { customAlphabet } from "nanoid";

const nanoid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12);

export function genId(prefix: string): string {
  return `${prefix}_${nanoid()}`;
}
