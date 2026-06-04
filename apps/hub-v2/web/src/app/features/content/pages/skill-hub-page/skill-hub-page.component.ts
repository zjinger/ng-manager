import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { AuthStore } from '@core/auth';
import { FilterBarComponent, ListStateComponent, MarkdownViewerComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import type { SkillDetailEntity, SkillEntity, SkillStatus, SkillUploadInput, SkillVersionEntity } from '../../models/skill-hub.model';
import { SkillHubApiService } from '../../services/skill-hub-api.service';

type SkillFilterStatus = SkillStatus | 'active';

@Component({
  selector: 'app-skill-hub-page',
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzDrawerModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzTagModule,
    PageHeaderComponent,
    PageToolbarComponent,
    FilterBarComponent,
    SearchBoxComponent,
    ListStateComponent,
    MarkdownViewerComponent,
  ],
  template: `
    <app-page-header title="Skill Hub" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <app-filter-bar toolbar-filters class="skill-toolbar">
        <nz-select
          class="toolbar-select"
          [ngModel]="status()"
          (ngModelChange)="status.set($event)"
          style="width: 132px;"
        >
          <nz-option nzLabel="已发布" nzValue="published"></nz-option>
          <nz-option nzLabel="我的草稿" nzValue="draft"></nz-option>
          <nz-option nzLabel="已归档" nzValue="archived"></nz-option>
        </nz-select>
        <button nz-button class="toolbar-filter-btn" (click)="load(true)">筛选</button>
        <button nz-button nzType="primary" [disabled]="!canCreate()" (click)="openUpload(null)">
          <nz-icon nzType="upload" nzTheme="outline" />
          上传 Skill
        </button>
      </app-filter-bar>
      <app-search-box
        toolbar-search
        class="toolbar-search"
        placeholder="搜索名称、slug 或描述"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="load(true)"
      />
    </app-page-toolbar>

    <app-list-state
      [loading]="loading()"
      [empty]="items().length === 0"
      loadingText="正在加载 Skill..."
      emptyTitle="暂无 Skill"
      emptyDescription="调整筛选条件或上传新的 Skill。"
    >
      <div class="skill-grid">
        @for (item of items(); track item.id) {
          <article class="skill-card" [class.is-selected]="selected()?.id === item.id" (click)="openDetail(item)">
            <div class="skill-card__head">
              <div>
                <h3>{{ item.name }}</h3>
                <p>{{ item.slug }}</p>
              </div>
              <nz-tag [nzColor]="skillStatusColor(item.status)">{{ skillStatusLabel(item.status) }}</nz-tag>
            </div>
            <p class="skill-card__desc">{{ item.description }}</p>
            <div class="skill-card__meta">
              <span>{{ item.category || 'general' }}</span>
              <span>{{ item.latestVersion || '未发布' }}</span>
              <span>{{ item.ownerName || '未知作者' }}</span>
            </div>
            @if (item.tags.length > 0) {
              <div class="skill-card__tags">
                @for (tag of item.tags; track tag) {
                  <nz-tag>{{ tag }}</nz-tag>
                }
              </div>
            }
          </article>
        }
      </div>
    </app-list-state>

    <nz-drawer
      [nzVisible]="detailOpen()"
      nzPlacement="right"
      [nzWidth]="720"
      [nzClosable]="true"
      nzTitle="Skill 详情"
      (nzOnClose)="closeDetail()"
    >
      <ng-template nzDrawerContent>
        @if (selected(); as detail) {
          <div class="detail">
            <header class="detail__header">
              <div>
                <h2>{{ detail.name }}</h2>
                <p>{{ detail.description }}</p>
              </div>
              <div class="detail__actions">
                @if (canCreate() && isOwner(detail)) {
                  <button nz-button (click)="openUpload(detail)">
                    <nz-icon nzType="plus" nzTheme="outline" />
                    新版本
                  </button>
                }
                @if (canManage() && detail.status !== 'archived') {
                  <button nz-button nzDanger (click)="archive(detail)">
                    <nz-icon nzType="stop" nzTheme="outline" />
                    归档
                  </button>
                }
              </div>
            </header>

            <section class="detail__section">
              <h3>版本</h3>
              <div class="version-list">
                @for (version of detail.versions; track version.id) {
                  <div class="version-row">
                    <div>
                      <strong>{{ version.version }}</strong>
                      <nz-tag [nzColor]="versionStatusColor(version.status)">{{ versionStatusLabel(version.status) }}</nz-tag>
                      <span>{{ version.fileCount }} files · {{ formatSize(version.packageSize) }}</span>
                    </div>
                    <div class="version-row__actions">
                      @if (version.status === 'published') {
                        <button nz-button nzSize="small" (click)="download(detail, version)">
                          <nz-icon nzType="download" nzTheme="outline" />
                          下载
                        </button>
                      }
                      @if ((version.status === 'draft' || version.status === 'rejected') && isOwner(detail)) {
                        <button nz-button nzSize="small" (click)="submit(detail, version)">提交</button>
                      }
                      @if ((version.status === 'submitted' || version.status === 'draft') && canReview()) {
                        <button nz-button nzSize="small" nzType="primary" (click)="publish(detail, version)">发布</button>
                        <button nz-button nzSize="small" nzDanger (click)="openReject(detail, version)">拒绝</button>
                      }
                    </div>
                    @if (version.reviewComment) {
                      <p class="version-row__comment">{{ version.reviewComment }}</p>
                    }
                  </div>
                }
              </div>
            </section>

            @if (latestPreview(detail); as preview) {
              <section class="detail__section">
                <h3>SKILL.md</h3>
                <app-markdown-viewer [content]="preview.readmeMd" [showToc]="false" />
              </section>
              <section class="detail__section">
                <h3>包结构</h3>
                <div class="file-list">
                  @for (file of preview.manifest.files.slice(0, 60); track file.path) {
                    <span>{{ file.path }}</span>
                  }
                </div>
              </section>
            }
          </div>
        }
      </ng-template>
    </nz-drawer>

    <nz-modal
      [nzVisible]="uploadOpen()"
      [nzTitle]="uploadTarget() ? '上传新版本' : '上传 Skill'"
      [nzOkLoading]="busy()"
      nzOkText="保存草稿"
      nzCancelText="取消"
      (nzOnCancel)="closeUpload()"
      (nzOnOk)="saveUpload()"
    >
      <ng-template nzModalContent>
        <div class="upload-form">
          <label>
            <span>Zip 包</span>
            <input type="file" accept=".zip,application/zip" (change)="onFileChange($event)" />
          </label>
          <label>
            <span>版本</span>
            <input nz-input [ngModel]="uploadVersion()" (ngModelChange)="uploadVersion.set($event)" placeholder="0.1.0" />
          </label>
          <label>
            <span>分类</span>
            <input nz-input [ngModel]="uploadCategory()" (ngModelChange)="uploadCategory.set($event)" placeholder="general" />
          </label>
          <label>
            <span>标签</span>
            <input nz-input [ngModel]="uploadTags()" (ngModelChange)="uploadTags.set($event)" placeholder="api, docs" />
          </label>
        </div>
      </ng-template>
    </nz-modal>

    <nz-modal
      [nzVisible]="rejectOpen()"
      nzTitle="拒绝版本"
      [nzOkLoading]="busy()"
      nzOkText="确认拒绝"
      nzCancelText="取消"
      (nzOnCancel)="closeReject()"
      (nzOnOk)="reject()"
    >
      <ng-template nzModalContent>
        <textarea
          nz-input
          rows="4"
          [ngModel]="rejectComment()"
          (ngModelChange)="rejectComment.set($event)"
          placeholder="填写拒绝原因"
        ></textarea>
      </ng-template>
    </nz-modal>
  `,
  styles: [
    `
      .skill-toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .skill-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 14px;
      }
      .skill-card {
        min-height: 188px;
        display: grid;
        gap: 12px;
        padding: 16px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--surface);
        cursor: pointer;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
      }
      .skill-card:hover,
      .skill-card.is-selected {
        border-color: var(--color-primary);
        box-shadow: var(--shadow-sm);
      }
      .skill-card__head {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .skill-card h3,
      .detail h2,
      .detail h3 {
        margin: 0;
        color: var(--text-primary);
      }
      .skill-card__head p,
      .detail__header p {
        margin: 4px 0 0;
        color: var(--text-secondary);
        font-size: 12px;
      }
      .skill-card__desc {
        margin: 0;
        min-height: 42px;
        color: var(--text-secondary);
        line-height: 1.6;
      }
      .skill-card__meta,
      .skill-card__tags {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        color: var(--text-secondary);
        font-size: 12px;
      }
      .detail {
        display: grid;
        gap: 20px;
      }
      .detail__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
      }
      .detail__actions,
      .version-row__actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .detail__section {
        display: grid;
        gap: 12px;
      }
      .version-list {
        display: grid;
        gap: 10px;
      }
      .version-row {
        display: grid;
        gap: 8px;
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--surface-subtle);
      }
      .version-row > div:first-child {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .version-row__comment {
        margin: 0;
        color: var(--danger-color);
        font-size: 12px;
      }
      .file-list {
        display: grid;
        gap: 6px;
        max-height: 220px;
        overflow: auto;
        padding: 12px;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background: var(--surface-subtle);
        font-family: var(--font-mono);
        font-size: 12px;
      }
      .upload-form {
        display: grid;
        gap: 14px;
      }
      .upload-form label {
        display: grid;
        gap: 6px;
      }
      .upload-form span {
        color: var(--text-secondary);
        font-size: 13px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillHubPageComponent {
  private readonly api = inject(SkillHubApiService);
  private readonly authStore = inject(AuthStore);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);

  readonly keyword = signal('');
  readonly status = signal<SkillFilterStatus>('published');
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly items = signal<SkillEntity[]>([]);
  readonly total = signal(0);
  readonly selected = signal<SkillDetailEntity | null>(null);
  readonly detailOpen = signal(false);
  readonly uploadOpen = signal(false);
  readonly uploadTarget = signal<SkillDetailEntity | null>(null);
  readonly uploadFile = signal<File | null>(null);
  readonly uploadVersion = signal('');
  readonly uploadCategory = signal('general');
  readonly uploadTags = signal('');
  readonly rejectOpen = signal(false);
  readonly rejectTarget = signal<{ skill: SkillDetailEntity; version: SkillVersionEntity } | null>(null);
  readonly rejectComment = signal('');

  readonly subtitle = computed(() => `公司共享 Skill · ${this.total()} 条`);
  readonly canCreate = computed(() => this.hasPermission('skill.create') || this.hasPermission('skill.manage'));
  readonly canReview = computed(() => this.hasPermission('skill.review') || this.hasPermission('skill.manage'));
  readonly canManage = computed(() => this.hasPermission('skill.manage'));

  constructor() {
    this.load();
  }

  load(force = false): void {
    void force;
    this.loading.set(true);
    this.api
      .list({
        page: 1,
        pageSize: 40,
        keyword: this.keyword().trim(),
        status: this.status(),
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => {
          this.items.set([]);
          this.total.set(0);
          this.loading.set(false);
        },
      });
  }

  openDetail(item: SkillEntity): void {
    this.loading.set(true);
    this.api.getById(item.id).subscribe({
      next: (detail) => {
        this.selected.set(detail);
        this.detailOpen.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.message.error('Skill 详情加载失败');
      },
    });
  }

  closeDetail(): void {
    this.detailOpen.set(false);
  }

  openUpload(target: SkillDetailEntity | null): void {
    this.uploadTarget.set(target);
    this.uploadFile.set(null);
    this.uploadVersion.set('');
    this.uploadCategory.set(target?.category || 'general');
    this.uploadTags.set(target?.tags.join(', ') || '');
    this.uploadOpen.set(true);
  }

  closeUpload(): void {
    this.uploadOpen.set(false);
    this.uploadTarget.set(null);
    this.uploadFile.set(null);
  }

  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.uploadFile.set(input?.files?.[0] ?? null);
  }

  saveUpload(): void {
    const file = this.uploadFile();
    if (!file) {
      this.message.warning('请选择 zip 包');
      return;
    }
    const payload: SkillUploadInput = {
      file,
      version: this.uploadVersion(),
      category: this.uploadCategory(),
      tags: this.uploadTags(),
    };
    const target = this.uploadTarget();
    this.busy.set(true);
    const request = target ? this.api.createVersion(target.id, payload) : this.api.create(payload);
    request.subscribe({
      next: (detail) => {
        this.busy.set(false);
        this.closeUpload();
        this.selected.set(detail);
        this.detailOpen.set(true);
        this.load(true);
        this.message.success('Skill 草稿已保存');
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  submit(skill: SkillDetailEntity, version: SkillVersionEntity): void {
    this.busy.set(true);
    this.api.submit(skill.id, version.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.refreshDetail(skill.id);
        this.message.success('版本已提交');
      },
      error: () => this.busy.set(false),
    });
  }

  publish(skill: SkillDetailEntity, version: SkillVersionEntity): void {
    this.modal.confirm({
      nzTitle: `发布 ${skill.name} ${version.version}`,
      nzOkText: '发布',
      nzCancelText: '取消',
      nzOnOk: () => {
        this.busy.set(true);
        this.api.publish(skill.id, version.id).subscribe({
          next: (detail) => {
            this.busy.set(false);
            this.selected.set(detail);
            this.load(true);
            this.message.success('Skill 已发布');
          },
          error: () => this.busy.set(false),
        });
      },
    });
  }

  openReject(skill: SkillDetailEntity, version: SkillVersionEntity): void {
    this.rejectTarget.set({ skill, version });
    this.rejectComment.set('');
    this.rejectOpen.set(true);
  }

  closeReject(): void {
    this.rejectOpen.set(false);
    this.rejectTarget.set(null);
    this.rejectComment.set('');
  }

  reject(): void {
    const target = this.rejectTarget();
    const comment = this.rejectComment().trim();
    if (!target || !comment) {
      this.message.warning('请填写拒绝原因');
      return;
    }
    this.busy.set(true);
    this.api.reject(target.skill.id, target.version.id, comment).subscribe({
      next: () => {
        this.busy.set(false);
        this.closeReject();
        this.refreshDetail(target.skill.id);
        this.message.success('版本已拒绝');
      },
      error: () => this.busy.set(false),
    });
  }

  archive(skill: SkillDetailEntity): void {
    this.modal.confirm({
      nzTitle: `归档 ${skill.name}`,
      nzOkText: '归档',
      nzCancelText: '取消',
      nzOkDanger: true,
      nzOnOk: () => {
        this.busy.set(true);
        this.api.archive(skill.id).subscribe({
          next: () => {
            this.busy.set(false);
            this.closeDetail();
            this.load(true);
            this.message.success('Skill 已归档');
          },
          error: () => this.busy.set(false),
        });
      },
    });
  }

  download(skill: SkillDetailEntity, version: SkillVersionEntity): void {
    window.open(this.api.downloadUrl(skill.id, version.id), '_blank', 'noopener');
  }

  refreshDetail(skillId: string): void {
    this.api.getById(skillId).subscribe({
      next: (detail) => this.selected.set(detail),
    });
  }

  latestPreview(detail: SkillDetailEntity): SkillVersionEntity | null {
    return detail.versions.find((item) => item.id === detail.latestVersionId)
      ?? detail.versions.find((item) => item.status === 'published')
      ?? detail.versions[0]
      ?? null;
  }

  isOwner(detail: SkillDetailEntity): boolean {
    const user = this.authStore.currentUser();
    const ids = new Set([user?.id?.trim(), user?.userId?.trim()].filter((item): item is string => !!item));
    return !!detail.ownerUserId && ids.has(detail.ownerUserId);
  }

  skillStatusLabel(status: SkillStatus): string {
    return { draft: '草稿', published: '已发布', archived: '已归档' }[status];
  }

  skillStatusColor(status: SkillStatus): string {
    return { draft: 'gold', published: 'green', archived: 'default' }[status];
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

  private hasPermission(code: string): boolean {
    return this.authStore.currentUser()?.permissionCodes.includes(code) ?? false;
  }
}

