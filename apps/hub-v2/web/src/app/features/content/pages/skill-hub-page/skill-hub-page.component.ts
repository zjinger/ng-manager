import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { AuthStore } from '@core/auth';
import {
  FilterBarComponent,
  ListStateComponent,
  PageHeaderComponent,
  PageToolbarComponent,
  SearchBoxComponent,
} from '@shared/ui';
import type { UserEntity } from '../../../users/models/user.model';
import { UserApiService } from '../../../users/services/user-api.service';
import { SkillDetailDrawerComponent } from '../../components/skill-detail-drawer/skill-detail-drawer.component';
import { SKILL_CATEGORY_OPTIONS } from '../../constants/skill-hub-options';
import { SkillEditDialogComponent } from '../../dialogs/skill-edit-dialog/skill-edit-dialog.component';
import { SkillUploadDialogComponent } from '../../dialogs/skill-upload-dialog/skill-upload-dialog.component';
import type {
  SkillCommentEntity,
  SkillDetailEntity,
  SkillEntity,
  SkillStatus,
  SkillUpdateInput,
  SkillUploadInput,
  SkillVersionEntity,
} from '../../models/skill-hub.model';
import { SkillHubApiService } from '../../services/skill-hub-api.service';

type SkillFilterStatus = Extract<SkillStatus, 'published' | 'archived'>;

