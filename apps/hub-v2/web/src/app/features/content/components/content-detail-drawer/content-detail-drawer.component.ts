import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { MarkdownViewerComponent } from '@shared/ui';
import type { AnnouncementEntity, ContentTab, DocumentEntity, ReleaseEntity } from '../../models/content.model';

@Component({
  selector: 'app-content-detail-drawer',
  standalone: true,
  imports: [DatePipe, NzButtonModule, NzDrawerModule, NzIconModule, NzPopconfirmModule, MarkdownViewerComponent],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzWidth]="tab() === 'documents' ? '60%' : '640px'"
      [nzWrapClassName]="'content-detail-drawer'"
      [nzBodyStyle]="drawerBodyStyle"
      [nzMask]="false"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="close.emit()"
    >
      <ng-template #drawerTitleTpl>
        <div class="detail-drawer__title">
          <div class="detail-drawer__title-main">
            <span class="detail-drawer__subtitle">{{ tabLabel() }}</span>
            <strong>{{ titleText() }}</strong>
          </div>
          <button type="button" class="detail-drawer__close" (click)="close.emit()">
            <span nz-icon nzType="close"></span>
          </button>
        </div>
      </ng-template>

      <ng-template nzDrawerContent>
        <div class="detail-panel">
          <div class="detail-actions">
            <button nz-button nzSize="small" (click)="edit.emit()">编辑</button>
            @if (isDraft()) {
              <button
                nz-button
                nzType="primary"
                nzSize="small"
                nz-popconfirm
                [nzPopconfirmTitle]="publishConfirmText()"
                nzPopconfirmPlacement="topRight"
                (nzOnConfirm)="publish.emit()"
              >
                发布
              </button>
            }
          </div>

          @if (tab() === 'announcements' && announcement(); as item) {
            <div class="detail-grid">
              <div class="detail-field">
                <span>状态</span>
                <strong>{{ statusLabel(item.status) }}</strong>
              </div>
              <div class="detail-field">
                <span>范围</span>
                <strong>{{ item.scope === 'global' ? '全局' : projectName() || '当前项目' }}</strong>
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
              <pre class="detail-plain">{{ item.contentMd }}</pre>
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
                <span>对外访问链接</span>
                @if (item.status === 'published') {
                  <a
                    class="detail-link"
                    [href]="publicDocumentLink(item.slug)"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ publicDocumentLink(item.slug) }}
                  </a>
                } @else {
                  <strong>文档发布后可访问</strong>
                }
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
              <app-markdown-viewer [content]="item.contentMd || '暂无内容'" />
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
        </div>
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
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
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
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .detail-field {
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
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
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
export class ContentDetailDrawerComponent {
  readonly open = input(false);
  readonly tab = input<ContentTab | null>(null);
  readonly announcement = input<AnnouncementEntity | null>(null);
  readonly document = input<DocumentEntity | null>(null);
  readonly release = input<ReleaseEntity | null>(null);
  readonly projectName = input('');
  readonly close = output<void>();
  readonly edit = output<void>();
  readonly publish = output<void>();

  readonly drawerBodyStyle = { padding: '18px 20px 24px', overflow: 'auto' };
  readonly isDraft = computed(() => {
    if (this.tab() === 'announcements') {
      return this.announcement()?.status === 'draft';
    }
    if (this.tab() === 'documents') {
      return this.document()?.status === 'draft';
    }
    if (this.tab() === 'releases') {
      return this.release()?.status === 'draft';
    }
    return false;
  });
  readonly titleText = computed(() => {
    if (this.tab() === 'announcements') {
      return this.announcement()?.title || '公告详情';
    }
    if (this.tab() === 'documents') {
      return this.document()?.title || '文档详情';
    }
    if (this.tab() === 'releases') {
      return this.release()?.title || '发布详情';
    }
    return '详情';
  });

  readonly tabLabel = computed(() => {
    if (this.tab() === 'announcements') {
      return '公告';
    }
    if (this.tab() === 'documents') {
      return '文档';
    }
    if (this.tab() === 'releases') {
      return '发布';
    }
    return '内容';
  });

  statusLabel(status: string): string {
    return (
      {
        draft: '草稿',
        published: '已发布',
        archived: '已归档',
      }[status] ?? status
    );
  }

  publishConfirmText(): string {
    if (this.tab() === 'announcements') {
      return '确认发布这条公告吗？发布后将对项目成员可见。';
    }
    if (this.tab() === 'documents') {
      return '确认发布这篇文档吗？发布后将对项目成员可见。';
    }
    return '确认发布这条版本记录吗？发布后将对项目成员可见。';
  }

  publicDocumentLink(slug: string): string {
    const normalizedSlug = encodeURIComponent((slug || '').trim());
    if (typeof window === 'undefined') {
      return `/public/docs/${normalizedSlug}`;
    }
    return `${window.location.origin}/public/docs/${normalizedSlug}`;
  }
}
