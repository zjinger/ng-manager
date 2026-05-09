import { readTextFile } from "@yinuo-ngm/shared";
import type { ViteConfigViewModel } from "./vite.viewmodel";
import { resolveProjectFile } from "../../utils/config-path";

function extractObjectBlock(content: string, pattern: RegExp): string | undefined {
  const match = pattern.exec(content);
  if (!match || match.index < 0) {
    return undefined;
  }

  const start = content.indexOf("{", match.index);
  if (start < 0) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (let i = start; i < content.length; i += 1) {
    const ch = content[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === quote) {
        inString = false;
      }
      continue;
    }

    if (ch === "'" || ch === '"' || ch === "`") {
      inString = true;
      quote = ch;
      continue;
    }

    if (ch === "{") {
      depth += 1;
    } else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        return content.slice(start, i + 1);
      }
    }
  }
  return undefined;
}

function extractStringValue(content: string, key: string): string | undefined {
  const regex = new RegExp(
    String.raw`(?:^|[,{]\s*)${key}\s*:\s*(['"])([^'"\\]*(?:\\.[^'"\\]*)*)\1`,
    "m"
  );
  const match = regex.exec(content);
  return match?.[2];
}

function extractNumberValue(content: string, key: string): number | undefined {
  const regex = new RegExp(String.raw`(?:^|[,{]\s*)${key}\s*:\s*(-?\d+)`, "m");
  const match = regex.exec(content);
  if (!match) {
    return undefined;
  }
  const value = Number(match[1]);
  return Number.isNaN(value) ? undefined : value;
}

function extractBooleanValue(content: string, key: string): boolean | undefined {
  const regex = new RegExp(String.raw`(?:^|[,{]\s*)${key}\s*:\s*(true|false)`, "m");
  const match = regex.exec(content);
  if (!match) {
    return undefined;
  }
  return match[1] === "true";
}

function extractPlugins(returnBlock: string): string[] {
  const pluginsMatch = /plugins\s*:\s*\[([\s\S]*?)\]/m.exec(returnBlock);
  const pluginsBlock = pluginsMatch?.[1];
  if (!pluginsBlock) {
    return [];
  }
  const names = new Set<string>();
  const regex = /([A-Za-z_$][\w$]*)\s*\(/g;
  for (const match of pluginsBlock.matchAll(regex)) {
    const name = match[1];
    if (name && name !== "defineConfig") {
      names.add(name);
    }
  }
  return [...names];
}

function extractAlias(returnBlock: string): Array<{ key: string; replacement?: string }> {
  const resolveBlock = extractObjectBlock(returnBlock, /resolve\s*:\s*\{/m);
  if (!resolveBlock) {
    return [];
  }
  const aliasBlock = extractObjectBlock(resolveBlock, /alias\s*:\s*\{/m);
  if (!aliasBlock) {
    return [];
  }

  const rows: Array<{ key: string; replacement?: string }> = [];
  const regex = /['"]([^'"]+)['"]\s*:\s*([^,\n}]+)/g;
  for (const match of aliasBlock.matchAll(regex)) {
    rows.push({
      key: match[1],
      replacement: match[2]?.trim()
    });
  }
  return rows;
}

function extractProxyTargets(
  returnBlock: string
): Array<{ context: string; target?: string; ws?: boolean; changeOrigin?: boolean }> {
  const serverBlock = extractObjectBlock(returnBlock, /server\s*:\s*\{/m);
  if (!serverBlock) {
    return [];
  }
  const proxyBlock = extractObjectBlock(serverBlock, /proxy\s*:\s*\{/m);
  if (!proxyBlock) {
    return [];
  }

  const rows: Array<{ context: string; target?: string; ws?: boolean; changeOrigin?: boolean }> = [];
  const entryRegex = /['"]([^'"]+)['"]\s*:\s*\{/g;
  for (const match of proxyBlock.matchAll(entryRegex)) {
    const context = match[1];
    const blockStart =
      typeof match.index === "number" ? proxyBlock.indexOf("{", match.index) : -1;
    if (blockStart < 0) {
      continue;
    }
    const nested = extractObjectBlock(proxyBlock.slice(blockStart), /^\{/);
    const target = nested ? extractStringValue(nested, "target") : undefined;
    const ws = nested ? extractBooleanValue(nested, "ws") : undefined;
    const changeOrigin = nested ? extractBooleanValue(nested, "changeOrigin") : undefined;
    rows.push({ context, target, ws, changeOrigin });
  }
  return rows;
}

export async function readViteConfig(input: {
  projectRoot: string;
  filePath: string;
}): Promise<{ content: string; viewModel: ViteConfigViewModel }> {
  const absPath = resolveProjectFile(input.projectRoot, input.filePath);
  const content = await readTextFile(absPath);
  const returnBlock = extractObjectBlock(content, /return\s*\{/m) ?? content;
  const serverBlock = extractObjectBlock(returnBlock, /server\s*:\s*\{/m);
  const buildBlock = extractObjectBlock(returnBlock, /build\s*:\s*\{/m);

  return {
    content,
    viewModel: {
      filePath: input.filePath,
      content,
      readonly: true,
      base: extractStringValue(returnBlock, "base"),
      envDir: extractStringValue(returnBlock, "envDir"),
      plugins: extractPlugins(returnBlock),
      alias: extractAlias(returnBlock),
      server: {
        host: extractStringValue(serverBlock ?? "", "host"),
        port: extractNumberValue(serverBlock ?? "", "port"),
        strictPort: extractBooleanValue(serverBlock ?? "", "strictPort"),
        proxyTargets: extractProxyTargets(returnBlock)
      },
      build: {
        outDir: extractStringValue(buildBlock ?? "", "outDir"),
        hasLibMode: /\blib\s*:\s*\{/m.test(buildBlock ?? "")
      }
    }
  };
}
