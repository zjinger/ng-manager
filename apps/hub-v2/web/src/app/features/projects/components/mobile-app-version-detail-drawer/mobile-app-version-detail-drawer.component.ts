import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { MobileAppVersion } from '../../models/mobile-app-version.model';
import {
  MOBILE_APP_VERSION_STATUS_LABELS,
  MOBILE_APP_PLATFORM_LABELS,
} from '../../models/mobile-app-version.model';

@Component({
  selector: 'app-mobile-app-version-detail-drawer',
  standalone: true,
  imports: [DatePipe, NzButtonModule, NzDrawerModule, NzIconModule],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      nzPlacement="right"
      [nzWidth]="520"
      [nzClosable]="false"
      (nzOnClose)="close.emit()"
    >
      @if (version(); as v) {
        <ng-container *nzDrawerContent>
          <div class="drawer-header">
            <div class="drawer-header-left">
              <span class="drawer-version">{{ v.version }}</span>
              <span class="status-badge" [attr.data-status]="v.status">
                {{ statusLabel(v.status) }}
              </span>
            </div>
            <button nz-button nzType="text" (click)="close.emit()">
              <nz-icon nzType="close" nzTheme="outline" />
            </button>
          </div>

          <div class="drawer-body">
            <div class="drawer-section">
              <div class="drawer-section-title">基本信息</div>
              <div class="info-grid">
                <div class="info-item">
                  <label>版本号</label>
                  <div class="value mono">{{ v.version }}</div>
                </div>
                <div class="info-item">
                  <label>构建号</label>
                  <div class="value mono">{{ v.buildNumber }}</div>
                </div>
                <div class="info-item">
                  <label>平台</label>
                  <div class="value">{{ platformLabel(v.platform) }}</div>
                </div>
                <div class="info-item">
                  <label>发布状态</label>
                  <div class="value">{{ statusLabel(v.status) }}</div>
                </div>
                <div class="info-item">
                  <label>安装包</label>
                  <div class="value mono">{{ v.packageName }}</div>
                </div>
                <div class="info-item">
                  <label>大小</label>
                  <div class="value mono">{{ formatSize(v.sizeBytes) }}</div>
                </div>
                <div class="info-item">
                  <label>发布时间</label>
                  <div class="value mono">
                    {{ v.publishedAt ? (v.publishedAt | date: 'yyyy-MM-dd HH:mm') : '—' }}
                  </div>
                </div>
                <div class="info-item">
                  <label>下载量</label>
                  <div class="value mono">{{ v.downloadCount }}</div>
                </div>
                <div class="info-item full">
                  <label>SHA256</label>
                  <div class="value mono sha">{{ v.sha256 }}</div>
                </div>
              </div>
            </div>

            <div class="drawer-section">
              <div class="drawer-section-title">更新日志</div>
              <ul class="changelog-list">
                @for (item of v.changelog; track item) {
                  <li>{{ item }}</li>
                } @empty {
                  <li class="empty">暂无更新日志</li>
                }
              </ul>
            </div>

            <div class="drawer-section">
              <div class="drawer-section-title">发布范围</div>
              <div class="info-grid">
                <div class="info-item full">
                  <label>发布渠道</label>
                  <div class="value">{{ v.releaseChannel }}</div>
                </div>
                <div class="info-item full">
                  <label>最低系统版本</label>
                  <div class="value">{{ v.minOsVersion }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="drawer-footer">
            @if (v.status !== 'archived') {
              <button nz-button (click)="archive.emit(v)">归档版本</button>
            }
            <button nz-button (click)="edit.emit(v)">编辑信息</button>
            @if (v.status !== 'published') {
              <button nz-button nzType="primary" (click)="publish.emit(v)">发布到门户</button>
            }
          </div>
        </ng-container>
      }
    </nz-drawer>
  `,
  styles: [
    `
      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid var(--border-color);
      }

      .drawer-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .drawer-version {
        font-family: var(--font-mono);
        font-weight: 700;
        font-size: 16px;
        color: var(--text-heading);
      }

      .drawer-body {
        padding: 20px;
        overflow-y: auto;
      }

      .drawer-section {
        margin-bottom: 24px;
      }

      .drawer-section-title {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin-bottom: 12px;
      }

      .info-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
      }

      .info-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .info-item.full {
        grid-column: 1 / -1;
      }

      .info-item label {
        font-size: 11px;
        color: var(--text-muted);
      }

      .info-item .value {
        font-size: 13px;
        font-weight: 500;
        color: var(--text);
      }

      .info-item .value.mono {
        font-family: var(--font-mono);
        font-size: 12px;
        color: var(--text-secondary);
      }

      .info-item .value.sha {
        word-break: break-all;
        font-size: 11px;
      }

      .changelog-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 6px;
      }

      .changelog-list li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.5;
      }

      .changelog-list li::before {
        content: '';
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: var(--text-muted);
        margin-top: 7px;
        flex-shrink: 0;
      }

      .changelog-list li.empty {
        color: var(--text-muted);
        font-style: italic;
      }

      .changelog-list li.empty::before {
        display: none;
      }

      .drawer-footer {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        padding: 12px 20px;
        border-top: 1px solid var(--border-color);
        background: var(--bg-container);
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppVersionDetailDrawerComponent {
  readonly open = input(false);
  readonly version = input<MobileAppVersion | null>(null);

  readonly close = output<void>();
  readonly edit = output<MobileAppVersion>();
  readonly archive = output<MobileAppVersion>();
  readonly publish = output<MobileAppVersion>();

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
