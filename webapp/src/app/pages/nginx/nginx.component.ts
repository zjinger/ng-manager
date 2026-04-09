import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PageLayoutComponent } from '@app/shared';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import { NzCardModule } from 'ng-zorro-antd/card';
import { NginxConfigEditorComponent } from './components/nginx-config-editor/nginx-config-editor.component';
import { NginxServerListComponent } from './components/nginx-server-list/nginx-server-list.component';
import type { NginxInstance, NginxStatus } from './models/nginx.types';
import { NginxService } from './services/nginx.service';

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
  templateUrl: './nginx.component.html',
  styleUrls: ['./nginx.component.less'],
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
