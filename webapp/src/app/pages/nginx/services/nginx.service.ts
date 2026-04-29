import { inject, Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiClient } from '@app/core';
import type {
  AnalyzeNginxImportServersRequestDto,
  CreateNginxServerRequestDto,
  NginxAnalyzeImportServersResponseDto,
  NginxBindRequestDto,
  NginxBindResponseDto,
  NginxCommandResultResponseDto,
  NginxConfigFilesResponseDto,
  NginxConfigResponseDto,
  NginxConfigValidationResponseDto,
  NginxDeleteServerResponseDto,
  NginxLocalIpResponseDto,
  NginxLogLinesResponseDto,
  NginxLogsInfoResponseDto,
  NginxModuleSettingsDto,
  NginxModuleSettingsResponseDto,
  NginxParseImportServersResponseDto,
  NginxPerformanceConfigDto,
  NginxPerformanceConfigResponseDto,
  NginxServerResponseDto,
  NginxServersResponseDto,
  NginxSslCertificatesResponseDto,
  NginxSslCertificateDto,
  NginxStatsResponseDto,
  NginxStatusResponseDto,
  NginxTrafficConfigDto,
  NginxTrafficConfigResponseDto,
  NginxUpstreamsResponseDto,
  NginxUpstreamDto,
  NginxValidateSslPathsResponseDto,
  ParseNginxImportServersRequestDto,
  SaveNginxModuleSettingsRequestDto,
  SaveNginxPerformanceConfigRequestDto,
  SaveNginxSslCertificatesRequestDto,
  SaveNginxTrafficConfigRequestDto,
  SaveNginxUpstreamsRequestDto,
  UpdateNginxConfigFileRequestDto,
  UpdateNginxConfigRequestDto,
  UpdateNginxServerRequestDto,
  ValidateNginxConfigRequestDto,
  ValidateNginxSslPathsRequestDto,
} from '@yinuo-ngm/protocol';

/**
 * Nginx 管理 API 服务
 */
@Injectable({
  providedIn: 'root',
})
export class NginxService {
  private http = inject(ApiClient);
  private readonly baseUrl = '/api/nginx';
  private statusCache: NginxStatusResponseDto | null = null;

  // ========== 实例管理 ==========

  /**
   * 获取 Nginx 状态和实例信息
   */
  async getStatus(): Promise<NginxStatusResponseDto> {
    const data = await this.getData<NginxStatusResponseDto>(`${this.baseUrl}/status`);
    this.statusCache = {
      instance: data.instance || null,
      status: data.status,
    };
    return data;
  }

