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
          <button
            type="button"
            class="version-row"
            [class.is-active]="selectedId() === item.id"
            (click)="viewDetail.emit(item)"
          >
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
              <a
                nz-button
                nzType="text"
                nz-tooltip="查看详情"
                class="version-action"
                type="button"
                (click)="viewDetail.emit(item)"
              >
                <nz-icon nzType="eye" nzTheme="outline" />
              </a>
              <a
                nz-button
                nzType="text"
                nz-tooltip="编辑"
                class="version-action"
                type="button"
                (click)="edit.emit(item)"
              >
                <nz-icon nzType="edit" nzTheme="outline" />
              </a>
              @if (item.status !== 'archived') {
                <a
                  nz-button
                  nzType="text"
                  nz-tooltip="归档"
                  class="version-action"
                  nzPopconfirm="确定要归档此版本吗？"
                  nzPopconfirmOkText="确认"
                  nzPopconfirmCancelText="取消"
                  (nzOnConfirm)="archive.emit(item)"
                >
                  <nz-icon nzType="inbox" nzTheme="outline" />
                </a>
              } @else {
                <a
                  nz-button
                  nzType="text"
                  nz-tooltip="删除"
                  class="version-action version-action--danger"
                  nzPopconfirm="确定要永久删除此版本吗？此操作不可撤销。"
                  nzPopconfirmOkText="删除"
                  nzPopconfirmCancelText="取消"
                  (nzOnConfirm)="delete.emit(item)"
                >
                  <nz-icon nzType="delete" nzTheme="outline" />
                </a>
              }
            </div>
          </button>
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
      .version-table__head,
      .version-row {
        display: grid;
        grid-template-columns: 100px 90px 110px 1fr 90px 90px 110px 80px 120px;
        gap: 12px;
        align-items: center;
      }

      .version-table__head {
        padding: 10px 16px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }

      .version-table__head > div {
        min-width: 0;
      }

      .version-table__body {
        min-height: 200px;
      }

      .version-row {
        width: 100%;
        padding: 0 16px;
        border: 0;
        border-bottom: 1px solid var(--border-color-soft);
        background: transparent;
        color: inherit;
        text-align: left;
        cursor: pointer;
        transition: var(--transition-base);
      }

      .version-row:hover {
        background: var(--bg-subtle);
      }

      .version-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04)),
          var(--bg-subtle);
        box-shadow: inset 3px 0 0 var(--primary-600);
      }

      .version-row:last-child {
        border-bottom: 0;
      }

      .version-cell {
        min-width: 0;
        padding: 14px 0;
        display: flex;
        align-items: center;
        font-size: 13px;
        color: var(--text-primary);
        overflow: hidden;
      }

      .version-cell--version {
        font-weight: 600;
        color: var(--text-heading);
      }

      .version-cell--mono {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--text-secondary);
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      .version-cell--date {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--text-muted);
      }

      .version-cell--actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 2px;
      }

      .version-action {
        border: 0;
        background: transparent;
        color: var(--primary-600);
        cursor: pointer;
      }

      .version-action--danger {
        color: var(--danger);
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

      @media (max-width: 1180px) {
        .version-table__head {
          display: none;
        }

        .version-row {
          grid-template-columns: 1fr;
          gap: 8px;
          padding: 14px 16px;
        }

        .version-cell {
          padding: 0;
        }
      }

      :host-context(html[data-theme='dark']) .version-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.06)),
          var(--bg-subtle);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionTableComponent {
  readonly versions = input<MobileAppVersion[]>([]);
  readonly selectedId = input<string | null>(null);

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
