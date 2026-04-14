import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import type { NginxInstance } from '../../../models/nginx.types';

@Component({
  selector: 'app-nginx-secondary-settings-tab',
  standalone: true,
  imports: [CommonModule, NzButtonModule],
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
export class NginxSecondarySettingsTabComponent {
  @Input() instance: NginxInstance | null = null;
  @Input() configFileCount = 0;
  @Output() unbind = new EventEmitter<void>();
}


