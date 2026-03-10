import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { debounceTime, firstValueFrom } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';

type DocStatus = 'draft' | 'published' | 'archived';
type DocCategory = 'guide' | 'faq' | 'release-note' | 'spec' | 'policy' | 'other';

interface DocListItem {
  id: string;
  projectId?: string | null;
  slug: string;
  title: string;
  category: DocCategory;
  summary?: string | null;
  status: DocStatus;
  version?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface DocDetail extends DocListItem {
  contentMd: string;
}

interface DocListResult {
  items: DocListItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface ProjectOption {
  id: string;
  name: string;
  projectKey: string;
}

@Component({
  selector: 'app-docs-page',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzTypographyModule,
    NzModalModule
  ],
  template: `
    <section class="page">
      <div class="header">
        <div class="header-row">
          <h1 class="header-title">文档管理</h1>
          <div class="header-desc">管理产品文档与发布状态</div>
        </div>
        <div class="actions-row">
          <button nz-button nzType="primary" (click)="createDoc()">新建文档</button>
        </div>
      </div>

      <nz-card nzTitle="筛选条件" class="section">
        <form nz-form [formGroup]="filters" class="filter-grid">
          <nz-form-item>
            <nz-form-label>项目</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="projectId" nzAllowClear nzPlaceHolder="全部项目">
                @for (project of projectOptions(); track project.id) {
                  <nz-option [nzValue]="project.id" [nzLabel]="project.name + ' (' + project.projectKey + ')'" />
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
              <input nz-input formControlName="keyword" placeholder="slug / 标题 / 内容" />
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
              <th>slug</th>
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
                <td>{{ item.slug }}</td>
                <td>{{ item.title }}</td>
                <td>{{ categoryLabel(item.category) }}</td>
                <td><nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag></td>
                <td>{{ item.updatedAt }}</td>
                <td>
                  <a nz-button nzType="link" (click)="editDoc(item)">编辑</a>
                  @if (item.status !== 'archived') {
                    <a nz-button nzType="link" nzDanger (click)="archiveDoc(item)">归档</a>
                  }
                  <a nz-button nzType="link" nzDanger (click)="deleteDoc(item)">删除</a>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>

      <nz-modal
        [nzTitle]="editingId() ? '编辑文档' : '新建文档'"
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
                <nz-form-label>项目（可选）</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="projectId" nzAllowClear nzPlaceHolder="不关联项目">
                    @for (project of projectOptions(); track project.id) {
                      <nz-option [nzValue]="project.id" [nzLabel]="project.name + ' (' + project.projectKey + ')'" />
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label nzRequired>slug</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="slug" />
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
                <textarea nz-input rows="12" formControlName="contentMd"></textarea>
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
  styles: `
    .page { background: #fff; border-radius: 10px; padding: 20px; }
    .section { margin-top: 16px; }
    .actions-row { display: flex; justify-content: flex-end; }
    .filter-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
    .table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .form { display: grid; gap: 4px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  `
})
export class DocsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);

  protected readonly visible = signal(false);
  protected readonly saving = signal(false);
  protected readonly listLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);

  protected readonly docs = signal<DocListItem[]>([]);
  protected readonly total = signal(0);
  protected readonly editingId = signal<string | null>(null);
  protected readonly projectOptions = signal<ProjectOption[]>([]);

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
    category: ['guide' as DocCategory, [Validators.required]],
    status: ['draft' as DocStatus],
    summary: [''],
    contentMd: ['', [Validators.required]],
    version: ['']
  });

  public constructor() {
    this.filters.valueChanges.pipe(debounceTime(250), takeUntilDestroyed()).subscribe(() => {
      void this.loadDocs();
    });

    void this.loadProjectOptions();
    void this.loadDocs();
  }

  protected async reload(): Promise<void> {
    await this.loadDocs();
  }

  protected createDoc(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({
      projectId: '',
      slug: '',
      title: '',
      category: 'guide',
      status: 'draft',
      summary: '',
      contentMd: '',
      version: ''
    });
    this.visible.set(true);
  }

  protected async editDoc(item: DocListItem): Promise<void> {
    this.formError.set(null);

    try {
      const detail = await firstValueFrom(this.api.get<DocDetail>(`/api/admin/documents/${item.id}`));

      this.editingId.set(item.id);
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
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载文档详情失败'));
    }
  }

  protected async archiveDoc(item: DocListItem): Promise<void> {
    this.listError.set(null);

    try {
      await firstValueFrom(this.api.post<DocDetail, Record<string, never>>(`/api/admin/documents/${item.id}/archive`, {}));
      await this.loadDocs();
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '归档文档失败'));
    }
  }

  protected async deleteDoc(item: DocListItem): Promise<void> {
    this.listError.set(null);

    try {
      await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/documents/${item.id}`));
      await this.loadDocs();
      if (this.editingId() === item.id) {
        this.visible.set(false);
        this.editingId.set(null);
      }
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '删除文档失败'));
    }
  }

  protected async saveDoc(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const value = this.form.getRawValue();
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
        await firstValueFrom(
          this.api.post<DocDetail, Record<string, never>>(`/api/admin/documents/${item.id}/archive`, {})
        );
      }

      this.visible.set(false);
      await this.loadDocs();
    } catch (error) {
      this.formError.set(this.getErrorMessage(error, '保存文档失败'));
    } finally {
      this.saving.set(false);
    }
  }

  protected statusColor(status: DocStatus): string {
    if (status === 'published') return 'green';
    if (status === 'archived') return 'default';
    return 'orange';
  }

  protected statusLabel(status: DocStatus): string {
    if (status === 'published') return '已发布';
    if (status === 'archived') return '已归档';
    return '草稿';
  }

  protected categoryLabel(category: DocCategory): string {
    if (category === 'guide') return '指南';
    if (category === 'faq') return '常见问题';
    if (category === 'release-note') return '发布说明';
    if (category === 'spec') return '规范';
    if (category === 'policy') return '策略';
    return '其他';
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

  private async loadProjectOptions(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.api.get<{ items: ProjectOption[] }>('/api/admin/projects', {
          params: { status: 'active', page: 1, pageSize: 100 }
        })
      );
      this.projectOptions.set(result.items);
    } catch {
      this.projectOptions.set([]);
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}



