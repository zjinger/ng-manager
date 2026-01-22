import { AppError } from "../../../common/errors";
import { ProjectFramework } from "../../project/project.meta";
import { ConfigFileType } from "../catalog";
import { AngularConfigProvider } from "./angular";

export function getProviderByFramework(framework?: ProjectFramework, type?: ConfigFileType) {
    // MVP：先只支持 Angular
    if (!framework || framework === "angular") {
        // 如果 type 为空，也默认 angular
        if (!type || type === "angular") return new AngularConfigProvider();
        // tsconfig/eslint/prettier 未来再接，这里先抛明确错误
        throw new AppError('NOT_IMPLEMENTED', `Config provider for type "${type}" not implemented`);
    }
    throw new AppError(`NOT_IMPLEMENTED`, `framework "${framework}" not supported`);
}