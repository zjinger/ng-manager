import {
  ConfigCtx,
  ConfigPatch,
  ConfigPatchChange,
  ConfigSchemaItem,
  ConfigSchemaSection,
} from "../models";

export function buildDotPath(section: ConfigSchemaSection, item: ConfigSchemaItem, ctx: ConfigCtx): string {
  // workspace scope
  if (section.scope === "workspace") return item.key;

  // project scope
  const project = ctx.project;
  const target = section.target ?? ctx.target;
  if (!project) throw new Error(`ctx.project required (section=${section.id})`);
  if (!target) throw new Error(`target required (section=${section.id})`);

  const architectKey = ctx.architectKey ?? "targets"; // 与 core fallback 一致
  const base = `projects.${project}.${architectKey}.${target}`;
  const cfg = item.configuration ?? ctx.configuration;
  if (cfg) return `${base}.configurations.${cfg}.${item.key}`;
  return `${base}.options.${item.key}`;
}

export function diffToScopedChanges(baseline: any, current: any, schema: any, ctx: any) {
  const workspace: ConfigPatchChange[] = [];
  const project: ConfigPatchChange[] = [];

  for (const sec of schema.sections ?? []) {
    for (const item of sec.items ?? []) {
      const k = item.key;
      const b = baseline?.[k];
      const c = current?.[k];

      if (JSON.stringify(b) === JSON.stringify(c)) continue;

      const change: ConfigPatchChange = { path: buildDotPath(sec, item, ctx), before: b, after: c };
      const scope = sec.scope ?? "project";
      if (scope === "workspace") workspace.push(change);
      else project.push(change);
    }
  }

  return { workspace, project };
}

export function buildPatch(scope: "workspace" | "project", ctx: any, changes: ConfigPatchChange[]): ConfigPatch {
  return {
    scope,
    project: ctx.project,
    target: ctx.target,
    configuration: ctx.configuration,
    changes,
  };
}