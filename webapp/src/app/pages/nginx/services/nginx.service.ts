import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '@app/core';
import type {
  NginxStatusResponse,
  NginxStatsResponse,
  NginxBindResponse,
  NginxConfig,
  NginxCommandResult,
  NginxConfigValidation,
  NginxServer,
  CreateNginxServerRequest,
  UpdateNginxServerRequest,
  NginxUpstream,
  NginxSslCertificate,
  NginxTrafficConfig,
  NginxPerformanceConfig,
  NginxModuleSettings,
} from '../models/nginx.types';

type NginxLocalIpResponse = { ip?: string };
type NginxConfigResponse = { config?: NginxConfig };
type NginxConfigFilesResponse = { files?: string[] };
type NginxServersResponse = { servers?: NginxServer[] };
type NginxServerResponse = { server?: NginxServer };
type NginxDeleteServerResponse = { snapshotId?: string };
type NginxValidateSslPathsResponse = {
  valid: boolean;
  cert?: { exists: boolean; readable: boolean; error?: string };
  key?: { exists: boolean; readable: boolean; error?: string };
};
type NginxParseImportServersResponse = {
  candidates: Array<{
    request?: CreateNginxServerRequest;
    error?: string;
  }>;
};
type NginxAnalyzeImportServersResponse = {
  candidates: Array<{
    request?: CreateNginxServerRequest;
    issues?: Array<{ level: 'error' | 'warning'; message: string; field?: 'name' | 'domains' | 'listen' }>;
    error?: string;
  }>;
};
type NginxUpstreamsResponse = { upstreams?: NginxUpstream[] };
type NginxSslCertificatesResponse = { certificates?: NginxSslCertificate[] };
type NginxTrafficConfigResponse = { traffic?: NginxTrafficConfig };
type NginxPerformanceConfigResponse = { performance?: NginxPerformanceConfig };
type NginxModuleSettingsResponse = { settings?: NginxModuleSettings };
type NginxLogLinesResponse = { lines?: string[] };
type NginxLogsInfoResponse = { errorLog?: string; accessLog?: string };

/**
 * Nginx 管理 API 服务
 */
@Injectable({
  providedIn: 'root',
})
export class NginxService {
  private http = inject(ApiClient);
  private readonly baseUrl = '/api/nginx';
  private statusCache: NginxStatusResponse | null = null;

  // ========== 实例管理 ==========

  /**
   * 获取 Nginx 状态和实例信息
   */
  async getStatus(): Promise<NginxStatusResponse> {
    const data = await this.getData<NginxStatusResponse>(`${this.baseUrl}/status`);
    this.statusCache = {
      instance: data.instance || null,
      status: data.status,
    };
    return data;
  }

  /**
   * 获取首页统计信息（状态 + server 汇总）
   */
  async getStats(): Promise<NginxStatsResponse> {
    const data = await this.getData<NginxStatsResponse>(`${this.baseUrl}/stats`);
    if (data.status) {
      this.statusCache = {
        instance: data.instance || null,
        status: data.status,
      };
    }
    return data;
  }

  /**
   * 绑定 Nginx 实例
   */
  async bind(path: string): Promise<NginxBindResponse> {
    return await this.postData<NginxBindResponse>(`${this.baseUrl}/bind`, { path });
  }

  /**
   * 解绑 Nginx 实例
   */
  async unbind(): Promise<void> {
    await this.postAction(`${this.baseUrl}/unbind`, {});
    this.statusCache = null;
  }

  getCachedStatusSnapshot(): NginxStatusResponse | null {
    if (!this.statusCache) {
      return null;
    }
    return {
      instance: this.statusCache.instance ? { ...this.statusCache.instance } : null,
      status: { ...this.statusCache.status },
    };
  }

  /**
   * 获取本机 IP 地址
   */
  async getLocalIp(): Promise<NginxLocalIpResponse> {
    return await this.getData<NginxLocalIpResponse>(`${this.baseUrl}/local-ip`);
  }

  // ========== 服务控制 ==========

  /**
   * 启动 Nginx
   */
  async start(): Promise<NginxCommandResult> {
    return this.executeWithRetry(() => this.postData<NginxCommandResult>(`${this.baseUrl}/start`, {}));
  }

