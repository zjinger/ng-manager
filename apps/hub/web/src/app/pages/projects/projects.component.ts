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
import { firstValueFrom } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';

type ProjectStatus = 'active' | 'archived';
type ProjectVisibility = 'internal' | 'public';

interface ProjectItem {
  id: string;
  projectKey: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  status: ProjectStatus;
  visibility: ProjectVisibility;
  createdAt: string;
  updatedAt: string;
}

interface ProjectListResult {
  items: ProjectItem[];
  page: number;
  pageSize: number;
  total: number;
}

@Component({
  selector: 'app-projects-page',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule
  ],
  template: `
    <section class="page">
      <div class="header">
        <div class="header-row">
          <h1 class="header-title">项目管理</h1>
          <div class="header-desc">维护项目基础信息与可见性</div>
        </div>
        <div class="actions-row">
          <button nz-button nzType="primary" (click)="createProject()">新建项目</button>
        </div>
      </div>

      <nz-card nzTitle="筛选条件" class="section">
        <form nz-form [formGroup]="filters" class="filter-grid">
          <nz-form-item>
            <nz-form-label>状态</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="status" nzAllowClear>
                <nz-option nzValue="active" nzLabel="active"></nz-option>
                <nz-option nzValue="archived" nzLabel="archived"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>可见性</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="visibility" nzAllowClear>
                <nz-option nzValue="internal" nzLabel="internal"></nz-option>
                <nz-option nzValue="public" nzLabel="public"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>关键词</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="keyword" placeholder="projectKey / 名称 / 描述" />
            </nz-form-control>
          </nz-form-item>
        </form>
      </nz-card>

      @if (listError()) {
        <nz-alert class="section" nzType="error" [nzMessage]="listError()!" nzShowIcon></nz-alert>
      }

      <nz-card nzTitle="项目列表" class="section">
        <div class="table-head">
          <span>共 {{ total() }} 条</span>
          <button nz-button nzType="default" (click)="reload()" [disabled]="listLoading()">刷新</button>
        </div>
        <nz-table #table [nzData]="projects()" [nzFrontPagination]="false" [nzLoading]="listLoading()">
          <thead>
            <tr>
              <th>projectKey</th>
              <th>名称</th>
              <th>状态</th>
              <th>可见性</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            @for (item of table.data; track item.id) {
              <tr>
                <td>{{ item.projectKey }}</td>
                <td>{{ item.name }}</td>
                <td><nz-tag [nzColor]="statusColor(item.status)">{{ item.status }}</nz-tag></td>
                <td>{{ item.visibility }}</td>
                <td>{{ item.updatedAt }}</td>
                <td>
                  <a nz-button nzType="link" (click)="editProject(item)">编辑</a>
                  @if (item.status === 'active') {
                    <a nz-button nzType="link" nzDanger (click)="archiveProject(item)">归档</a>
                  } @else {
                    <a nz-button nzType="link" (click)="activateProject(item)">启用</a>
                  }
                  <a nz-button nzType="link" nzDanger (click)="deleteProject(item)">删除</a>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>

      <nz-modal
        [nzTitle]="editingId() ? '编辑项目' : '新建项目'"
        [(nzVisible)]="visible"
        [nzMaskClosable]="false"
        [nzWidth]="680"
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
                <nz-form-label nzRequired>项目 Key</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="projectKey" placeholder="example-project" />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label nzRequired>项目名称</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="name" />
                </nz-form-control>
              </nz-form-item>
            </div>

            <nz-form-item>
              <nz-form-label>描述</nz-form-label>
              <nz-form-control>
                <textarea nz-input rows="3" formControlName="description"></textarea>
              </nz-form-control>
            </nz-form-item>

            <div class="grid-2">
              <nz-form-item>
                <nz-form-label>图标 URL</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="icon" />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label>可见性</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="visibility">
                    <nz-option nzValue="internal" nzLabel="internal"></nz-option>
                    <nz-option nzValue="public" nzLabel="public"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <button nz-button nzType="primary" (click)="saveProject()" [disabled]="form.invalid || saving()">
              保存项目
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
    .filter-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .form { display: grid; gap: 4px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  `
})
export class ProjectsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);

  protected readonly visible = signal(false);
  protected readonly saving = signal(false);
  protected readonly listLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly projects = signal<ProjectItem[]>([]);
  protected readonly total = signal(0);
  protected readonly editingId = signal<string | null>(null);

  protected readonly filters = this.fb.nonNullable.group({
    status: [''],
    visibility: [''],
    keyword: ['']
  });

  protected readonly form = this.fb.nonNullable.group({
    projectKey: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    name: ['', [Validators.required]],
    description: [''],
    icon: [''],
    visibility: ['internal' as ProjectVisibility, [Validators.required]]
  });

  public constructor() {
    this.filters.valueChanges.subscribe(() => {
      void this.loadProjects();
    });
    void this.loadProjects();
  }

  protected async reload(): Promise<void> {
    await this.loadProjects();
  }

  protected createProject(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.enable();
    this.form.reset({
      projectKey: '',
      name: '',
      description: '',
      icon: '',
      visibility: 'internal'
    });
    this.visible.set(true);
  }

  protected editProject(item: ProjectItem): void {
    this.editingId.set(item.id);
    this.formError.set(null);
    this.form.reset({
      projectKey: item.projectKey,
      name: item.name,
      description: item.description || '',
      icon: item.icon || '',
      visibility: item.visibility
    });
    this.form.controls.projectKey.disable();
    this.visible.set(true);
  }

  protected async archiveProject(item: ProjectItem): Promise<void> {
    await this.updateStatus(item, 'archived', '归档项目失败');
  }

  protected async activateProject(item: ProjectItem): Promise<void> {
    await this.updateStatus(item, 'active', '启用项目失败');
  }

  protected async deleteProject(item: ProjectItem): Promise<void> {
    this.listError.set(null);
    try {
      await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${item.id}`));
      await this.loadProjects();
      if (this.editingId() === item.id) {
        this.visible.set(false);
        this.editingId.set(null);
      }
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '删除项目失败'));
    }
  }

  protected async saveProject(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const value = this.form.getRawValue();
      if (this.editingId()) {
        await firstValueFrom(
          this.api.put<ProjectItem, Record<string, string | ProjectVisibility | null>>(
            `/api/admin/projects/${this.editingId()!}`,
            {
              name: value.name.trim(),
              description: value.description.trim() || null,
              icon: value.icon.trim() || null,
              visibility: value.visibility
            }
          )
        );
      } else {
        await firstValueFrom(
          this.api.post<ProjectItem, Record<string, string | ProjectVisibility | undefined>>('/api/admin/projects', {
            projectKey: value.projectKey.trim(),
            name: value.name.trim(),
            description: value.description.trim() || undefined,
            icon: value.icon.trim() || undefined,
            visibility: value.visibility
          })
        );
      }

      this.visible.set(false);
      await this.loadProjects();
    } catch (error) {
      this.formError.set(this.getErrorMessage(error, '保存项目失败'));
    } finally {
      this.saving.set(false);
    }
  }

  protected statusColor(status: ProjectStatus): string {
    return status === 'active' ? 'green' : 'default';
  }

  private async updateStatus(item: ProjectItem, status: ProjectStatus, fallback: string): Promise<void> {
    this.listError.set(null);
    try {
      await firstValueFrom(
        this.api.put<ProjectItem, { status: ProjectStatus }>(`/api/admin/projects/${item.id}`, {
          status
        })
      );
      await this.loadProjects();
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, fallback));
    }
  }

  private async loadProjects(): Promise<void> {
    this.listLoading.set(true);
    this.listError.set(null);

    try {
      const filter = this.filters.getRawValue();
      const params: Record<string, string | number> = { page: 1, pageSize: 100 };
      if (filter.status) params['status'] = filter.status;
      if (filter.visibility) params['visibility'] = filter.visibility;
      if (filter.keyword.trim()) params['keyword'] = filter.keyword.trim();

      const result = await firstValueFrom(this.api.get<ProjectListResult>('/api/admin/projects', { params }));
      this.projects.set(result.items);
      this.total.set(result.total);
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载项目列表失败'));
    } finally {
      this.listLoading.set(false);
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}
