import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { PageLayoutComponent } from '@app/shared';

import { NginxService } from './services/nginx.service';
import type { NginxInstance, NginxStatus, NginxServer, NginxConfig } from './models/nginx.types';
import { NginxConfigEditorComponent } from './components/nginx-config-editor/nginx-config-editor.component';
import { NginxServerListComponent } from './components/nginx-server-list/nginx-server-list.component';
import { NzCardModule } from 'ng-zorro-antd/card';

/**
 * Nginx 管理主页面
 */
@Component({
  selector: 'app-nginx',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSpinModule,
    NzTagModule,
    NzTooltipModule,
    NzTabsModule,
    NzCardModule,
    NzEmptyModule,
    NzDescriptionsModule,
    NzBadgeModule,
    PageLayoutComponent,
    NginxConfigEditorComponent,
    NginxServerListComponent,
  ],
  template: `
    <app-page-layout [title]="'Nginx 管理'" [loading]="loading()">
      <ng-container ngProjectAs="actions">
        @if (instance()) {
          <button nz-button (click)="refreshStatus()">
            <nz-icon nzType="reload" nzTheme="outline"></nz-icon>
            刷新
          </button>
          <button nz-button nzDanger (click)="unbind()">
            <nz-icon nzType="disconnect" nzTheme="outline"></nz-icon>
            解绑
          </button>
        } @else {
          <button nz-button nzType="primary" (click)="showBindModal()">
            <nz-icon nzType="link" nzTheme="outline"></nz-icon>
            绑定 Nginx
          </button>
        }
      </ng-container>

      <!-- 未绑定状态 -->
      @if (!instance()) {
        <nz-empty
          nzNotFoundImage="simple"
          [nzNotFoundContent]="'请先绑定本地 Nginx 实例'"
          [nzNotFoundFooter]="bindFooter"
        >
          <ng-template #bindFooter>
            <button nz-button nzType="primary" (click)="showBindModal()">
              绑定 Nginx
            </button>
          </ng-template>
        </nz-empty>
      } @else {
        <!-- 状态和控制面板 -->
        <div class="status-row">
          <!-- 状态卡片 -->
          <nz-card class="status-card">
            <div class="status-header">
              <h3>运行状态</h3>
              <nz-badge
                [nzStatus]="status()?.isRunning ? 'success' : 'error'"
                [nzText]="status()?.isRunning ? '运行中' : '已停止'"
              ></nz-badge>
            </div>
            <nz-descriptions [nzColumn]="1" nzSize="small">
              <nz-descriptions-item nzTitle="版本">
                {{ instance()?.version || '-' }}
              </nz-descriptions-item>
              <nz-descriptions-item nzTitle="进程 ID">
                {{ status()?.pid || '-' }}
              </nz-descriptions-item>
              <nz-descriptions-item nzTitle="运行时间">
                {{ status()?.uptime || '-' }}
              </nz-descriptions-item>
            </nz-descriptions>
          </nz-card>

          <!-- 控制卡片 -->
          <nz-card class="control-card">
            <h3>服务控制</h3>
            <div class="control-buttons">
              <button
                nz-button
                nzType="primary"
                [disabled]="status()?.isRunning"
                (click)="startNginx()"
              >
                <nz-icon nzType="caret-right" nzTheme="outline"></nz-icon>
                启动
              </button>
              <button
                nz-button
                nzDanger
                [disabled]="!status()?.isRunning"
                (click)="stopNginx()"
              >
                <nz-icon nzType="pause" nzTheme="outline"></nz-icon>
                停止
              </button>
              <button
                nz-button
                [disabled]="!status()?.isRunning"
                (click)="reloadNginx()"
              >
                <nz-icon nzType="reload" nzTheme="outline"></nz-icon>
                重载
              </button>
              <button nz-button (click)="testConfig()">
                <nz-icon nzType="check-circle" nzTheme="outline"></nz-icon>
                测试配置
              </button>
            </div>
            <div class="config-info">
              <div class="info-item">
                <span class="label">配置路径:</span>
                <span class="value" nz-tooltip [nzTooltipTitle]="instance()?.configPath">
                  {{ instance()?.configPath | slice:0:40 }}{{ (instance()?.configPath?.length || 0) > 40 ? '...' : '' }}
                </span>
              </div>
              <div class="info-item">
                <span class="label">前缀路径:</span>
                <span class="value" nz-tooltip [nzTooltipTitle]="instance()?.prefixPath">
                  {{ instance()?.prefixPath | slice:0:40 }}{{ (instance()?.prefixPath?.length || 0) > 40 ? '...' : '' }}
                </span>
              </div>
            </div>
          </nz-card>
        </div>

        <!-- Tab 切换 -->
        <nz-tabset class="nginx-tabs">
          <nz-tab nzTitle="配置编辑器">
            <app-nginx-config-editor></app-nginx-config-editor>
          </nz-tab>
          <nz-tab nzTitle="Server 管理">
            <app-nginx-server-list></app-nginx-server-list>
          </nz-tab>
        </nz-tabset>
      }

      <!-- 绑定模态框 -->
      <nz-modal
        [(nzVisible)]="bindModalVisible"
        nzTitle="绑定 Nginx 实例"
        (nzOnOk)="bindNginx()"
        (nzOnCancel)="bindModalVisible = false"
        [nzOkLoading]="binding()"
      >
        <ng-container *nzModalContent>
          <div class="bind-form">
            <p>请输入 Nginx 可执行文件的完整路径：</p>
            <input
              nz-input
              [(ngModel)]="bindPath"
              placeholder="例如: /usr/local/nginx/sbin/nginx"
            />
            <div class="path-hints">
              <p>常见路径：</p>
              <ul>
                <li>macOS (Homebrew): <code>/opt/homebrew/bin/nginx</code> 或 <code>/usr/local/bin/nginx</code></li>
                <li>Linux (apt/yum): <code>/usr/sbin/nginx</code></li>
                <li>Windows: <code>C:\nginx\nginx.exe</code></li>
              </ul>
            </div>
          </div>
        </ng-container>
      </nz-modal>
    </app-page-layout>
  `,
  styles: [`
    .status-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-bottom: 24px;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .status-card, .control-card {
      h3 {
        margin: 0 0 16px 0;
        font-size: 16px;
        font-weight: 500;
      }
    }

    .status-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        margin: 0;
      }
    }

    .control-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 16px;
    }

    .config-info {
      .info-item {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
        font-size: 13px;

        .label {
          color: rgba(0, 0, 0, 0.45);
          flex-shrink: 0;
        }

        .value {
          color: rgba(0, 0, 0, 0.85);
          font-family: monospace;
          word-break: break-all;
        }
      }
    }

    .nginx-tabs {
      margin-top: 24px;
    }

    .bind-form {
      p {
        margin-bottom: 12px;
      }

      input {
        width: 100%;
        margin-bottom: 16px;
      }

      .path-hints {
        background: #f6ffed;
        border: 1px solid #b7eb8f;
        border-radius: 4px;
        padding: 12px;

        p {
          margin: 0 0 8px 0;
          font-weight: 500;
        }

        ul {
          margin: 0;
          padding-left: 20px;

          li {
            margin-bottom: 4px;
            font-size: 13px;
          }
        }

        code {
          background: #e6f7ff;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
        }
      }
    }
  `],
})
export class NginxComponent implements OnInit {
  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);
  private modal = inject(NzModalService);

  // State
  instance = signal<NginxInstance | null>(null);
  status = signal<NginxStatus | null>(null);
  loading = signal(false);
  binding = signal(false);

  // UI State
  bindModalVisible = false;
  bindPath = '';

  ngOnInit() {
    this.loadStatus();
  }

  /**
   * 加载状态
   */
  async loadStatus() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.getStatus();
      this.instance.set(res.instance);
      this.status.set(res.status);
    } catch (err: any) {
      this.message.error('加载状态失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 刷新状态
   */
  refreshStatus() {
    this.loadStatus();
  }

  /**
   * 显示绑定模态框
   */
  showBindModal() {
    this.bindPath = '';
    this.bindModalVisible = true;
  }

  /**
   * 绑定 Nginx
   */
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
        this.loadStatus();
      } else {
        this.message.error(res.error || '绑定失败');
      }
    } catch (err: any) {
      this.message.error('绑定失败: ' + err.message);
    } finally {
      this.binding.set(false);
    }
  }

  /**
   * 解绑 Nginx
   */
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
          this.message.success('解绑成功');
        } catch (err: any) {
          this.message.error('解绑失败: ' + err.message);
        }
      },
    });
  }

  /**
   * 启动 Nginx
   */
  async startNginx() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.start();
      if (res.success) {
        this.message.success('启动成功');
        this.loadStatus();
      } else {
        this.message.error(res.error || '启动失败');
      }
    } catch (err: any) {
      this.message.error('启动失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 停止 Nginx
   */
  async stopNginx() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.stop();
      if (res.success) {
        this.message.success('停止成功');
        this.loadStatus();
      } else {
        this.message.error(res.error || '停止失败');
      }
    } catch (err: any) {
      this.message.error('停止失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 重载配置
   */
  async reloadNginx() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.reload();
      if (res.success) {
        this.message.success('重载成功');
        this.loadStatus();
      } else {
        this.message.error(res.error || '重载失败');
      }
    } catch (err: any) {
      this.message.error('重载失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * 测试配置
   */
  async testConfig() {
    this.loading.set(true);
    try {
      const res = await this.nginxService.test();
      if (res.valid) {
        this.message.success('配置验证通过');
        if (res.warnings?.length) {
          res.warnings.forEach((w: string) => this.message.warning(w));
        }
      } else {
        this.message.error('配置验证失败');
        res.errors?.forEach((e: string) => this.message.error(e));
      }
    } catch (err: any) {
      this.message.error('测试失败: ' + err.message);
    } finally {
      this.loading.set(false);
    }
  }
}
