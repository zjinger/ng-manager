import { AppError } from "../../../../common/errors";
import { getByDotPath } from "../../patch/path-access";
import { WorkspaceModel } from "../../workspace/workspace.model";
import { ConfigCtx, ConfigSchema, ConfigSchemaItem, ConfigSchemaSection } from "../config-provider";
import { AngularViewModel } from "./angular-view-model";
import { pickArchitectKey } from "./angular.path";

function pickDefaultProject(raw: any): string {
    const p = raw?.defaultProject;
    if (typeof p === "string" && p) return p;
    const keys = Object.keys(raw?.projects ?? {});
    return keys[0] ?? "";
}

function buildPathForItem(args: {
    raw: any;
    section: ConfigSchemaSection;
    item: ConfigSchemaItem;
    ctx: ConfigCtx;
    architectKey: "architect" | "targets";
}): string {

    const { raw, section, item, ctx, architectKey } = args;
    const itemKey = item.key
    // workspace scope
    if (section.scope === "workspace") {
        return itemKey; // e.g. defaultProject
    }
    // project scope：projects.<project>.(architect|targets).<target>.options.<itemKey>
    if (section.scope === "project") {
        const project = ctx.project;
        const target = section.target ?? ctx.target;

        if (!project) {
            throw new AppError("BAD_REQUEST", "project is required for project-scoped config", {
                sectionId: section.id,
            });
        }
        if (!target) {
            throw new AppError("BAD_REQUEST", "target is required for project-scoped config", {
                sectionId: section.id,
            });
        }
        const base = `projects.${project}.${architectKey}.${target}`;
        // 单项覆盖：sourceMap -> production
        const cfg = item.configuration ?? ctx.configuration;
        if (cfg) {
            return `${base}.configurations.${cfg}.${itemKey}`;
        }
        return `${base}.options.${itemKey}`;
    }
    return itemKey;
}

/**
 * json -> view model
 */
export function toAngularViewModel(
    workspace: WorkspaceModel,
    schema: ConfigSchema,
    inputCtx?: ConfigCtx
): AngularViewModel {
    const raw = workspace.raw;

    const projects = Object.keys(raw?.projects ?? {});
    const project = inputCtx?.project || pickDefaultProject(raw) || projects[0] || "";

    if (!project) {
        throw new AppError("PROJECT_ANGULAR_JSON_INVALID", "No projects found in angular.json", {
            filePath: workspace.filePath,
        });
    }

    const projectNode = raw?.projects?.[project];
    const architectKey = pickArchitectKey(projectNode);
    const arch = projectNode?.[architectKey] ?? {};

    const targets = Object.keys(arch ?? {});
    const target = inputCtx?.target || undefined;

    const cfgs = target ? Object.keys((arch?.[target]?.configurations ?? {})) : [];

    const ctx: ConfigCtx = {
        project,
        target,
        configuration: inputCtx?.configuration,
        architectKey
    };

    const values: Record<string, any> = {};

    for (const sec of schema.sections) {
        for (const item of sec.items) {
            const p = buildPathForItem({
                raw,
                section: sec,
                item,
                ctx: { project, target, configuration: inputCtx?.configuration },
                architectKey,
            });
            values[item.key] = getByDotPath(raw, p);
        }
    }

    if (values["defaultProject"] == null) {
        values["defaultProject"] = project;
    }
    return {
        fileType: "angular",
        filePath: workspace.filePath,
        ctx,
        options: {
            projects,
            targets,
            configurations: cfgs,
        },
        values,
    };
}
