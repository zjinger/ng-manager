import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { map, Observable } from 'rxjs';

import { ListStateComponent, MarkdownViewerComponent, PageHeaderComponent } from '@shared/ui';
import { ProjectContextStore } from '@core/state';
import type { AnnouncementEntity, ContentTab, DocumentEntity, ReleaseEntity } from '../../models/content.model';
import { ContentApiService } from '../../services/content-api.service';

@Component({
  selector: 'app-content-detail-page',
  standalone: true,
  imports: [DatePipe, NzButtonModule, NzIconModule, RouterLink, ListStateComponent, MarkdownViewerComponent, PageHeaderComponent],
  template: `
    <div class="detail-page">
      <app-page-header [title]="pageTitle()" [subtitle]="subtitle()" />

      <a class="back-link" [routerLink]="['/content']">
        <span nz-icon nzType="arrow-left" class="back-link__icon"></span>
        返回内容管理
      </a>

      <app-list-state
        [loading]="loading()"
        [empty]="!loading() && !entityLoaded()"
        loadingText="正在加载内容详情…"
        emptyTitle="未找到对应内容"
        emptyDescription="该内容可能已删除或你无访问权限。"
      />

      @if (!loading() && entityLoaded()) {
        <section class="detail-card">
          @if (tab() === 'announcements' && announcement(); as item) {
            <div class="detail-grid">
              <div class="detail-field">
                <span>状态</span>
                <strong>{{ statusLabel(item.status) }}</strong>
              </div>
              <div class="detail-field">
                <span>范围</span>
                <strong>{{ item.scope === 'global' ? '全局' : projectLabel(item.projectId) }}</strong>
              </div>
              <div class="detail-field">
                <span>发布时间</span>
                <strong>{{ item.publishAt ? (item.publishAt | date: 'yyyy-MM-dd HH:mm') : '-' }}</strong>
              </div>
              <div class="detail-field">
                <span>过期时间</span>
                <strong>{{ item.expireAt ? (item.expireAt | date: 'yyyy-MM-dd HH:mm') : '-' }}</strong>
              </div>
            </div>

            @if (item.summary) {
              <section class="detail-section">
                <h4>摘要</h4>
                <p class="detail-plain">{{ item.summary }}</p>
              </section>
            }

            <section class="detail-section">
              <h4>正文</h4>
              <pre class="detail-plain">{{ item.contentMd || '暂无内容' }}</pre>
            </section>
          }

          @if (tab() === 'documents' && document(); as item) {
            <div class="detail-grid">
              <div class="detail-field">
                <span>状态</span>
                <strong>{{ statusLabel(item.status) }}</strong>
              </div>
              <div class="detail-field">
                <span>文档标识</span>
                <strong>{{ item.slug }}</strong>
              </div>
              <div class="detail-field">
                <span>分类</span>
                <strong>{{ item.category || '-' }}</strong>
              </div>
              <div class="detail-field">
                <span>版本</span>
                <strong>{{ item.version || '-' }}</strong>
              </div>
              <div class="detail-field detail-field--full">
                <span>所属项目</span>
                <strong>{{ projectLabel(item.projectId) }}</strong>
              </div>
            </div>

            @if (item.summary) {
              <section class="detail-section">
                <h4>摘要</h4>
                <p class="detail-plain">{{ item.summary }}</p>
              </section>
            }

            <section class="detail-section">
              <h4>正文</h4>
              <app-markdown-viewer [content]="item.contentMd || '暂无内容'" [showToc]="true" tocVariant="inline" />
            </section>
          }

          @if (tab() === 'releases' && release(); as item) {
            <div class="detail-grid">
              <div class="detail-field">
                <span>状态</span>
                <strong>{{ statusLabel(item.status) }}</strong>
              </div>
              <div class="detail-field">
                <span>渠道</span>
                <strong>{{ item.channel }}</strong>
              </div>
              <div class="detail-field">
                <span>版本</span>
                <strong>{{ item.version }}</strong>
              </div>
              <div class="detail-field">
                <span>发布时间</span>
                <strong>{{ item.publishedAt ? (item.publishedAt | date: 'yyyy-MM-dd HH:mm') : '-' }}</strong>
              </div>
              <div class="detail-field detail-field--full">
                <span>所属项目</span>
                <strong>{{ projectLabel(item.projectId) }}</strong>
              </div>
            </div>

            @if (item.downloadUrl) {
              <section class="detail-section">
                <h4>下载地址</h4>
                <a class="detail-link" [href]="item.downloadUrl" target="_blank" rel="noopener noreferrer">
                  {{ item.downloadUrl }}
                </a>
              </section>
            }

            <section class="detail-section">
              <h4>更新说明</h4>
              <pre class="detail-plain">{{ item.notes || '暂无更新说明' }}</pre>
            </section>
          }
        </section>
      }
    </div>
  `,
  styles: [
    `
      .detail-page {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .back-link {
        width: fit-content;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 999px;
        background: var(--surface-overlay);
        border: 1px solid var(--border-color);
        color: var(--primary-700);
        font-weight: 700;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
        backdrop-filter: blur(10px);
      }
      .back-link__icon {
        font-size: 12px;
      }
      .detail-card {
        display: grid;
        gap: 16px;
        padding: 22px 24px;
        border: 1px solid var(--border-color);
        border-radius: 24px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 32%),
          var(--bg-container);
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
      }
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .detail-field {
        padding: 12px 14px;
        border: 1px solid var(--border-color-soft);
        border-radius: 12px;
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
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
      }
      .detail-section {
        border: 1px solid var(--border-color-soft);
        border-radius: 14px;
        padding: 16px;
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
      .detail-link {
        color: var(--primary-500);
        text-decoration: none;
        word-break: break-all;
      }
      .detail-link:hover {
        text-decoration: underline;
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
export class ContentDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly contentApi = inject(ContentApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly tabParam = toSignal(this.route.paramMap.pipe(map((params) => params.get('tab'))), {
    initialValue: this.route.snapshot.paramMap.get('tab'),
  });
  private readonly contentIdParam = toSignal(this.route.paramMap.pipe(map((params) => params.get('contentId'))), {
    initialValue: this.route.snapshot.paramMap.get('contentId'),
  });

  readonly tab = signal<ContentTab | null>(null);
  readonly announcement = signal<AnnouncementEntity | null>(null);
  readonly document = signal<DocumentEntity | null>(null);
  readonly release = signal<ReleaseEntity | null>(null);
  readonly loading = signal(false);

  readonly entityLoaded = computed(() => !!this.announcement() || !!this.document() || !!this.release());
  readonly pageTitle = computed(() => {
    if (this.tab() === 'announcements') {
      return '公告详情';
    }
    if (this.tab() === 'documents') {
      return '文档详情';
    }
    if (this.tab() === 'releases') {
      return '版本详情';
    }
    return '内容详情';
  });
  readonly subtitle = computed(() => {
    if (this.tab() === 'announcements') {
      return this.announcement()?.title || '通过 工作台 动态进入';
    }
    if (this.tab() === 'documents') {
      return this.document()?.title || '通过 工作台 动态进入';
    }
    if (this.tab() === 'releases') {
      return this.release()?.title || '通过 工作台 动态进入';
    }
    return '内容详情';
  });

  constructor() {
    effect(() => {
      const tab = this.normalizeTab(this.tabParam());
      const contentId = (this.contentIdParam() || '').trim();
      if (!tab || !contentId) {
        this.reset();
        return;
      }
      this.load(tab, contentId);
    });
  }

  statusLabel(status: string): string {
    return (
      {
        draft: '草稿',
        published: '已发布',
        archived: '已归档',
      }[status] ?? status
    );
  }

  projectLabel(projectId: string | null): string {
    if (!projectId) {
      return '全局';
    }
    const project = this.projectContext.projects().find((item) => item.id === projectId);
    return project?.name || '项目内容';
  }

  private load(tab: ContentTab, contentId: string): void {
    this.loading.set(true);
    this.tab.set(tab);
    this.announcement.set(null);
    this.document.set(null);
    this.release.set(null);

    const request: Observable<AnnouncementEntity | DocumentEntity | ReleaseEntity> =
      tab === 'announcements'
        ? this.contentApi.getAnnouncementById(contentId)
        : tab === 'documents'
          ? this.contentApi.getDocumentById(contentId)
          : this.contentApi.getReleaseById(contentId);

    request.subscribe({
      next: (entity) => {
        if (tab === 'announcements') {
          this.announcement.set(entity as AnnouncementEntity);
        } else if (tab === 'documents') {
          this.document.set(entity as DocumentEntity);
        } else {
          this.release.set(entity as ReleaseEntity);
        }
        this.loading.set(false);
      },
      error: () => {
        this.reset();
        this.loading.set(false);
      },
    });
  }

  private reset(): void {
    this.tab.set(null);
    this.announcement.set(null);
    this.document.set(null);
    this.release.set(null);
  }

  private normalizeTab(value: string | null): ContentTab | null {
    if (value === 'announcements' || value === 'documents' || value === 'releases') {
      return value;
    }
    return null;
  }
}
