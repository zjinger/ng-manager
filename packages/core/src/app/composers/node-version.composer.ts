import { NodeVersionServiceImpl } from "../../domain/node-version/node-version.service.impl";
import type { SystemLogService } from "../../domain/logger";

export function createNodeVersionDomain(sysLog: SystemLogService) {
    return new NodeVersionServiceImpl(sysLog);
}
