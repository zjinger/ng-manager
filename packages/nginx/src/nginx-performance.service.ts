import { NginxModuleStateStore } from './nginx-module-state.store';
import type { NginxPerformanceConfig } from './nginx.types';

/**
 * 性能优化配置服务
 */
export class NginxPerformanceService {
  constructor(private stateStore: NginxModuleStateStore) {}

  async getPerformanceConfig(): Promise<NginxPerformanceConfig> {
    const state = await this.stateStore.readState();
    return state.performance;
  }

  async savePerformanceConfig(performance: NginxPerformanceConfig): Promise<void> {
    const state = await this.stateStore.readState();
    state.performance = {
      gzipEnabled: Boolean(performance.gzipEnabled),
      gzipTypes: performance.gzipTypes?.trim() || '',
      keepaliveTimeout: performance.keepaliveTimeout?.trim() || '',
      workerProcesses: performance.workerProcesses?.trim() || '',
      sendfile: Boolean(performance.sendfile),
      tcpNopush: Boolean(performance.tcpNopush),
    };
    await this.stateStore.writeState(state);
  }
}