  /**
   * 停止 Nginx
   */
  async stop(): Promise<NginxCommandResult> {
    return this.executeWithRetry(() => this.postData<NginxCommandResult>(`${this.baseUrl}/stop`, {}));
  }

  /**
   * 重载配置
   */
  async reload(): Promise<NginxCommandResult> {
    return this.executeWithRetry(() => this.postData<NginxCommandResult>(`${this.baseUrl}/reload`, {}));
  }

  /**
   * 测试配置
   */
  async test(): Promise<NginxConfigValidation> {
    return await firstValueFrom(this.http.post<NginxConfigValidation>(`${this.baseUrl}/test`, {}));
  }

  // ========== 配置管理 ==========

  /**
   * 读取主配置
   */
  async getConfig(): Promise<NginxConfigResponse> {
    return await this.getData<NginxConfigResponse>(`${this.baseUrl}/config`);
  }

  /**
   * 更新主配置
   */
  async updateConfig(content: string): Promise<void> {
    await this.putAction(`${this.baseUrl}/config`, { content });
  }

  /**
   * 验证配置
   */
  async validateConfig(content?: string): Promise<NginxConfigValidation> {
    return await firstValueFrom(
      this.http.post<NginxConfigValidation>(`${this.baseUrl}/config/validate`, { content })
    );
  }

  /**
   * 获取包含的配置文件列表
   */
  async getConfigFiles(): Promise<NginxConfigFilesResponse> {
    return await this.getData<NginxConfigFilesResponse>(`${this.baseUrl}/config/files`);
  }

  /**
   * 读取指定配置文件
   */
  async getConfigFile(filePath: string): Promise<NginxConfigResponse> {
    const params = new HttpParams().set('filePath', filePath);
    return await this.getData<NginxConfigResponse>(`${this.baseUrl}/config/file`, params);
  }

  /**
   * 保存指定配置文件
   */
  async updateConfigFile(filePath: string, content: string): Promise<void> {
    await this.putAction(`${this.baseUrl}/config/file`, { filePath, content });
  }

  // ========== Server 管理 ==========

  /**
   * 获取所有 server
   */
  async getServers(): Promise<NginxServersResponse> {
    return await this.getData<NginxServersResponse>(`${this.baseUrl}/servers`);
  }

  /**
   * 获取单个 server
   */
  async getServer(id: string): Promise<NginxServerResponse> {
    return await this.getData<NginxServerResponse>(`${this.baseUrl}/servers/${id}`);
  }

  /**
   * 创建 server
   */
  async createServer(request: CreateNginxServerRequest): Promise<NginxServerResponse> {
    return await this.postData<NginxServerResponse>(`${this.baseUrl}/servers`, request);
  }

  /**
   * 更新 server
   */
  async updateServer(id: string, request: UpdateNginxServerRequest): Promise<NginxServerResponse> {
    return await this.putData<NginxServerResponse>(`${this.baseUrl}/servers/${id}`, request);
  }

  /**
   * 删除 server
   */
  async deleteServer(id: string): Promise<NginxDeleteServerResponse> {
    return await this.deleteData<NginxDeleteServerResponse>(`${this.baseUrl}/servers/${id}`);
  }

  async restoreDeletedServer(snapshotId: string): Promise<NginxServerResponse> {
    return await this.postData<NginxServerResponse>(
      `${this.baseUrl}/servers/restore-deleted`,
      { snapshotId }
    );
  }

  /**
   * 启用 server
   */
  async enableServer(id: string): Promise<void> {
    await this.patchAction(`${this.baseUrl}/servers/${id}/enable`, {});
  }

  /**
   * 禁用 server
   */
  async disableServer(id: string): Promise<void> {
    await this.patchAction(`${this.baseUrl}/servers/${id}/disable`, {});
  }

  async validateSslPaths(sslCert?: string, sslKey?: string): Promise<NginxValidateSslPathsResponse> {
    return await this.postData<NginxValidateSslPathsResponse>(
      `${this.baseUrl}/servers/validate-ssl-paths`,
      { sslCert, sslKey }
    );
  }

  async parseImportServers(content: string): Promise<NginxParseImportServersResponse> {
    return await this.postData<NginxParseImportServersResponse>(
      `${this.baseUrl}/servers/import/parse`,
      { content }
    );
  }

