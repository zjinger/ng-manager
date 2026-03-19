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
  templateUrl: './docs-create.component.html',
  styleUrls: ['./docs-create.component.less'],
  styles: [
    PAGE_SHELL_STYLES,
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
