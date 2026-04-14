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
} from '../models/nginx.types';

/**
 * Nginx 管理 API 服务
 */
@Injectable({
  providedIn: 'root',
})
export class NginxService {
  private http = inject(ApiClient);
  private readonly baseUrl = '/api/nginx';

  // ========== 实例管理 ==========

  /**
   * 获取 Nginx 状态和实例信息
   */
  async getStatus(): Promise<NginxStatusResponse> {
    return await firstValueFrom(this.http.get<NginxStatusResponse>(`${this.baseUrl}/status`));
  }

  /**
   * 获取首页统计信息（状态 + server 汇总）
   */
  async getStats(): Promise<NginxStatsResponse> {
    return await firstValueFrom(this.http.get<NginxStatsResponse>(`${this.baseUrl}/stats`));
  }

  /**
   * 绑定 Nginx 实例
   */
  async bind(path: string): Promise<NginxBindResponse> {
    return await firstValueFrom(this.http.post<NginxBindResponse>(`${this.baseUrl}/bind`, { path }));
  }

  /**
   * 解绑 Nginx 实例
   */
  async unbind(): Promise<{ success: boolean }> {
    return await firstValueFrom(this.http.post<{ success: boolean }>(`${this.baseUrl}/unbind`, {}));
  }

  // ========== 服务控制 ==========

  /**
   * 启动 Nginx
   */
  async start(): Promise<NginxCommandResult> {
    return await firstValueFrom(this.http.post<NginxCommandResult>(`${this.baseUrl}/start`, {}));
  }

  /**
   * 停止 Nginx
   */
  async stop(): Promise<NginxCommandResult> {
    return await firstValueFrom(this.http.post<NginxCommandResult>(`${this.baseUrl}/stop`, {}));
  }

