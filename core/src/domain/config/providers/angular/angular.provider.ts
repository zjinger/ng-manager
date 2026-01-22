// core/src/domain/config/providers/angular/angular.provider.ts
import { applyPatch } from "../../patch/patch.engine";
import { ConfigPatch } from "../../patch/patch.model";
import { loadWorkspace } from "../../workspace/workspace.loader";
import { WorkspaceModel } from "../../workspace/workspace.model";
import { ConfigCtx, ConfigProvider } from "../config-provider";
import { toAngularViewModel } from "./angular.mapper";
import { angularSchema } from "./angular.schema";

export class AngularConfigProvider implements ConfigProvider {

    readonly type = "angular" as const;

    readonly relPath = "angular.json" as const;

    async load(projectRoot: string, relPath?: string): Promise<WorkspaceModel> {
        return loadWorkspace(projectRoot, relPath || this.relPath);
    }

    getSchema() {
        return angularSchema;
    }

    toViewModel(
        workspace: WorkspaceModel,
        ctx: ConfigCtx
    ) {
        return toAngularViewModel(workspace, angularSchema, ctx);
    }

    applyPatch(
        workspace: WorkspaceModel,
        patch: ConfigPatch
    ): WorkspaceModel {
        return applyPatch(workspace, patch);
    }
}
