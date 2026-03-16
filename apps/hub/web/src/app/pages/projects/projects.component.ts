import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { firstValueFrom } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { HubDateTimePipe } from '../../shared/pipes/date-time.pipe';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import { ProjectConfigItem, ProjectItem, ProjectListResult, ProjectMemberItem, ProjectMemberRole, ProjectStatus, ProjectVersionItem, ProjectVisibility, roleLabel, UserOptionItem } from './projects.model';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzResultModule } from 'ng-zorro-antd/result';
@Component({
  selector: 'app-projects-page',
  imports: [
    ClipboardModule,
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzDropDownModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzMenuModule,
    NzModalModule,
    NzSelectModule,
    NzTableModule,
    NzTabsModule,
    NzTagModule,
    NzTooltipModule,
    PageHeaderComponent,
    HubDateTimePipe,
    NzSpaceModule,
    NzPopconfirmModule,
    NzResultModule
  ],
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.less'],
  styles: [PAGE_SHELL_STYLES]
})
export class ProjectsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);
  private readonly clipboard = inject(Clipboard);
  private readonly message = inject(NzMessageService);

  protected readonly projects = signal<ProjectItem[]>([]);
  protected readonly total = signal(0);
  protected readonly listLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly projectModalVisible = signal(false);
  protected readonly editingId = signal<string | null>(null);
  protected readonly editingProjectKey = signal<string | null>(null);

  protected readonly configVisible = signal(false);
  protected configTabIndex = 0;
  protected readonly configProjectId = signal<string>('');
  protected readonly configProjectName = signal<string>('');
  protected readonly configProjectKey = signal<string>('');
  protected readonly configProjectDesc = signal<string | null>('');
  protected readonly configProjectVisibility = signal<ProjectVisibility>('internal');

  protected readonly createGuideVisible = signal(false);
  private createdProjectForGuide: ProjectItem | null = null;
  protected readonly menuProject = signal<ProjectItem | null>(null);

  protected readonly projectMembers = signal<ProjectMemberItem[]>([]);
  protected readonly projectUsers = signal<UserOptionItem[]>([]);
  protected readonly memberSaving = signal(false);

  protected readonly modules = signal<ProjectConfigItem[]>([]);
  protected readonly environments = signal<ProjectConfigItem[]>([]);
  protected readonly versions = signal<ProjectVersionItem[]>([]);

  protected readonly memberRoleOptions: ProjectMemberRole[] = ['product', 'ui', 'frontend_dev', 'backend_dev', 'qa', 'ops', 'project_admin'];

  protected readonly projectForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    visibility: ['internal' as ProjectVisibility, [Validators.required]]
  });

  protected readonly memberForm = this.fb.nonNullable.group({
    userId: ['', [Validators.required]],
    roles: [[] as ProjectMemberRole[], [Validators.required]]
  });

  protected readonly moduleForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    enabled: [true],
    sort: [0]
  });

  protected readonly environmentForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    enabled: [true],
    sort: [0]
  });

  protected readonly versionForm = this.fb.nonNullable.group({
    version: ['', [Validators.required]],
    enabled: [true],
    sort: [0]
  });

  public constructor() {
    void this.loadProjects();
  }

  protected async reload(): Promise<void> { await this.loadProjects(); }
  protected setMenuProject(item: ProjectItem): void { this.menuProject.set(item); }

  protected archiveFromMenu(): void { const item = this.menuProject(); if (item) void this.updateStatus(item, 'archived', '归档项目失败', `项目「${item.name}」已归档`); }

  protected openProjectModal(item?: ProjectItem): void {
    this.formError.set(null);
    if (!item) {
      this.editingId.set(null);
      this.editingProjectKey.set(null);
      this.projectForm.reset({ name: '', description: '', visibility: 'internal' });
    } else {
      this.editingId.set(item.id);
      this.editingProjectKey.set(item.projectKey);
      this.projectForm.reset({ name: item.name, description: item.description || '', visibility: item.visibility });
    }
    this.projectModalVisible.set(true);
  }

  protected async saveProject(): Promise<void> {
    if (this.projectForm.invalid) return;
    this.saving.set(true);
    this.formError.set(null);

    try {
      const value = this.projectForm.getRawValue();
      if (this.editingId()) {
        await firstValueFrom(this.api.put<ProjectItem, { name: string; description: string | null; visibility: ProjectVisibility }>(`/api/admin/projects/${this.editingId()}`, { name: value.name.trim(), description: value.description.trim() || null, visibility: value.visibility }));
      } else {
        const created = await firstValueFrom(this.api.post<ProjectItem, { name: string; description?: string; visibility: ProjectVisibility }>('/api/admin/projects', { name: value.name.trim(), description: value.description.trim() || undefined, visibility: value.visibility }));
        this.createdProjectForGuide = { ...created, memberCount: created.memberCount ?? 0 };
        this.createGuideVisible.set(true);
      }
      this.projectModalVisible.set(false);
      await this.loadProjects();
    } catch (error) {
      this.formError.set(this.getErrorMessage(error, '保存项目失败'));
    } finally {
      this.saving.set(false);
    }
  }

  protected enterConfigCenter(): void {
    const item = this.createdProjectForGuide;
    if (!item) return;
    this.createGuideVisible.set(false);
    this.openConfigCenter(item, 'base');
  }

  protected openConfigCenter(item: ProjectItem, tab: 'base' | 'members' | 'modules' | 'environments' | 'versions'): void {
    this.configProjectId.set(item.id);
    this.configProjectName.set(item.name);
    this.configProjectKey.set(item.projectKey);
    this.configProjectDesc.set(item.description || '');
    this.configProjectVisibility.set(item.visibility);
    this.configTabIndex = tab === 'base' ? 0 : tab === 'members' ? 1 : tab === 'modules' ? 2 : tab === 'environments' ? 3 : 4;
    this.configVisible.set(true);
    void this.loadConfigData(item.id);
  }

  protected roleLabel(role: ProjectMemberRole): string {
    return roleLabel(role);
  }

  protected onUserSelectChange(userId: string): void {
    const user = this.projectUsers().find(u => u.id === userId);
    if (user && user.titleCode) {
      // 设置默认的角色
      this.memberForm.patchValue({ roles: [user.titleCode as ProjectMemberRole] });
    }
  }

  protected async saveMember(): Promise<void> {
    if (this.memberForm.invalid) return;
    const projectId = this.configProjectId();
    if (!projectId) return;

    this.memberSaving.set(true);
    try {
      const value = this.memberForm.getRawValue();
      await firstValueFrom(this.api.post<ProjectMemberItem, { userId: string; roles: ProjectMemberRole[] }>(`/api/admin/projects/${projectId}/members`, { userId: value.userId.trim(), roles: value.roles }));
      this.memberForm.reset({ userId: '', roles: [] });
      await this.loadMembers(projectId);
      await this.loadProjects();
    } catch (error) {
      this.message.error(this.getErrorMessage(error, '添加成员失败'));
    } finally {
      this.memberSaving.set(false);
    }
  }

  protected async removeMember(item: ProjectMemberItem): Promise<void> {
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${projectId}/members/${item.id}`));
    await this.loadMembers(projectId);
    await this.loadProjects();
  }

  protected async addModule(): Promise<void> {
    if (this.moduleForm.invalid) return;
    const projectId = this.configProjectId();
    if (!projectId) return;
    const value = this.moduleForm.getRawValue();
    await firstValueFrom(this.api.post<ProjectConfigItem, { name: string; enabled: boolean; sort: number }>(`/api/admin/projects/${projectId}/modules`, { name: value.name.trim(), enabled: value.enabled, sort: value.sort ?? 0 }));
    this.moduleForm.reset({ name: '', enabled: true, sort: 0 });
    await this.loadModules(projectId);
  }

  protected async toggleModuleEnabled(item: ProjectConfigItem): Promise<void> {
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.put<ProjectConfigItem, { enabled: boolean }>(`/api/admin/projects/${projectId}/modules/${item.id}`, { enabled: !item.enabled }));
    await this.loadModules(projectId);
  }

  protected async removeModule(item: ProjectConfigItem): Promise<void> {
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${projectId}/modules/${item.id}`));
    await this.loadModules(projectId);
  }

  protected async addEnvironment(): Promise<void> {
    if (this.environmentForm.invalid) return;
    const projectId = this.configProjectId();
    if (!projectId) return;
    const value = this.environmentForm.getRawValue();
    await firstValueFrom(this.api.post<ProjectConfigItem, { name: string; enabled: boolean; sort: number }>(`/api/admin/projects/${projectId}/environments`, { name: value.name.trim(), enabled: value.enabled, sort: value.sort ?? 0 }));
    this.environmentForm.reset({ name: '', enabled: true, sort: 0 });
    await this.loadEnvironments(projectId);
  }

  protected async toggleEnvironmentEnabled(item: ProjectConfigItem): Promise<void> {
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.put<ProjectConfigItem, { enabled: boolean }>(`/api/admin/projects/${projectId}/environments/${item.id}`, { enabled: !item.enabled }));
    await this.loadEnvironments(projectId);
  }

  protected async removeEnvironment(item: ProjectConfigItem): Promise<void> {
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${projectId}/environments/${item.id}`));
    await this.loadEnvironments(projectId);
  }

  protected async addVersion(): Promise<void> {
    if (this.versionForm.invalid) return;
    const projectId = this.configProjectId();
    if (!projectId) return;
    const value = this.versionForm.getRawValue();
    await firstValueFrom(this.api.post<ProjectVersionItem, { version: string; enabled: boolean; sort: number }>(`/api/admin/projects/${projectId}/versions`, { version: value.version.trim(), enabled: value.enabled, sort: value.sort ?? 0 }));
    this.versionForm.reset({ version: '', enabled: true, sort: 0 });
    await this.loadVersions(projectId);
  }

  protected async toggleVersionEnabled(item: ProjectVersionItem): Promise<void> {
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.put<ProjectVersionItem, { enabled: boolean }>(`/api/admin/projects/${projectId}/versions/${item.id}`, { enabled: !item.enabled }));
    await this.loadVersions(projectId);
  }

  protected async removeVersion(item: ProjectVersionItem): Promise<void> {
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${projectId}/versions/${item.id}`));
    await this.loadVersions(projectId);
  }

  private async loadConfigData(projectId: string): Promise<void> {
    await Promise.all([this.loadUsers(), this.loadMembers(projectId), this.loadModules(projectId), this.loadEnvironments(projectId), this.loadVersions(projectId)]);
  }

  private async loadUsers(): Promise<void> {
    try {
      const result = await firstValueFrom(this.api.get<{ items: UserOptionItem[] }>('/api/admin/users', { params: { page: 1, pageSize: 100, status: 'active' } }));
      this.projectUsers.set(result.items);
    } catch {
      this.projectUsers.set([]);
    }
  }

  private async loadMembers(projectId: string): Promise<void> {
    const result = await firstValueFrom(this.api.get<{ items: ProjectMemberItem[] }>(`/api/admin/projects/${projectId}/members`));
    this.projectMembers.set(result.items);
  }

  private async loadModules(projectId: string): Promise<void> {
    const result = await firstValueFrom(this.api.get<{ items: ProjectConfigItem[] }>(`/api/admin/projects/${projectId}/modules`));
    this.modules.set(result.items);
  }

  private async loadEnvironments(projectId: string): Promise<void> {
    const result = await firstValueFrom(this.api.get<{ items: ProjectConfigItem[] }>(`/api/admin/projects/${projectId}/environments`));
    this.environments.set(result.items);
  }

  private async loadVersions(projectId: string): Promise<void> {
    const result = await firstValueFrom(this.api.get<{ items: ProjectVersionItem[] }>(`/api/admin/projects/${projectId}/versions`));
    this.versions.set(result.items);
  }

  private async updateStatus(item: ProjectItem, status: ProjectStatus, fallback: string, successMessage: string): Promise<void> {
    try {
      await firstValueFrom(this.api.put<ProjectItem, { status: ProjectStatus }>(`/api/admin/projects/${item.id}`, { status }));
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
      const result = await firstValueFrom(this.api.get<ProjectListResult>('/api/admin/projects', { params: { page: 1, pageSize: 100 } }));
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

  protected copyProjectKey(projectKey: string): void {
    this.clipboard.copy(projectKey);
    this.message.success('projectKey 已复制');
  }
}

