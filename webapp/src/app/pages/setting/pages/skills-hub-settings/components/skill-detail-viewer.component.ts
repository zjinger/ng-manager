import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTreeModule, type NzFormatEmitEvent, type NzTreeNodeOptions } from 'ng-zorro-antd/tree';

import { MarkdownViewerComponent } from '@app/shared/components/markdown-viewer';
import type { SkillDetailEntity, SkillEntity, SkillVersionEntity } from '../models/skill-hub.model';

type SkillFileEntry = { path: string; size: number; content?: string | null; contentTruncated?: boolean };

@Component({
  selector: 'app-skill-detail-viewer',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzDrawerModule,
    NzIconModule,
    NzTabsModule,
    NzTagModule,
    NzTreeModule,
    MarkdownViewerComponent,
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
                      <span class="skill-author-avatar" [ngClass]="avatarTone(detail)">{{ avatarText(detail.ownerName) }}</span>
                      <span>{{ detail.ownerName || '未知作者' }}</span>
                      <span>·</span>
                      <span>{{ detail.slug }}</span>
                    </div>
                  </div>
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
                          <nz-tree
                            [nzData]="fileTreeData()"
                            [nzSelectedKeys]="selectedFileKeys()"
                            [nzShowIcon]="true"
                            [nzShowExpand]="true"
                            [nzShowLine]="false"
                            (nzClick)="onFileTreeClick($event)"
                          ></nz-tree>
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
              </nz-tabset>
            </section>
          </div>
        }
      </ng-template>
    </nz-drawer>
  `,
  styles: [`
    :host { display: contents; }
    .detail { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; color: var(--app-text-color); background: var(--app-component-bg); }
    .detail__fixed { flex: 0 0 auto; border-bottom: 1px solid var(--app-border-color); background: var(--app-component-bg); }
    .detail__header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; padding: 26px 24px; }
    .drawer-hero-main { display: flex; align-items: flex-start; gap: 16px; min-width: 0; }
    .drawer-hero-icon { width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 14px; font-size: 24px; }
    .drawer-hero-copy { min-width: 0; }
    .drawer-hero-copy h2, .detail__section h3 { margin: 0; color: var(--app-text-color); }
    .drawer-hero-copy h2 { font-size: 18px; font-weight: 700; }
    .drawer-hero-copy p { margin: 8px 0 0; color: var(--app-text-secondary); line-height: 1.6; }
    .drawer-hero-author { display: flex; align-items: center; gap: 6px; margin-top: 8px; color: var(--app-text-secondary); font-size: 13px; }
    .skill-author-avatar { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; color: #fff; font-size: 11px; font-weight: 700; }
    .detail__section { padding: 0 24px 18px; }
    .detail__section h3 { margin-bottom: 10px; font-size: 14px; font-weight: 700; }
    .version-list { display: grid; gap: 8px; }
    .version-row { display: grid; grid-template-columns: minmax(0, 1fr) max-content; align-items: center; gap: 12px; padding: 12px 14px; border: 1px solid var(--app-border-color); border-radius: 8px; background: #fafafa; }
    .version-row__meta { display: flex; align-items: center; gap: 10px; min-width: 0; white-space: nowrap; }
    .version-row__meta > span { color: var(--app-text-secondary); }
    .version-row__actions { display: flex; align-items: center; justify-content: flex-end; }
    .detail__tabs { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden; padding: 0 24px 22px; }
    .detail__tabs nz-tabset { flex: 1 1 auto; height: 100%; min-height: 0; display: flex; flex-direction: column; }
    .tab-pane { min-height: 100%; height: auto; overflow: visible; padding: 16px 0 24px; }
    .tab-pane--files { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; padding-bottom: 0; }
    .empty-panel { margin: 0; padding: 24px; color: var(--text-color-gray); text-align: center; }
    .file-browser { display: grid; grid-template-columns: minmax(220px, 280px) minmax(0, 1fr); gap: 14px; flex: 1 1 auto; min-height: 0; height: 100%; }
    .file-tree { min-height: 0; border: 1px solid var(--app-border-color); border-radius: 8px; background: var(--app-component-bg); overflow: auto; padding: 4px 0; }
    .file-content { min-height: 0; display: flex; flex-direction: column; overflow: hidden; border: 1px solid var(--app-border-color); border-radius: 8px; background: var(--app-component-bg); }
    .file-content__header { flex: 0 0 auto; padding: 12px 14px; border-bottom: 1px solid var(--app-border-color); }
    .file-content__header div { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-width: 0; }
    .file-content__header strong { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .file-content__header span { flex-shrink: 0; color: var(--text-color-gray); font-size: 12px; }
    .file-content__body { flex: 1 1 auto; min-height: 0; margin: 0; padding: 14px; overflow: auto; color: var(--app-text-secondary); background: transparent; font-size: 12px; line-height: 1.7; white-space: pre-wrap; }
    .file-content__hint, .file-browser__hint { flex: 0 0 auto; margin: 8px 0 0; color: var(--text-color-gray); font-size: 12px; }
    .blue { background: #eff6ff; color: #2563eb; }
    .purple { background: #f3e8ff; color: #7c3aed; }
    .green { background: #ecfdf5; color: #059669; }
    .orange { background: #fffbeb; color: #d97706; }
    .rose { background: #fff1f2; color: #e11d48; }
    .cyan { background: #ecfeff; color: #0891b2; }
    .indigo { background: #eef2ff; color: #4f46e5; }
    .a1 { background: linear-gradient(135deg, #14b8a6, #0ea5e9); }
    .a2 { background: linear-gradient(135deg, #8b5cf6, #ec4899); }
    .a3 { background: linear-gradient(135deg, #f97316, #ef4444); }
    .a4 { background: linear-gradient(135deg, #22c55e, #84cc16); }
    .version-status.is-archived, :host ::ng-deep .version-status.is-archived { background: rgba(239, 68, 68, 0.22) !important; color: #fca5a5 !important; border-color: rgba(248, 113, 113, 0.28) !important; }
    ::ng-deep .skill-detail-drawer .ant-drawer-content, ::ng-deep .skill-detail-drawer .ant-drawer-wrapper-body { height: 100%; min-height: 0; }
    ::ng-deep .skill-detail-drawer .ant-drawer-wrapper-body { display: flex; flex-direction: column; }
    ::ng-deep .skill-detail-drawer .ant-drawer-body { flex: 1 1 auto; min-height: 0; overflow: hidden !important; }
    ::ng-deep .skill-detail-drawer .ant-tabs { height: 100%; display: flex; flex-direction: column; }
    ::ng-deep .skill-detail-drawer .ant-tabs-nav { flex: 0 0 auto; }
    ::ng-deep .skill-detail-drawer .ant-tabs-content-holder { flex: 1 1 auto; min-height: 0; overflow-x: hidden; overflow-y: auto; }
    .detail__tabs.is-files-tab ::ng-deep .ant-tabs-content-holder { overflow: hidden; }
    .detail__tabs.is-files-tab ::ng-deep .ant-tabs-content, .detail__tabs.is-files-tab ::ng-deep .ant-tabs-tabpane, .detail__tabs.is-files-tab ::ng-deep .ant-tabs-tabpane-active { height: 100%; min-height: 0; }
    ::ng-deep .skill-detail-drawer .ant-tabs-content, ::ng-deep .skill-detail-drawer .ant-tabs-tabpane { min-height: 100%; }
    ::ng-deep .skill-detail-drawer .ant-tabs-tabpane-active { display: block; min-height: 0; }
    :host-context(html[data-theme='dark']) .detail, :host-context(html[data-theme='dark']) .detail__fixed, :host-context(html[data-theme='dark']) .file-tree, :host-context(html[data-theme='dark']) .file-content { background: var(--app-component-bg); border-color: rgba(148, 163, 184, 0.14); }
    :host-context(html[data-theme='dark']) .version-row { background: rgba(15, 23, 42, 0.42); border-color: rgba(148, 163, 184, 0.14); }
    @media (max-width: 768px) {
      .detail__header { flex-direction: column; }
      .file-browser { grid-template-columns: 1fr; min-height: auto; }
      .file-tree, .file-content { max-height: 320px; }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillDetailViewerComponent {
  readonly open = input(false);
  readonly skill = input<SkillDetailEntity | null>(null);
  readonly close = output<void>();
  readonly download = output<{ skill: SkillDetailEntity; version: SkillVersionEntity }>();

  readonly drawerBodyStyle = { padding: '0', overflow: 'hidden', background: 'var(--app-component-bg)', color: 'var(--app-text-color)' };
  readonly detailTabIndex = signal(0);
  readonly selectedSkillFilePath = signal<string | null>(null);
  readonly fileTreeData = signal<NzTreeNodeOptions[]>([]);
  readonly selectedFileKeys = signal<string[]>([]);

  private fileMap = new Map<string, SkillFileEntry>();
  private lastSkillId: string | null = null;

  constructor() {
    effect(() => {
      const detail = this.skill();
      const skillId = detail?.id ?? null;
      if (skillId === this.lastSkillId) return;
      this.lastSkillId = skillId;
      this.detailTabIndex.set(0);
      this.selectedSkillFilePath.set(null);
      this.fileMap.clear();

      if (detail) {
        const preview = this.latestPreview(detail);
        const files = preview?.manifest.files.slice(0, 120) ?? [];
        this.buildTreeData(files);
      } else {
        this.fileTreeData.set([]);
        this.selectedFileKeys.set([]);
      }
    });
  }

  latestPreview(detail: SkillDetailEntity): SkillVersionEntity | null {
    return detail.versions.find((item) => item.id === detail.latestVersionId)
      ?? detail.versions.find((item) => item.status === 'published')
      ?? detail.versions[0]
      ?? null;
  }

  activeSkillFile(files: SkillFileEntry[]): SkillFileEntry | null {
    return files.find((file) => file.path === this.selectedSkillFilePath()) ?? files[0] ?? null;
  }

  filePreviewContent(version: SkillVersionEntity, file: SkillFileEntry): string {
    if (typeof file.content === 'string') return file.content;
    if (file.path === version.manifest.validation.skillMdPath) return version.readmeMd;
    return '';
  }

  onFileTreeClick(event: NzFormatEmitEvent): void {
    const node = event.node;
    if (node && node.isLeaf) {
      this.selectedSkillFilePath.set(node.key);
      this.selectedFileKeys.set([node.key]);
    }
  }

  buildTreeData(files: SkillFileEntry[]): void {
    this.fileMap.clear();
    for (const file of files) {
      this.fileMap.set(file.path, file);
    }
    this.fileTreeData.set(this.toNzTreeNodes(files));
    const firstFile = files.find((f) => !f.path.includes('/') || f.path.endsWith('.md'));
    if (firstFile) {
      this.selectedSkillFilePath.set(firstFile.path);
      this.selectedFileKeys.set([firstFile.path]);
    }
  }

  versionStatusLabel(status: SkillVersionEntity['status']): string {
    return { draft: '草稿', submitted: '待审核', published: '已发布', rejected: '已拒绝', archived: '已归档' }[status];
  }

  versionStatusColor(status: SkillVersionEntity['status']): string {
    return { draft: 'gold', submitted: 'blue', published: 'green', rejected: 'red', archived: 'default' }[status];
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  skillIconType(item: Pick<SkillEntity, 'category' | 'tags'>): string {
    const source = `${item.category} ${item.tags.join(' ')}`.toLowerCase();
    if (source.includes('api')) return 'api';
    if (source.includes('data') || source.includes('db')) return 'database';
    if (source.includes('doc') || source.includes('markdown')) return 'file-text';
    if (source.includes('image') || source.includes('img')) return 'picture';
    if (source.includes('cli') || source.includes('shell')) return 'code';
    return 'appstore';
  }

  skillIconTone(item: Pick<SkillEntity, 'id' | 'category' | 'tags'>): string {
    const source = `${item.category} ${item.tags.join(' ')}`.toLowerCase();
    if (source.includes('api')) return 'purple';
    if (source.includes('data') || source.includes('db')) return 'green';
    if (source.includes('doc') || source.includes('markdown')) return 'blue';
    if (source.includes('image') || source.includes('img')) return 'rose';
    if (source.includes('cli') || source.includes('shell')) return 'cyan';
    return ['blue', 'purple', 'green', 'orange', 'rose', 'cyan', 'indigo'][this.hashText(item.id) % 7];
  }

  avatarTone(item: Pick<SkillEntity, 'ownerUserId' | 'ownerName' | 'id'>): string {
    return `a${(this.hashText(item.ownerUserId || item.ownerName || item.id) % 4) + 1}`;
  }

  avatarText(name: string | null): string {
    const n = (name || '作者').trim();
    return n.slice(-1);
  }

  private ownerAvatarKey(item: Pick<SkillEntity, 'id' | 'ownerUserId'>): string {
    return item.ownerUserId || item.id;
  }

  private hashText(value: string): number {
    return Array.from(value || 'skill').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }

  private toNzTreeNodes(files: SkillFileEntry[]): NzTreeNodeOptions[] {
    const root = new Map<string, { name: string; path: string; isFolder: boolean; size: number; children: Map<string, any> }>();

    for (const file of files) {
      const parts = file.path.split(/[\\/]+/).filter(Boolean);
      let current = root;
      let currentPath = '';

      parts.forEach((part, index) => {
        const isLast = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        if (!current.has(part)) {
          current.set(part, {
            name: part,
            path: currentPath,
            isFolder: !isLast,
            size: isLast ? file.size : 0,
            children: new Map(),
          });
        }

        const node = current.get(part)!;
        if (isLast) {
          node.isFolder = false;
          node.size = file.size;
        }
        current = node.children;
      });
    }

    const toNodes = (map: Map<string, any>): NzTreeNodeOptions[] => {
      const entries = Array.from(map.values());
      entries.sort((a, b) => {
        if (a.isFolder !== b.isFolder) return a.isFolder ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

      return entries.map((entry) => {
        if (entry.isFolder || entry.children.size > 0) {
          return {
            title: entry.name,
            key: entry.path,
            icon: 'folder',
            isLeaf: false,
            expanded: true,
            children: toNodes(entry.children),
          };
        }
        return {
          title: entry.name,
          key: entry.path,
          icon: 'file-text',
          isLeaf: true,
        };
      });
    };

    return toNodes(root);
  }
}
