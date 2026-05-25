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
import {
  FilterBarComponent,
  ListStateComponent,
  PageHeaderComponent,
  PageToolbarComponent,
  SearchBoxComponent,
} from '@shared/ui';
import type { ProjectSummary } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import type { UserEntity } from '../../../users/models/user.model';
import { UserApiService } from '../../../users/services/user-api.service';
import { RdTaskSheetDetailDrawerComponent } from '../../components/rd-task-sheet-detail-drawer/rd-task-sheet-detail-drawer.component';
import {
  RdTaskSheetConvertDialogComponent,
  type RdTaskSheetConvertKind,
  type RdTaskSheetConvertSubmit,
} from '../../dialogs/rd-task-sheet-convert-dialog/rd-task-sheet-convert-dialog.component';
import { RdTaskSheetDialogComponent } from '../../dialogs/rd-task-sheet-dialog/rd-task-sheet-dialog.component';
import { RdTaskSheetImportDialogComponent } from '../../dialogs/rd-task-sheet-import-dialog/rd-task-sheet-import-dialog.component';
import {
  RD_TASK_SHEET_STATUS_LABELS,
  RD_TASK_SHEET_STATUS_OPTIONS,
  RD_TASK_SHEET_URGENCY_LABELS,
  type CreateRdTaskSheetInput,
  type RdTaskSheetDetail,
  type RdTaskSheetEntity,
  type RdTaskSheetResult,
  type RdTaskSheetStatus,
  type RdTaskSheetUrgency,
} from '../../models/rd-task-sheet.model';
import { RdTaskSheetApiService } from '../../services/rd-task-sheet-api.service';
import { RdTaskSheetStore } from '../../store/rd-task-sheet.store';

type ReplyForm = { result: RdTaskSheetResult; resolvedAt: string; deliveryContent: string };

