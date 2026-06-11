import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { MarkdownViewerComponent } from '@shared/ui';
import type { UserEntity } from '../../../users/models/user.model';
import type { SkillCommentEntity, SkillDetailEntity, SkillEntity, SkillVersionEntity } from '../../models/skill-hub.model';
import { SkillCommentsComponent } from '../skill-comments/skill-comments.component';

type SkillFileEntry = { path: string; size: number; content?: string | null; contentTruncated?: boolean };
type SkillFileTreeInput = SkillFileEntry[];
type SkillFileTreeNode = {
  key: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  size: number;
  content: string | null;
  contentTruncated: boolean;
  children: SkillFileTreeNode[];
  childMap?: Map<string, SkillFileTreeNode>;
};
type SkillFileTreeRow = Omit<SkillFileTreeNode, 'children' | 'childMap'> & {
  level: number;
  expanded: boolean;
};

@Component({
  selector: 'app-skill-detail-drawer',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzDrawerModule,
    NzIconModule,
    NzPopconfirmModule,
    NzTabsModule,
    NzTagModule,
    MarkdownViewerComponent,
    SkillCommentsComponent,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      nzPlacement="right"
      [nzWidth]="860"
      [nzWrapClassName]="'skill-detail-drawer'"
      [nzBodyStyle]="drawerBodyStyle"
      [nzClosable]="true"
      nzTitle="Skill 详情"
      (nzOnClose)="close.emit()"
    >
      <ng-template nzDrawerContent>
        @if (skill(); as detail) {
          <div class="detail">
            <div class="detail__fixed">
              <header class="detail__header">
                <div class="drawer-hero-main">
                  <div class="drawer-hero-icon" [ngClass]="skillIconTone(detail)">
                    <nz-icon [nzType]="skillIconType(detail)" nzTheme="outline" />
                  </div>
                  <div class="drawer-hero-copy">
                    <h2>{{ detail.name }}</h2>
                    <p>{{ detail.description }}</p>
                    <div class="drawer-hero-author">
                      <span class="skill-author-avatar" [ngClass]="avatarTone(detail)">
                        @if (showOwnerAvatarImage(detail)) {
                          <img [src]="detail.ownerAvatarUrl!" [alt]="detail.ownerName || '作者头像'" (error)="markOwnerAvatarError(detail)" />
                        } @else {
                          {{ avatarText(detail.ownerName) }}
                        }
                      </span>
                      <span>{{ detail.ownerName || '未知作者' }}</span>
                      <span>·</span>
                      <span>{{ detail.slug }}</span>
                    </div>
                  </div>
                </div>
                <div class="detail__actions">
                  @if (detail.status === 'published') {
                    <button nz-button (click)="toggleFavorite.emit(detail)">
                      <nz-icon nzType="star" [nzTheme]="detail.isFavorited ? 'fill' : 'outline'" />
                      {{ detail.isFavorited ? '已收藏' : '收藏' }}
                    </button>
                  }
                  @if (canCreate() && isOwner()) {
                    <button nz-button (click)="uploadVersion.emit(detail)">
                      <nz-icon nzType="plus" nzTheme="outline" />
                      新版本
                    </button>
                  }
                  @if (canManage() && detail.status === 'published') {
                    <button
                      nz-button
                      nzDanger
                      nz-popconfirm
                      nzPopconfirmTitle="确认归档该 Skill？"
                      nzOkText="归档"
                      nzCancelText="取消"
                      (nzOnConfirm)="archive.emit(detail)"
                    >
                      <nz-icon nzType="stop" nzTheme="outline" />
                      归档
                    </button>
                  }
                  @if (canDelete(detail)) {
                    <button
                      nz-button
                      nzDanger
                      nz-popconfirm
                      [nzPopconfirmTitle]="detail.status === 'archived' ? '确认删除已归档 Skill？对应 zip 将无法再下载。' : '确认删除草稿 Skill？'"
                      nzOkText="删除"
                      nzCancelText="取消"
                      (nzOnConfirm)="deleteSkill.emit(detail)"
                    >
                      <nz-icon nzType="delete" nzTheme="outline" />
                      删除
                    </button>
                  }
                </div>
              </header>

              <section class="detail__section">
                <h3>版本</h3>
                <div class="version-list">
                  @for (version of detail.versions; track version.id) {
                    <div class="version-row">
                      <div class="version-row__meta">
                        <strong>{{ version.version }}</strong>
                        <nz-tag class="version-status" [class.is-archived]="version.status === 'archived'" [nzColor]="versionStatusColor(version.status)">
                          {{ versionStatusLabel(version.status) }}
                        </nz-tag>
                        <span>{{ version.fileCount }} files · {{ formatSize(version.packageSize) }}</span>
                      </div>
                      @if (version.status === 'published') {
                        <div class="version-row__actions">
                          <button nz-button nzSize="small" (click)="download.emit({ skill: detail, version })">
                            <nz-icon nzType="download" nzTheme="outline" />
                            下载
                          </button>
                        </div>
                      }
                      @if (version.reviewComment) {
                        <p class="version-row__comment">{{ version.reviewComment }}</p>
                      }
                    </div>
                  }
                </div>
              </section>
            </div>

            <section class="detail__tabs" [class.is-files-tab]="detailTabIndex() === 2">
              <nz-tabset [nzSelectedIndex]="detailTabIndex()" (nzSelectedIndexChange)="detailTabIndex.set($event)">
                <nz-tab nzTitle="描述">
                  <div class="tab-pane">
                    @if (detail.descriptionMd) {
                      <app-markdown-viewer [content]="detail.descriptionMd" [showToc]="false" />
                    } @else {
                      <p class="empty-panel">暂无描述。</p>
                    }
                  </div>
                </nz-tab>
                <nz-tab nzTitle="SKILL.md">
                  <div class="tab-pane">
                    @if (latestPreview(detail); as preview) {
                      <app-markdown-viewer [content]="preview.readmeMd" [showToc]="false" />
                    } @else {
                      <p class="empty-panel">暂无 SKILL.md 预览。</p>
                    }
                  </div>
                </nz-tab>
                <nz-tab nzTitle="Files">
                  <div class="tab-pane tab-pane--files">
                    @if (latestPreview(detail); as preview) {
                      <div class="file-browser">
                        <div class="file-tree">
                          @for (row of fileTreeRows(preview.manifest.files.slice(0, 120)); track row.key) {
                            <div
                              class="file-tree__row"
                              [class.is-folder]="row.type === 'folder'"
                              [class.is-active]="row.type === 'file' && activeSkillFile(preview.manifest.files.slice(0, 120))?.path === row.path"
                              [style.padding-left.px]="row.level * 18 + 8"
                              (click)="row.type === 'folder' ? toggleFileFolder(row.path) : selectSkillFile(row.path)"
                            >
                              @if (row.type === 'folder') {
                                <button type="button" class="file-tree__toggle" (click)="toggleFileFolder(row.path); $event.stopPropagation()">
                                  <nz-icon [nzType]="row.expanded ? 'caret-down' : 'caret-right'" nzTheme="outline" />
                                </button>
                                <nz-icon class="file-tree__icon" [nzType]="row.expanded ? 'folder-open' : 'folder'" nzTheme="outline" />
                                <span class="file-tree__name">{{ row.name }}</span>
                              } @else {
                                <span class="file-tree__toggle file-tree__toggle--spacer"></span>
                                <nz-icon class="file-tree__icon" nzType="file-text" nzTheme="outline" />
                                <span class="file-tree__name" [title]="row.path">{{ row.name }}</span>
                                <span class="file-tree__size">{{ formatSize(row.size) }}</span>
                              }
                            </div>
                          }
                        </div>
                        <div class="file-content">
                          @if (activeSkillFile(preview.manifest.files.slice(0, 120)); as file) {
                            <header class="file-content__header">
                              <div>
                                <strong>{{ file.path }}</strong>
                                <span>{{ formatSize(file.size) }}</span>
                              </div>
                            </header>
                            @if (filePreviewContent(preview, file); as content) {
                              <pre class="file-content__body">{{ content }}</pre>
                              @if (file.contentTruncated) {
                                <p class="file-content__hint">内容较长，当前仅展示前 128KB。</p>
                              }
                            } @else {
                              <p class="empty-panel">该文件暂无可预览内容。</p>
                            }
                          } @else {
                            <p class="empty-panel">请选择左侧文件。</p>
                          }
                        </div>
                      </div>
                      @if (preview.manifest.files.length > 120) {
                        <p class="file-browser__hint">仅展示前 120 个文件。</p>
                      }
                    } @else {
                      <p class="empty-panel">暂无文件清单。</p>
                    }
                  </div>
                </nz-tab>
                <nz-tab nzTitle="评论">
                  <div class="tab-pane">
                    <app-skill-comments
                      [comments]="comments()"
                      [members]="members()"
                      [loading]="commentsLoading()"
                      [busy]="commentBusy()"
                      (submit)="submitComment.emit($event)"
                    />
                  </div>
                </nz-tab>
              </nz-tabset>
            </section>
          </div>
        }
      </ng-template>
    </nz-drawer>
  `,
  styles: [
    `
      :host {
        display: contents;
      }
      .detail {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        color: var(--text-primary);
        background: var(--bg-container);
      }
      .detail__fixed {
        flex: 0 0 auto;
        border-bottom: 1px solid var(--border-color);
        background: var(--bg-container);
      }
      .detail__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding: 26px 24px;
      }
      .drawer-hero-main {
        display: flex;
        align-items: flex-start;
        gap: 16px;
        min-width: 0;
      }
      .drawer-hero-icon {
        width: 52px;
        height: 52px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        border-radius: 14px;
        font-size: 24px;
      }
      .drawer-hero-copy {
        min-width: 0;
      }
      .drawer-hero-copy h2,
      .detail__section h3 {
        margin: 0;
        color: var(--text-primary);
      }
      .drawer-hero-copy h2 {
        font-size: 18px;
        font-weight: 700;
      }
      .drawer-hero-copy p {
        margin: 8px 0 0;
        color: var(--text-secondary);
        line-height: 1.6;
      }
      .drawer-hero-author {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        color: var(--text-secondary);
        font-size: 13px;
      }
      .skill-author-avatar {
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        overflow: hidden;
        border-radius: 50%;
        color: #fff;
        font-size: 9px;
        font-weight: 700;
      }
      .skill-author-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .detail__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        flex-wrap: wrap;
      }
      .detail__section {
        padding: 0 24px 18px;
      }
      .detail__section h3 {
        margin-bottom: 10px;
        font-size: 14px;
        font-weight: 700;
      }
      .version-list {
        display: grid;
        gap: 8px;
      }
      .version-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) max-content;
        align-items: center;
        gap: 12px;
        padding: 12px 14px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-subtle);
      }
      .version-row__meta {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        white-space: nowrap;
      }
      .version-row__meta > span {
        color: var(--text-secondary);
      }
      .version-row__actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }
      .version-row__comment {
        grid-column: 1 / -1;
        margin: 0;
        color: var(--text-secondary);
        font-size: 12px;
      }
      .detail__tabs {
        flex: 1 1 auto;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding: 0 24px 22px;
      }
      .detail__tabs nz-tabset {
        flex: 1 1 auto;
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      .tab-pane {
        min-height: 100%;
        height: auto;
        overflow: visible;
        padding: 16px 0 24px;
      }
      .tab-pane--files {
        height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        padding-bottom: 0;
      }
      .empty-panel {
        margin: 0;
        padding: 24px;
        color: var(--text-muted);
        text-align: center;
      }
      .file-browser {
        display: grid;
        grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
        gap: 14px;
        flex: 1 1 auto;
        min-height: 0;
        height: 100%;
      }
      .file-tree,
      .file-content {
        min-height: 0;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--bg-container);
      }
      .file-tree {
        overflow: auto;
        padding: 8px 0;
      }
      .file-tree__row {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 32px;
        padding: 5px 10px 5px 8px;
        color: var(--text-secondary);
        cursor: pointer;
      }
      .file-tree__row:hover,
      .file-tree__row.is-active {
        background: color-mix(in srgb, var(--primary-500) 12%, transparent);
        color: var(--text-primary);
      }
      .file-tree__toggle {
        width: 16px;
        min-width: 16px;
        height: 16px;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        font-size: 11px;
        cursor: pointer;
      }
      .file-tree__toggle--spacer {
        display: inline-block;
      }
      .file-tree__icon {
        flex-shrink: 0;
      }
      .file-tree__name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .file-tree__size {
        margin-left: auto;
        color: var(--text-muted);
        font-size: 11px;
      }
      .file-content {
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .file-content__header {
        flex: 0 0 auto;
        padding: 12px 14px;
        border-bottom: 1px solid var(--border-color);
      }
      .file-content__header div {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        min-width: 0;
      }
      .file-content__header strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .file-content__header span {
        flex-shrink: 0;
        color: var(--text-muted);
        font-size: 12px;
      }
      .file-content__body {
        flex: 1 1 auto;
        min-height: 0;
        margin: 0;
        padding: 14px;
        overflow: auto;
        color: var(--text-secondary);
        background: transparent;
        font-size: 12px;
        line-height: 1.7;
        white-space: pre-wrap;
      }
      .file-content__hint,
      .file-browser__hint {
        flex: 0 0 auto;
        margin: 8px 0 0;
        color: var(--text-muted);
        font-size: 12px;
      }
      .blue {
        background: #eff6ff;
        color: #2563eb;
      }
      .purple {
        background: #f3e8ff;
        color: #7c3aed;
      }
      .green {
        background: #ecfdf5;
        color: #059669;
      }
      .orange {
        background: #fffbeb;
        color: #d97706;
      }
      .rose {
        background: #fff1f2;
        color: #e11d48;
      }
      .cyan {
        background: #ecfeff;
        color: #0891b2;
      }
      .indigo {
        background: #eef2ff;
        color: #4f46e5;
      }
      .a1 {
        background: linear-gradient(135deg, #14b8a6, #0ea5e9);
      }
      .a2 {
        background: linear-gradient(135deg, #8b5cf6, #ec4899);
      }
      .a3 {
        background: linear-gradient(135deg, #f97316, #ef4444);
      }
      .a4 {
        background: linear-gradient(135deg, #22c55e, #84cc16);
      }
      .version-status.is-archived,
      :host ::ng-deep .version-status.is-archived {
        background: rgba(239, 68, 68, 0.22) !important;
        color: #fca5a5 !important;
        border-color: rgba(248, 113, 113, 0.28) !important;
      }
      ::ng-deep .skill-detail-drawer .ant-drawer-content,
      ::ng-deep .skill-detail-drawer .ant-drawer-wrapper-body {
        height: 100%;
        min-height: 0;
      }
      ::ng-deep .skill-detail-drawer .ant-drawer-wrapper-body {
        display: flex;
        flex-direction: column;
      }
      ::ng-deep .skill-detail-drawer .ant-drawer-body {
        flex: 1 1 auto;
        min-height: 0;
        overflow: hidden !important;
      }
      ::ng-deep .skill-detail-drawer .ant-tabs {
        height: 100%;
        display: flex;
        flex-direction: column;
      }
      ::ng-deep .skill-detail-drawer .ant-tabs-nav {
        flex: 0 0 auto;
      }
      ::ng-deep .skill-detail-drawer .ant-tabs-content-holder {
        flex: 1 1 auto;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
      }
      .detail__tabs.is-files-tab ::ng-deep .ant-tabs-content-holder {
        overflow: hidden;
      }
      .detail__tabs.is-files-tab ::ng-deep .ant-tabs-content,
      .detail__tabs.is-files-tab ::ng-deep .ant-tabs-tabpane,
      .detail__tabs.is-files-tab ::ng-deep .ant-tabs-tabpane-active {
        height: 100%;
        min-height: 0;
      }
      ::ng-deep .skill-detail-drawer .ant-tabs-content,
      ::ng-deep .skill-detail-drawer .ant-tabs-tabpane {
        min-height: 100%;
      }
      ::ng-deep .skill-detail-drawer .ant-tabs-tabpane-active {
        display: block;
        min-height: 0;
      }
      :host-context(html[data-theme='dark']) .detail,
      :host-context(html[data-theme='dark']) .detail__fixed,
      :host-context(html[data-theme='dark']) .file-tree,
      :host-context(html[data-theme='dark']) .file-content {
        background: var(--bg-container);
        border-color: rgba(148, 163, 184, 0.14);
      }
      :host-context(html[data-theme='dark']) .version-row {
        background: rgba(15, 23, 42, 0.42);
        border-color: rgba(148, 163, 184, 0.14);
      }
      @media (max-width: 768px) {
        .detail__header {
          flex-direction: column;
        }
        .detail__actions {
          justify-content: flex-start;
        }
        .file-browser {
          grid-template-columns: 1fr;
          min-height: auto;
        }
        .file-tree,
        .file-content {
          max-height: 320px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillDetailDrawerComponent {
  readonly open = input(false);
  readonly skill = input<SkillDetailEntity | null>(null);
  readonly comments = input<SkillCommentEntity[]>([]);
  readonly members = input<UserEntity[]>([]);
  readonly commentsLoading = input(false);
  readonly commentBusy = input(false);
  readonly canCreate = input(false);
  readonly canManage = input(false);
  readonly isOwner = input(false);
  readonly close = output<void>();
  readonly uploadVersion = output<SkillDetailEntity>();
  readonly toggleFavorite = output<SkillDetailEntity>();
  readonly archive = output<SkillDetailEntity>();
  readonly deleteSkill = output<SkillDetailEntity>();
  readonly download = output<{ skill: SkillDetailEntity; version: SkillVersionEntity }>();
  readonly submitComment = output<string>();

  readonly drawerBodyStyle = { padding: '0', overflow: 'hidden', background: 'var(--bg-container)', color: 'var(--text-primary)' };
  readonly detailTabIndex = signal(0);
  readonly brokenOwnerAvatarMap = signal<Record<string, true>>({});
  readonly collapsedFileFolders = signal<Record<string, true>>({});
  readonly selectedSkillFilePath = signal<string | null>(null);

  private lastSkillId: string | null = null;

  constructor() {
    effect(() => {
      const skillId = this.skill()?.id ?? null;
      if (skillId === this.lastSkillId) {
        return;
      }
      this.lastSkillId = skillId;
      this.detailTabIndex.set(0);
      this.collapsedFileFolders.set({});
      this.selectedSkillFilePath.set(null);
    });
  }

  canDelete(detail: SkillDetailEntity): boolean {
    if (detail.status === 'archived') {
      return this.canManage();
    }
    if (detail.status !== 'draft') {
      return false;
    }
    return this.isOwner() || this.canManage();
  }

  latestPreview(detail: SkillDetailEntity): SkillVersionEntity | null {
    return detail.versions.find((item) => item.id === detail.latestVersionId)
      ?? detail.versions.find((item) => item.status === 'published')
      ?? detail.versions[0]
      ?? null;
  }

  fileTreeRows(files: SkillFileTreeInput): SkillFileTreeRow[] {
    return this.flattenFileTree(this.buildFileTree(files));
  }

  toggleFileFolder(path: string): void {
    this.collapsedFileFolders.update((state) => {
      if (state[path]) {
        const { [path]: _removed, ...rest } = state;
        return rest;
      }
      return { ...state, [path]: true };
    });
  }

  selectSkillFile(path: string): void {
    this.selectedSkillFilePath.set(path);
  }

  activeSkillFile(files: SkillFileTreeInput): SkillFileEntry | null {
    const selectedPath = this.selectedSkillFilePath();
    return files.find((file) => file.path === selectedPath) ?? files[0] ?? null;
  }

  filePreviewContent(version: SkillVersionEntity, file: SkillFileEntry): string {
    if (typeof file.content === 'string') {
      return file.content;
    }
    if (file.path === version.manifest.validation.skillMdPath) {
      return version.readmeMd;
    }
    return '';
  }

  versionStatusLabel(status: SkillVersionEntity['status']): string {
    return {
      draft: '草稿',
      submitted: '待审核',
      published: '已发布',
      rejected: '已拒绝',
      archived: '已归档',
    }[status];
  }

  versionStatusColor(status: SkillVersionEntity['status']): string {
    return {
      draft: 'gold',
      submitted: 'blue',
      published: 'green',
      rejected: 'red',
      archived: 'default',
    }[status];
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  skillIconType(item: Pick<SkillEntity, 'category' | 'tags'>): string {
    const source = `${item.category} ${item.tags.join(' ')}`.toLowerCase();
    if (source.includes('api')) {
      return 'api';
    }
    if (source.includes('data') || source.includes('db')) {
      return 'database';
    }
    if (source.includes('doc') || source.includes('markdown')) {
      return 'file-text';
    }
    if (source.includes('image') || source.includes('img')) {
      return 'picture';
    }
    if (source.includes('cli') || source.includes('shell')) {
      return 'code';
    }
    return 'appstore';
  }

  skillIconTone(item: Pick<SkillEntity, 'id' | 'category' | 'tags'>): string {
    const source = `${item.category} ${item.tags.join(' ')}`.toLowerCase();
    if (source.includes('api')) {
      return 'purple';
    }
    if (source.includes('data') || source.includes('db')) {
      return 'green';
    }
    if (source.includes('doc') || source.includes('markdown')) {
      return 'blue';
    }
    if (source.includes('image') || source.includes('img')) {
      return 'rose';
    }
    if (source.includes('cli') || source.includes('shell')) {
      return 'cyan';
    }
    return ['blue', 'purple', 'green', 'orange', 'rose', 'cyan', 'indigo'][this.hashText(item.id) % 7];
  }

  avatarTone(item: Pick<SkillEntity, 'ownerUserId' | 'ownerName' | 'id'>): string {
    return `a${(this.hashText(item.ownerUserId || item.ownerName || item.id) % 4) + 1}`;
  }

  avatarText(name: string | null): string {
    const normalized = (name || '作者').trim();
    return normalized.slice(0, 2).toUpperCase();
  }

  showOwnerAvatarImage(item: Pick<SkillEntity, 'id' | 'ownerUserId' | 'ownerAvatarUrl'>): boolean {
    return !!item.ownerAvatarUrl && !this.brokenOwnerAvatarMap()[this.ownerAvatarKey(item)];
  }

  markOwnerAvatarError(item: Pick<SkillEntity, 'id' | 'ownerUserId'>): void {
    const key = this.ownerAvatarKey(item);
    this.brokenOwnerAvatarMap.update((state) => ({ ...state, [key]: true }));
  }

  private ownerAvatarKey(item: Pick<SkillEntity, 'id' | 'ownerUserId'>): string {
    return item.ownerUserId || item.id;
  }

  private hashText(value: string): number {
    return Array.from(value || 'skill').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }

  private buildFileTree(files: SkillFileTreeInput): SkillFileTreeNode[] {
    const root = new Map<string, SkillFileTreeNode>();
    for (const file of files) {
      const parts = file.path.split(/[\\/]+/).filter(Boolean);
      let siblings = root;
      let currentPath = '';
      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        let node = siblings.get(part);
        if (!node) {
          node = {
            key: currentPath,
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            size: isFile ? file.size : 0,
            content: isFile ? file.content ?? null : null,
            contentTruncated: isFile ? file.contentTruncated === true : false,
            children: [],
            childMap: new Map<string, SkillFileTreeNode>(),
          };
          siblings.set(part, node);
        }
        if (isFile) {
          node.type = 'file';
          node.size = file.size;
          node.content = file.content ?? null;
          node.contentTruncated = file.contentTruncated === true;
          return;
        }
        siblings = node.childMap ?? new Map<string, SkillFileTreeNode>();
        node.childMap = siblings;
      });
    }
    return this.normalizeFileTree(Array.from(root.values()));
  }

  private normalizeFileTree(nodes: SkillFileTreeNode[]): SkillFileTreeNode[] {
    return nodes
      .map((node) => ({
        ...node,
        childMap: undefined,
        children: this.normalizeFileTree(Array.from((node.childMap ?? new Map<string, SkillFileTreeNode>()).values())),
      }))
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }

  private flattenFileTree(nodes: SkillFileTreeNode[], level = 0): SkillFileTreeRow[] {
    const rows: SkillFileTreeRow[] = [];
    for (const node of nodes) {
      const expanded = node.type === 'folder' && !this.collapsedFileFolders()[node.path];
      rows.push({
        key: node.key,
        name: node.name,
        path: node.path,
        type: node.type,
        size: node.size,
        content: node.content,
        contentTruncated: node.contentTruncated,
        level,
        expanded,
      });
      if (node.type === 'folder' && expanded) {
        rows.push(...this.flattenFileTree(node.children, level + 1));
      }
    }
    return rows;
  }
}
