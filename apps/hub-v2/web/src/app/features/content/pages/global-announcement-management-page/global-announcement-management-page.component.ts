import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { AuthStore } from '@core/auth';
import {
  FilterBarComponent,
  ListStateComponent,
  PageHeaderComponent,
  PageToolbarComponent,
  SearchBoxComponent,
} from '@shared/ui';
import { AnnouncementListComponent } from '../../components/announcement-list/announcement-list.component';
import { ContentDetailDrawerComponent } from '../../components/content-detail-drawer/content-detail-drawer.component';
import { AnnouncementCreateDialogComponent } from '../../dialogs/announcement-create-dialog/announcement-create-dialog.component';
import type { AnnouncementEntity, ContentStatus, CreateAnnouncementInput } from '../../models/content.model';
import { ContentApiService } from '../../services/content-api.service';

@Component({
  selector: 'app-global-announcement-management-page',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzSelectModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    FilterBarComponent,
    ListStateComponent,
    AnnouncementListComponent,
    AnnouncementCreateDialogComponent,
    ContentDetailDrawerComponent,
  ],
  template: `
    <app-page-header title="全局公告" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <app-filter-bar toolbar-filters class="global-announcement-toolbar">
        <button nz-button nzType="primary" [disabled]="!canManage()" (click)="openCreateDialog()">
          <nz-icon nzType="plus" nzTheme="outline" />
          新建全局公告
        </button>

        <nz-select
          nzPlaceHolder="全部状态"
          class="toolbar-select"
          [ngModel]="status()"
          (ngModelChange)="status.set($event)"
          style="width: 100px;"
        >
          <nz-option nzLabel="全部状态" nzValue=""></nz-option>
          <nz-option nzLabel="草稿" nzValue="draft"></nz-option>
          <nz-option nzLabel="已发布" nzValue="published"></nz-option>
          <nz-option nzLabel="已归档" nzValue="archived"></nz-option>
        </nz-select>

        <button nz-button class="toolbar-filter-btn" (click)="applyFilters()">筛选</button>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        placeholder="搜索公告标题或摘要"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="applyFilters()"
      />
    </app-page-toolbar>

    <app-list-state
      [loading]="loading()"
      [empty]="items().length === 0"
      loadingText="正在加载全局公告..."
      emptyTitle="当前筛选条件下没有全局公告"
      emptyDescription="先创建一条全局公告或调整筛选条件。"
    >
      <app-announcement-list
        [items]="items()"
        [selectedId]="selectedAnnouncementId()"
        (select)="openDetail($event)"
      />
    </app-list-state>

    <app-announcement-create-dialog
      [open]="dialogOpen()"
      [busy]="busy()"
      [value]="editingAnnouncement()"
      [scope]="'global'"
      (cancel)="closeDialog()"
      (create)="submitAnnouncement($event)"
    />

    <app-content-detail-drawer
      [open]="detailDrawerOpen()"
      [tab]="'announcements'"
      [announcement]="detailAnnouncement()"
      [document]="null"
      [release]="null"
      [projectName]="'全局公告'"
      [projectKey]="''"
      [canEdit]="canManage()"
      [canPublish]="canManage()"
      [canArchive]="canManage()"
      (edit)="openEditFromDetail()"
      (publish)="publishCurrentDetail()"
      (archive)="archiveCurrentDetail()"
      (close)="closeDetail(true)"
    />
  `,
  styles: [
    `
      .global-announcement-toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalAnnouncementManagementPageComponent {
  private readonly contentApi = inject(ContentApiService);
  private readonly authStore = inject(AuthStore);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly keyword = signal('');
  readonly status = signal<ContentStatus>('');
  readonly items = signal<AnnouncementEntity[]>([]);
  readonly total = signal(0);
  readonly dialogOpen = signal(false);
  readonly editingAnnouncement = signal<AnnouncementEntity | null>(null);
  readonly detailDrawerOpen = signal(false);
  readonly detailAnnouncement = signal<AnnouncementEntity | null>(null);
  private readonly detailQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('detail'))), {
    initialValue: this.route.snapshot.queryParamMap.get('detail'),
  });

  readonly canManage = computed(() => this.authStore.currentUser()?.permissionCodes.includes('announcement.global.manage') === true);
  readonly subtitle = computed(() => `通用全局公告 · ${this.total()} 条`);
  readonly selectedAnnouncementId = computed(() => this.detailAnnouncement()?.id ?? null);

  constructor() {
    this.load();
  }

  applyFilters(): void {
    this.load();
  }

  openCreateDialog(): void {
    if (!this.canManage()) {
      this.message.warning('当前权限不支持该操作');
      return;
    }
    this.editingAnnouncement.set(null);
    this.dialogOpen.set(true);
  }

  openDetail(item: AnnouncementEntity): void {
    this.detailAnnouncement.set(item);
    this.detailDrawerOpen.set(true);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: item.id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  closeDetail(clearRouteDetailQuery = false): void {
    this.detailDrawerOpen.set(false);
    this.detailAnnouncement.set(null);
    if (clearRouteDetailQuery && this.detailQuery()) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { detail: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  openEditFromDetail(): void {
    const item = this.detailAnnouncement();
    if (!item || !this.canManage()) {
      this.message.warning('当前权限不支持该操作');
      return;
    }
    this.closeDetail();
    this.editingAnnouncement.set(item);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editingAnnouncement.set(null);
  }

  submitAnnouncement(input: CreateAnnouncementInput): void {
    if (!this.canManage()) {
      this.message.warning('当前权限不支持该操作');
      return;
    }
    const payload: CreateAnnouncementInput = {
      ...input,
      domain: 'content',
      scope: 'global',
      projectId: null,
    };

    const editing = this.editingAnnouncement();
    this.busy.set(true);
    if (editing) {
      this.contentApi.updateAnnouncement(editing.id, payload).subscribe({
        next: (entity) => {
          this.busy.set(false);
          this.closeDialog();
          this.syncDetail(entity);
          this.load();
        },
        error: () => {
          this.busy.set(false);
        },
      });
      return;
    }

    this.contentApi.createAnnouncement(payload).subscribe({
      next: (entity) => {
        this.busy.set(false);
        this.closeDialog();
        this.load();
        this.confirmPublishAfterCreate(entity);
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  publishCurrentDetail(): void {
    const item = this.detailAnnouncement();
    if (!item || !this.canManage() || item.status === 'published') {
      return;
    }
    this.busy.set(true);
    this.contentApi.publishAnnouncement(item.id).subscribe({
      next: (entity) => {
        this.busy.set(false);
        this.syncDetail(entity);
        this.load();
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  archiveCurrentDetail(): void {
    const item = this.detailAnnouncement();
    if (!item || !this.canManage() || item.status === 'archived') {
      return;
    }
    this.busy.set(true);
    this.contentApi.archiveAnnouncement(item.id).subscribe({
      next: (entity) => {
        this.busy.set(false);
        this.syncDetail(entity);
        this.load();
      },
      error: () => {
        this.busy.set(false);
      },
    });
  }

  private load(): void {
    this.loading.set(true);
    this.contentApi
      .listAnnouncements({
        domain: 'content',
        scope: 'global',
        page: 1,
        pageSize: 20,
        keyword: this.keyword().trim(),
        status: this.status(),
      })
      .subscribe({
        next: (result) => {
          this.items.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
          this.openRouteDetail();
        },
        error: () => {
          this.items.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.message.error('加载全局公告失败');
        },
      });
  }

  private confirmPublishAfterCreate(entity: AnnouncementEntity): void {
    this.modal.confirm({
      nzTitle: '全局公告已创建，是否立即发布？',
      nzContent: '立即发布后，所有可见人员将可见该全局公告。',
      nzOkText: '立即发布',
      nzCancelText: '暂不发布',
      nzOnOk: () => {
        this.busy.set(true);
        this.contentApi.publishAnnouncement(entity.id).subscribe({
          next: (next) => {
            this.busy.set(false);
            this.syncDetail(next);
            this.load();
          },
          error: () => {
            this.busy.set(false);
          },
        });
      },
    });
  }

  private syncDetail(entity: AnnouncementEntity): void {
    if (this.detailAnnouncement()?.id === entity.id) {
      this.detailAnnouncement.set(entity);
    }
  }

  private openRouteDetail(): void {
    const detailId = this.detailQuery()?.trim();
    if (!detailId || this.detailAnnouncement()?.id === detailId) {
      return;
    }
    const found = this.items().find((item) => item.id === detailId);
    if (found) {
      this.detailAnnouncement.set(found);
      this.detailDrawerOpen.set(true);
    }
  }
}
