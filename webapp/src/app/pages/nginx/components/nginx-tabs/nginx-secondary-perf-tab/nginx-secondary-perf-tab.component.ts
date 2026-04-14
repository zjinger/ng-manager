import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { NginxService } from '../../../services/nginx.service';
import type { NginxPerformanceConfig } from '../../../models/nginx.types';

@Component({
  selector: 'app-nginx-secondary-perf-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzIconModule],
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
        <label class="toggle">
          <input
            type="checkbox"
            [checked]="config().gzipEnabled"
            (change)="setBoolean('gzipEnabled', $any($event.target).checked)"
          />
          <div class="toggle-track"></div>
        </label>
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
        <label class="toggle">
          <input
            type="checkbox"
            [checked]="config().sendfile"
            (change)="setBoolean('sendfile', $any($event.target).checked)"
          />
          <div class="toggle-track"></div>
        </label>
      </div>
    </div>

    <div class="setting-row">
      <div>
        <div class="setting-label">tcp_nopush</div>
        <div class="setting-desc">优化大文件传输</div>
      </div>
      <div class="setting-ctrl">
        <label class="toggle">
          <input
            type="checkbox"
            [checked]="config().tcpNopush"
            (change)="setBoolean('tcpNopush', $any($event.target).checked)"
          />
          <div class="toggle-track"></div>
        </label>
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
    }
  `],
})
export class NginxSecondaryPerfTabComponent implements OnInit {
  private nginxService = inject(NginxService);
  private message = inject(NzMessageService);

  saving = signal(false);
  dirty = signal(false);
  config = signal<NginxPerformanceConfig>({
    gzipEnabled: true,
    gzipTypes: 'text/plain text/css application/json application/javascript',
    keepaliveTimeout: '65s',
    workerProcesses: 'auto',
    sendfile: true,
    tcpNopush: true,
  });

  async ngOnInit() {
    await this.load();
  }

  async load() {
    try {
      const res = await this.nginxService.getPerformanceConfig();
      if (res.success && res.performance) {
        this.config.set({
          ...res.performance,
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
      const res = await this.nginxService.savePerformanceConfig(payload);
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