  async analyzeImportServers(requests: CreateNginxServerRequest[]): Promise<NginxAnalyzeImportServersResponse> {
    return await this.postData<NginxAnalyzeImportServersResponse>(
      `${this.baseUrl}/servers/import/analyze`,
      { requests }
    );
  }

  // ========== Phase2：Upstream / SSL / 流量 / 性能 ==========

  async getUpstreams(): Promise<NginxUpstreamsResponse> {
    return await this.getData<NginxUpstreamsResponse>(`${this.baseUrl}/upstreams`);
  }

  async saveUpstreams(upstreams: NginxUpstream[]): Promise<void> {
    await this.putAction(`${this.baseUrl}/upstreams`, { upstreams });
  }

  async getSslCertificates(): Promise<NginxSslCertificatesResponse> {
    return await this.getData<NginxSslCertificatesResponse>(`${this.baseUrl}/ssl/certificates`);
  }

  async saveSslCertificates(certificates: NginxSslCertificate[]): Promise<void> {
    await this.putAction(`${this.baseUrl}/ssl/certificates`, { certificates });
  }

  async getTrafficConfig(): Promise<NginxTrafficConfigResponse> {
    return await this.getData<NginxTrafficConfigResponse>(`${this.baseUrl}/traffic`);
  }

  async saveTrafficConfig(traffic: NginxTrafficConfig): Promise<void> {
    await this.putAction(`${this.baseUrl}/traffic`, traffic);
  }

  async getPerformanceConfig(): Promise<NginxPerformanceConfigResponse> {
    return await this.getData<NginxPerformanceConfigResponse>(`${this.baseUrl}/performance`);
  }

  async savePerformanceConfig(performance: NginxPerformanceConfig): Promise<void> {
    await this.putAction(`${this.baseUrl}/performance`, performance);
  }

  async getModuleSettings(): Promise<NginxModuleSettingsResponse> {
    return await this.getData<NginxModuleSettingsResponse>(`${this.baseUrl}/module/settings`);
  }

  async saveModuleSettings(settings: Partial<NginxModuleSettings>): Promise<NginxModuleSettingsResponse> {
    return await this.putData<NginxModuleSettingsResponse>(`${this.baseUrl}/module/settings`, settings);
  }

  // ========== 日志管理 ==========

  /**
   * 获取错误日志尾部
   */
  async getErrorLogs(tail: number = 100): Promise<NginxLogLinesResponse> {
    const params = new HttpParams().set('tail', tail.toString());
    return await this.getData<NginxLogLinesResponse>(`${this.baseUrl}/logs/error`, params);
  }

  /**
   * 获取访问日志尾部
   */
  async getAccessLogs(tail: number = 100): Promise<NginxLogLinesResponse> {
    const params = new HttpParams().set('tail', tail.toString());
    return await this.getData<NginxLogLinesResponse>(`${this.baseUrl}/logs/access`, params);
  }

  /**
   * 获取日志文件路径信息
   */
  async getLogsInfo(): Promise<NginxLogsInfoResponse> {
    return await this.getData<NginxLogsInfoResponse>(`${this.baseUrl}/logs/info`);
  }

  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    options: { retries?: number; delayMs?: number } = {}
  ): Promise<T> {
    const retries = Math.max(0, options.retries ?? 1);
    const delayMs = Math.max(0, options.delayMs ?? 500);
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt >= retries) {
          throw error;
        }
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    throw lastError;
  }

  private async getData<T extends object>(url: string, params?: HttpParams): Promise<T> {
    return await firstValueFrom(this.http.get<T>(url, params));
  }

  private async postData<T extends object>(url: string, body: unknown): Promise<T> {
    return await firstValueFrom(this.http.post<T>(url, body));
  }

  private async putData<T extends object>(url: string, body: unknown): Promise<T> {
    return await firstValueFrom(this.http.put<T>(url, body));
  }

  private async deleteData<T extends object>(url: string): Promise<T> {
    return await firstValueFrom(this.http.delete<T>(url));
  }

  private async postAction(url: string, body: unknown): Promise<void> {
    await firstValueFrom(this.http.post<unknown>(url, body));
  }

  private async putAction(url: string, body: unknown): Promise<void> {
    await firstValueFrom(this.http.put<unknown>(url, body));
  }

  private async patchAction(url: string, body: unknown): Promise<void> {
    await firstValueFrom(this.http.patch<unknown>(url, body));
  }
}
