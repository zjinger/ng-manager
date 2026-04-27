import type { SystemLogService } from '@yinuo-ngm/logger';
import { NodeVersionServiceImpl } from '../node-version.service.impl';
import type { NodeVersionService } from '../node-version.service';

export function createNodeVersionService(sysLog: SystemLogService): NodeVersionService {
    return new NodeVersionServiceImpl(sysLog);
}
