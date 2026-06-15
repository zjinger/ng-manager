import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { MobileAppReleaseRecord } from '../../models/mobile-app-version.model';
import {
  MOBILE_APP_VERSION_STATUS_LABELS,
  MOBILE_APP_PLATFORM_LABELS,
} from '../../models/mobile-app-version.model';

@Component({
  selector: 'app-mobile-app-release-timeline',
  standalone: true,
  imports: [DatePipe, NzIconModule],
  template: `
    <div class="timeline">
      @for (record of records(); track record.id) {
        <div class="timeline-item">
          <div class="timeline-dot" [attr.data-status]="record.status"></div>
          <div class="timeline-card">
            <div class="timeline-header">
              <div class="timeline-header-left">
                <span class="timeline-version">{{ record.version }}</span>
                <span class="status-badge" [attr.data-status]="record.status">
                  {{ statusLabel(record.status) }}
                </span>
              </div>
              <span class="timeline-date">
                {{ record.publishedAt | date: 'yyyy-MM-dd HH:mm' }}
              </span>
            </div>
            <ul class="timeline-changelog">
              @for (item of record.changelog; track item) {
                <li>{{ item }}</li>
              }
            </ul>
            <div class="timeline-meta">
              <span class="timeline-meta-item">
                <nz-icon nzType="mobile" nzTheme="outline" />
                {{ platformLabel(record.platform) }}
              </span>
              <span class="timeline-meta-item">
                <nz-icon nzType="download" nzTheme="outline" />
                {{ record.downloadCount }} 次下载
              </span>
              <span class="timeline-meta-item">
                <nz-icon nzType="cluster" nzTheme="outline" />
                {{ record.releaseChannel }}
              </span>
            </div>
          </div>
        </div>
      } @empty {
        <div class="timeline-empty">
          <nz-icon nzType="inbox" nzTheme="outline" />
          <span>暂无发布记录</span>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .timeline {
        position: relative;
        padding-left: 24px;
      }

      .timeline::before {
        content: '';
        position: absolute;
        left: 7px;
        top: 0;
        bottom: 0;
        width: 1px;
        background: var(--border-color);
      }

      .timeline-item {
        position: relative;
        padding-bottom: 24px;
      }

      .timeline-item:last-child {
        padding-bottom: 0;
      }

      .timeline-dot {
        position: absolute;
        left: -21px;
        top: 4px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        border: 2px solid var(--bg-container);
        z-index: 1;
      }

      .timeline-dot[data-status='published'] {
        background: var(--color-success);
      }

      .timeline-dot[data-status='testing'] {
        background: var(--color-info);
      }

      .timeline-dot[data-status='draft'] {
        background: var(--color-warning);
      }

      .timeline-dot[data-status='archived'] {
        background: var(--text-muted);
      }

      .timeline-card {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        padding: 16px;
      }

      .timeline-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .timeline-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .timeline-version {
        font-family: var(--font-mono);
        font-weight: 700;
        font-size: 14px;
        color: var(--text-heading);
      }

      .timeline-date {
        font-size: 12px;
        color: var(--text-muted);
        font-family: var(--font-mono);
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

      .timeline-changelog {
        list-style: none;
        padding: 0;
        margin: 0;
        display: grid;
        gap: 4px;
      }

      .timeline-changelog li {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 13px;
        color: var(--text-secondary);
        line-height: 1.5;
      }

      .timeline-changelog li::before {
        content: '';
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: var(--text-muted);
        margin-top: 8px;
        flex-shrink: 0;
      }

      .timeline-meta {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px solid var(--border-color);
        font-size: 12px;
        color: var(--text-muted);
      }

      .timeline-meta-item {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .timeline-meta-item nz-icon {
        font-size: 13px;
      }

      .timeline-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 48px;
        color: var(--text-muted);
      }

      .timeline-empty nz-icon {
        font-size: 32px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileAppReleaseTimelineComponent {
  readonly records = input<MobileAppReleaseRecord[]>([]);

  readonly viewDetail = output<MobileAppReleaseRecord>();

  statusLabel(status: string): string {
    return MOBILE_APP_VERSION_STATUS_LABELS[status as keyof typeof MOBILE_APP_VERSION_STATUS_LABELS] ?? status;
  }

  platformLabel(platform: string): string {
    return MOBILE_APP_PLATFORM_LABELS[platform as keyof typeof MOBILE_APP_PLATFORM_LABELS] ?? platform;
  }
}
