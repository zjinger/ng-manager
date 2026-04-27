import type { SystemLogPort } from './system-log-port';
import { NodeVersionServiceImpl } from '../node-version.service.impl';
import type { NodeVersionService } from '../node-version.service';

export function createNodeVersionService(sysLog: SystemLogPort): NodeVersionService {
    return new NodeVersionServiceImpl(sysLog);
}