@Component({
  selector: 'app-rd-task-sheet-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    PageHeaderComponent,
    PageToolbarComponent,
    FilterBarComponent,
    SearchBoxComponent,
    ListStateComponent,
    RdTaskSheetImportDialogComponent,
    RdTaskSheetDialogComponent,
    RdTaskSheetDetailDrawerComponent,
    RdTaskSheetConvertDialogComponent,
    NzButtonModule,
    NzIconModule,
    NzPaginationModule,
    NzSelectModule,
    NzTagModule,
  ],
  providers: [RdTaskSheetStore],
  template: `
    <app-page-header title="任务单管理" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <div toolbar-primary class="toolbar-actions">
        <button nz-button nzType="primary" (click)="openCreate()">
          <span nz-icon nzType="plus"></span>
          新建任务单
        </button>
        <button nz-button (click)="openImport()">
          <span nz-icon nzType="import"></span>
          关联历史任务单
        </button>
      </div>

      <app-filter-bar toolbar-filters class="task-toolbar__main">
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
      emptyDescription="可以新建任务单，或调整筛选条件。"
    >
      <div class="task-table">
        <div class="task-table__head">
          <div>编号</div>
          <div>任务</div>
          <div>关联项目</div>
          <div>发起 / 接收</div>
          <div>状态</div>
          <div>期望解决</div>
          <div>更新</div>
        </div>
        <div class="task-table__body">
          @for (item of store.items(); track item.id) {
            <button
              type="button"
              class="task-row"
              [class.is-active]="store.selected()?.id === item.id"
              (click)="openDetail(item)"
            >
              <div class="task-row__no">{{ item.sheetNo }}</div>
              <div class="task-row__main">
                <strong>{{ item.title }}</strong>
                <span>{{ item.businessDescription }}</span>
              </div>
              <div>{{ projectName(item.projectId) || '未关联' }}</div>
              <div>
                <span>{{ item.issuerName || '-' }}</span>
                <span class="muted"> -> {{ item.receiverName || '未指定' }}</span>
              </div>
              <div>
                <nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag>
                <nz-tag [nzColor]="item.urgency === 'urgent' ? 'red' : 'default'">{{ urgencyLabel(item.urgency) }}</nz-tag>
              </div>
              <div>{{ item.expectedResolvedAt || '-' }}</div>
              <div>{{ item.updatedAt | date: 'MM-dd HH:mm' }}</div>
            </button>
          }
        </div>
      </div>

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
      [busy]="dialogBusy()"
      [exporting]="exporting()"
      (close)="closeDetail()"
      (exportWord)="exportWord($event)"
      (convert)="store.selected() && openConvert(store.selected()!, $event)"
      (edit)="openEdit($event)"
      (issue)="store.issue($event)"
      (startProcessing)="store.startProcessing($event)"
      (reply)="openReply($event)"
      (closeSheet)="store.close($event, {})"
      (upload)="uploadForSelected($event)"
      (detach)="store.detach($event.sheetId, $event.attachmentId)"
    />

    <app-rd-task-sheet-dialog
      [open]="formOpen()"
      [busy]="dialogBusy()"
      [projects]="projects()"
      [users]="users()"
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

    @if (replyOpen()) {
      <div class="modal-backdrop">
        <section class="modal-panel modal-panel--narrow">
          <header>
            <h2>回复任务单</h2>
            <button nz-button nzType="text" (click)="replyOpen.set(false)">
              <span nz-icon nzType="close"></span>
            </button>
          </header>
          <div class="form-grid form-grid--single">
            <label>
              <span>处理结果</span>
              <nz-select [ngModel]="replyForm().result" (ngModelChange)="updateReply({ result: $event })">
                <nz-option nzLabel="已解决" nzValue="resolved"></nz-option>
                <nz-option nzLabel="未解决" nzValue="unresolved"></nz-option>
              </nz-select>
            </label>
            <label>
              <span>解决时间</span>
              <input class="date-input" type="date" [ngModel]="replyForm().resolvedAt" (ngModelChange)="updateReply({ resolvedAt: $event })" />
            </label>
            <label>
              <span>交付 / 答复内容</span>
              <textarea rows="5" [ngModel]="replyForm().deliveryContent" (ngModelChange)="updateReply({ deliveryContent: $event })"></textarea>
            </label>
          </div>
          <footer>
            <button nz-button (click)="replyOpen.set(false)">取消</button>
            <button nz-button nzType="primary" [disabled]="!replyForm().deliveryContent.trim()" [nzLoading]="store.busy()" (click)="saveReply()">回复</button>
          </footer>
        </section>
      </div>
    }
  `,
  styles: [
    `
      .toolbar-actions,
      .task-toolbar__main,
      .modal-panel header,
      .modal-panel footer {
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
      .toolbar-select--status {
        width: 250px;
      }
      .toolbar-search {
        min-width: 240px;
        max-width: 320px;
      }
      .task-table {
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        overflow: hidden;
        background: var(--surface-card);
      }
      .task-table__head,
      .task-row {
        display: grid;
        grid-template-columns: 150px minmax(220px, 1.6fr) 160px 190px 170px 120px 120px;
        gap: 12px;
        align-items: center;
      }
      .task-table__head {
        padding: 12px 16px;
        color: var(--text-muted);
        background: var(--surface-subtle);
        font-size: 12px;
        font-weight: 600;
      }
      .task-row {
        width: 100%;
        padding: 14px 16px;
        border: 0;
        border-top: 1px solid var(--border-color-soft);
        background: transparent;
        text-align: left;
        color: var(--text-body);
        cursor: pointer;
      }
      .task-row:hover,
      .task-row.is-active {
        background: var(--surface-hover);
      }
      .task-row__no {
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
        color: var(--text-muted);
      }
      .task-row__main {
        min-width: 0;
      }
      .task-row__main strong,
      .task-row__main span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .task-row__main span,
      .muted {
        color: var(--text-muted);
      }
      .pagination {
        display: flex;
        justify-content: flex-end;
        padding: 16px 0 4px;
      }
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 30;
        display: grid;
        place-items: center;
        padding: 24px;
        background: rgba(15, 23, 42, 0.34);
      }
      .modal-panel {
        width: min(560px, 100%);
        max-height: min(86vh, 860px);
        overflow: auto;
        background: var(--surface-card);
        border-radius: var(--border-radius);
        box-shadow: 0 18px 46px rgba(15, 23, 42, 0.22);
        padding: 20px;
      }
      .modal-panel header,
      .modal-panel footer {
        justify-content: space-between;
        gap: 12px;
      }
      .modal-panel h2 {
        margin: 0;
        font-size: 18px;
      }
      .modal-panel footer {
        justify-content: flex-end;
        margin-top: 18px;
      }
      .form-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        margin-top: 18px;
      }
      label {
        display: grid;
        gap: 6px;
      }
      label span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .date-input,
      textarea {
        width: 100%;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        padding: 8px 11px;
        background: var(--surface-card);
      }
      @media (max-width: 900px) {
        .task-table__head {
          display: none;
        }
        .task-row,
        .form-grid {
          grid-template-columns: 1fr;
        }
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
  readonly replyForm = signal<ReplyForm>({
    result: 'resolved',
    resolvedAt: new Date().toISOString().slice(0, 10),
    deliveryContent: '',
  });

  readonly statusOptions = RD_TASK_SHEET_STATUS_OPTIONS;
  readonly subtitle = computed(() => `共 ${this.store.total()} 张任务单，支持关联或不关联项目。`);
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

  openReply(detail: RdTaskSheetDetail): void {
    this.replyForm.set({
      result: detail.result ?? 'resolved',
      resolvedAt: (detail.resolvedAt ?? new Date().toISOString()).slice(0, 10),
      deliveryContent: detail.deliveryContent ?? '',
    });
    this.replyOpen.set(true);
  }

  updateReply(patch: Partial<ReplyForm>): void {
    this.replyForm.update((form) => ({ ...form, ...patch }));
  }

  saveReply(): void {
    const detail = this.store.selected();
    const reply = this.replyForm();
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

  statusColor(status: RdTaskSheetStatus): string {
    return {
      draft: 'default',
      issued: 'blue',
      processing: 'orange',
      replied: 'green',
      closed: 'default',
    }[status];
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
