import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { finalize, forkJoin, of } from 'rxjs';

import { AuthStore } from '@core/auth';
import { HasPermissionDirective } from '@core/auth/has-permission.directive';
import {
  FilterBarComponent,
  DataTableComponent,
  ListStateComponent,
  PageHeaderComponent,
  PageToolbarComponent,
  SearchBoxComponent,
  StatusBadgeComponent,
} from '@shared/ui';
import type { ProjectSummary } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import type { UserEntity } from '../../../users/models/user.model';
import { UserApiService } from '../../../users/services/user-api.service';
import { RdTaskSheetDetailDrawerComponent } from '../../components/rd-task-sheet-detail-drawer/rd-task-sheet-detail-drawer.component';
import { RdTaskSheetAssignDialogComponent } from '../../dialogs/rd-task-sheet-assign-dialog/rd-task-sheet-assign-dialog.component';
import {
  RdTaskSheetConvertDialogComponent,
  type RdTaskSheetConvertKind,
  type RdTaskSheetConvertSubmit,
} from '../../dialogs/rd-task-sheet-convert-dialog/rd-task-sheet-convert-dialog.component';
import { RdTaskSheetDialogComponent } from '../../dialogs/rd-task-sheet-dialog/rd-task-sheet-dialog.component';
import { RdTaskSheetImportDialogComponent } from '../../dialogs/rd-task-sheet-import-dialog/rd-task-sheet-import-dialog.component';
import { RdTaskSheetReplyDialogComponent } from '../../dialogs/rd-task-sheet-reply-dialog/rd-task-sheet-reply-dialog.component';
import { RdTaskSheetReviewReturnDialogComponent } from '../../dialogs/rd-task-sheet-review-return-dialog/rd-task-sheet-review-return-dialog.component';
import {
  RD_TASK_SHEET_STATUS_LABELS,
  RD_TASK_SHEET_STATUS_OPTIONS,
  RD_TASK_SHEET_URGENCY_LABELS,
  type AssignRdTaskSheetInput,
  type CreateRdTaskSheetInput,
  type RdTaskSheetDetail,
  type RdTaskSheetEntity,
  type RdTaskSheetStatus,
  type RdTaskSheetUrgency,
  type ReplyRdTaskSheetInput,
} from '../../models/rd-task-sheet.model';
import { RdTaskSheetApiService } from '../../services/rd-task-sheet-api.service';
import { RdTaskSheetStore } from '../../store/rd-task-sheet.store';

