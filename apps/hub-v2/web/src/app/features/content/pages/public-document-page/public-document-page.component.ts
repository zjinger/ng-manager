import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import type { ApiSuccessResponse } from '@core/http';
import { MarkdownViewerComponent } from '@shared/ui';
import type { DocumentEntity } from '../../models/content.model';

@Component({
  selector: 'app-public-document-page',
  standalone: true,
  imports: [CommonModule, DatePipe, NzButtonModule, NzSpinModule, RouterLink, MarkdownViewerComponent],
  template: `
    <main class="public-doc">
      <section class="public-doc__card">
        @if (loading()) {
          <div class="public-doc__state">
            <nz-spin nzSimple></nz-spin>
            <span>正在加载文档...</span>
          </div>
        } @else if (error()) {
          <div class="public-doc__state">
            <h2>文档不可访问</h2>
            <p>{{ error() }}</p>
            <a nz-button routerLink="/login">返回系统首页</a>
          </div>
        } @else if (document(); as doc) {
          <header class="public-doc__header">
            <div class="public-doc__meta">
              <h1>{{ doc.title }}</h1>
              <p>
                <span>标识：{{ doc.slug }}</span>
                <span>分类：{{ doc.category || '-' }}</span>
                <span>版本：{{ doc.version || '-' }}</span>
                <span>发布时间：{{ doc.publishAt ? (doc.publishAt | date: 'yyyy-MM-dd HH:mm') : '-' }}</span>
              </p>
            </div>
          </header>

          @if (doc.summary) {
            <section class="public-doc__summary">
              {{ doc.summary }}
            </section>
          }

          <section class="public-doc__content">
            <app-markdown-viewer [content]="doc.contentMd || '暂无内容'" [showToc]="true" tocVariant="inline" />
          </section>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .public-doc {
        min-height: 100vh;
        background: var(--bg-page);
        padding: 24px 16px;
      }
      .public-doc__card {
        max-width: 1080px;
        margin: 0 auto;
        border: 1px solid var(--border-color-soft);
        border-radius: 16px;
        background: var(--surface-primary);
        padding: 20px;
        box-shadow: var(--shadow-sm);
      }
      .public-doc__state {
        min-height: 200px;
        display: grid;
        place-items: center;
        gap: 10px;
        color: var(--text-muted);
        text-align: center;
      }
      .public-doc__state h2 {
        margin: 0;
        color: var(--text-heading);
      }
      .public-doc__state p {
        margin: 0;
      }
      .public-doc__header {
        border-bottom: 1px solid var(--border-color-soft);
        padding-bottom: 14px;
        margin-bottom: 14px;
      }
      .public-doc__meta h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1.25;
        color: var(--text-heading);
      }
      .public-doc__meta p {
        margin: 10px 0 0;
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        color: var(--text-muted);
        font-size: 13px;
      }
      .public-doc__summary {
        margin-bottom: 14px;
        padding: 12px 14px;
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        background: var(--bg-subtle);
        color: var(--text-primary);
        line-height: 1.7;
      }
      .public-doc__content {
        border-top: 1px solid var(--border-color-soft);
        padding-top: 14px;
      }
      @media (max-width: 900px) {
        .public-doc {
          padding: 12px;
        }
        .public-doc__card {
          padding: 14px;
          border-radius: 12px;
        }
        .public-doc__meta h1 {
          font-size: 24px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicDocumentPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly document = signal<DocumentEntity | null>(null);

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const slug = (params.get('slug') || '').trim();
      if (!slug) {
        this.loading.set(false);
        this.error.set('缺少文档标识。');
        this.document.set(null);
        return;
      }
      this.fetchBySlug(slug);
    });
  }

  private fetchBySlug(slug: string): void {
    this.loading.set(true);
    this.error.set('');
    this.http
      .get<ApiSuccessResponse<DocumentEntity>>(`/api/public/documents/${encodeURIComponent(slug)}`)
      .subscribe({
        next: (res) => {
          this.document.set(res.data);
          this.loading.set(false);
        },
        error: (err: { status?: number; error?: { message?: string } }) => {
          this.document.set(null);
          this.loading.set(false);
          if (err?.status === 404) {
            this.error.set('文档不存在或未发布。');
            return;
          }
          this.error.set(err?.error?.message || '加载失败，请稍后重试。');
        },
      });
  }
}

