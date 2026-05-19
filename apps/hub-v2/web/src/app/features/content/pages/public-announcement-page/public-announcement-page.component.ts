import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import type { ApiSuccessResponse } from '@core/http';
import { MarkdownViewerComponent } from '@shared/ui';
import type { AnnouncementEntity } from '../../models/content.model';

@Component({
  selector: 'app-public-announcement-page',
  standalone: true,
  imports: [CommonModule, DatePipe, NzButtonModule, NzSpinModule, RouterLink, MarkdownViewerComponent],
  template: `
    <main class="public-announcement">
      <section class="public-announcement__card">
        @if (loading()) {
          <div class="public-announcement__state">
            <nz-spin nzSimple></nz-spin>
            <span>正在加载公告...</span>
          </div>
        } @else if (error()) {
          <div class="public-announcement__state">
            <h2>公告不可访问</h2>
            <p>{{ error() }}</p>
            <a nz-button routerLink="/login">返回系统首页</a>
          </div>
        } @else if (announcement(); as item) {
          <header class="public-announcement__header">
            <div class="public-announcement__meta">
              <h1>{{ item.title }}</h1>
              <p>
                <span>公告类型：报销公告</span>
                <span>发布时间：{{ item.publishAt ? (item.publishAt | date: 'yyyy-MM-dd HH:mm') : '-' }}</span>
                <span>生效日期：{{ item.effectiveAt ? (item.effectiveAt | date: 'yyyy-MM-dd HH:mm') : '-' }}</span>
              </p>
            </div>
          </header>

          @if (item.summary) {
            <section class="public-announcement__summary">
              {{ item.summary }}
            </section>
          }

          <section class="public-announcement__content">
            <app-markdown-viewer [content]="item.contentMd || '暂无内容'" />
          </section>
        }
      </section>
    </main>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
      }
      .public-announcement {
        min-height: 100dvh;
        background: var(--bg-page);
        padding: 24px 16px;
      }
      .public-announcement__card {
        max-width: 960px;
        margin: 0 auto;
        border: 1px solid var(--border-color-soft);
        border-radius: 16px;
        background: var(--surface-primary);
        padding: 20px;
        box-shadow: var(--shadow-sm);
      }
      .public-announcement__state {
        min-height: 200px;
        display: grid;
        place-items: center;
        gap: 10px;
        color: var(--text-muted);
        text-align: center;
      }
      .public-announcement__state h2 {
        margin: 0;
        color: var(--text-heading);
      }
      .public-announcement__state p {
        margin: 0;
      }
      .public-announcement__header {
        border-bottom: 1px solid var(--border-color-soft);
        padding-bottom: 14px;
        margin-bottom: 14px;
      }
      .public-announcement__meta h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1.25;
        color: var(--text-heading);
      }
      .public-announcement__meta p {
        margin: 10px 0 0;
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        color: var(--text-muted);
        font-size: 13px;
      }
      .public-announcement__summary {
        margin-bottom: 14px;
        padding: 12px 14px;
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        background: var(--bg-subtle);
        color: var(--text-primary);
        line-height: 1.7;
      }
      .public-announcement__content {
        border-top: 1px solid var(--border-color-soft);
        padding-top: 14px;
      }
      @media (max-width: 900px) {
        .public-announcement {
          padding: 12px;
        }
        .public-announcement__card {
          padding: 14px;
          border-radius: 12px;
        }
        .public-announcement__meta h1 {
          font-size: 24px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicAnnouncementPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);
  private readonly title = inject(Title);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly announcement = signal<AnnouncementEntity | null>(null);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const announcementId = (params.get('announcementId') || '').trim();
      if (!announcementId) {
        this.loading.set(false);
        this.error.set('缺少公告标识。');
        this.announcement.set(null);
        return;
      }
      this.fetchAnnouncement(announcementId);
    });
  }

  private fetchAnnouncement(announcementId: string): void {
    this.loading.set(true);
    this.error.set('');
    const encodedId = encodeURIComponent(announcementId.trim());
    this.http
      .get<ApiSuccessResponse<AnnouncementEntity>>(`/api/public/announcements/${encodedId}`)
      .subscribe({
        next: (res) => {
          this.announcement.set(res.data);
          this.title.setTitle(res.data.title || '报销公告');
          this.loading.set(false);
        },
        error: (err: { status?: number; error?: { message?: string } }) => {
          this.announcement.set(null);
          this.loading.set(false);
          if (err?.status === 404) {
            this.error.set('公告不存在或未发布。');
            return;
          }
          this.error.set(err?.error?.message || '加载失败，请稍后重试。');
        },
      });
  }
}
