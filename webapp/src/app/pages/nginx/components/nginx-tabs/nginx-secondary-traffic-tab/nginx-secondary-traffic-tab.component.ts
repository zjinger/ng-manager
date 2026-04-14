import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { NginxService } from '../../../services/nginx.service';
import type { NginxTrafficConfig } from '../../../models/nginx.types';

@Component({
  selector: 'app-nginx-secondary-traffic-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule],
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
        <label class="toggle">
          <input
            type="checkbox"
            [checked]="config().rateLimitEnabled"
            (change)="setRateLimitEnabled($any($event.target).checked)"
          />
          <div class="toggle-track"></div>
        </label>
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
        <label class="toggle">
          <input
            type="checkbox"
            [checked]="config().connLimitEnabled"
            (change)="setConnLimitEnabled($any($event.target).checked)"
          />
          <div class="toggle-track"></div>
        </label>
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

    .toggle {
      position: relative;
      display: inline-block;
      width: 32px;
      height: 18px;
      cursor: pointer;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-track {
      position: absolute;
      inset: 0;
      border-radius: 9px;
      background: #c9cdd4;
      transition: all 120ms ease;
    }

    .toggle-track::after {
      content: '';
      position: absolute;
      left: 2px;
      top: 2px;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      transition: all 120ms ease;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
    }

    .toggle input:checked + .toggle-track {
      background: var(--green);
    }

    .toggle input:checked + .toggle-track::after {
      transform: translateX(14px);
    }

    .full-width {
      width: 100%;
    }

    @media (max-width: 768px) {
      .panel-header-row,
      .setting-row {
        flex-direction: column;
        align-items: flex-start;
      }

      .setting-ctrl {
        width: 100%;
      }
    }
  `],
})
export class NginxSecondaryTrafficTabComponent implements OnInit {
  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);

  saving = signal(false);
  dirty = signal(false);
  config = signal<NginxTrafficConfig>({
    rateLimitEnabled: true,
    rateLimit: '20r/s',
    connLimitEnabled: true,
    connLimit: 50,
    blacklistIps: [],
  });
  blacklistText = signal('');

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      const res = await this.nginxService.getTrafficConfig();
      if (res.success && res.traffic) {
        this.config.set({
          ...res.traffic,
          connLimit: Number(res.traffic.connLimit || 50),
        });
        this.blacklistText.set((res.traffic.blacklistIps || []).join('\n'));
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
      connLimit: Math.max(1, Number(this.config().connLimit || 1)),
      blacklistIps: this.blacklistText()
        .split(/[\n,]/)
        .map(item => item.trim())
        .filter(Boolean),
    };

    this.saving.set(true);
    try {
      const res = await this.nginxService.saveTrafficConfig(payload);
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


