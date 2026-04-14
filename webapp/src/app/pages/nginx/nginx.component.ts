import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageLayoutComponent } from '@app/shared';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { NginxConfigEditorComponent } from './components/nginx-config-editor/nginx-config-editor.component';
import { LogEntry } from './components/nginx-log-viewer/nginx-log-viewer.component';
import { NginxSecondaryLogsTabComponent } from './components/nginx-tabs/nginx-secondary-logs-tab/nginx-secondary-logs-tab.component';
import { NginxSecondaryPerfTabComponent } from './components/nginx-tabs/nginx-secondary-perf-tab/nginx-secondary-perf-tab.component';
import { NginxSecondarySettingsTabComponent } from './components/nginx-tabs/nginx-secondary-settings-tab/nginx-secondary-settings-tab.component';
import { NginxSecondarySslTabComponent } from './components/nginx-tabs/nginx-secondary-ssl-tab/nginx-secondary-ssl-tab.component';
import { NginxSecondaryTestTabComponent } from './components/nginx-tabs/nginx-secondary-test-tab/nginx-secondary-test-tab.component';
import { NginxSecondaryTrafficTabComponent } from './components/nginx-tabs/nginx-secondary-traffic-tab/nginx-secondary-traffic-tab.component';
import { NginxSecondaryUpstreamTabComponent } from './components/nginx-tabs/nginx-secondary-upstream-tab/nginx-secondary-upstream-tab.component';
import { NginxSectionCardComponent } from './components/nginx-section-card/nginx-section-card.component';
import { NginxServerListComponent } from './components/nginx-server-list/nginx-server-list.component';
import { NginxStatCardComponent } from './components/nginx-stat-card/nginx-stat-card.component';
import type { NginxInstance, NginxStatus } from './models/nginx.types';
import { NginxService } from './services/nginx.service';

type SecondaryTab =
  | 'upstream'
  | 'ssl'
  | 'traffic'
  | 'perf'
  | 'logs'
  | 'test'
  | 'settings';

interface ServerSummary {
  total: number;
  enabled: number;
}

@Component({
  selector: 'app-nginx',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzLayoutModule,
    NzModalModule,
    NzSpinModule,
    NzTabsModule,
    NzEmptyModule,
    NzTooltipModule,
    PageLayoutComponent,
    NginxConfigEditorComponent,
    NginxSecondaryUpstreamTabComponent,
    NginxSecondarySslTabComponent,
    NginxSecondaryTrafficTabComponent,
    NginxSecondaryPerfTabComponent,
    NginxSecondaryLogsTabComponent,
    NginxSecondaryTestTabComponent,
    NginxSecondarySettingsTabComponent,
    NginxSectionCardComponent,
    NginxServerListComponent,
    NginxStatCardComponent,
  ],
  templateUrl: './nginx.component.html',
  styleUrls: ['./nginx.component.less'],
})
export class NginxComponent implements OnInit {
  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  // Core state
  instance = signal<NginxInstance | null>(null);
  status = signal<NginxStatus | null>(null);
  loading = signal(false);
  binding = signal(false);

  // UI state
  bindModalVisible = false;
  bindPath = '';
  secondaryTab = signal<SecondaryTab>('upstream');
  configExpanded = signal(false);
  openServerDrawerToken = signal(0);
  configEditorRefreshToken = signal(0);
  configLoading = signal(false);

  // Data state
  configFiles = signal<string[]>([]);
  serverSummary = signal<ServerSummary>({ total: 0, enabled: 0 });
  recentLogs = signal<LogEntry[]>([
    { time: '16:10:23', level: 'info', msg: 'nginx started' },
    { time: '16:10:24', level: 'info', msg: 'worker process started' },
    { time: '16:11:05', level: 'warn', msg: 'upstream server 192.168.1.10:8080 down' },
    { time: '16:12:30', level: 'error', msg: 'connect() failed to 192.168.1.10:8080' },
  ]);

  readonly secondaryTabs: Array<{ id: SecondaryTab; label: string }> = [
    { id: 'upstream', label: 'Upstream 管理' },
    { id: 'ssl', label: 'SSL 证书' },
    { id: 'traffic', label: '流量控制' },
    { id: 'perf', label: '性能优化' },
    { id: 'logs', label: '日志' },
    { id: 'test', label: '配置检测' },
    { id: 'settings', label: '设置' },
  ];

  async ngOnInit() {
    await this.loadStatus();
    await this.loadConfigFiles();
  }

  switchSecondaryTab(tab: SecondaryTab) {
    this.secondaryTab.set(tab);
  }

  onSecondaryTabIndexChange(index: number) {
    const target = this.secondaryTabs[index];
    if (target) {
      this.secondaryTab.set(target.id);
    }
  }

  secondaryTabIndex(): number {
    const index = this.secondaryTabs.findIndex(tab => tab.id === this.secondaryTab());
    return index >= 0 ? index : 0;
  }

  toggleConfigExpanded() {
    this.configExpanded.update(open => !open);
  }

  requestCreateServer() {
    this.openServerDrawerToken.update(token => token + 1);
  }

  importServer() {
    this.message.info('导入功能开发中');
  }

  onServerSummaryChange(summary: ServerSummary) {
    this.serverSummary.set(summary);
  }

  onServerListMutated() {
    void this.loadConfigFiles();
    if (this.configExpanded()) {
      this.configEditorRefreshToken.update(token => token + 1);
    }
  }

  get serviceStatusText(): string {
    return this.status()?.isRunning ? '运行中' : '已停止';
  }

  get uptimeText(): string {
    return this.status()?.uptime || '-';
  }