@Component({
  selector: 'app-rd-task-sheet-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    PageHeaderComponent,
    PageToolbarComponent,
    FilterBarComponent,
    DataTableComponent,
    StatusBadgeComponent,
    SearchBoxComponent,
    ListStateComponent,
    HasPermissionDirective,
    RdTaskSheetImportDialogComponent,
    RdTaskSheetDialogComponent,
    RdTaskSheetDetailDrawerComponent,
    RdTaskSheetConvertDialogComponent,
    RdTaskSheetAssignDialogComponent,
    RdTaskSheetReplyDialogComponent,
    RdTaskSheetReviewReturnDialogComponent,
    NzButtonModule,
    NzIconModule,
    NzPaginationModule,
    NzSelectModule,
    NzTagModule,
  ],
  providers: [RdTaskSheetStore],
  template: `
    <app-page-header title="我的任务单" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <div toolbar-primary class="toolbar-actions">
        <button *appHasPermission="['task_sheet.submit', 'task_sheet.manage']" nz-button nzType="primary" (click)="openCreate()">
          <span nz-icon nzType="plus"></span>
          新建任务单
        </button>
        <button *appHasPermission="['task_sheet.submit', 'task_sheet.manage']" nz-button (click)="openImport()">
          <span nz-icon nzType="import"></span>
          关联任务单
        </button>
      </div>

      <app-filter-bar toolbar-filters class="task-toolbar__main">
        <nz-select
          *appHasPermission="['task_sheet.review', 'task_sheet.assign', 'task_sheet.manage']"
          nzPlaceHolder="任务范围"
          class="toolbar-select toolbar-select--scope"
          [ngModel]="store.query().scope"
          (ngModelChange)="store.updateQuery({ scope: $event, page: 1 })"
        >
          <nz-option nzLabel="与我有关" nzValue="related"></nz-option>
          <nz-option nzLabel="待审核/待分派" nzValue="workflow"></nz-option>
        </nz-select>
        <nz-select
          nzPlaceHolder="项目范围"
          class="toolbar-select toolbar-select--project"
          [ngModel]="projectFilter()"
          (ngModelChange)="setProjectFilter($event)"
        >
          <nz-option nzLabel="全部任务单" nzValue=""></nz-option>
          <nz-option nzLabel="未关联项目" nzValue="__unlinked"></nz-option>
          @for (project of projects(); track project.id) {
            <nz-option [nzLabel]="project.name" [nzValue]="project.id"></nz-option>
          }
        </nz-select>
        <nz-select
          nzMode="multiple"
          [nzMaxTagCount]="2"
          nzPlaceHolder="状态，支持多选"
          class="toolbar-select toolbar-select--status"
          [ngModel]="store.query().status"
          (ngModelChange)="store.updateQuery({ status: $event, page: 1 })"
          nzAllowClear
        >
          @for (status of statusOptions; track status.value) {
            <nz-option [nzLabel]="status.label" [nzValue]="status.value"></nz-option>
          }
        </nz-select>
        <button nz-button class="toolbar-filter-btn" (click)="applyKeyword()">筛选</button>
        <button nz-button class="toolbar-filter-btn" (click)="resetFilters()">清空</button>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        class="toolbar-search"
        placeholder="搜索编号、标题、客户或描述"
        [value]="keywordDraft()"
        (valueChange)="keywordDraft.set($event)"
        (submitted)="applyKeyword()"
      />
    </app-page-toolbar>

    <app-list-state
      [loading]="store.loading()"
      [empty]="store.items().length === 0"
      loadingText="正在加载任务单..."
      emptyTitle="暂无任务单"
      [emptyDescription]="emptyDescription()"
    >
      <app-data-table class="task-table">
        <div table-head class="task-table__head">
          <div>序号</div>
          <div>编号</div>
          <div>任务</div>
          <div>关联项目</div>
          <div>发起 / 接收</div>
          <div>期望解决</div>
          <div>更新</div>
        </div>
        <div table-body class="task-table__body">
          @for (item of store.items(); track item.id; let i = $index) {
            <button
              type="button"
              class="task-row"
              [class.is-active]="store.selected()?.id === item.id"
              (click)="openDetail(item)"
            >
              <div class="task-cell task-cell__seq">{{ sequence(i) }}</div>
              <div class="task-cell task-row__no">{{ item.sheetNo }}</div>
              <div class="task-row__main">
                <div class="task-title-main-header">
                  <strong class="task-name">{{ item.title }}</strong>
                  <div class="task-title-badges">
                    <app-status-badge [status]="item.status" [label]="statusLabel(item.status)" />
                    <nz-tag [nzColor]="item.urgency === 'urgent' ? 'red' : 'default'">{{ urgencyLabel(item.urgency) }}</nz-tag>
                  </div>
                </div>
                <span class="task-meta">{{ item.businessDescription || '暂无业务描述' }}</span>
              </div>
              <div class="task-cell">{{ projectName(item.projectId) || '未关联' }}</div>
              <div class="task-cell">
                <span>{{ item.issuerName || '-' }}</span>
                <span class="muted"> -> {{ item.receiverName || '未指定' }}</span>
              </div>
              <div class="task-cell task-cell__muted">{{ item.expectedResolvedAt || '-' }}</div>
              <div class="task-cell task-cell__muted">{{ item.updatedAt | date: 'MM-dd HH:mm' }}</div>
            </button>
          }
        </div>
      </app-data-table>

      @if (store.total() > 0) {
        <div class="pagination">
          <nz-pagination
            [nzTotal]="store.total()"
            [nzPageIndex]="store.page()"
            [nzPageSize]="store.pageSize()"
            [nzPageSizeOptions]="[10, 20, 50, 100]"
            [nzShowSizeChanger]="true"
            [nzShowQuickJumper]="true"
            [nzShowTotal]="totalTpl"
            (nzPageIndexChange)="store.updateQuery({ page: $event })"
            (nzPageSizeChange)="store.updateQuery({ page: 1, pageSize: $event })"
          ></nz-pagination>
          <ng-template #totalTpl let-total>共 {{ total }} 条</ng-template>
        </div>
      }
    </app-list-state>

    <app-rd-task-sheet-detail-drawer
      [open]="!!store.selected()"
      [detail]="store.selected()"
      [projects]="projects()"
      [currentUserId]="currentUserId()"
      [permissionCodes]="permissionCodes()"
      [busy]="dialogBusy()"
      [exporting]="exporting()"
      (close)="closeDetail()"
      (exportWord)="exportWord($event)"
      (convert)="store.selected() && openConvert(store.selected()!, $event)"
      (edit)="openEdit($event)"
      (issue)="store.issue($event)"
      (submitReview)="store.submitReview($event)"
      (approveReview)="store.approveReview($event)"
      (returnReview)="openReturnReview($event)"
      (assign)="openAssign($event)"
      (startProcessing)="store.startProcessing($event)"
      (reply)="openReply($event)"
      (closeSheet)="store.close($event, {})"
      (deleteSheet)="deleteSheet($event)"
      (upload)="uploadForSelected($event)"
      (detach)="store.detach($event.sheetId, $event.attachmentId)"
    />

    <app-rd-task-sheet-dialog
      [open]="formOpen()"
      [busy]="dialogBusy()"
      [projects]="projects()"
      [initial]="editingSheet()"
      [prefill]="prefillDraft()"
      [currentUser]="authStore.currentUser()"
      (cancel)="closeForm()"
      (save)="saveSheet($event)"
    />

    <app-rd-task-sheet-import-dialog
      [open]="importOpen()"
      [busy]="importing()"
      (cancel)="closeImport()"
      (importFile)="handleImportFile($event)"
    />

    <app-rd-task-sheet-convert-dialog
      [open]="convertOpen()"
      [busy]="converting()"
      [kind]="convertKind()"
      [detail]="store.selected()"
      [projects]="projects()"
      [users]="users()"
      (cancel)="convertOpen.set(false)"
      (confirm)="saveConvert($event)"
    />

    <app-rd-task-sheet-assign-dialog
      [open]="assignOpen()"
      [busy]="store.busy()"
      [detail]="store.selected()"
      [projects]="projects()"
      [users]="users()"
      (cancel)="assignOpen.set(false)"
      (confirm)="saveAssign($event)"
    />

    <app-rd-task-sheet-review-return-dialog
      [open]="returnReviewOpen()"
      [busy]="store.busy()"
      [detail]="store.selected()"
      (cancel)="returnReviewOpen.set(false)"
      (confirm)="saveReturnReview($event)"
    />

    <app-rd-task-sheet-reply-dialog
      [open]="replyOpen()"
      [busy]="store.busy()"
      [detail]="store.selected()"
      (cancel)="replyOpen.set(false)"
      (confirm)="saveReply($event)"
    />
  `,
  styles: [
    `
      .toolbar-actions,
      .task-toolbar__main {
        display: flex;
        align-items: center;
      }
      .toolbar-actions,
      .task-toolbar__main {
        gap: 12px;
      }
      .toolbar-select--project {
        width: 240px;
      }
      .toolbar-select--scope {
        width: 160px;
      }
      .toolbar-select--status {
        width: 250px;
      }
      .toolbar-search {
        min-width: 240px;
        max-width: 320px;
      }
      .task-table__head,
      .task-row {
        display: grid;
        grid-template-columns: 56px 120px minmax(240px, 2.4fr) 160px 190px 120px 110px;
        gap: 16px;
        align-items: center;
      }
      .task-table__head {
        padding: 10px 16px;
        color: var(--text-muted);
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border-color-soft);
        font-size: 12px;
        font-weight: 700;
      }
      .task-row {
        width: 100%;
        padding: 14px 16px;
        border: 0;
        border-bottom: 1px solid var(--border-color-soft);
        background: transparent;
        text-align: left;
        color: inherit;
        cursor: pointer;
        appearance: none;
        transition: var(--transition-base);
      }
      .task-row:last-child {
        border-bottom: 0;
      }
      .task-row:hover {
        background: var(--bg-subtle);
      }
      .task-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.14), rgba(99, 102, 241, 0.04)),
          var(--bg-subtle);
        box-shadow: inset 3px 0 0 var(--primary-600);
      }
      .task-row__no {
        font-family: 'SF Mono', 'Fira Code', ui-monospace, SFMono-Regular, Consolas, monospace;
        color: var(--primary-700);
        font-size: 13px;
        font-weight: 700;
      }
      .task-cell {
        min-width: 0;
        color: var(--text-primary);
      }
      .task-cell__seq {
        color: var(--text-muted);
        font-size: 12px;
      }
      .task-row__main {
        min-width: 0;
      }
      .task-title-main-header {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .task-name {
        display: block;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        color: var(--text-heading);
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
      }
      .task-title-badges {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        flex: 0 0 auto;
      }
      .task-meta {
        margin-top: 4px;
        display: -webkit-box;
        overflow: hidden;
        text-overflow: ellipsis;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        white-space: normal;
        line-height: 1.5;
        font-size: 12px;
      }
      .task-meta,
      .task-cell__muted,
      .muted {
        color: var(--text-muted);
      }
      .pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }
      @media (max-width: 900px) {
        .task-table__head {
          display: none;
        }
        .task-row {
          grid-template-columns: 1fr;
        }
      }
      :host-context(html[data-theme='dark']) .task-row.is-active {
        background:
          linear-gradient(90deg, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.06)),
          var(--bg-subtle);
      }
      :host-context(html[data-theme='dark']) .task-row__no {
        color: var(--text-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetPageComponent implements OnInit {
  readonly store = inject(RdTaskSheetStore);
  private readonly api = inject(RdTaskSheetApiService);
  private readonly projectApi = inject(ProjectApiService);
  private readonly userApi = inject(UserApiService);
  readonly authStore = inject(AuthStore);
  private readonly message = inject(NzMessageService);

  readonly projects = signal<ProjectSummary[]>([]);
  readonly users = signal<UserEntity[]>([]);
  readonly keywordDraft = signal('');
  readonly formOpen = signal(false);
  readonly editingSheet = signal<RdTaskSheetDetail | null>(null);
  readonly prefillDraft = signal<CreateRdTaskSheetInput | null>(null);
  readonly replyOpen = signal(false);
  readonly uploading = signal(false);
  readonly importing = signal(false);
  readonly importOpen = signal(false);
  readonly importUploadId = signal<string | null>(null);
  readonly exporting = signal(false);
  readonly converting = signal(false);
  readonly convertOpen = signal(false);
  readonly convertKind = signal<RdTaskSheetConvertKind>('rd');
  readonly assignOpen = signal(false);
  readonly returnReviewOpen = signal(false);

  readonly statusOptions = RD_TASK_SHEET_STATUS_OPTIONS;
  readonly subtitle = computed(() => `共 ${this.store.total()} 张与我有关的任务单，支持关联或不关联项目。`);
  readonly permissionCodes = computed(() => this.authStore.currentUser()?.permissionCodes ?? []);
  readonly currentUserId = computed(() => this.authStore.currentUser()?.userId ?? this.authStore.currentUser()?.id ?? '');
  readonly canSubmitTaskSheet = computed(() => this.hasPermission('task_sheet.submit') || this.hasPermission('task_sheet.manage'));
  readonly emptyDescription = computed(() =>
    this.canSubmitTaskSheet() ? '可以新建任务单，或调整筛选条件。' : '暂无与你相关的任务单，可调整筛选条件。',
  );
  readonly dialogBusy = computed(() => this.store.busy() || this.uploading());
  readonly projectFilter = computed(() => {
    const query = this.store.query();
    if (query.unlinked) {
      return '__unlinked';
    }
    return query.projectId || '';
  });

  ngOnInit(): void {
    this.store.load();
    this.keywordDraft.set(this.store.query().keyword || '');
    this.projectApi.listAccessible('all_accessible').subscribe({
      next: (items) => this.projects.set(items),
      error: () => this.projects.set([]),
    });
    this.userApi.list({ page: 1, pageSize: 200, status: 'active' }).subscribe({
      next: (result) => this.users.set(result.items),
      error: () => this.users.set([]),
    });
  }

  setProjectFilter(value: string): void {
    if (value === '__unlinked') {
      this.store.updateQuery({ projectId: '', unlinked: true, page: 1 });
      return;
    }
    this.store.updateQuery({ projectId: value || '', unlinked: false, page: 1 });
  }

  applyKeyword(): void {
    this.store.updateQuery({ keyword: this.keywordDraft().trim(), page: 1 });
  }

  resetFilters(): void {
    this.keywordDraft.set('');
    this.store.reset();
  }

  openDetail(item: RdTaskSheetEntity): void {
    this.store.select(item.id);
  }

  closeDetail(): void {
    this.store.select(null);
  }

  openCreate(): void {
    this.editingSheet.set(null);
    this.prefillDraft.set(null);
    this.importUploadId.set(null);
    this.formOpen.set(true);
  }

  openEdit(detail: RdTaskSheetDetail): void {
    this.editingSheet.set(detail);
    this.prefillDraft.set(null);
    this.formOpen.set(true);
  }

  deleteSheet(sheetId: string): void {
    this.store.delete(sheetId, () => this.message.success('任务单已删除'));
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingSheet.set(null);
    this.prefillDraft.set(null);
    this.importUploadId.set(null);
  }

  saveSheet(event: { id?: string; value: CreateRdTaskSheetInput; files: File[] }): void {
    if (event.id) {
      this.store.update(event.id, event.value, () => this.closeForm());
      return;
    }
    const uploadRequest = event.files.length > 0 ? forkJoin(event.files.map((file) => this.api.uploadAttachment(file))) : of([]);
    this.uploading.set(true);
    uploadRequest.pipe(finalize(() => this.uploading.set(false))).subscribe({
      next: (uploads) => {
        const importUploadId = this.importUploadId();
        this.store.create(
          {
            ...event.value,
            attachments: [
              ...(importUploadId ? [{ uploadId: importUploadId }] : []),
              ...uploads.map((upload) => ({ uploadId: upload.id })),
            ],
          },
          (detail) => {
            this.closeForm();
            this.store.select(detail.id);
          },
        );
      },
      error: () => this.message.error('附件上传失败，请稍后重试'),
    });
  }

  openImport(): void {
    this.importOpen.set(true);
  }

  closeImport(): void {
    if (this.importing()) {
      return;
    }
    this.importOpen.set(false);
  }

  handleImportFile(file: File): void {
    this.importing.set(true);
    this.api.uploadWordImport(file).subscribe({
      next: (upload) => {
        this.api
          .previewImport(upload.id)
          .pipe(finalize(() => this.importing.set(false)))
          .subscribe({
            next: (result) => {
              this.importOpen.set(false);
              this.editingSheet.set(null);
              this.prefillDraft.set(result.draft);
              this.importUploadId.set(result.upload.uploadId);
              this.formOpen.set(true);
            },
            error: () => this.message.error('Word 解析失败，请确认格式为任务单 .docx'),
          });
      },
      error: () => {
        this.importing.set(false);
        this.message.error('历史任务单上传失败');
      },
    });
  }

  openReply(_detail: RdTaskSheetDetail): void {
    this.replyOpen.set(true);
  }

  saveReply(reply: ReplyRdTaskSheetInput): void {
    const detail = this.store.selected();
    if (!detail || !reply.deliveryContent.trim()) {
      return;
    }
    this.store.reply(
      detail.id,
      {
        result: reply.result,
        resolvedAt: reply.resolvedAt,
        deliveryContent: reply.deliveryContent.trim(),
      },
      () => this.replyOpen.set(false),
    );
  }

  exportWord(detail: RdTaskSheetDetail): void {
    this.exporting.set(true);
    this.api
      .exportWord(detail.id)
      .pipe(finalize(() => this.exporting.set(false)))
      .subscribe({
        next: (response) => {
          const blob = response.body;
          if (!blob) {
            this.message.error('导出 Word 失败');
            return;
          }
          const filename = decodeDownloadFileName(response.headers.get('content-disposition')) || `${detail.sheetNo}.docx`;
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = filename;
          anchor.click();
          URL.revokeObjectURL(url);
        },
        error: () => this.message.error('导出 Word 失败'),
      });
  }

  openConvert(_detail: RdTaskSheetDetail, kind: RdTaskSheetConvertKind): void {
    this.convertKind.set(kind);
    this.convertOpen.set(true);
  }

  openAssign(_detail: RdTaskSheetDetail): void {
    this.assignOpen.set(true);
  }

  saveAssign(input: AssignRdTaskSheetInput): void {
    const detail = this.store.selected();
    if (!detail) {
      return;
    }
    this.store.assign(detail.id, input, () => {
      this.assignOpen.set(false);
      this.message.success('任务单已分派');
    });
  }

  openReturnReview(_detail: RdTaskSheetDetail): void {
    this.returnReviewOpen.set(true);
  }

  saveReturnReview(input: { comment?: string | null }): void {
    const detail = this.store.selected();
    if (!detail) {
      return;
    }
    this.store.returnReview(detail.id, input, () => {
      this.returnReviewOpen.set(false);
      this.message.success('任务单已退回');
    });
  }

  saveConvert(event: RdTaskSheetConvertSubmit): void {
    const detail = this.store.selected();
    if (!detail) {
      return;
    }
    this.converting.set(true);
    const request =
      event.kind === 'rd'
        ? this.api.convertToRdItem(detail.id, event.value)
        : this.api.convertToIssue(detail.id, event.value);
    request.pipe(finalize(() => this.converting.set(false))).subscribe({
      next: (updated) => {
        this.convertOpen.set(false);
        this.store.select(updated.id);
        this.message.success(event.kind === 'rd' ? '已创建研发项' : '已创建测试单');
      },
      error: () => this.message.error(event.kind === 'rd' ? '转研发项失败' : '转测试单失败'),
    });
  }

  uploadForSelected(files: File[]): void {
    const detail = this.store.selected();
    if (!detail) {
      return;
    }
    if (files.length === 0) {
      return;
    }
    this.uploading.set(true);
    forkJoin(files.map((file) => this.api.uploadAttachment(file)))
      .pipe(
        finalize(() => {
          this.uploading.set(false);
        }),
      )
      .subscribe({
        next: (uploads) => {
          for (const upload of uploads) {
            this.store.attach(detail.id, upload.id);
          }
        },
        error: () => this.message.error('附件上传失败，请稍后重试'),
      });
  }

  projectName(projectId: string | null): string {
    if (!projectId) {
      return '';
    }
    return this.projects().find((item) => item.id === projectId)?.name ?? projectId;
  }

  statusLabel(status: RdTaskSheetStatus): string {
    return RD_TASK_SHEET_STATUS_LABELS[status] ?? status;
  }

  urgencyLabel(urgency: RdTaskSheetUrgency): string {
    return RD_TASK_SHEET_URGENCY_LABELS[urgency] ?? urgency;
  }

  sequence(index: number): number {
    return (this.store.page() - 1) * this.store.pageSize() + index + 1;
  }

  statusColor(status: RdTaskSheetStatus): string {
    return {
      draft: 'default',
      pending_review: 'gold',
      returned: 'red',
      issued: 'blue',
      processing: 'orange',
      replied: 'green',
      closed: 'default',
    }[status];
  }

  private hasPermission(code: string): boolean {
    return this.permissionCodes().includes(code);
  }

}

function decodeDownloadFileName(disposition: string | null): string {
  if (!disposition) {
    return '';
  }
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ''));
  }
  const asciiMatch = /filename="?([^";]+)"?/i.exec(disposition);
  return asciiMatch ? decodeURIComponent(asciiMatch[1]) : '';
}