@Component({
  selector: 'app-skill-hub-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzPaginationModule,
    NzSelectModule,
    NzTagModule,
    PageHeaderComponent,
    PageToolbarComponent,
    FilterBarComponent,
    SearchBoxComponent,
    ListStateComponent,
    SkillDetailDrawerComponent,
    SkillEditDialogComponent,
    SkillUploadDialogComponent,
  ],
  template: `
    <app-page-header title="SKILL HUB" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <app-filter-bar toolbar-filters class="skill-toolbar">
        <button nz-button nzType="primary" [disabled]="!canCreate()" (click)="openUpload(null)">
          <nz-icon nzType="upload" nzTheme="outline" />
          上传 SKILL
        </button>
        <nz-select
          class="toolbar-select"
          [ngModel]="status()"
          (ngModelChange)="setStatus($event)"
          style="width: 132px;"
        >
          <nz-option nzLabel="已发布" nzValue="published"></nz-option>
          <nz-option nzLabel="已归档" nzValue="archived"></nz-option>
        </nz-select>
        <nz-select
          class="toolbar-select"
          [ngModel]="category()"
          (ngModelChange)="setCategory($event)"
          nzAllowClear
          nzPlaceHolder="分类"
          style="width: 156px;"
        >
          @for (item of categoryOptions; track item.value) {
            <nz-option
              [nzLabel]="categoryLabel(item.value, item.label)"
              [nzValue]="item.value"
            ></nz-option>
          }
        </nz-select>
        <button nz-button class="toolbar-filter-btn" (click)="load(true)">筛选</button>
      </app-filter-bar>
      <app-search-box
        toolbar-search
        class="toolbar-search"
        placeholder="搜索名称、标签、描述"
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
          <article
            class="skill-card"
            [class.is-selected]="selected()?.id === item.id"
            (click)="openDetail(item)"
          >
            <div class="skill-card-header">
              <div class="skill-icon" [ngClass]="skillIconTone(item)">
                <nz-icon [nzType]="skillIconType(item)" nzTheme="outline" />
              </div>
              <div class="skill-card-info">
                <h3 class="skill-card-title">
                  <span class="skill-card-title-text">{{ item.name }}</span>
                  <span class="skill-stat version">{{ item.latestVersion || '未发布' }}</span>
                </h3>
                <div class="skill-card-author">
                  <span class="skill-card-author-avatar" [ngClass]="avatarTone(item)">
                    @if (showOwnerAvatarImage(item)) {
                      <img
                        [src]="item.ownerAvatarUrl!"
                        [alt]="item.ownerName || '作者头像'"
                        (error)="markOwnerAvatarError(item)"
                      />
                    } @else {
                      {{ avatarText(item.ownerName) }}
                    }
                  </span>
                  <span>{{ item.ownerName || '未知作者' }}</span>
                </div>
              </div>
              <nz-tag
                class="skill-status"
                [class.is-archived]="item.status === 'archived'"
                [nzColor]="skillStatusColor(item)"
              >
                {{ skillStatusLabel(item) }}
              </nz-tag>
            </div>
            <p class="skill-card-desc">{{ cardDescription(item) }}</p>
            <div class="skill-card-footer">
              <div class="skill-card-meta">
                <!-- <div class="skill-category-row">
                  <span class="skill-category-label">分类</span>
                  <span class="skill-category-value">{{ skillCategoryLabel(item.category) }}</span>
                </div> -->
                @if (item.tags.length > 0) {
                  <div class="skill-tag-row" aria-label="标签">
                    @for (tag of item.tags.slice(0, 4); track tag) {
                      <span class="skill-tag" [ngClass]="tagTone(tag)">{{ tag }}</span>
                    }
                  </div>
                }
              </div>
              <span class="skill-card-updated"> {{ item.updatedAt | date: 'MM-dd HH:mm' }}</span>
            </div>
          </article>
        }
      </div>

      @if (total() > 0) {
        <div class="skill-pagination">
          <nz-pagination
            [nzTotal]="total()"
            [nzPageIndex]="page()"
            [nzPageSize]="pageSize()"
            [nzPageSizeOptions]="[12, 24, 48, 96]"
            [nzShowSizeChanger]="true"
            [nzShowQuickJumper]="true"
            [nzShowTotal]="totalTpl"
            (nzPageIndexChange)="onPageIndexChange($event)"
            (nzPageSizeChange)="onPageSizeChange($event)"
          ></nz-pagination>
          <ng-template #totalTpl let-total>共 {{ total }} 条</ng-template>
        </div>
      }
    </app-list-state>

    <app-skill-detail-drawer
      [open]="detailOpen()"
      [skill]="selected()"
      [comments]="comments()"
      [members]="members()"
      [commentsLoading]="commentsLoading()"
      [commentBusy]="commentBusy()"
      [canCreate]="canCreate()"
      [canManage]="canManage()"
      [isOwner]="selectedIsOwner()"
      (close)="closeDetail()"
      (uploadVersion)="openUpload($event)"
      (editSkill)="openEdit($event)"
      (toggleFavorite)="toggleFavorite($event)"
      (archive)="archive($event)"
      (deleteSkill)="deleteSkill($event)"
      (download)="download($event.skill, $event.version)"
      (submitComment)="createComment($event)"
    />

    <app-skill-upload-dialog
      [open]="uploadOpen()"
      [busy]="busy()"
      [target]="uploadTarget()"
      (cancel)="closeUpload()"
      (create)="saveUpload($event)"
    />

    <app-skill-edit-dialog
      [open]="editOpen()"
      [busy]="busy()"
      [skill]="editTarget()"
      (cancel)="closeEdit()"
      (save)="saveEdit($event)"
    />
  `,
  styleUrls: ['./skill-hub-page.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillHubPageComponent {
  private readonly api = inject(SkillHubApiService);
  private readonly userApi = inject(UserApiService);
  private readonly authStore = inject(AuthStore);
  private readonly message = inject(NzMessageService);

  readonly categoryOptions = SKILL_CATEGORY_OPTIONS;
  readonly keyword = signal('');
  readonly status = signal<SkillFilterStatus>('published');
  readonly category = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(24);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly items = signal<SkillEntity[]>([]);
  readonly total = signal(0);
  readonly categories = signal<Array<{ name: string; count: number }>>([]);
  readonly members = signal<UserEntity[]>([]);
  readonly selected = signal<SkillDetailEntity | null>(null);
  readonly detailOpen = signal(false);
  readonly uploadOpen = signal(false);
  readonly uploadTarget = signal<SkillDetailEntity | null>(null);
  readonly editOpen = signal(false);
  readonly editTarget = signal<SkillDetailEntity | null>(null);
  readonly comments = signal<SkillCommentEntity[]>([]);
  readonly commentsLoading = signal(false);
  readonly commentBusy = signal(false);
  readonly brokenOwnerAvatarMap = signal<Record<string, true>>({});

  readonly subtitle = computed(() => `公司共享 Skill · ${this.total()} 条`);
  readonly canCreate = computed(
    () => this.hasPermission('skill.create') || this.hasPermission('skill.manage'),
  );
  readonly canManage = computed(() => this.hasPermission('skill.manage'));
  readonly selectedIsOwner = computed(() => {
    const detail = this.selected();
    return detail ? this.isOwner(detail) : false;
  });

  constructor() {
    this.load();
    this.loadMembers();
  }

  load(resetPage = false): void {
    if (resetPage) {
      this.page.set(1);
    }
    this.loading.set(true);
    this.api
      .list({
        page: this.page(),
        pageSize: this.pageSize(),
        keyword: this.keyword().trim() || undefined,
        status: this.status(),
        category: this.category() || undefined,
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
    this.loadMeta();
  }

  loadMeta(): void {
    this.api
      .meta({
        keyword: this.keyword().trim() || undefined,
        status: this.status(),
      })
      .subscribe({
        next: (result) => this.categories.set(result.categories),
      });
  }

  setStatus(value: SkillFilterStatus): void {
    this.status.set(value);
    this.load(true);
  }

  setCategory(value: string | null): void {
    this.category.set(value || '');
    this.load(true);
  }

  onPageIndexChange(page: number): void {
    this.page.set(page);
    this.load();
  }

  onPageSizeChange(pageSize: number): void {
    this.pageSize.set(pageSize);
    this.page.set(1);
    this.load();
  }

  openDetail(item: SkillEntity): void {
    this.api.getById(item.id).subscribe({
      next: (detail) => {
        this.selected.set(detail);
        this.detailOpen.set(true);
        this.loadComments(detail.id);
      },
      error: () => this.message.error('Skill 详情加载失败'),
    });
  }

  closeDetail(): void {
    this.detailOpen.set(false);
    this.comments.set([]);
    this.closeEdit();
  }

  openUpload(target: SkillDetailEntity | null): void {
    this.uploadTarget.set(target);
    this.uploadOpen.set(true);
  }

  closeUpload(): void {
    this.uploadOpen.set(false);
    this.uploadTarget.set(null);
  }

  openEdit(target: SkillDetailEntity): void {
    this.editTarget.set(target);
    this.editOpen.set(true);
  }

  closeEdit(): void {
    this.editOpen.set(false);
    this.editTarget.set(null);
  }

  saveUpload(payload: SkillUploadInput): void {
    const target = this.uploadTarget();
    this.busy.set(true);
    const request = target ? this.api.createVersion(target.id, payload) : this.api.create(payload);
    request.subscribe({
      next: (detail) => {
        this.busy.set(false);
        this.closeUpload();
        this.selected.set(detail);
        this.detailOpen.set(true);
        this.loadComments(detail.id);
        this.load(true);
        this.message.success(target ? 'Skill 新版本已上传并自动发布' : 'Skill 已上传并自动发布');
      },
      error: () => this.busy.set(false),
    });
  }

  saveEdit(payload: SkillUpdateInput): void {
    const target = this.editTarget();
    if (!target) {
      return;
    }
    this.busy.set(true);
    this.api.update(target.id, payload).subscribe({
      next: (detail) => {
        this.busy.set(false);
        this.closeEdit();
        this.selected.set(detail);
        this.replaceListItem(detail);
        this.load();
        this.message.success('Skill 信息已保存');
      },
      error: () => this.busy.set(false),
    });
  }

  archive(skill: SkillDetailEntity): void {
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
  }

  deleteSkill(skill: SkillDetailEntity): void {
    this.busy.set(true);
    this.api.deleteSkill(skill.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.closeDetail();
        this.selected.set(null);
        this.load(true);
        this.message.success(
          skill.status === 'archived' ? '已归档 Skill 已删除' : 'Skill 草稿已删除',
        );
      },
      error: () => this.busy.set(false),
    });
  }

  download(skill: SkillDetailEntity, version: SkillVersionEntity): void {
    window.open(this.api.downloadUrl(skill.id, version.id), '_blank', 'noopener');
  }

  toggleFavorite(skill: SkillDetailEntity): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(true);
    this.api.setFavorite(skill.id, !skill.isFavorited).subscribe({
      next: (detail) => {
        this.busy.set(false);
        this.selected.set(detail);
        this.replaceListItem(detail);
        this.load();
        this.message.success(detail.isFavorited ? '已收藏' : '已取消收藏');
      },
      error: () => this.busy.set(false),
    });
  }

  createComment(content: string): void {
    const detail = this.selected();
    if (!detail || !content.trim() || this.commentBusy()) {
      return;
    }
    this.commentBusy.set(true);
    this.api.createComment(detail.id, content).subscribe({
      next: (comment) => {
        this.commentBusy.set(false);
        this.comments.update((items) => [...items, comment]);
        this.message.success('评论已发送');
      },
      error: () => this.commentBusy.set(false),
    });
  }

  categoryLabel(value: string, label: string): string {
    const count = this.categories().find((item) => item.name === value)?.count;
    return count === undefined ? label : `${label} (${count})`;
  }

  skillCategoryLabel(value: string | null | undefined): string {
    const normalized = value?.trim() || 'general';
    return SKILL_CATEGORY_OPTIONS.find((item) => item.value === normalized)?.label || normalized;
  }

  cardDescription(item: Pick<SkillEntity, 'description' | 'descriptionMd' | 'slug'>): string {
    return this.markdownSummary(item.descriptionMd) || item.description?.trim() || item.slug;
  }

  isOwner(detail: SkillDetailEntity): boolean {
    const user = this.authStore.currentUser();
    const ids = new Set(
      [user?.id?.trim(), user?.userId?.trim()].filter((item): item is string => !!item),
    );
    return !!detail.ownerUserId && ids.has(detail.ownerUserId);
  }

  skillStatusLabel(item: SkillEntity): string {
    return { draft: '草稿', published: '已发布', archived: '已归档' }[item.status];
  }

  skillStatusColor(item: SkillEntity): string {
    return { draft: 'gold', published: 'green', archived: 'default' }[item.status];
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
    return ['blue', 'purple', 'green', 'orange', 'rose', 'cyan', 'indigo'][
      this.hashText(item.id) % 7
    ];
  }

  avatarTone(item: Pick<SkillEntity, 'ownerUserId' | 'ownerName' | 'id'>): string {
    return `a${(this.hashText(item.ownerUserId || item.ownerName || item.id) % 4) + 1}`;
  }

  avatarText(name: string | null): string {
    return (name || '作者').trim().slice(0, 2).toUpperCase();
  }

  tagTone(tag: string): string {
    const normalized = tag.toLowerCase();
    if (normalized.includes('api')) {
      return 'api';
    }
    if (normalized.includes('web') || normalized.includes('front')) {
      return 'web';
    }
    if (normalized.includes('data') || normalized.includes('db')) {
      return 'data';
    }
    if (normalized.includes('image') || normalized.includes('img')) {
      return 'img';
    }
    if (normalized.includes('auto') || normalized.includes('workflow')) {
      return 'auto';
    }
    return 'cli';
  }

  showOwnerAvatarImage(item: Pick<SkillEntity, 'id' | 'ownerUserId' | 'ownerAvatarUrl'>): boolean {
    return !!item.ownerAvatarUrl && !this.brokenOwnerAvatarMap()[this.ownerAvatarKey(item)];
  }

  markOwnerAvatarError(item: Pick<SkillEntity, 'id' | 'ownerUserId'>): void {
    const key = this.ownerAvatarKey(item);
    this.brokenOwnerAvatarMap.update((state) => ({ ...state, [key]: true }));
  }

  private loadComments(skillId: string): void {
    this.commentsLoading.set(true);
    this.api.listComments(skillId).subscribe({
      next: (result) => {
        this.comments.set(result.items);
        this.commentsLoading.set(false);
      },
      error: () => {
        this.comments.set([]);
        this.commentsLoading.set(false);
      },
    });
  }

  private loadMembers(): void {
    this.userApi.list({ page: 1, pageSize: 100, status: 'active' }).subscribe({
      next: (result) => this.members.set(result.items),
      error: () => this.members.set([]),
    });
  }

  private replaceListItem(detail: SkillDetailEntity): void {
    this.items.update((items) => items.map((item) => (item.id === detail.id ? detail : item)));
  }

  private hasPermission(code: string): boolean {
    return this.authStore.currentUser()?.permissionCodes.includes(code) ?? false;
  }

  private hashText(value: string): number {
    return Array.from(value || 'skill').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }

  private ownerAvatarKey(item: Pick<SkillEntity, 'id' | 'ownerUserId'>): string {
    return item.ownerUserId || item.id;
  }

  private markdownSummary(value: string | null | undefined): string {
    return (value || '')
      .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[#>*_~\-\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
