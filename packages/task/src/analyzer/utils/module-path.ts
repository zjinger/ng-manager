import path from "node:path";

export function basenameNoQuery(filePath: string): string {
    return path.basename(filePath.split("?")[0] ?? filePath);
}

export function packageNameFromPath(inputPath: string): string | undefined {
    const normalized = inputPath.replace(/\\/g, "/");
    const marker = "node_modules/";
    const idx = normalized.lastIndexOf(marker);
    if (idx < 0) return undefined;
    const rest = normalized.slice(idx + marker.length);
    const parts = rest.split("/").filter(Boolean);
    if (parts.length === 0) return undefined;
    if (parts[0]!.startsWith("@") && parts.length > 1) return `${parts[0]}/${parts[1]}`;
    return parts[0];
}
