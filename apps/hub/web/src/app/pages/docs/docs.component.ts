import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { debounceTime, firstValueFrom } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { ProjectContextService } from '../../core/services/project-context.service';
import { MarkdownEditorComponent } from '../../shared/markdown-editor/markdown-editor.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { HubDateTimePipe } from '../../shared/pipes/date-time.pipe';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import {
  DocDetail,
  DocListItem,
  DocListResult,
  DocProjectOption,
  DocStatus,
  getDocCategoryLabel,
  getDocStatusColor,
  getDocStatusLabel
} from './docs.model';

@Component({
  selector: 'app-docs-page',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    PageHeaderComponent,
    HubDateTimePipe,
    MarkdownEditorComponent
  ],
  template: `
    <section class="page">
      <app-page-header title="文档管理" subtitle="管理产品文档与发布状态">
        @if (canCreateDocument()) {
          <button page-header-actions nz-button nzType="primary" (click)="createDoc()">
            <i nz-icon nzType="plus"></i> 新建文档
          </button>
        }
      </app-page-header>

      @if (!isAdmin() && !canCreateDocument()) {
        <nz-alert
          class="section"
          nzType="info"
          nzMessage="当前账号不是任何项目的项目管理员，只能查看自己所在项目和公共文档。"
          nzShowIcon
        ></nz-alert>
      }

      <nz-card nzTitle="筛选条件" class="section">
        <form nz-form [formGroup]="filters" class="filter-grid">
          <nz-form-item>
            <nz-form-label>项目</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="projectId" nzAllowClear nzPlaceHolder="选择项目">
                @for (project of projectOpts(); track project.value) {
                  <nz-option [nzValue]="project.value" [nzLabel]="project.label" />
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>状态</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="status" nzAllowClear>
                <nz-option nzValue="draft" nzLabel="草稿"></nz-option>
                <nz-option nzValue="published" nzLabel="已发布"></nz-option>
                <nz-option nzValue="archived" nzLabel="已归档"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>分类</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="category" nzAllowClear>
                <nz-option nzValue="guide" nzLabel="指南"></nz-option>
                <nz-option nzValue="faq" nzLabel="常见问题"></nz-option>
                <nz-option nzValue="release-note" nzLabel="发布说明"></nz-option>
                <nz-option nzValue="spec" nzLabel="规范"></nz-option>
                <nz-option nzValue="policy" nzLabel="策略"></nz-option>
                <nz-option nzValue="other" nzLabel="其他"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>关键词</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="keyword" placeholder="文档标识 / 标题 / 内容" />
            </nz-form-control>
          </nz-form-item>
        </form>
      </nz-card>

      @if (listError()) {
        <nz-alert class="section" nzType="error" [nzMessage]="listError()!" nzShowIcon></nz-alert>
      }

      <nz-card nzTitle="文档列表" class="section">
        <div class="table-head">
          <span>共 {{ total() }} 条</span>
          <button nz-button nzType="default" (click)="reload()" [disabled]="listLoading()">刷新</button>
        </div>
        <nz-table #table [nzData]="docs()" [nzFrontPagination]="false" [nzLoading]="listLoading()">
          <thead>
            <tr>
              <th>标题</th>
              <th>分类</th>
              <th>状态</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            @for (item of table.data; track item.id) {
              <tr>
                <td>{{ item.title }}</td>
                <td>{{ categoryLabel(item.category) }}</td>
                <td><nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag></td>
                <td>{{ item.updatedAt | hubDateTime }}</td>
                <td>
                  <a nz-button nzType="link" (click)="viewDoc(item)">查看</a>
                  @if (canManageDocument(item)) {
                    <a nz-button nzType="link" (click)="editDoc(item)">编辑</a>
                    @if (item.status !== 'archived') {
                      <a nz-button nzType="link" nzDanger (click)="archiveDoc(item)">归档</a>
                    }
                    <a nz-button nzType="link" nzDanger (click)="deleteDoc(item)">删除</a>
                  }
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>

      <nz-modal
        nzTitle="文档详情"
        [(nzVisible)]="detailVisible"
        [nzMaskClosable]="true"
        [nzWidth]="760"
        [nzFooter]="detailFooter"
        (nzOnCancel)="closeDetail()"
      >
        <ng-container *nzModalContent>
          @if (detailError()) {
            <nz-alert nzType="error" [nzMessage]="detailError()!" nzShowIcon></nz-alert>
          }

          @if (detailLoading()) {
            <div class="detail-empty">文档详情加载中...</div>
          } @else if (selectedDetail(); as detail) {
            <div class="detail-panel">
              <div class="detail-header">
                <div>
                  <div class="detail-title">{{ detail.title }}</div>
                  <div class="detail-meta">
                    <span>项目：{{ projectLabel(detail.projectId) }}</span>
                    <span>分类：{{ categoryLabel(detail.category) }}</span>
                    <span>文档标识：{{ detail.slug }}</span>
                    <span>状态：{{ statusLabel(detail.status) }}</span>
                    @if (detail.version) {
                      <span>版本：{{ detail.version }}</span>
                    }
                    <span>更新时间：{{ detail.updatedAt | hubDateTime }}</span>
                  </div>
                </div>
              </div>

              @if (detail.summary) {
                <div class="detail-summary">{{ detail.summary }}</div>
              }

              <div class="detail-content">{{ detail.contentMd }}</div>
            </div>
          } @else {
            <div class="detail-empty">暂无文档详情</div>
          }
        </ng-container>

        <ng-template #detailFooter>
          <div class="detail-footer">
            @if (selectedDetail() && canManageDetail()) {
              <button nz-button type="button" (click)="editSelectedDoc()">编辑</button>
              @if (selectedDetail()!.status !== 'archived') {
                <button nz-button nzDanger type="button" (click)="archiveSelectedDoc()">归档</button>
              }
              <button nz-button nzDanger type="button" (click)="deleteSelectedDoc()">删除</button>
            }
            <button nz-button nzType="primary" type="button" (click)="closeDetail()">关闭</button>
          </div>
        </ng-template>
      </nz-modal>

      <nz-modal
        nzTitle="编辑文档"
        [(nzVisible)]="visible"
        [nzMaskClosable]="false"
        [nzWidth]="760"
        [nzFooter]="null"
        (nzOnCancel)="visible.set(false)"
      >
        <ng-container *nzModalContent>
          @if (formError()) {
            <nz-alert nzType="error" [nzMessage]="formError()!" nzShowIcon></nz-alert>
          }

          <form nz-form [formGroup]="form" nzLayout="vertical" class="form">
            <div class="grid-2">
              <nz-form-item>
                <nz-form-label [nzRequired]="!isAdmin()">{{ isAdmin() ? '项目（管理员可不选）' : '项目' }}</nz-form-label>
                <nz-form-control>
                  <nz-select
                    formControlName="projectId"
                    [nzAllowClear]="isAdmin()"
                    [nzPlaceHolder]="isAdmin() ? '不关联项目时为公共文档' : '请选择你有管理权限的项目'"
                  >
                    @for (project of editableProjectOptions(); track project.id) {
                      <nz-option [nzValue]="project.id" [nzLabel]="project.name + ' (' + project.projectKey + ')'" />
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label nzRequired>文档标识</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="slug" />
                  <div class="field-hint">用于生成文档地址，建议使用英文短横线，例如 <code>release-note-v2</code>。</div>
                </nz-form-control>
              </nz-form-item>
            </div>

            <nz-form-item>
              <nz-form-label nzRequired>标题</nz-form-label>
              <nz-form-control>
                <input nz-input formControlName="title" />
              </nz-form-control>
            </nz-form-item>

            <div class="grid-2">
              <nz-form-item>
                <nz-form-label nzRequired>分类</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="category">
                    <nz-option nzValue="guide" nzLabel="指南"></nz-option>
                    <nz-option nzValue="faq" nzLabel="常见问题"></nz-option>
                    <nz-option nzValue="release-note" nzLabel="发布说明"></nz-option>
                    <nz-option nzValue="spec" nzLabel="规范"></nz-option>
                    <nz-option nzValue="policy" nzLabel="策略"></nz-option>
                    <nz-option nzValue="other" nzLabel="其他"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label>目标状态</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="status">
                    <nz-option nzValue="draft" nzLabel="草稿"></nz-option>
                    <nz-option nzValue="published" nzLabel="已发布"></nz-option>
                    <nz-option nzValue="archived" nzLabel="已归档"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div class="grid-2">
              <nz-form-item>
                <nz-form-label>摘要</nz-form-label>
                <nz-form-control>
                  <textarea nz-input rows="2" formControlName="summary"></textarea>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label>版本</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="version" />
                </nz-form-control>
              </nz-form-item>
            </div>

            <nz-form-item>
              <nz-form-label nzRequired>Markdown 内容</nz-form-label>
              <nz-form-control>
                <app-markdown-editor formControlName="contentMd"></app-markdown-editor>
              </nz-form-control>
            </nz-form-item>

            <button nz-button nzType="primary" (click)="saveDoc()" [disabled]="form.invalid || saving()">
              保存文档
            </button>
          </form>
        </ng-container>
      </nz-modal>
    </section>
  `,
  styles: [
    PAGE_SHELL_STYLES,
    `
      .filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
      .table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .form { display: grid; gap: 4px; }
      .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .field-hint { margin-top: 6px; color: #8c8c8c; font-size: 12px; line-height: 1.5; }
      .detail-panel { display: grid; gap: 16px; }
      .detail-header { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; }
      .detail-title { font-size: 20px; font-weight: 600; color: #262626; }
      .detail-meta { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; color: #8c8c8c; font-size: 12px; }
      .detail-summary { white-space: pre-wrap; line-height: 1.7; color: #595959; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 12px; padding: 12px 16px; }
      .detail-content { white-space: pre-wrap; line-height: 1.7; color: #262626; background: #fafafa; border: 1px solid #f0f0f0; border-radius: 12px; padding: 16px; max-height: 60vh; overflow: auto; }
      .detail-empty { padding: 32px 0; text-align: center; color: #8c8c8c; }
      .detail-footer { display: flex; justify-content: flex-end; gap: 8px; }
    `
  ]
})
export class DocsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly projectContext = inject(ProjectContextService);

  protected readonly visible = signal(false);
  protected readonly detailVisible = signal(false);
  protected readonly saving = signal(false);
  protected readonly listLoading = signal(false);
  protected readonly detailLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly detailError = signal<string | null>(null);
  protected readonly docs = signal<DocListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly editingId = signal<string | null>(null);
  protected readonly selectedDetail = signal<DocDetail | null>(null);
  protected readonly projectOptions = signal<DocProjectOption[]>([]);
  protected readonly projectOpts = this.projectContext.projectOpts;

  protected readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');
  protected readonly editableProjectOptions = computed(() => {
    if (this.isAdmin()) {
      return this.projectOptions();
    }
    return this.projectOptions().filter((item) => item.currentUserCanManage);
  });
  protected readonly manageableProjectIds = computed(() => new Set(this.editableProjectOptions().map((item) => item.id)));
  protected readonly canCreateDocument = computed(() => this.isAdmin() || this.editableProjectOptions().length > 0);
  protected readonly canManageDetail = computed(() => {
    const detail = this.selectedDetail();
    return !!detail && this.canManageDocument(detail);
  });

  protected readonly filters = this.fb.nonNullable.group({
    projectId: [''],
    status: [''],
    category: [''],
    keyword: ['']
  });

  protected readonly form = this.fb.nonNullable.group({
    projectId: [''],
    slug: ['', [Validators.required]],
    title: ['', [Validators.required]],
    category: ['guide', [Validators.required]],
    status: ['draft' as DocStatus],
    summary: [''],
    contentMd: ['', [Validators.required]],
    version: ['']
  });

  public constructor() {
    this.filters.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => {
      void this.loadDocs();
    });

    const currentProjectId = this.projectContext.currentProject()?.id;
    this.filters.patchValue({ projectId: currentProjectId ?? '' }, { emitEvent: false });

    void this.loadProjectOptions();
    void this.loadDocs();
  }

  protected async reload(): Promise<void> {
    await this.loadDocs();
  }

  protected createDoc(): void {
    if (!this.canCreateDocument()) {
      return;
    }

    const preferredProjectId = this.filters.controls.projectId.value || this.projectContext.currentProject()?.id || undefined;
    void this.router.navigate(['/docs/new'], {
      queryParams: { projectId: preferredProjectId || undefined }
    });
  }

  protected async viewDoc(item: DocListItem): Promise<void> {
    this.detailVisible.set(true);
    this.detailLoading.set(true);
    this.detailError.set(null);

    try {
      const detail = await this.loadDocDetail(item.id);
      this.selectedDetail.set(detail);
    } catch (error) {
      this.detailError.set(this.getErrorMessage(error, '加载文档详情失败'));
      this.selectedDetail.set(null);
    } finally {
      this.detailLoading.set(false);
    }
  }

  protected closeDetail(): void {
    this.detailVisible.set(false);
    this.detailError.set(null);
  }

  protected async editDoc(item: DocListItem): Promise<void> {
    if (!this.canManageDocument(item)) {
      return;
    }

    this.formError.set(null);

    try {
      const detail = await this.loadDocDetail(item.id);
      this.openEditModal(detail);
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载文档详情失败'));
    }
  }

  protected editSelectedDoc(): void {
    const detail = this.selectedDetail();
    if (!detail || !this.canManageDocument(detail)) {
      return;
    }

    this.openEditModal(detail);
    this.detailVisible.set(false);
  }

  protected async archiveSelectedDoc(): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    await this.archiveDoc(detail);
    this.detailVisible.set(false);
  }

  protected async deleteSelectedDoc(): Promise<void> {
    const detail = this.selectedDetail();
    if (!detail) {
      return;
    }

    await this.deleteDoc(detail);
    this.detailVisible.set(false);
  }

  protected async archiveDoc(item: Pick<DocListItem, 'id' | 'projectId'>): Promise<void> {
    if (!this.canManageDocument(item)) {
      return;
    }

    this.listError.set(null);

    try {
      await firstValueFrom(this.api.post<DocDetail, Record<string, never>>(`/api/admin/documents/${item.id}/archive`, {}));
      await this.loadDocs();
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '归档文档失败'));
    }
  }

  protected async deleteDoc(item: Pick<DocListItem, 'id' | 'projectId'>): Promise<void> {
    if (!this.canManageDocument(item)) {
      return;
    }

    this.listError.set(null);

    try {
      await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/documents/${item.id}`));
      await this.loadDocs();
      if (this.editingId() === item.id) {
        this.visible.set(false);
        this.editingId.set(null);
      }
      if (this.selectedDetail()?.id === item.id) {
        this.selectedDetail.set(null);
      }
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '删除文档失败'));
    }
  }

  protected async saveDoc(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    if (!this.isAdmin()) {
      if (!value.projectId) {
        this.formError.set('请选择你有管理权限的项目');
        return;
      }
      if (!this.manageableProjectIds().has(value.projectId)) {
        this.formError.set('当前项目没有文档管理权限');
        return;
      }
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const basePayload = {
        projectId: value.projectId || null,
        slug: value.slug,
        title: value.title,
        category: value.category,
        summary: value.summary,
        contentMd: value.contentMd,
        version: value.version.trim() ? value.version.trim() : undefined
      };

      let item: DocDetail;
      if (this.editingId()) {
        item = await firstValueFrom(
          this.api.put<DocDetail, typeof basePayload>(`/api/admin/documents/${this.editingId()!}`, basePayload)
        );
      } else {
        item = await firstValueFrom(
          this.api.post<DocDetail, typeof basePayload>('/api/admin/documents', basePayload)
        );
      }

      if (value.status === 'published' && item.status !== 'published') {
        item = await firstValueFrom(
          this.api.post<DocDetail, Record<string, never>>(`/api/admin/documents/${item.id}/publish`, {})
        );
      }

      if (value.status === 'archived' && item.status !== 'archived') {
        item = await firstValueFrom(
          this.api.post<DocDetail, Record<string, never>>(`/api/admin/documents/${item.id}/archive`, {})
        );
      }

      this.selectedDetail.set(item);
      this.visible.set(false);
      await this.loadDocs();
    } catch (error) {
      this.formError.set(this.getErrorMessage(error, '保存文档失败'));
    } finally {
      this.saving.set(false);
    }
  }

  protected canManageDocument(item: Pick<DocListItem, 'projectId'>): boolean {
    if (this.isAdmin()) {
      return true;
    }

    return !!item.projectId && this.manageableProjectIds().has(item.projectId);
  }

  protected statusColor(status: DocStatus): string {
    return getDocStatusColor(status);
  }

  protected statusLabel(status: DocStatus): string {
    return getDocStatusLabel(status);
  }

  protected categoryLabel(category: DocListItem['category']): string {
    return getDocCategoryLabel(category);
  }

  protected projectLabel(projectId?: string | null): string {
    if (!projectId) {
      return '公共文档';
    }
    const project = this.projectOptions().find((item) => item.id === projectId);
    return project ? `${project.name} (${project.projectKey})` : projectId;
  }

  private openEditModal(detail: DocDetail): void {
    this.selectedDetail.set(detail);
    this.editingId.set(detail.id);
    this.form.reset({
      projectId: detail.projectId || '',
      slug: detail.slug,
      title: detail.title,
      category: detail.category,
      status: detail.status,
      summary: detail.summary || '',
      contentMd: detail.contentMd,
      version: detail.version || ''
    });
    this.visible.set(true);
  }

  private async loadProjectOptions(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.api.get<{ items: DocProjectOption[] }>('/api/admin/projects', {
          params: { status: 'active', page: 1, pageSize: 100 }
        })
      );
      this.projectOptions.set(result.items ?? []);
    } catch {
      this.projectOptions.set([]);
    }
  }

  private async loadDocs(): Promise<void> {
    this.listLoading.set(true);
    this.listError.set(null);

    try {
      const filter = this.filters.getRawValue();
      const params: Record<string, string | number | boolean> = { page: 1, pageSize: 50 };

      if (filter.projectId) params['projectId'] = filter.projectId;
      if (filter.status) params['status'] = filter.status;
      if (filter.category) params['category'] = filter.category;
      if (filter.keyword.trim()) params['keyword'] = filter.keyword.trim();

      const result = await firstValueFrom(this.api.get<DocListResult>('/api/admin/documents', { params }));
      this.docs.set(result.items);
      this.total.set(result.total);
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载文档列表失败'));
    } finally {
      this.listLoading.set(false);
    }
  }

  private async loadDocDetail(id: string): Promise<DocDetail> {
    return firstValueFrom(this.api.get<DocDetail>(`/api/admin/documents/${id}`));
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}

