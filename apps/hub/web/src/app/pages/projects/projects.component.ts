import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { firstValueFrom } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { HubDateTimePipe } from '../../shared/pipes/date-time.pipe';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';

type ProjectStatus = 'active' | 'archived';
type ProjectVisibility = 'internal' | 'public';
type ProjectMemberRole = 'product' | 'ui' | 'frontend_dev' | 'backend_dev' | 'qa' | 'ops';

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

interface ProjectMemberItem {
  id: string;
  projectId: string;
  userId: string;
  displayName: string;
  roles: ProjectMemberRole[];
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-projects-page',
  imports: [
    ClipboardModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    NzIconModule,
    NzTooltipModule,
    PageHeaderComponent,
    HubDateTimePipe
  ],
  template: `
    <section class="page">
      <app-page-header title="项目管理" subtitle="维护项目基础信息与可见性">
        <button page-header-actions nz-button nzType="primary" (click)="createProject()">新建项目</button>
      </app-page-header>

      <nz-card nzTitle="筛选条件" class="section">
        <form nz-form [formGroup]="filters" class="filter-grid">
          <nz-form-item>
            <nz-form-label>状态</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="status" nzAllowClear>
                <nz-option nzValue="active" nzLabel="启用"></nz-option>
                <nz-option nzValue="archived" nzLabel="归档"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>可见性</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="visibility" nzAllowClear>
                <nz-option nzValue="internal" nzLabel="内部"></nz-option>
                <nz-option nzValue="public" nzLabel="公开"></nz-option>
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
                <td>
                  <div class="project-key-row">
                    <span>{{ item.projectKey }}</span>
                    <button
                      nz-button
                      nzType="text"
                      [disabled]="!item.projectKey"
                      (click)="copyProjectKey(item.projectKey)"
                    >
                      @if (keyCopied() && curCopiedKey() === item.projectKey) {
                        <nz-icon style="color: green;" nzType="check" nzTheme="outline" />
                      } @else {
                        <nz-icon nz-tooltip nzTooltipTitle="复制" nzType="copy" nzTheme="outline"></nz-icon>
                      }
                    </button>
                  </div>
                </td>
                <td>{{ item.name }}</td>
                <td><nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag></td>
                <td>{{ visibilityLabel(item.visibility) }}</td>
                <td>{{ item.updatedAt | hubDateTime }}</td>
                <td>
                  <a nz-button nzType="link" (click)="editProject(item)">编辑</a>
                  <a nz-button nzType="link" (click)="openMemberConfig(item)">成员配置</a>
                  @if (item.status === 'active') {
                    <a
                      nz-button
                      nzType="link"
                      nzDanger
                      nz-popconfirm
                      [nzPopconfirmTitle]="'确认归档项目「' + item.name + '」吗？'"
                      nzPopconfirmPlacement="topRight"
                      nzPopconfirmOkText="确认"
                      nzPopconfirmCancelText="取消"
                      (nzOnConfirm)="archiveProject(item)"
                    >
                      归档
                    </a>
                  } @else {
                    <a nz-button nzType="link" (click)="activateProject(item)">启用</a>
                  }
                  <a
                    nz-button
                    nzType="link"
                    nzDanger
                    nz-popconfirm
                    [nzPopconfirmTitle]="'确认删除项目「' + item.name + '」吗？删除后不可恢复。'"
                    nzPopconfirmPlacement="topRight"
                    nzPopconfirmOkText="删除"
                    nzPopconfirmCancelText="取消"
                    (nzOnConfirm)="deleteProject(item)"
                  >
                    删除
                  </a>
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
                <nz-form-label>项目 Key</nz-form-label>
                <nz-form-control>
                  <div class="project-key-row">
                    <input nz-input [value]="editingProjectKey() || '由系统自动生成'" readonly />
                    <button
                      nz-button
                      nzType="text"
                      type="button"
                      [disabled]="!editingProjectKey()"
                      (click)="copyProjectKey(editingProjectKey()!)"
                    >
                      @if (keyCopied() && curCopiedKey() === editingProjectKey()) {
                        <nz-icon style="color: green;" nzType="check" nzTheme="outline" />
                      } @else {
                        <nz-icon nz-tooltip nzTooltipTitle="复制" nzType="copy" nzTheme="outline"></nz-icon>
                      }
                    </button>
                  </div>
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
                    <nz-option nzValue="internal" nzLabel="内部"></nz-option>
                    <nz-option nzValue="public" nzLabel="公开"></nz-option>
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

      <nz-modal
        [nzTitle]="'项目成员配置 - ' + memberProjectName()"
        [(nzVisible)]="memberVisible"
        [nzMaskClosable]="false"
        [nzWidth]="920"
        [nzFooter]="null"
        (nzOnCancel)="memberVisible.set(false)"
      >
        <ng-container *nzModalContent>
          @if (memberError()) {
            <nz-alert nzType="error" [nzMessage]="memberError()!" nzShowIcon></nz-alert>
          }

          <form nz-form [formGroup]="memberForm" nzLayout="vertical" class="form section">
            <div class="grid-3">
              <nz-form-item>
                <nz-form-label nzRequired>成员ID</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="userId" [readonly]="!!editingMemberId()" placeholder="admin user id" />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label nzRequired>显示名称</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="displayName" placeholder="例如：张三" />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label nzRequired>角色</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="roles" nzMode="multiple" nzPlaceHolder="至少选择一个角色">
                    @for (role of memberRoleOptions; track role) {
                      <nz-option [nzValue]="role" [nzLabel]="roleLabel(role)"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>
            <div class="action-buttons">
              <button nz-button nzType="primary" type="button" (click)="saveMember()" [disabled]="memberForm.invalid || memberSaving()">
                {{ editingMemberId() ? '保存成员' : '添加成员' }}
              </button>
              <button nz-button nzType="default" type="button" (click)="resetMemberForm()" [disabled]="memberSaving()">清空</button>
            </div>
          </form>

          <nz-table [nzData]="projectMembers()" [nzFrontPagination]="false" [nzLoading]="memberLoading()">
            <thead>
              <tr>
                <th>成员ID</th>
                <th>显示名称</th>
                <th>角色</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              @for (member of projectMembers(); track member.id) {
                <tr>
                  <td>{{ member.userId }}</td>
                  <td>{{ member.displayName }}</td>
                  <td>{{ member.roles.map(roleLabel).join('、') }}</td>
                  <td>
                    <a nz-button nzType="link" (click)="editMember(member)">编辑</a>
                    <a nz-button nzType="link" nzDanger (click)="removeMember(member)">删除</a>
                  </td>
                </tr>
              }
            </tbody>
          </nz-table>
        </ng-container>
      </nz-modal>
    </section>
  `,
  styles: [
    PAGE_SHELL_STYLES,
    `
      .filter-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      .table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .form { display: grid; gap: 4px; }
      .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .project-key-row { display: grid; grid-template-columns: 200px 1fr;  gap: 8px; align-items: center; }
    `
  ]
})
export class ProjectsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);
  private readonly clipboard = inject(Clipboard);
  private readonly message = inject(NzMessageService);

  protected readonly visible = signal(false);
  protected readonly saving = signal(false);
  protected readonly listLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly projects = signal<ProjectItem[]>([]);
  protected readonly total = signal(0);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingProjectKey = signal<string | null>(null);
  protected readonly keyCopied = signal(false);
  protected readonly curCopiedKey = signal<string | null>(null);
  protected readonly memberVisible = signal(false);
  protected readonly memberLoading = signal(false);
  protected readonly memberSaving = signal(false);
  protected readonly memberError = signal<string | null>(null);
  protected readonly memberProjectId = signal<string>('');
  protected readonly memberProjectName = signal<string>('');
  protected readonly projectMembers = signal<ProjectMemberItem[]>([]);
  protected readonly editingMemberId = signal<string | null>(null);

  protected readonly memberRoleOptions: ProjectMemberRole[] = ['product', 'ui', 'frontend_dev', 'backend_dev', 'qa', 'ops'];

  protected readonly filters = this.fb.nonNullable.group({
    status: [''],
    visibility: [''],
    keyword: ['']
  });

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    icon: [''],
    visibility: ['internal' as ProjectVisibility, [Validators.required]]
  });

  protected readonly memberForm = this.fb.nonNullable.group({
    userId: ['', [Validators.required]],
    displayName: ['', [Validators.required]],
    roles: [[] as ProjectMemberRole[], [Validators.required]]
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
    this.editingProjectKey.set(null);
    this.keyCopied.set(false);
    this.curCopiedKey.set(null);
    this.formError.set(null);
    this.form.reset({
      name: '',
      description: '',
      icon: '',
      visibility: 'internal'
    });
    this.visible.set(true);
  }

  protected editProject(item: ProjectItem): void {
    this.editingId.set(item.id);
    this.editingProjectKey.set(item.projectKey);
    this.keyCopied.set(false);
    this.curCopiedKey.set(null);
    this.formError.set(null);
    this.form.reset({
      name: item.name,
      description: item.description || '',
      icon: item.icon || '',
      visibility: item.visibility
    });
    this.visible.set(true);
  }

  protected async archiveProject(item: ProjectItem): Promise<void> {
    await this.updateStatus(item, 'archived', '归档项目失败', `项目「${item.name}」已归档`);
  }

  protected async activateProject(item: ProjectItem): Promise<void> {
    await this.updateStatus(item, 'active', '启用项目失败', `项目「${item.name}」已启用`);
  }

  protected async deleteProject(item: ProjectItem): Promise<void> {
    this.listError.set(null);
    try {
      await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${item.id}`));
      this.message.success(`项目「${item.name}」已删除`);
      await this.loadProjects();
      if (this.editingId() === item.id) {
        this.visible.set(false);
        this.editingId.set(null);
        this.editingProjectKey.set(null);
        this.curCopiedKey.set(null);
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

  protected async copyProjectKey(key: string): Promise<void> {
    if (!key) {
      return;
    }
    const copied = this.clipboard.copy(key);
    if (!copied) {
      return;
    }

    this.keyCopied.set(true);
    this.curCopiedKey.set(key);
    setTimeout(() => {
      this.keyCopied.set(false);
      this.curCopiedKey.set(null);
    }, 1200);
  }


  protected roleLabel(role: ProjectMemberRole): string {
    if (role === 'product') return '产品';
    if (role === 'frontend_dev') return '前端开发';
    if (role === 'backend_dev') return '后端开发';
    return '测试';
  }

  protected openMemberConfig(item: ProjectItem): void {
    this.memberProjectId.set(item.id);
    this.memberProjectName.set(item.name);
    this.memberError.set(null);
    this.memberVisible.set(true);
    this.resetMemberForm();
    void this.loadProjectMembers(item.id);
  }

  protected resetMemberForm(): void {
    this.editingMemberId.set(null);
    this.memberForm.reset({
      userId: '',
      displayName: '',
      roles: []
    });
  }

  protected editMember(item: ProjectMemberItem): void {
    this.editingMemberId.set(item.id);
    this.memberError.set(null);
    this.memberForm.reset({
      userId: item.userId,
      displayName: item.displayName,
      roles: [...item.roles]
    });
  }

  protected async saveMember(): Promise<void> {
    if (this.memberForm.invalid) {
      return;
    }

    const projectId = this.memberProjectId();
    if (!projectId) {
      return;
    }

    this.memberSaving.set(true);
    this.memberError.set(null);

    try {
      const value = this.memberForm.getRawValue();
      if (this.editingMemberId()) {
        await firstValueFrom(
          this.api.put<ProjectMemberItem, { displayName: string; roles: ProjectMemberRole[] }>(
            `/api/admin/projects/${projectId}/members/${this.editingMemberId()!}`,
            {
              displayName: value.displayName.trim(),
              roles: value.roles
            }
          )
        );
      } else {
        await firstValueFrom(
          this.api.post<ProjectMemberItem, { userId: string; displayName: string; roles: ProjectMemberRole[] }>(
            `/api/admin/projects/${projectId}/members`,
            {
              userId: value.userId.trim(),
              displayName: value.displayName.trim(),
              roles: value.roles
            }
          )
        );
      }

      this.resetMemberForm();
      await this.loadProjectMembers(projectId);
    } catch (error) {
      this.memberError.set(this.getErrorMessage(error, '保存项目成员失败'));
    } finally {
      this.memberSaving.set(false);
    }
  }

  protected async removeMember(item: ProjectMemberItem): Promise<void> {
    const projectId = this.memberProjectId();
    if (!projectId) {
      return;
    }

    this.memberError.set(null);
    try {
      await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${projectId}/members/${item.id}`));
      await this.loadProjectMembers(projectId);
      if (this.editingMemberId() === item.id) {
        this.resetMemberForm();
      }
    } catch (error) {
      this.memberError.set(this.getErrorMessage(error, '删除项目成员失败'));
    }
  }

  private async loadProjectMembers(projectId: string): Promise<void> {
    this.memberLoading.set(true);
    this.memberError.set(null);

    try {
      const result = await firstValueFrom(
        this.api.get<{ items: ProjectMemberItem[] }>(`/api/admin/projects/${projectId}/members`)
      );
      this.projectMembers.set(result.items);
    } catch (error) {
      this.projectMembers.set([]);
      this.memberError.set(this.getErrorMessage(error, '加载项目成员失败'));
    } finally {
      this.memberLoading.set(false);
    }
  }
  protected statusColor(status: ProjectStatus): string {
    return status === 'active' ? 'green' : 'default';
  }

  protected statusLabel(status: ProjectStatus): string {
    return status === 'active' ? '启用' : '归档';
  }

  protected visibilityLabel(visibility: ProjectVisibility): string {
    return visibility === 'public' ? '公开' : '内部';
  }

  private async updateStatus(
    item: ProjectItem,
    status: ProjectStatus,
    fallback: string,
    successMessage: string
  ): Promise<void> {
    this.listError.set(null);
    try {
      await firstValueFrom(
        this.api.put<ProjectItem, { status: ProjectStatus }>(`/api/admin/projects/${item.id}`, {
          status
        })
      );
      this.message.success(successMessage);
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

