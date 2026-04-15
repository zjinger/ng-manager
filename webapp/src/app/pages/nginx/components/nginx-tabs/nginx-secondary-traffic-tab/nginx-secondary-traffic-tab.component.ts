import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { NginxModuleStore } from '../../../services/nginx-module.store';
import type { NginxTrafficConfig } from '../../../models/nginx.types';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

@Component({
  selector: 'app-nginx-secondary-traffic-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzSwitchModule],
  template: `
    <div class="panel-header-row">
      <span class="panel-tip">流量控制策略</span>
      <button nz-button nzType="primary" (click)="save()" [nzLoading]="saving()" [disabled]="!dirty()">
        <nz-icon nzType="save" nzTheme="outline"></nz-icon>
        保存
      </button>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-label">请求限流</div>
        <div class="setting-desc">每个 IP 每秒最大请求数</div>
      </div>
      <div class="setting-ctrl">
        <input
          class="setting-input"
          [(ngModel)]="config().rateLimit"
          (ngModelChange)="markDirty()"
          placeholder="20r/s"
        />
        <nz-switch
          name="rateLimitEnabled"
          nzSize="small"
          [ngModel]="config().rateLimitEnabled"
          (ngModelChange)="setRateLimitEnabled($event)"
        ></nz-switch>
      </div>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-label">连接限制</div>
        <div class="setting-desc">单 IP 最大并发连接数</div>
      </div>
      <div class="setting-ctrl">
        <input
          class="setting-input"
          type="number"
          min="1"
          [(ngModel)]="config().connLimit"
          (ngModelChange)="markDirty()"
        />
        <nz-switch
          name="connLimitEnabled"
          nzSize="small"
          [ngModel]="config().connLimitEnabled"
          (ngModelChange)="setConnLimitEnabled($event)"
        ></nz-switch>
      </div>
    </div>

    <div class="setting-row no-border">
      <div class="full-width">
        <div class="setting-label">黑名单 IP</div>
        <div class="setting-desc">逗号或换行分隔</div>
        <textarea
          class="setting-textarea mono"
          [ngModel]="blacklistText()"
          (ngModelChange)="setBlacklistText($event)"
          rows="4"
          placeholder="192.168.1.10&#10;10.10.10.5"
        ></textarea>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .panel-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .panel-tip {
      font-size: var(--nginx-font-size-sm, 12px);
      color: var(--text-3);
    }

    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-light);

      &.no-border {
        border-bottom: none;
      }
    }

    .setting-label {
      font-size: var(--nginx-font-size-sm, 12px);
      font-weight: 600;
      color: var(--text-1);
    }

    .setting-desc {
      font-size: var(--nginx-font-size-sm, 12px);
      color: var(--text-3);
      margin-top: 2px;
    }

    .setting-ctrl {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .setting-input {
      width: 110px;
      padding: 5px 8px;
      border-radius: 4px;
      border: 1px solid var(--border);
      background: var(--bg-input);
      color: var(--text-2);
      font-size: var(--nginx-font-size-sm, 12px);
      text-align: center;
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
      outline: none;
    }

    .setting-input:focus,
    .setting-textarea:focus {
      border-color: var(--blue);
      box-shadow: 0 0 0 2px var(--blue-border);
    }

    .setting-textarea {
      width: 100%;
      margin-top: 8px;
      border: 1px solid var(--border);
      border-radius: 6px;
      background: var(--bg-input);
      color: var(--text-2);
      font-size: var(--nginx-font-size-sm, 12px);
      padding: 8px 10px;
      resize: vertical;
      outline: none;
    }

    .mono {
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);
    }
  `],
})
export class NginxSecondaryTrafficTabComponent implements OnInit {
  private moduleStore = inject(NginxModuleStore);
  private message = inject(NzMessageService);

  saving = signal(false);
  dirty = signal(false);
  config = signal<NginxTrafficConfig>({
    rateLimitEnabled: false,
    rateLimit: '',
    connLimitEnabled: false,
    connLimit: 0,
    blacklistIps: [],
  });
  blacklistText = signal('');

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      const res = await this.moduleStore.loadTrafficConfig();
      if (res.success && res.traffic) {
        const traffic = this.moduleStore.trafficConfig();
        this.config.set({
          ...traffic,
          connLimit: Math.max(0, Number(traffic.connLimit ?? 0)),
        });
        this.blacklistText.set((traffic.blacklistIps || []).join('\n'));
        this.dirty.set(false);
      } else {
        this.message.error(res.error || '加载流量配置失败');
      }
    } catch (err: any) {
      this.message.error('加载流量配置失败: ' + err.message);
    }
  }

  setRateLimitEnabled(checked: boolean) {
    this.config.update(prev => ({ ...prev, rateLimitEnabled: checked }));
    this.markDirty();
  }

  setConnLimitEnabled(checked: boolean) {
    this.config.update(prev => ({ ...prev, connLimitEnabled: checked }));
    this.markDirty();
  }

  setBlacklistText(value: string) {
    this.blacklistText.set(value || '');
    this.markDirty();
  }

  markDirty() {
    this.dirty.set(true);
  }

  async save() {
    const payload: NginxTrafficConfig = {
      ...this.config(),
      rateLimit: this.config().rateLimit.trim(),
      connLimit: this.config().connLimitEnabled
        ? Math.max(1, Number(this.config().connLimit || 1))
        : Math.max(0, Number(this.config().connLimit || 0)),
      blacklistIps: this.blacklistText()
        .split(/[\n,]/)
        .map(item => item.trim())
        .filter(Boolean),
    };

    this.saving.set(true);
    try {
      const res = await this.moduleStore.saveTrafficConfig(payload);
      if (res.success) {
        this.message.success('流量控制配置已保存');
        this.dirty.set(false);
        await this.load();
      } else {
        this.message.error(res.error || '保存流量控制配置失败');
      }
    } catch (err: any) {
      this.message.error('保存流量控制配置失败: ' + err.message);
    } finally {
      this.saving.set(false);
    }
  }
}