  get pidText(): string {
    return this.status()?.pid ? `PID ${this.status()?.pid}` : '未检测到 PID';
  }

  get activeConnectionText(): string {
    const activeConnections = this.status()?.activeConnections;
    if (Number.isFinite(activeConnections)) {
      return String(activeConnections);
    }
    return this.status()?.isRunning ? 'N/A' : '-';
  }

  get activeConnectionSubText(): string {
    const activeConnections = this.status()?.activeConnections;
    if (!this.status()?.isRunning) {
      return '服务未运行';
    }
    if (Number.isFinite(activeConnections)) {
      return 'ESTABLISHED TCP 连接数';
    }
    return '当前环境暂不可用';
  }

  get enabledServerText(): string {
    const summary = this.serverSummary();
    return `${summary.enabled} 启用 / ${Math.max(summary.total - summary.enabled, 0)} 禁用`;
  }

  async refreshAll() {
    await Promise.all([this.loadStatus(), this.loadConfigFiles()]);
    this.message.success('状态已刷新');
  }

  async loadStatus() {
    this.loading.set(true);
    try {
      const stats = await this.nginxService.getStats();
      if (stats.success && stats.status) {
        this.instance.set(stats.instance || null);
        this.status.set(stats.status);
        if (stats.serverSummary) {
          this.serverSummary.set({
            total: stats.serverSummary.total,
            enabled: stats.serverSummary.enabled,
          });
        }
        return;
      }

      const res = await this.nginxService.getStatus();
      this.instance.set(res.instance);
      this.status.set(res.status);
    } catch {
      // 静默失败，等待用户手动绑定
    } finally {
      this.loading.set(false);
    }
  }

  async loadConfigFiles() {
    this.configLoading.set(true);
    try {
      const res = await this.nginxService.getConfigFiles();
      this.configFiles.set(res.success ? res.files || [] : []);
    } catch {
      this.configFiles.set([]);
    } finally {
      this.configLoading.set(false);
    }
  }

  showBindModal() {
    this.bindPath = this.getBindPathCandidates()[0] || '';
    this.bindModalVisible = true;
  }

  showPathHint() {
    this.message.info('当前版本请手动输入路径，文件浏览选择能力后续接入');
  }

  autoDetectBindPath() {
    const candidates = this.getBindPathCandidates();
    if (!candidates.length) {
      this.message.warning('未识别到可用的默认路径，请手动输入');
      return;
    }

    this.bindPath = candidates[0];
    this.message.success(`已填充路径：${this.bindPath}`);
  }

  async bindNginx() {
    if (!this.bindPath.trim()) {
      this.message.warning('请输入 Nginx 路径');
      return;
    }

    this.binding.set(true);
    try {
      const res = await this.nginxService.bind(this.bindPath.trim());
      if (res.success && res.instance) {
        this.instance.set(res.instance);
        this.bindModalVisible = false;
        this.message.success('绑定成功');
        await this.refreshAll();
      } else {
        this.message.error(res.error || '绑定失败');
      }
    } catch (err: any) {
      this.message.error('绑定失败: ' + err.message);
    } finally {
      this.binding.set(false);
    }
  }

  unbind() {
    this.modal.confirm({
      nzTitle: '确认解绑',
      nzContent: '解绑后将无法管理 Nginx，是否继续？',
      nzOkText: '解绑',
      nzOkType: 'primary',
      nzOnOk: async () => {
        try {
          await this.nginxService.unbind();
          this.instance.set(null);
          this.status.set(null);
          this.serverSummary.set({ total: 0, enabled: 0 });
          this.configFiles.set([]);
          this.message.success('解绑成功');
        } catch (err: any) {
          this.message.error('解绑失败: ' + err.message);
        }
      },
    });
  }

  async startNginx() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.start();
      if (res.success) {
        this.appendLog('ok', 'nginx start executed');
        this.message.success('启动成功');
        await this.loadStatus();
      } else {
        this.message.error(res.error || '启动失败');
      }
    } catch (err: any) {
      this.message.error('启动失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  async stopNginx() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.stop();
      if (res.success) {
        this.appendLog('warn', 'nginx stop executed');
        this.message.success('停止成功');
        await this.loadStatus();
      } else {
        this.message.error(res.error || '停止失败');
      }
    } catch (err: any) {
      this.message.error('停止失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  async reloadNginx() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.reload();
      if (res.success) {
        this.appendLog('ok', 'nginx reload executed');
        this.message.success('重载成功');
        await this.loadStatus();
      } else {
        this.message.error(res.error || '重载失败');
      }
    } catch (err: any) {
      this.message.error('重载失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  async testConfig() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.test();
      if (res.valid) {
        this.appendLog('ok', 'configuration test passed');
        this.message.success('配置验证通过');
        if (res.warnings?.length) {
          res.warnings.forEach((w: string) => this.message.warning(w));
        }
      } else {
        this.appendLog('error', 'configuration test failed');
        this.message.error('配置验证失败');
        res.errors?.forEach((e: string) => this.message.error(e));
      }
    } catch (err: any) {
      this.message.error('测试失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  private appendLog(level: LogEntry['level'], msg: string) {
    const time = new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    this.recentLogs.update(logs => [{ time, level, msg }, ...logs].slice(0, 120));
  }

  private getBindPathCandidates(): string[] {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';

    if (ua.includes('windows')) {
      return ['C:\\nginx\\nginx.exe', 'D:\\nginx\\nginx.exe'];
    }

    if (ua.includes('mac')) {
      return ['/opt/homebrew/bin/nginx', '/usr/local/bin/nginx'];
    }

    return ['/usr/sbin/nginx', '/usr/local/nginx/sbin/nginx', '/usr/local/bin/nginx'];
  }
}