  /**
   * 重载配置
   */
  async reload(): Promise<NginxCommandResult> {
    return await firstValueFrom(this.http.post<NginxCommandResult>(`${this.baseUrl}/reload`, {}));
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
  async getConfig(): Promise<{ success: boolean; config?: NginxConfig; error?: string }> {
    return await firstValueFrom(
      this.http.get<{ success: boolean; config?: NginxConfig; error?: string }>(
        `${this.baseUrl}/config`
      )
    );
  }

  /**
   * 更新主配置
   */
  async updateConfig(content: string): Promise<{ success: boolean; error?: string }> {
    return await firstValueFrom(
      this.http.put<{ success: boolean; error?: string }>(`${this.baseUrl}/config`, { content })
    );
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
  async getConfigFiles(): Promise<{ success: boolean; files?: string[]; error?: string }> {
    return await firstValueFrom(
      this.http.get<{ success: boolean; files?: string[]; error?: string }>(
        `${this.baseUrl}/config/files`
      )
    );
  }

  /**
   * 读取指定配置文件
   */
  async getConfigFile(filePath: string): Promise<{ success: boolean; config?: NginxConfig; error?: string }> {
    const params = new HttpParams().set('filePath', filePath);
    return await firstValueFrom(
      this.http.get<{ success: boolean; config?: NginxConfig; error?: string }>(
        `${this.baseUrl}/config/file`,
        params
      )
    );
  }

  /**
   * 保存指定配置文件
   */
  async updateConfigFile(filePath: string, content: string): Promise<{ success: boolean; error?: string }> {
    return await firstValueFrom(
      this.http.put<{ success: boolean; error?: string }>(`${this.baseUrl}/config/file`, {
        filePath,
        content,
      })
    );
  }

  // ========== Server 管理 ==========

  /**
   * 获取所有 server
   */
  async getServers(): Promise<{ success: boolean; servers?: NginxServer[]; error?: string }> {
    return await firstValueFrom(
      this.http.get<{ success: boolean; servers?: NginxServer[]; error?: string }>(
        `${this.baseUrl}/servers`
      )
    );
  }

  /**
   * 获取单个 server
   */
  async getServer(id: string): Promise<{ success: boolean; server?: NginxServer; error?: string }> {
    return await firstValueFrom(
      this.http.get<{ success: boolean; server?: NginxServer; error?: string }>(
        `${this.baseUrl}/servers/${id}`
      )
    );
  }

  /**
   * 创建 server
   */
  async createServer(
    request: CreateNginxServerRequest
  ): Promise<{ success: boolean; server?: NginxServer; error?: string }> {
    return await firstValueFrom(
      this.http.post<{ success: boolean; server?: NginxServer; error?: string }>(
        `${this.baseUrl}/servers`,
        request
      )
    );
  }

  /**
   * 更新 server
   */
  async updateServer(
    id: string,
    request: UpdateNginxServerRequest
  ): Promise<{ success: boolean; server?: NginxServer; error?: string }> {
    return await firstValueFrom(
      this.http.put<{ success: boolean; server?: NginxServer; error?: string }>(
        `${this.baseUrl}/servers/${id}`,
        request
      )
    );
  }

  /**
   * 删除 server
   */
  async deleteServer(id: string): Promise<{ success: boolean; error?: string }> {
    return await firstValueFrom(
      this.http.delete<{ success: boolean; error?: string }>(`${this.baseUrl}/servers/${id}`)
    );
  }

  /**
   * 启用 server
   */
  async enableServer(id: string): Promise<{ success: boolean; error?: string }> {
    return await firstValueFrom(
      this.http.patch<{ success: boolean; error?: string }>(`${this.baseUrl}/servers/${id}/enable`, {})
    );
  }

  /**
   * 禁用 server
   */
  async disableServer(id: string): Promise<{ success: boolean; error?: string }> {
    return await firstValueFrom(
      this.http.patch<{ success: boolean; error?: string }>(`${this.baseUrl}/servers/${id}/disable`, {})
    );
  }

  // ========== Phase2：Upstream / SSL / 流量 / 性能 ==========

  async getUpstreams(): Promise<{ success: boolean; upstreams?: NginxUpstream[]; error?: string }> {
    return await firstValueFrom(
      this.http.get<{ success: boolean; upstreams?: NginxUpstream[]; error?: string }>(
        `${this.baseUrl}/upstreams`
      )
    );
  }

  async saveUpstreams(upstreams: NginxUpstream[]): Promise<{ success: boolean; error?: string }> {
    return await firstValueFrom(
      this.http.put<{ success: boolean; error?: string }>(`${this.baseUrl}/upstreams`, { upstreams })
    );
  }

  async getSslCertificates(): Promise<{ success: boolean; certificates?: NginxSslCertificate[]; error?: string }> {
    return await firstValueFrom(
      this.http.get<{ success: boolean; certificates?: NginxSslCertificate[]; error?: string }>(
        `${this.baseUrl}/ssl/certificates`
      )
    );
  }

  async saveSslCertificates(
    certificates: NginxSslCertificate[]
  ): Promise<{ success: boolean; error?: string }> {
    return await firstValueFrom(
      this.http.put<{ success: boolean; error?: string }>(`${this.baseUrl}/ssl/certificates`, {
        certificates,
      })
    );
  }

  async getTrafficConfig(): Promise<{ success: boolean; traffic?: NginxTrafficConfig; error?: string }> {
    return await firstValueFrom(
      this.http.get<{ success: boolean; traffic?: NginxTrafficConfig; error?: string }>(
        `${this.baseUrl}/traffic`
      )
    );
  }

  async saveTrafficConfig(traffic: NginxTrafficConfig): Promise<{ success: boolean; error?: string }> {
    return await firstValueFrom(
      this.http.put<{ success: boolean; error?: string }>(`${this.baseUrl}/traffic`, traffic)
    );
  }

  async getPerformanceConfig(): Promise<{ success: boolean; performance?: NginxPerformanceConfig; error?: string }> {
    return await firstValueFrom(
      this.http.get<{ success: boolean; performance?: NginxPerformanceConfig; error?: string }>(
        `${this.baseUrl}/performance`
      )
    );
  }

  async savePerformanceConfig(
    performance: NginxPerformanceConfig
  ): Promise<{ success: boolean; error?: string }> {
    return await firstValueFrom(
      this.http.put<{ success: boolean; error?: string }>(`${this.baseUrl}/performance`, performance)
    );
  }
}
