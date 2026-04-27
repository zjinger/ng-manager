import type { SystemLogService } from '@yinuo-ngm/logger';
import { NodeVersionServiceImpl } from '../node-version.service.impl';
import type { NodeVersionService } from '../node-version.service';

/** 创建 NodeVersionService 实例。 */
export function createNodeVersionService(sysLog: SystemLogService): NodeVersionService {
  return new NodeVersionServiceImpl(sysLog);
}
