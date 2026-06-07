import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MCP_TOOL_NAME_SET, MCP_TOOL_NAMES } from "../src/registry/tool-names";

const CANONICAL_PATTERN = /^(ngm|hub_v2)_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const BACKTICK_TOKEN = /`([A-Za-z0-9_.-]+)`/g;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const skillsRoot = path.join(repoRoot, "apps", "site", "docs", "hub-v2", "skills");

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function collectMarkdownToolRefs(markdown: string): string[] {
  const refs: string[] = [];
  for (const match of markdown.matchAll(BACKTICK_TOKEN)) {
    const token = match[1];
    if (!token) continue;
    if (token.startsWith("ngm") || token.startsWith("hub")) {
      refs.push(token);
    }
  }
  return refs;
}

async function main(): Promise<void> {
  const errors: string[] = [];

  for (const toolName of Object.values(MCP_TOOL_NAMES)) {
    if (!CANONICAL_PATTERN.test(toolName)) {
      errors.push(`Invalid canonical tool name: ${toolName}`);
    }
  }

  const markdownFiles = await listMarkdownFiles(skillsRoot);
  for (const markdownFile of markdownFiles) {
    const content = await readFile(markdownFile, "utf8");
    for (const ref of collectMarkdownToolRefs(content)) {
      if (ref.startsWith("ngm.") || ref.startsWith("hubv2_") || ref.startsWith("sl_hub_v2_")) {
        errors.push(`Deprecated/invalid tool naming in docs: ${ref} (${path.relative(repoRoot, markdownFile)})`);
        continue;
      }
      if (ref.startsWith("ngm_") || ref.startsWith("hub_v2_")) {
        if (ref.includes(".")) continue;
        if (!MCP_TOOL_NAME_SET.has(ref)) {
          errors.push(`Unknown canonical tool in docs: ${ref} (${path.relative(repoRoot, markdownFile)})`);
        }
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  console.log("Tool naming lint passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
