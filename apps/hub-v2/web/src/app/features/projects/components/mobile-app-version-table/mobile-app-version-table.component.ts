import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { DataTableComponent } from '@shared/ui';
import type { MobileAppVersion } from '../../models/mobile-app-version.model';
import {
  MOBILE_APP_VERSION_STATUS_LABELS,
  MOBILE_APP_PLATFORM_LABELS,
} from '../../models/mobile-app-version.model';

@Component({
  selector: 'app-mobile-app-version-table',
  standalone: true,
  imports: [
    DatePipe,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
    NzToolTipModule,
    DataTableComponent,
  ],
  template: `
    <app-data-table>
      <div table-head class="version-table__head">
        <div>版本号</div>
        <div>平台</div>
        <div>构建号</div>
        <div>安装包</div>
        <div>大小</div>
        <div>状态</div>
        <div>发布时间</div>
        <div>下载量</div>
        <div>操作</div>
      </div>
      <div table-body class="version-table__body">
        @for (item of versions(); track item.id) {
          <div class="version-row" (click)="viewDetail.emit(item)">
            <div class="version-cell version-cell--version">{{ item.version }}</div>
            <div class="version-cell">
              <span class="platform-badge" [attr.data-platform]="item.platform">
                @if (item.platform === 'ios') {
                  <nz-icon nzType="apple" nzTheme="outline" />
                } @else {
                  <nz-icon nzType="android" nzTheme="outline" />
                }
                {{ platformLabel(item.platform) }}
              </span>
            </div>
            <div class="version-cell version-cell--mono">{{ item.buildNumber }}</div>
            <div class="version-cell version-cell--mono">{{ item.packageName }}</div>
            <div class="version-cell version-cell--mono">{{ formatSize(item.sizeBytes) }}</div>
            <div class="version-cell">
              <span class="status-badge" [attr.data-status]="item.status">
                {{ statusLabel(item.status) }}
              </span>
            </div>
            <div class="version-cell version-cell--date">
              {{ item.publishedAt ? (item.publishedAt | date: 'yyyy-MM-dd') : '—' }}
            </div>
            <div class="version-cell version-cell--mono">{{ item.downloadCount }}</div>
            <div class="version-cell version-cell--actions" (click)="$event.stopPropagation()">
              <button
                nz-button
                nzType="text"
                nz-tooltip="查看详情"
                (click)="viewDetail.emit(item)"
              >
                <nz-icon nzType="eye" nzTheme="outline" />
              </button>
              <button
                nz-button
                nzType="text"
                nz-tooltip="编辑"
                (click)="edit.emit(item)"
              >
                <nz-icon nzType="edit" nzTheme="outline" />
              </button>
              @if (item.status !== 'archived') {
                <button
                  nz-button
                  nzType="text"
                  nz-tooltip="归档"
                  nzPopconfirm="确定要归档此版本吗？"
                  nzPopconfirmOkText="确认"
                  nzPopconfirmCancelText="取消"
                  (nzOnConfirm)="archive.emit(item)"
                >
                  <nz-icon nzType="inbox" nzTheme="outline" />
                </button>
              } @else {
                <button
                  nz-button
                  nzType="text"
                  nz-tooltip="删除"
                  nzPopconfirm="确定要永久删除此版本吗？此操作不可撤销。"
                  nzPopconfirmOkText="删除"
                  nzPopconfirmCancelText="取消"
                  (nzOnConfirm)="delete.emit(item)"
                  class="action-danger"
                >
                  <nz-icon nzType="delete" nzTheme="outline" />
                </button>
              }
            </div>
          </div>
        } @empty {
          <div class="version-empty">
            <nz-icon nzType="inbox" nzTheme="outline" />
            <span>暂无版本数据</span>
          </div>
        }
      </div>
    </app-data-table>
  `,
  styles: [
    `
      .version-table__head {
        display: grid;
        grid-template-columns: 100px 90px 110px 1fr 90px 90px 110px 80px 120px;
        padding: 0 16px;
        background: var(--bg-elevated);
        border-bottom: 1px solid var(--border-color);
      }

      .version-table__head > div {
        padding: 12px 8px;
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }

      .version-table__body {
        min-height: 200px;
      }

      .version-row {
        display: grid;
        grid-template-columns: 100px 90px 110px 1fr 90px 90px 110px 80px 120px;
        padding: 0 16px;
        cursor: pointer;
        transition: background 0.15s;
        border-bottom: 1px solid var(--border-color);
      }

      .version-row:hover {
        background: var(--bg-elevated);
      }

      .version-row:last-child {
        border-bottom: none;
      }

      .version-cell {
        padding: 14px 8px;
        display: flex;
        align-items: center;
        font-size: 13px;
        color: var(--text);
      }

      .version-cell--version {
        font-weight: 600;
        color: var(--text-heading);
      }

      .version-cell--mono {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--text-secondary);
      }

      .version-cell--date {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--text-muted);
      }

      .version-cell--actions {
        display: flex;
        gap: 4px;
      }

      .version-cell--actions button {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .action-danger {
        color: var(--color-danger);
      }

      .action-danger:hover {
        color: var(--color-danger);
        background: var(--color-danger-bg);
      }

      .platform-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 12px;
        color: var(--text-secondary);
      }

      .platform-badge nz-icon {
        font-size: 14px;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
      }

      .status-badge::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
      }

      .status-badge[data-status='published'] {
        background: var(--color-success-bg);
        color: var(--color-success);
      }

      .status-badge[data-status='published']::before {
        background: var(--color-success);
      }

      .status-badge[data-status='testing'] {
        background: var(--color-info-bg);
        color: var(--color-info);
      }

      .status-badge[data-status='testing']::before {
        background: var(--color-info);
      }

      .status-badge[data-status='draft'] {
        background: var(--color-warning-bg);
        color: var(--color-warning);
      }

      .status-badge[data-status='draft']::before {
        background: var(--color-warning);
      }

      .status-badge[data-status='archived'] {
        background: var(--border-color);
        color: var(--text-muted);
      }

      .status-badge[data-status='archived']::before {
        background: var(--text-muted);
      }

      .version-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 48px;
        color: var(--text-muted);
      }

      .version-empty nz-icon {
        font-size: 32px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionTableComponent {
  readonly versions = input<MobileAppVersion[]>([]);

  readonly viewDetail = output<MobileAppVersion>();
  readonly edit = output<MobileAppVersion>();
  readonly archive = output<MobileAppVersion>();
  readonly delete = output<MobileAppVersion>();

  statusLabel(status: string): string {
    return MOBILE_APP_VERSION_STATUS_LABELS[status as keyof typeof MOBILE_APP_VERSION_STATUS_LABELS] ?? status;
  }

  platformLabel(platform: string): string {
    return MOBILE_APP_PLATFORM_LABELS[platform as keyof typeof MOBILE_APP_PLATFORM_LABELS] ?? platform;
  }

  formatSize(bytes: number): string {
    if (bytes === 0) return '—';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  }
}
