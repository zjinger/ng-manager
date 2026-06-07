import type { CapabilityCatalogEntry, ToolCatalogEntry } from "./types";

function assertNoDuplicateToolNames(tools: readonly ToolCatalogEntry[]): void {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const tool of tools) {
    if (seen.has(tool.name)) {
      duplicates.add(tool.name);
      continue;
    }
    seen.add(tool.name);
  }

  if (duplicates.size > 0) {
    throw new Error(`Duplicate tool name(s) found in tool catalog: ${[...duplicates].sort().join(", ")}`);
  }
}

function assertCapabilityToolReferences(capabilities: readonly CapabilityCatalogEntry[], tools: readonly ToolCatalogEntry[]): void {
  const toolNames = new Set(tools.map((tool) => tool.name));
  const unknownReferences: string[] = [];

  for (const capability of capabilities) {
    for (const toolName of capability.tools) {
      if (!toolNames.has(toolName)) {
        unknownReferences.push(`${capability.id}:${toolName}`);
      }
    }
  }

  if (unknownReferences.length > 0) {
    throw new Error(
      `Unknown capability tool reference(s): ${unknownReferences.sort().join(", ")}`
    );
  }
}

export function buildToolCatalog(...groups: ReadonlyArray<readonly ToolCatalogEntry[]>): ToolCatalogEntry[] {
  const tools = groups.flatMap((group) => group);
  assertNoDuplicateToolNames(tools);
  return tools;
}

export function buildCapabilityCatalog(
  tools: readonly ToolCatalogEntry[],
  ...groups: ReadonlyArray<readonly CapabilityCatalogEntry[]>
): CapabilityCatalogEntry[] {
  const capabilities = groups.flatMap((group) => group);
  assertCapabilityToolReferences(capabilities, tools);
  return capabilities;
}
