import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { ProjectContextService } from '../../core/services/project-context.service';
import { MarkdownEditorComponent } from '../../shared/markdown-editor/markdown-editor.component';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import { DocDetail, DocProjectOption, DocStatus } from './docs.model';

@Component({
  selector: 'app-docs-create-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    PageHeaderComponent,
    MarkdownEditorComponent
  ],
  template: `
    <section class="page">
      <app-page-header title="新建文档" subtitle="创建文档并设置所属项目与发布状态">
        <a page-header-actions nz-button nzType="default" routerLink="/docs">返回列表</a>
      </app-page-header>

      @if (error()) {
        <nz-alert class="section" nzType="error" [nzMessage]="error()!" nzShowIcon></nz-alert>
      }

      @if (!loading() && !canCreateDocument()) {
        <nz-alert
          class="section"
          nzType="info"
          nzMessage="当前账号不是管理员，也不是任何项目的项目管理员，无法新建文档。"
          nzShowIcon
        ></nz-alert>
      }

      <nz-card nzTitle="文档信息" class="section">
        @if (loading()) {
          <div class="empty-state">新建页初始化中...</div>
        } @else if (canCreateDocument()) {
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
                      <nz-option [nzValue]="project.id" [nzLabel]="project.name" />
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label nzRequired>文档标识</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="slug" placeholder="用于生成文档地址，建议使用英文短横线，例如 release-note-v2" />
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

            <div class="actions">
              <button nz-button type="button" routerLink="/docs">取消</button>
              <button nz-button nzType="primary" type="button" (click)="saveDoc()" [disabled]="form.invalid || saving()">
                保存文档
              </button>
            </div>
          </form>
        } @else {
          <div class="empty-state">当前账号没有可管理的项目。</div>
        }
      </nz-card>
    </section>
  `,
  styles: [
    PAGE_SHELL_STYLES,
    `
      .form { display: grid; gap: 4px; }
      .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .field-hint { margin-top: 6px; color: #8c8c8c; font-size: 12px; line-height: 1.5; }
      .actions { display: flex; justify-content: flex-end; gap: 8px; }
      .empty-state { padding: 32px 0; text-align: center; color: #8c8c8c; }
    `
  ]
})
export class DocsCreatePageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);
  private readonly auth = inject(AdminAuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly projectContext = inject(ProjectContextService);

  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly projectOptions = signal<DocProjectOption[]>([]);
  protected readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');
  protected readonly editableProjectOptions = computed(() => {
    if (this.isAdmin()) {
      return this.projectOptions();
    }
    return this.projectOptions().filter((item) => item.currentUserCanManage);
  });
  protected readonly manageableProjectIds = computed(() => new Set(this.editableProjectOptions().map((item) => item.id)));
  protected readonly canCreateDocument = computed(() => this.isAdmin() || this.editableProjectOptions().length > 0);

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
    void this.initialize();
  }

  protected async saveDoc(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    if (!this.isAdmin()) {
      if (!value.projectId) {
        this.error.set('请选择你有管理权限的项目');
        return;
      }
      if (!this.manageableProjectIds().has(value.projectId)) {
        this.error.set('当前项目没有文档管理权限');
        return;
      }
    }

    this.saving.set(true);
    this.error.set(null);

    try {
      const payload = {
        projectId: value.projectId || null,
        slug: value.slug,
        title: value.title,
        category: value.category,
        summary: value.summary,
        contentMd: value.contentMd,
        version: value.version.trim() ? value.version.trim() : undefined
      };

      let item = await firstValueFrom(this.api.post<DocDetail, typeof payload>('/api/admin/documents', payload));

      if (value.status === 'published' && item.status !== 'published') {
        item = await firstValueFrom(this.api.post<DocDetail, Record<string, never>>(`/api/admin/documents/${item.id}/publish`, {}));
      }

      if (value.status === 'archived' && item.status !== 'archived') {
        await firstValueFrom(this.api.post<DocDetail, Record<string, never>>(`/api/admin/documents/${item.id}/archive`, {}));
      }

      await this.router.navigate(['/docs']);
    } catch (error) {
      this.error.set(this.getErrorMessage(error, '保存文档失败'));
    } finally {
      this.saving.set(false);
    }
  }

  private async initialize(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<{ items: DocProjectOption[] }>('/api/admin/projects', {
          params: { status: 'active', page: 1, pageSize: 100 }
        })
      );
      const items = result.items ?? [];
      this.projectOptions.set(items);
      this.resetDefaultProject(items);
    } catch (error) {
      this.error.set(this.getErrorMessage(error, '加载新建页数据失败'));
      this.projectOptions.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  private resetDefaultProject(projects: DocProjectOption[]): void {
    const preferredProjectId = this.route.snapshot.queryParamMap.get('projectId')?.trim() || this.projectContext.currentProject()?.id || '';
    const editableProjects = this.isAdmin() ? projects : projects.filter((item) => item.currentUserCanManage);
    const nextProjectId = preferredProjectId && editableProjects.some((item) => item.id === preferredProjectId)
      ? preferredProjectId
      : (!this.isAdmin() ? (editableProjects[0]?.id ?? '') : '');

    this.form.patchValue({ projectId: nextProjectId });
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}
