// core/src/domain/config/providers/angular/angular.provider.ts
import { ConfigProvider, ConfigContext } from "../config-provider";
import { loadWorkspace } from "../../workspace/workspace.loader";
import { WorkspaceModel } from "../../workspace/workspace.model";
import { ConfigPatch } from "../../patch/patch.model";
import { applyPatch } from "../../patch/patch.engine";
import { angularSchema } from "./angular.schema";
import { toAngularViewModel } from "./angular.mapper";

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
        ctx: ConfigContext
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
