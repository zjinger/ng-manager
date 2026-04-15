import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { NginxModuleStore } from '../../../services/nginx-module.store';
import type { NginxPerformanceConfig } from '../../../models/nginx.types';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

@Component({
  selector: 'app-nginx-secondary-perf-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule, NzSwitchModule],
  template: `
    <div class="panel-header-row">
      <span class="panel-tip">性能优化配置</span>
      <button nz-button nzType="primary" (click)="save()" [nzLoading]="saving()" [disabled]="!dirty()">
        <nz-icon nzType="save" nzTheme="outline"></nz-icon>
        保存
      </button>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-label">Gzip 压缩</div>
        <div class="setting-desc">是否启用 gzip</div>
      </div>
      <div class="setting-ctrl">
        <nz-switch
          nzSize="small"
          name="gzipEnabled"
          [ngModel]="config().gzipEnabled"
          (ngModelChange)="setBoolean('gzipEnabled', $event)"
        ></nz-switch>
      </div>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-label">Keepalive 超时</div>
        <div class="setting-desc">keepalive_timeout</div>
      </div>
      <div class="setting-ctrl">
        <input
          class="setting-input"
          [(ngModel)]="config().keepaliveTimeout"
          (ngModelChange)="markDirty()"
          placeholder="65s"
        />
      </div>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-label">Worker 进程</div>
        <div class="setting-desc">worker_processes</div>
      </div>
      <div class="setting-ctrl">
        <input
          class="setting-input"
          [(ngModel)]="config().workerProcesses"
          (ngModelChange)="markDirty()"
          placeholder="auto"
        />
      </div>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-label">sendfile</div>
        <div class="setting-desc">静态文件零拷贝</div>
      </div>
      <div class="setting-ctrl">
        <nz-switch
          nzSize="small"
          name="sendfile"
          [ngModel]="config().sendfile"
          (ngModelChange)="setBoolean('sendfile', $event)"
        ></nz-switch>
      </div>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-label">tcp_nopush</div>
        <div class="setting-desc">优化大文件传输</div>
      </div>
      <div class="setting-ctrl">
        <nz-switch
          nzSize="small"
          name="tcpNopush"
          [ngModel]="config().tcpNopush"
          (ngModelChange)="setBoolean('tcpNopush', $event)"
        ></nz-switch>
      </div>
    </div>

    <div class="setting-row no-border">
      <div class="full-width">
        <div class="setting-label">Gzip Types</div>
        <div class="setting-desc">空格分隔 MIME 列表</div>
        <textarea
          class="setting-textarea mono"
          [(ngModel)]="config().gzipTypes"
          (ngModelChange)="markDirty()"
          rows="3"
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
export class NginxSecondaryPerfTabComponent implements OnInit {
  private moduleStore = inject(NginxModuleStore);
  private message = inject(NzMessageService);

  saving = signal(false);
  dirty = signal(false);
  config = signal<NginxPerformanceConfig>({
    gzipEnabled: false,
    gzipTypes: '',
    keepaliveTimeout: '',
    workerProcesses: '',
    sendfile: false,
    tcpNopush: false,
  });

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      const res = await this.moduleStore.loadPerformanceConfig();
      if (res.success && res.performance) {
        this.config.set({
          ...this.moduleStore.performanceConfig(),
        });
        this.dirty.set(false);
      } else {
        this.message.error(res.error || '加载性能配置失败');
      }
    } catch (err: any) {
      this.message.error('加载性能配置失败: ' + err.message);
    }
  }

  setBoolean<K extends keyof Pick<NginxPerformanceConfig, 'gzipEnabled' | 'sendfile' | 'tcpNopush'>>(
    key: K,
    value: boolean,
  ) {
    this.config.update(prev => ({
      ...prev,
      [key]: value,
    }));
    this.markDirty();
  }

  markDirty() {
    this.dirty.set(true);
  }

  async save() {
    const payload: NginxPerformanceConfig = {
      ...this.config(),
      gzipTypes: this.config().gzipTypes.trim(),
      keepaliveTimeout: this.config().keepaliveTimeout.trim(),
      workerProcesses: this.config().workerProcesses.trim(),
    };

    this.saving.set(true);
    try {
      const res = await this.moduleStore.savePerformanceConfig(payload);
      if (res.success) {
        this.message.success('性能优化配置已保存');
        this.dirty.set(false);
        await this.load();
      } else {
        this.message.error(res.error || '保存性能配置失败');
      }
    } catch (err: any) {
      this.message.error('保存性能配置失败: ' + err.message);
    } finally {
      this.saving.set(false);
    }
  }
}