  /**
   * 获取首页统计信息（状态 + server 汇总）
   */
  async getStats(): Promise<NginxStatsResponseDto> {
    const data = await this.getData<NginxStatsResponseDto>(`${this.baseUrl}/stats`);
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
  async bind(path: string): Promise<NginxBindResponseDto> {
    const body: NginxBindRequestDto = { path };
    return await this.postData<NginxBindResponseDto>(`${this.baseUrl}/bind`, body);
  }

  /**
   * 解绑 Nginx 实例
   */
  async unbind(): Promise<void> {
    await this.postAction(`${this.baseUrl}/unbind`, {});
    this.statusCache = null;
  }

  getCachedStatusSnapshot(): NginxStatusResponseDto | null {
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
  async getLocalIp(): Promise<NginxLocalIpResponseDto> {
    return await this.getData<NginxLocalIpResponseDto>(`${this.baseUrl}/local-ip`);
  }

  // ========== 服务控制 ==========

  /**
   * 启动 Nginx
   */
  async start(): Promise<NginxCommandResultResponseDto> {
    return this.executeWithRetry(() => this.postData<NginxCommandResultResponseDto>(`${this.baseUrl}/start`, {}));
  }

  /**
   * 停止 Nginx
   */
  async stop(): Promise<NginxCommandResultResponseDto> {
    return this.executeWithRetry(() => this.postData<NginxCommandResultResponseDto>(`${this.baseUrl}/stop`, {}));
  }

  /**
   * 重载配置
   */
  async reload(): Promise<NginxCommandResultResponseDto> {
    return this.executeWithRetry(() => this.postData<NginxCommandResultResponseDto>(`${this.baseUrl}/reload`, {}));
  }

  /**
   * 测试配置
   */
  async test(): Promise<NginxConfigValidationResponseDto> {
    return await firstValueFrom(this.http.post<NginxConfigValidationResponseDto>(`${this.baseUrl}/test`, {}));
  }

  // ========== 配置管理 ==========

  /**
   * 读取主配置
   */
  async getConfig(): Promise<NginxConfigResponseDto> {
    return await this.getData<NginxConfigResponseDto>(`${this.baseUrl}/config`);
  }

  /**
   * 更新主配置
   */
  async updateConfig(content: string): Promise<void> {
    const body: UpdateNginxConfigRequestDto = { content };
    await this.putAction(`${this.baseUrl}/config`, body);
  }

  /**
   * 验证配置
   */
  async validateConfig(content?: string): Promise<NginxConfigValidationResponseDto> {
    const body: ValidateNginxConfigRequestDto = { content };
    return await firstValueFrom(
      this.http.post<NginxConfigValidationResponseDto>(`${this.baseUrl}/config/validate`, body)
    );
  }

  /**
   * 获取包含的配置文件列表
   */
  async getConfigFiles(): Promise<NginxConfigFilesResponseDto> {
    return await this.getData<NginxConfigFilesResponseDto>(`${this.baseUrl}/config/files`);
  }

  /**
   * 读取指定配置文件
   */
  async getConfigFile(filePath: string): Promise<NginxConfigResponseDto> {
    const params = new HttpParams().set('filePath', filePath);
    return await this.getData<NginxConfigResponseDto>(`${this.baseUrl}/config/file`, params);
  }

  /**
   * 保存指定配置文件
   */
  async updateConfigFile(filePath: string, content: string): Promise<void> {
    const body: UpdateNginxConfigFileRequestDto = { filePath, content };
    await this.putAction(`${this.baseUrl}/config/file`, body);
  }

  // ========== Server 管理 ==========

  /**
   * 获取所有 server
   */
  async getServers(): Promise<NginxServersResponseDto> {
    return await this.getData<NginxServersResponseDto>(`${this.baseUrl}/servers`);
  }

  /**
   * 获取单个 server
   */
  async getServer(id: string): Promise<NginxServerResponseDto> {
    return await this.getData<NginxServerResponseDto>(`${this.baseUrl}/servers/${id}`);
  }

  /**
   * 创建 server
   */
  async createServer(request: CreateNginxServerRequestDto): Promise<NginxServerResponseDto> {
    return await this.postData<NginxServerResponseDto>(`${this.baseUrl}/servers`, request);
  }

  /**
   * 更新 server
   */
  async updateServer(id: string, request: UpdateNginxServerRequestDto): Promise<NginxServerResponseDto> {
    return await this.putData<NginxServerResponseDto>(`${this.baseUrl}/servers/${id}`, request);
  }

  /**
   * 删除 server
   */
  async deleteServer(id: string): Promise<NginxDeleteServerResponseDto> {
    return await this.deleteData<NginxDeleteServerResponseDto>(`${this.baseUrl}/servers/${id}`);
  }

  async restoreDeletedServer(snapshotId: string): Promise<NginxServerResponseDto> {
    return await this.postData<NginxServerResponseDto>(
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

  async validateSslPaths(sslCert?: string, sslKey?: string): Promise<NginxValidateSslPathsResponseDto> {
    const body: ValidateNginxSslPathsRequestDto = { sslCert, sslKey };
    return await this.postData<NginxValidateSslPathsResponseDto>(
      `${this.baseUrl}/servers/validate-ssl-paths`,
      body
    );
  }

  async parseImportServers(content: string): Promise<NginxParseImportServersResponseDto> {
    const body: ParseNginxImportServersRequestDto = { content };
    return await this.postData<NginxParseImportServersResponseDto>(
      `${this.baseUrl}/servers/import/parse`,
      body
    );
  }

  async analyzeImportServers(requests: CreateNginxServerRequestDto[]): Promise<NginxAnalyzeImportServersResponseDto> {
    const body: AnalyzeNginxImportServersRequestDto = { requests };
    return await this.postData<NginxAnalyzeImportServersResponseDto>(
      `${this.baseUrl}/servers/import/analyze`,
      body
    );
  }

  // ========== Phase2：Upstream / SSL / 流量 / 性能 ==========

  async getUpstreams(): Promise<NginxUpstreamsResponseDto> {
    return await this.getData<NginxUpstreamsResponseDto>(`${this.baseUrl}/upstreams`);
  }

  async saveUpstreams(upstreams: NginxUpstreamDto[]): Promise<void> {
    const body: SaveNginxUpstreamsRequestDto = { upstreams };
    await this.putAction(`${this.baseUrl}/upstreams`, body);
  }

  async getSslCertificates(): Promise<NginxSslCertificatesResponseDto> {
    return await this.getData<NginxSslCertificatesResponseDto>(`${this.baseUrl}/ssl/certificates`);
  }

  async saveSslCertificates(certificates: NginxSslCertificateDto[]): Promise<void> {
    const body: SaveNginxSslCertificatesRequestDto = { certificates };
    await this.putAction(`${this.baseUrl}/ssl/certificates`, body);
  }

  async getTrafficConfig(): Promise<NginxTrafficConfigResponseDto> {
    return await this.getData<NginxTrafficConfigResponseDto>(`${this.baseUrl}/traffic`);
  }

  async saveTrafficConfig(traffic: NginxTrafficConfigDto): Promise<void> {
    const body: SaveNginxTrafficConfigRequestDto = traffic;
    await this.putAction(`${this.baseUrl}/traffic`, body);
  }

  async getPerformanceConfig(): Promise<NginxPerformanceConfigResponseDto> {
    return await this.getData<NginxPerformanceConfigResponseDto>(`${this.baseUrl}/performance`);
  }

  async savePerformanceConfig(performance: NginxPerformanceConfigDto): Promise<void> {
    const body: SaveNginxPerformanceConfigRequestDto = performance;
    await this.putAction(`${this.baseUrl}/performance`, body);
  }

  async getModuleSettings(): Promise<NginxModuleSettingsResponseDto> {
    return await this.getData<NginxModuleSettingsResponseDto>(`${this.baseUrl}/module/settings`);
  }

  async saveModuleSettings(settings: Partial<NginxModuleSettingsDto>): Promise<NginxModuleSettingsResponseDto> {
    const body: SaveNginxModuleSettingsRequestDto = settings;
    return await this.putData<NginxModuleSettingsResponseDto>(`${this.baseUrl}/module/settings`, body);
  }

  // ========== 日志管理 ==========

  /**
   * 获取错误日志尾部
   */
  async getErrorLogs(tail: number = 100): Promise<NginxLogLinesResponseDto> {
    const params = new HttpParams().set('tail', tail.toString());
    return await this.getData<NginxLogLinesResponseDto>(`${this.baseUrl}/logs/error`, params);
  }

  /**
   * 获取访问日志尾部
   */
  async getAccessLogs(tail: number = 100): Promise<NginxLogLinesResponseDto> {
    const params = new HttpParams().set('tail', tail.toString());
    return await this.getData<NginxLogLinesResponseDto>(`${this.baseUrl}/logs/access`, params);
  }

  /**
   * 获取日志文件路径信息
   */
  async getLogsInfo(): Promise<NginxLogsInfoResponseDto> {
    return await this.getData<NginxLogsInfoResponseDto>(`${this.baseUrl}/logs/info`);
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
