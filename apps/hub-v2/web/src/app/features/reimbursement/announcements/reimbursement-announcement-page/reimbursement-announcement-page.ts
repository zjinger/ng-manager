import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
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
import { FilterBarComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { AnnouncementListComponent } from '../../../content/components/announcement-list/announcement-list.component';
import { ContentDetailDrawerComponent } from '../../../content/components/content-detail-drawer/content-detail-drawer.component';
import type { AnnouncementEntity, ContentStatus, CreateAnnouncementInput } from '../../../content/models/content.model';
import { ContentApiService } from '../../../content/services/content-api.service';
import { ReimbursementAnnouncementDialogComponent } from '../dialogs/reimbursement-announcement-dialog.component';

type ReimbursementAnnouncementDialogValue = Pick<
  CreateAnnouncementInput,
  'title' | 'summary' | 'contentMd' | 'pinned' | 'effectiveAt' | 'expireAt'
>;

@Component({
  selector: 'app-reimbursement-announcement-page',
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
    ContentDetailDrawerComponent,
    ReimbursementAnnouncementDialogComponent,
  ],
  template: `
    <app-page-header title="公告管理" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <app-filter-bar toolbar-filters class="notice-toolbar">
        <button nz-button nzType="primary" [disabled]="!canManage()" (click)="openCreateDialog()">
          <nz-icon nzType="plus" nzTheme="outline" />
          新建报销公告
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
      loadingText="正在加载报销公告…"
      emptyTitle="当前筛选条件下没有报销公告"
      emptyDescription="先创建一条报销公告或调整筛选条件。"
    >
      <app-announcement-list
        [items]="items()"
        [selectedId]="selectedAnnouncementId()"
        (select)="openDetail($event)"
      />
    </app-list-state>

    <app-reimbursement-announcement-dialog
      [open]="dialogOpen()"
      [busy]="busy()"
      [value]="editingAnnouncement()"
      (cancel)="closeDialog()"
      (submit)="submitAnnouncement($event)"
    />

    <app-content-detail-drawer
      [open]="detailDrawerOpen()"
      [tab]="'announcements'"
      [announcement]="detailAnnouncement()"
      [document]="null"
      [release]="null"
      [projectName]="''"
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
      .notice-toolbar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReimbursementAnnouncementPage {
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
  private readonly handledRouteDetailId = signal<string | null>(null);
  private readonly detailQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('detail'))), {
    initialValue: this.route.snapshot.queryParamMap.get('detail'),
  });

  readonly canManage = computed(() => {
    const current = this.authStore.currentUser();
    if (!current) {
      return false;
    }
    return current.permissionCodes.includes('expense.rule.manage');
  });
  readonly subtitle = computed(() => `全局公告 · ${this.total()} 条`);
  readonly selectedAnnouncementId = computed(() => this.detailAnnouncement()?.id ?? null);

  constructor() {
    this.load();

    effect(() => {
      const detailId = this.normalizeDetailQuery(this.detailQuery());
      if (!detailId) {
        this.handledRouteDetailId.set(null);
        return;
      }
      if (this.loading()) {
        return;
      }
      if (this.handledRouteDetailId() === detailId) {
        return;
      }
      const found = this.items().find((item) => item.id === detailId);
      if (!found) {
        return;
      }
      this.detailAnnouncement.set(found);
      this.detailDrawerOpen.set(true);
      this.handledRouteDetailId.set(detailId);
    });
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

  submitAnnouncement(input: ReimbursementAnnouncementDialogValue): void {
    if (!this.canManage()) {
      this.message.warning('当前权限不支持该操作');
      return;
    }
    const payload: CreateAnnouncementInput = {
      ...input,
      domain: 'reimbursement',
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
        domain: 'reimbursement',
        projectId: '',
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
        },
        error: () => {
          this.items.set([]);
          this.total.set(0);
          this.loading.set(false);
          this.message.error('加载报销公告失败');
        },
      });
  }

  private confirmPublishAfterCreate(entity: AnnouncementEntity): void {
    this.modal.confirm({
      nzTitle: '报销公告已创建，是否立即发布？',
      nzContent: '立即发布后，协作平台中所有可见人员将可见该报销公告。',
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

  private normalizeDetailQuery(value: string | null): string | null {
    const normalized = value?.trim() ?? '';
    return normalized || null;
  }
}
