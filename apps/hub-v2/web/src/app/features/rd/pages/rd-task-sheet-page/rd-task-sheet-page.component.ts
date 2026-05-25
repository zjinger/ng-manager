import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { finalize, forkJoin, of } from 'rxjs';

import { AuthStore } from '@core/auth';
import {
  FileUploadDropzoneComponent,
  FilterBarComponent,
  ListStateComponent,
  MarkdownViewerComponent,
  PageHeaderComponent,
  PageToolbarComponent,
  SearchBoxComponent,
} from '@shared/ui';
import { formatUploadSizeLimit, UPLOAD_TARGETS } from '@shared/constants';
import type { ProjectSummary } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import type { UserEntity } from '../../../users/models/user.model';
import { UserApiService } from '../../../users/services/user-api.service';
import { RdTaskSheetDialogComponent } from '../../dialogs/rd-task-sheet-dialog/rd-task-sheet-dialog.component';
import {
  RD_TASK_SHEET_BUSINESS_TYPE_LABELS,
  RD_TASK_SHEET_RESULT_LABELS,
  RD_TASK_SHEET_STATUS_LABELS,
  RD_TASK_SHEET_STATUS_OPTIONS,
  RD_TASK_SHEET_URGENCY_LABELS,
  type CreateRdTaskSheetInput,
  type RdTaskSheetBusinessType,
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
    RouterLink,
    PageHeaderComponent,
    PageToolbarComponent,
    FilterBarComponent,
    SearchBoxComponent,
    ListStateComponent,
    MarkdownViewerComponent,
    FileUploadDropzoneComponent,
    RdTaskSheetDialogComponent,
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
        <a nz-button routerLink="/rd">
          <span nz-icon nzType="unordered-list"></span>
          研发项
        </a>
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

    @if (store.selected(); as selected) {
      <aside class="drawer">
        <div class="drawer__panel">
          <header class="drawer__header">
            <div>
              <span class="drawer__code">{{ selected.sheetNo }}</span>
              <h2>{{ selected.title }}</h2>
              <div class="drawer__meta">
                <nz-tag [nzColor]="statusColor(selected.status)">{{ statusLabel(selected.status) }}</nz-tag>
                <nz-tag>{{ businessTypeLabel(selected.businessType) }}</nz-tag>
                <nz-tag [nzColor]="selected.urgency === 'urgent' ? 'red' : 'default'">{{ urgencyLabel(selected.urgency) }}</nz-tag>
              </div>
            </div>
            <button nz-button nzType="text" (click)="closeDetail()">
              <span nz-icon nzType="close"></span>
            </button>
          </header>

          <div class="drawer__actions">
            @if (selected.status === 'draft') {
              <button nz-button (click)="openEdit(selected)">编辑</button>
              <button nz-button nzType="primary" [nzLoading]="store.busy()" (click)="store.issue(selected.id)">下发</button>
            }
            @if (selected.status === 'issued') {
              <button nz-button nzType="primary" [nzLoading]="store.busy()" (click)="store.startProcessing(selected.id)">开始处理</button>
            }
            @if (selected.status === 'issued' || selected.status === 'processing') {
              <button nz-button (click)="openReply(selected)">回复</button>
            }
            @if (selected.status === 'replied') {
              <button nz-button nzDanger [nzLoading]="store.busy()" (click)="store.close(selected.id, {})">关闭</button>
            }
          </div>

          <section class="detail-grid">
            <div><span>关联项目</span><strong>{{ projectName(selected.projectId) || '未关联项目' }}</strong></div>
            <div><span>发起部门</span><strong>{{ selected.issuerDepartment || '-' }}</strong></div>
            <div><span>发起人</span><strong>{{ selected.issuerName || '-' }}</strong></div>
            <div><span>接收部门</span><strong>{{ selected.receiverDepartment || '-' }}</strong></div>
            <div><span>接收人</span><strong>{{ selected.receiverName || '-' }}</strong></div>
            <div><span>接收人联系电话</span><strong>{{ selected.receiverPhone || '-' }}</strong></div>
            <div><span>处理人</span><strong>{{ selected.processorName || '-' }}</strong></div>
            <div><span>客户单位</span><strong>{{ selected.customerCompany || '-' }}</strong></div>
            <div><span>客户联系人</span><strong>{{ selected.customerContact || '-' }}</strong></div>
            <div><span>客户联系方式</span><strong>{{ selected.customerPhone || '-' }}</strong></div>
            <div><span>项目名称</span><strong>{{ selected.projectName || '-' }}</strong></div>
            <div><span>项目联系人</span><strong>{{ selected.projectContact || '-' }}</strong></div>
            <div><span>相关系统</span><strong>{{ selected.relatedSystem || '-' }}</strong></div>
            <div><span>期望解决时间</span><strong>{{ selected.expectedResolvedAt || '-' }}</strong></div>
            <div><span>解决时间</span><strong>{{ selected.resolvedAt || '-' }}</strong></div>
            <div><span>处理结果</span><strong>{{ selected.result ? resultLabel(selected.result) : '-' }}</strong></div>
          </section>

          <section class="detail-section">
            <h3>业务描述</h3>
            <app-markdown-viewer [content]="selected.businessDescription" [showToc]="false" />
          </section>

          <section class="detail-section">
            <h3>交付 / 答复内容</h3>
            @if (selected.deliveryContent) {
              <app-markdown-viewer [content]="selected.deliveryContent" [showToc]="false" />
            } @else {
              <p class="muted">暂无回复</p>
            }
          </section>

          <section class="detail-section">
            <div class="section-title">
              <h3>附件</h3>
            </div>
            @if (selected.status !== 'closed') {
              <app-file-upload-dropzone
                [policy]="uploadPolicy"
                [files]="detailUploadFiles()"
                [disabled]="dialogBusy()"
                [hint]="'支持 Word / PDF / JPG / PNG，单个文件最大 ' + uploadSizeLimit"
                (filesChange)="uploadForSelected($event, selected)"
              />
            }
            @if (selected.attachments.length > 0) {
              <div class="attachment-list">
                @for (attachment of selected.attachments; track attachment.id) {
                  <div class="attachment-item">
                    <a [href]="attachmentUrl(attachment.uploadId)" target="_blank" rel="noreferrer">
                      {{ attachment.originalName || attachment.fileName || attachment.uploadId }}
                    </a>
                    <span>{{ formatFileSize(attachment.fileSize) }}</span>
                    @if (selected.status !== 'closed') {
                      <button nz-button nzType="link" nzDanger (click)="store.detach(selected.id, attachment.id)">删除</button>
                    }
                  </div>
                }
              </div>
            } @else {
              <p class="muted">暂无附件。</p>
            }
          </section>

          <section class="detail-section">
            <h3>操作日志</h3>
            <div class="log-list">
              @for (log of selected.logs; track log.id) {
                <div class="log-item">
                  <span>{{ log.createdAt | date: 'MM-dd HH:mm' }}</span>
                  <strong>{{ log.actorName || '-' }}</strong>
                  <span>{{ actionLabel(log.action) }}</span>
                  @if (log.comment) {
                    <em>{{ log.comment }}</em>
                  }
                </div>
              }
            </div>
          </section>
        </div>
      </aside>
    }

    <app-rd-task-sheet-dialog
      [open]="formOpen()"
      [busy]="dialogBusy()"
      [projects]="projects()"
      [users]="users()"
      [initial]="editingSheet()"
      [currentUser]="authStore.currentUser()"
      (cancel)="closeForm()"
      (save)="saveSheet($event)"
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
      .drawer__actions,
      .section-title,
      .attachment-item,
      .modal-panel header,
      .modal-panel footer {
        display: flex;
        align-items: center;
      }
      .toolbar-actions,
      .task-toolbar__main,
      .drawer__actions {
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
      .drawer {
        position: fixed;
        inset: 0;
        z-index: 20;
        display: flex;
        justify-content: flex-end;
        background: rgba(15, 23, 42, 0.28);
      }
      .drawer__panel {
        width: min(760px, 100vw);
        height: 100%;
        overflow: auto;
        background: var(--surface-card);
        box-shadow: -12px 0 32px rgba(15, 23, 42, 0.18);
        padding: 24px;
      }
      .drawer__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
      }
      .drawer__header h2 {
        margin: 4px 0 8px;
        font-size: 20px;
      }
      .drawer__code {
        color: var(--text-muted);
        font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      }
      .detail-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        margin: 20px 0;
      }
      .detail-grid div,
      .detail-section {
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius-sm);
        padding: 12px;
      }
      .detail-grid span {
        display: block;
        color: var(--text-muted);
        font-size: 12px;
        margin-bottom: 4px;
      }
      .detail-grid strong {
        font-weight: 500;
      }
      .detail-section {
        margin-top: 12px;
      }
      .detail-section h3 {
        margin: 0 0 8px;
        font-size: 14px;
      }
      .detail-section p {
        margin: 0;
        white-space: pre-wrap;
        line-height: 1.7;
      }
      .section-title {
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .attachment-list,
      .log-list {
        display: grid;
        gap: 8px;
        margin-top: 12px;
      }
      .attachment-item {
        justify-content: space-between;
        gap: 12px;
      }
      .log-item {
        display: grid;
        grid-template-columns: 90px 100px 110px 1fr;
        gap: 8px;
        color: var(--text-muted);
      }
      .log-item strong {
        color: var(--text-body);
      }
      .log-item em {
        font-style: normal;
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
        .detail-grid {
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
  readonly replyOpen = signal(false);
  readonly uploading = signal(false);
  readonly detailUploadFiles = signal<File[]>([]);
  readonly replyForm = signal<ReplyForm>({
    result: 'resolved',
    resolvedAt: new Date().toISOString().slice(0, 10),
    deliveryContent: '',
  });

  readonly statusOptions = RD_TASK_SHEET_STATUS_OPTIONS;
  readonly uploadPolicy = UPLOAD_TARGETS.taskSheetAttachment;
  readonly uploadSizeLimit = formatUploadSizeLimit(this.uploadPolicy);
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
    this.detailUploadFiles.set([]);
  }

  openCreate(): void {
    this.editingSheet.set(null);
    this.formOpen.set(true);
  }

  openEdit(detail: RdTaskSheetDetail): void {
    this.editingSheet.set(detail);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.editingSheet.set(null);
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
        this.store.create(
          {
            ...event.value,
            attachments: uploads.map((upload) => ({ uploadId: upload.id })),
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

  uploadForSelected(files: File[], detail: RdTaskSheetDetail): void {
    if (files.length === 0) {
      this.detailUploadFiles.set([]);
      return;
    }
    this.detailUploadFiles.set(files);
    this.uploading.set(true);
    forkJoin(files.map((file) => this.api.uploadAttachment(file)))
      .pipe(
        finalize(() => {
          this.uploading.set(false);
          this.detailUploadFiles.set([]);
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

  businessTypeLabel(type: RdTaskSheetBusinessType): string {
    return RD_TASK_SHEET_BUSINESS_TYPE_LABELS[type] ?? type;
  }

  resultLabel(result: RdTaskSheetResult): string {
    return RD_TASK_SHEET_RESULT_LABELS[result] ?? result;
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

  actionLabel(action: string): string {
    const labels: Record<string, string> = {
      create: '创建',
      update: '更新',
      issue: '下发',
      start_processing: '开始处理',
      reply: '回复',
      close: '关闭',
      'attachment.added': '添加附件',
      'attachment.removed': '删除附件',
    };
    return labels[action] ?? action;
  }

  attachmentUrl(uploadId: string): string {
    return `/api/admin/uploads/${encodeURIComponent(uploadId)}/raw`;
  }

  formatFileSize(size: number | null): string {
    if (!size) {
      return '';
    }
    if (size < 1024 * 1024) {
      return `${Math.round(size / 1024)}KB`;
    }
    return `${(size / 1024 / 1024).toFixed(1)}MB`;
  }
}
