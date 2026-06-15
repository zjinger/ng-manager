import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { API_BASE_URL } from '@core/http';
import type { MobileAppVersion } from '../../models/mobile-app-version.model';
import {
  MOBILE_APP_PLATFORM_LABELS,
  MOBILE_APP_VERSION_STATUS_LABELS,
} from '../../models/mobile-app-version.model';

@Component({
  selector: 'app-mobile-app-version-detail-drawer',
  standalone: true,
  imports: [DatePipe, NzButtonModule, NzDrawerModule, NzIconModule, NzPopconfirmModule],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzWidth]="720"
      [nzWrapClassName]="'mobile-app-version-detail-drawer'"
      [nzBodyStyle]="drawerBodyStyle"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="close.emit()"
    >
      <ng-template #drawerTitleTpl>
        <div class="detail-drawer__title">
          <div class="detail-drawer__title-main">
            <span class="detail-drawer__subtitle">{{ platformLabel(version()?.platform || '') }}</span>
            <strong>{{ titleText() }}</strong>
            @if (version(); as v) {
              <span class="status-badge" [attr.data-status]="v.status">
                {{ statusLabel(v.status) }}
              </span>
            }
          </div>
          <button type="button" class="detail-drawer__close" (click)="close.emit()">
            <span nz-icon nzType="close"></span>
          </button>
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        @if (version(); as v) {
          <div class="detail-panel">
            <div class="detail-actions">
              <a
                nz-button
                nzSize="small"
                class="detail-action-link"
                [href]="packageDownloadUrl(v)"
                target="_blank"
                rel="noopener noreferrer"
              >
                <nz-icon nzType="download" nzTheme="outline" />
                下载安装包
              </a>
              @if (v.status !== 'archived') {
                <button nz-button nzSize="small" (click)="edit.emit(v)">编辑</button>
              }
              @if (v.status !== 'published' && v.status !== 'archived') {
                <button
                  nz-button
                  nzType="primary"
                  nzSize="small"
                  nz-popconfirm
                  nzPopconfirmTitle="确认发布该版本到门户吗？发布后将成为对应平台的当前下载包。"
                  nzPopconfirmPlacement="topRight"
                  (nzOnConfirm)="publish.emit(v)"
                >
                  发布到门户
                </button>
              }
              @if (v.status !== 'archived') {
                <button
                  nz-button
                  nzDanger
                  nzSize="small"
                  nz-popconfirm
                  nzPopconfirmTitle="确认归档该版本吗？归档后将不再作为门户下载包。"
                  nzPopconfirmPlacement="topRight"
                  (nzOnConfirm)="archive.emit(v)"
                >
                  归档
                </button>
              } @else {
                <button
                  nz-button
                  nzDanger
                  nzSize="small"
                  nz-popconfirm
                  nzPopconfirmTitle="确认永久删除该已归档版本吗？此操作不可撤销。"
                  nzPopconfirmPlacement="topRight"
                  (nzOnConfirm)="remove.emit(v)"
                >
                  删除
                </button>
              }
            </div>

            <div class="detail-grid">
              <div class="detail-field">
                <span>版本号</span>
                <strong class="mono">{{ v.version }}</strong>
              </div>
              <div class="detail-field">
                <span>构建号</span>
                <strong class="mono">{{ v.buildNumber }}</strong>
              </div>
              <div class="detail-field">
                <span>平台</span>
                <strong>{{ platformLabel(v.platform) }}</strong>
              </div>
              <div class="detail-field">
                <span>状态</span>
                <strong>{{ statusLabel(v.status) }}</strong>
              </div>
              <div class="detail-field">
                <span>大小</span>
                <strong class="mono">{{ formatSize(v.sizeBytes) }}</strong>
              </div>
              <div class="detail-field">
                <span>下载量</span>
                <strong class="mono">{{ v.downloadCount }}</strong>
              </div>
              <div class="detail-field">
                <span>发布时间</span>
                <strong class="mono">{{ v.publishedAt ? (v.publishedAt | date: 'yyyy-MM-dd HH:mm') : '-' }}</strong>
              </div>
              <div class="detail-field">
                <span>最低系统版本</span>
                <strong>{{ v.minOsVersion || '-' }}</strong>
              </div>
              <div class="detail-field detail-field--full">
                <span>安装包</span>
                <strong class="mono text-break">{{ v.packageName }}</strong>
              </div>
              <div class="detail-field detail-field--full">
                <span>SHA256</span>
                <strong class="mono text-break">{{ v.sha256 || '-' }}</strong>
              </div>
            </div>

            <section class="detail-section">
              <h4>发布范围</h4>
              <p class="detail-plain">{{ v.releaseChannel || '-' }}</p>
            </section>

            <section class="detail-section">
              <h4>更新日志</h4>
              <ul class="changelog-list">
                @for (item of v.changelog; track item) {
                  <li>{{ item }}</li>
                } @empty {
                  <li class="empty">暂无更新日志</li>
                }
              </ul>
            </section>
          </div>
        }
      </ng-template>
    </nz-drawer>
  `,
  styles: [
    `
      .detail-drawer__title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .detail-drawer__title-main {
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .detail-drawer__title-main strong {
        color: var(--text-primary);
        font-size: 18px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .detail-drawer__subtitle {
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.4;
        background: var(--gray-100);
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
      }

      .detail-drawer__close {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: 999px;
      }

      .detail-drawer__close:hover {
        background: var(--bg-subtle);
        color: var(--text-primary);
      }

      .detail-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .detail-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
      }

      .detail-action-link {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .detail-field {
        min-width: 0;
        padding: 10px 12px;
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        background: var(--bg-subtle);
        display: grid;
        gap: 4px;
      }

      .detail-field--full {
        grid-column: 1 / -1;
      }

      .detail-field > span {
        font-size: 12px;
        color: var(--text-muted);
      }

      .detail-field > strong {
        min-width: 0;
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
      }

      .mono {
        font-family: var(--font-mono);
      }

      .text-break {
        word-break: break-all;
      }

      .detail-section {
        border: 1px solid var(--border-color-soft);
        border-radius: 12px;
        padding: 14px;
        background: var(--surface-primary);
      }

      .detail-section h4 {
        margin: 0 0 10px;
        color: var(--text-heading);
        font-size: 14px;
      }

      .detail-plain {
        margin: 0;
        color: var(--text-primary);
        white-space: pre-wrap;
        word-break: break-word;
        line-height: 1.7;
      }

      .changelog-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 8px;
      }

      .changelog-list li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      .changelog-list li::before {
        content: '';
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--text-muted);
        margin-top: 9px;
        flex-shrink: 0;
      }

      .changelog-list li.empty {
        color: var(--text-muted);
      }

      .changelog-list li.empty::before {
        display: none;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 600;
        white-space: nowrap;
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

      @media (max-width: 900px) {
        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionDetailDrawerComponent {
  private readonly apiBaseUrl = inject(API_BASE_URL);

  readonly open = input(false);
  readonly version = input<MobileAppVersion | null>(null);

  readonly close = output<void>();
  readonly edit = output<MobileAppVersion>();
  readonly archive = output<MobileAppVersion>();
  readonly publish = output<MobileAppVersion>();
  readonly remove = output<MobileAppVersion>();

  readonly drawerBodyStyle = { padding: '18px 20px 24px', overflow: 'auto' };
  readonly titleText = computed(() => {
    const version = this.version();
    if (!version) {
      return 'APP 版本详情';
    }
    return `${version.version} · ${version.buildNumber}`;
  });

  statusLabel(status: string): string {
    return MOBILE_APP_VERSION_STATUS_LABELS[status as keyof typeof MOBILE_APP_VERSION_STATUS_LABELS] ?? status;
  }

  platformLabel(platform: string): string {
    return MOBILE_APP_PLATFORM_LABELS[platform as keyof typeof MOBILE_APP_PLATFORM_LABELS] ?? (platform || '平台');
  }

  formatSize(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '-';
    }
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    }
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  }

  packageDownloadUrl(version: MobileAppVersion): string {
    return `${this.apiBaseUrl}/uploads/${encodeURIComponent(version.packageUploadId)}/raw`;
  }
}
