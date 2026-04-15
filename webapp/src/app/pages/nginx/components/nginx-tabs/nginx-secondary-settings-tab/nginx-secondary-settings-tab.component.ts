import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';

import type { NginxInstance } from '../../../models/nginx.types';
import { NginxModuleStore } from '../../../services/nginx-module.store';

@Component({
  selector: 'app-nginx-secondary-settings-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule],
  template: `
    <div class="setting-row">
      <div>
        <div class="setting-label">Nginx 路径</div>
        <div class="setting-desc">可执行文件位置</div>
      </div>
      <div class="setting-ctrl">
        <span class="mono strong">{{ instance?.path || '-' }}</span>
      </div>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">配置文件</div>
        <div class="setting-desc">主配置路径</div>
      </div>
      <div class="setting-ctrl">
        <span class="mono strong">{{ instance?.configPath || '-' }}</span>
      </div>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">配置文件数</div>
        <div class="setting-desc">根据 include 指令解析</div>
      </div>
      <div class="setting-ctrl">
        <span class="mono strong">{{ configFileCount }}</span>
      </div>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">状态备份保留数</div>
        <div class="setting-desc">.ngm-nginx-module.json.backup-* 最多保留数量</div>
      </div>
      <div class="setting-ctrl">
        <input
          nz-input
          type="number"
          min="1"
          class="retention-input mono"
          [ngModel]="backupRetention()"
          (ngModelChange)="setBackupRetention($event)"
        />
        <button
          nz-button
          nzType="default"
          (click)="saveBackupRetention()"
          [disabled]="!retentionDirty() || saving()"
        >
          保存
        </button>
      </div>
    </div>
    <div class="setting-row">
      <div>
        <div class="setting-label">配置备份保留数</div>
        <div class="setting-desc">*.conf.backup-* 最多保留数量</div>
      </div>
      <div class="setting-ctrl">
        <input
          nz-input
          type="number"
          min="1"
          class="retention-input mono"
          [ngModel]="configBackupRetention()"
          (ngModelChange)="setConfigBackupRetention($event)"
        />
        <button
          nz-button
          nzType="default"
          (click)="saveBackupRetention()"
          [disabled]="!retentionDirty() || saving()"
        >
          保存
        </button>
      </div>
    </div>
    <div class="danger-box">
      <div class="setting-label danger">危险操作</div>
      <div class="setting-row danger-row">
        <div>
          <div class="setting-label">解绑实例</div>
          <div class="setting-desc">不影响 Nginx 服务本身</div>
        </div>
        <button nz-button nzDanger nzType="default" (click)="unbind.emit()">
          解绑
        </button>
      </div>
    </div>
  `,
  styles: [`
    .setting-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-light);

      &:last-child {
        border-bottom: none;
      }

      &.danger-row {
        padding: 6px 0 0;
        border-bottom: none;
      }
    }

    .setting-label {
      font-size: var(--nginx-font-size-sm, 12px);
      font-weight: 600;
      color: var(--text-1);

      &.danger {
        color: var(--red);
        margin-bottom: 4px;
      }
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

    .retention-input {
      width: 92px;
    }

    .mono {
      font-family: var(--nginx-font-family-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace);

      &.strong {
        color: var(--text-1);
        font-weight: 600;
      }
    }

    .danger-box {
      margin-top: 8px;
      padding: 10px 12px;
      border: 1px solid rgba(245, 63, 63, 0.2);
      background: var(--red-bg);
      border-radius: 6px;
    }

    @media (max-width: 768px) {
      .setting-row {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `],
})
export class NginxSecondarySettingsTabComponent implements OnInit {
  private moduleStore = inject(NginxModuleStore);
  private message = inject(NzMessageService);

  @Input() instance: NginxInstance | null = null;
  @Input() configFileCount = 0;
  @Output() unbind = new EventEmitter<void>();

  backupRetention = signal(5);
  configBackupRetention = signal(20);
  retentionDirty = signal(false);
  saving = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      const res = await this.moduleStore.loadModuleSettings();
      if (res.success && res.settings) {
        this.backupRetention.set(Math.max(1, Number(res.settings.backupRetention ?? 5)));
        this.configBackupRetention.set(Math.max(1, Number(res.settings.configBackupRetention ?? 20)));
      }
    } catch {
      // 忽略，使用默认值
    }
  }

  setBackupRetention(value: number | string): void {
    const parsed = Number(value);
    const normalized = Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1;
    this.backupRetention.set(normalized);
    this.retentionDirty.set(true);
  }

  setConfigBackupRetention(value: number | string): void {
    const parsed = Number(value);
    const normalized = Number.isFinite(parsed) ? Math.max(1, Math.trunc(parsed)) : 1;
    this.configBackupRetention.set(normalized);
    this.retentionDirty.set(true);
  }

  async saveBackupRetention(): Promise<void> {
    this.saving.set(true);
    try {
      const res = await this.moduleStore.saveModuleSettings({
        backupRetention: this.backupRetention(),
        configBackupRetention: this.configBackupRetention(),
      });
      if (res.success && res.settings) {
        this.backupRetention.set(Math.max(1, Number(res.settings.backupRetention ?? 5)));
        this.configBackupRetention.set(Math.max(1, Number(res.settings.configBackupRetention ?? 20)));
        this.retentionDirty.set(false);
        this.message.success('备份保留数量已保存');
      } else {
        this.message.error(res.error || '保存备份保留数量失败');
      }
    } catch (err: any) {
      this.message.error('保存备份保留数量失败: ' + err.message);
    } finally {
      this.saving.set(false);
    }
  }
}
