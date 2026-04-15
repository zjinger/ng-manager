import { NginxModuleStateStore } from './nginx-module-state.store';
import type { NginxTrafficConfig } from './nginx.types';

/**
 * 流量控制配置服务
 */
export class NginxTrafficService {
  constructor(private stateStore: NginxModuleStateStore) {}

  async getTrafficConfig(): Promise<NginxTrafficConfig> {
    const state = await this.stateStore.readState();
    return state.traffic;
  }

  async saveTrafficConfig(traffic: NginxTrafficConfig): Promise<void> {
    const state = await this.stateStore.readState();
    const parsedConnLimit = Number.isFinite(traffic.connLimit) ? Number(traffic.connLimit) : 0;
    state.traffic = {
      rateLimitEnabled: Boolean(traffic.rateLimitEnabled),
      rateLimit: traffic.rateLimit?.trim() || '',
      connLimitEnabled: Boolean(traffic.connLimitEnabled),
      connLimit: traffic.connLimitEnabled ? Math.max(1, parsedConnLimit) : Math.max(0, parsedConnLimit),
      blacklistIps: (traffic.blacklistIps || []).map(ip => ip.trim()).filter(Boolean),
    };
    await this.stateStore.writeState(state);
  }
}

