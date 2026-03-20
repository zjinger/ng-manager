import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzResultModule } from 'ng-zorro-antd/result';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpaceModule } from 'ng-zorro-antd/space';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { firstValueFrom } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { HubDateTimePipe } from '../../shared/pipes/date-time.pipe';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import {
  ProjectConfigItem,
  ProjectItem,
  ProjectListResult,
  ProjectMemberItem,
  ProjectMemberRole,
  ProjectStatus,
  ProjectVersionItem,
  ProjectVisibility,
  roleLabel,
  UserOptionItem
} from './projects.model';
import { ProjectContextService } from '../../core/services/project-context.service';

type ConfigSortKind = 'module' | 'environment' | 'version';
type SortableConfigItem = ProjectConfigItem | ProjectVersionItem;

@Component({
  selector: 'app-projects-page',
  imports: [
    ClipboardModule,
    FormsModule,
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
  private readonly auth = inject(AdminAuthService);
  private readonly clipboard = inject(Clipboard);
  private readonly message = inject(NzMessageService);
  private readonly projectContextService = inject(ProjectContextService);

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
  protected readonly sortDrafts = signal<Record<string, number>>({});
  protected readonly sortSaving = signal<Record<string, boolean>>({});

  protected readonly memberRoleOptions: ProjectMemberRole[] = ['product', 'ui', 'frontend_dev', 'backend_dev', 'qa', 'ops', 'project_admin'];
  protected readonly currentUserId = computed(() => {
    const profile = this.auth.profile();
    if (!profile) return null;
    return profile.userId?.trim() || profile.id;
  });
  protected readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');
  protected readonly currentMember = computed(() => {
    const currentUserId = this.currentUserId();
    if (!currentUserId) return null;
    return this.projectMembers().find((item) => item.userId === currentUserId) ?? null;
  });
  protected readonly canManageMembers = computed(() => this.isAdmin() || !!this.currentMember()?.roles.includes('project_admin'));

  protected readonly projectForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    description: [''],
    visibility: ['internal' as ProjectVisibility, [Validators.required]]
  });

  protected readonly memberForm = this.fb.nonNullable.group({
    userId: ['', [Validators.required]],
    roles: [[] as ProjectMemberRole[], [Validators.required]]
  });

  protected readonly moduleForm = this.fb.group({
    name: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    enabled: this.fb.nonNullable.control(true),
    sort: this.fb.control<number | null>(null, { validators: [Validators.min(0), Validators.max(9999)] })
  });

  protected readonly environmentForm = this.fb.group({
    name: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    enabled: this.fb.nonNullable.control(true),
    sort: this.fb.control<number | null>(null, { validators: [Validators.min(0), Validators.max(9999)] })
  });

  protected readonly versionForm = this.fb.group({
    version: this.fb.nonNullable.control('', { validators: [Validators.required] }),
    enabled: this.fb.nonNullable.control(true),
    sort: this.fb.control<number | null>(null, { validators: [Validators.min(0), Validators.max(9999)] })
  });

  public constructor() {
    void this.loadProjects();
  }

  protected async reload(): Promise<void> {
    await this.loadProjects();
  }

  protected setMenuProject(item: ProjectItem): void {
    this.menuProject.set(item);
  }

  protected archiveFromMenu(): void {
    const item = this.menuProject();
    if (item) void this.updateStatus(item, 'archived', '归档项目失败', `项目「${item.name}」已归档`);
  }

  protected activateFromMenu(): void {
    const item = this.menuProject();
    if (item) void this.updateStatus(item, 'active', '激活项目失败', `项目「${item.name}」已激活`);
  }

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
        await firstValueFrom(
          this.api.put<ProjectItem, { name: string; description: string | null; visibility: ProjectVisibility }>(
            `/api/admin/projects/${this.editingId()}`,
            { name: value.name.trim(), description: value.description.trim() || null, visibility: value.visibility }
          )
        );
      } else {
        const created = await firstValueFrom(
          this.api.post<ProjectItem, { name: string; description?: string; visibility: ProjectVisibility }>('/api/admin/projects', {
            name: value.name.trim(),
            description: value.description.trim() || undefined,
            visibility: value.visibility
          })
        );
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
    this.sortDrafts.set({});
    this.sortSaving.set({});
    this.configVisible.set(true);
    void this.loadConfigData(item.id);
  }

  protected roleLabel(role: ProjectMemberRole): string {
    return roleLabel(role);
  }

  protected onUserSelectChange(userId: string): void {
    const user = this.projectUsers().find((item) => item.id === userId);
    if (user && user.titleCode) {
      this.memberForm.patchValue({ roles: [user.titleCode as ProjectMemberRole] });
    }
  }

  protected async saveMember(): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以添加成员');
      return;
    }
    if (this.memberForm.invalid) return;
    const projectId = this.configProjectId();
    if (!projectId) return;

    this.memberSaving.set(true);
    try {
      const value = this.memberForm.getRawValue();
      await firstValueFrom(
        this.api.post<ProjectMemberItem, { userId: string; roles: ProjectMemberRole[] }>(`/api/admin/projects/${projectId}/members`, {
          userId: value.userId.trim(),
          roles: value.roles
        })
      );
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
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以移除成员');
      return;
    }
    if (this.isOnlyProjectAdmin(item)) {
      this.message.warning('项目至少需要保留一个项目管理员');
      return;
    }
    const projectId = this.configProjectId();
    if (!projectId) return;

    try {
      await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${projectId}/members/${item.id}`));
      await this.loadMembers(projectId);
      await this.loadProjects();
    } catch (error) {
      this.message.error(this.getErrorMessage(error, '移除成员失败'));
    }
  }

  protected isOnlyProjectAdmin(item: ProjectMemberItem): boolean {
    return item.roles.includes('project_admin') && this.projectMembers().filter((member) => member.roles.includes('project_admin')).length === 1;
  }

  protected async toggleProjectAdmin(item: ProjectMemberItem): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以设置管理员');
      return;
    }
    if (this.isOnlyProjectAdmin(item) && item.roles.includes('project_admin')) {
      this.message.warning('项目至少需要保留一个项目管理员');
      return;
    }
    const projectId = this.configProjectId();
    if (!projectId) return;

    const nextRoles: ProjectMemberRole[] = item.roles.includes('project_admin')
      ? item.roles.filter((role) => role !== 'project_admin')
      : [...item.roles, 'project_admin'];

    try {
      await firstValueFrom(
        this.api.put<ProjectMemberItem, { roles: ProjectMemberRole[] }>(`/api/admin/projects/${projectId}/members/${item.id}`, {
          roles: nextRoles
        })
      );
      await this.loadMembers(projectId);
      this.message.success(item.roles.includes('project_admin') ? '已取消项目管理员' : '已设为项目管理员');
    } catch (error) {
      this.message.error(this.getErrorMessage(error, '更新成员角色失败'));
    }
  }

  protected async addModule(): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以维护模块配置');
      return;
    }
    if (this.moduleForm.invalid) return;
    const projectId = this.configProjectId();
    if (!projectId) return;

    const value = this.moduleForm.getRawValue();
    const payload: { name: string; enabled: boolean; sort?: number } = {
      name: value.name.trim(),
      enabled: value.enabled ?? true
    };
    if (value.sort != null) payload.sort = value.sort;

    try {
      await firstValueFrom(this.api.post<ProjectConfigItem, { name: string; enabled: boolean; sort?: number }>(`/api/admin/projects/${projectId}/modules`, payload));
      this.moduleForm.reset({ name: '', enabled: true, sort: null });
      await this.loadModules(projectId);
      this.message.success('模块已新增');
    } catch (error) {
      this.message.error(this.getErrorMessage(error, '新增模块失败'));
    }
  }

  protected async toggleModuleEnabled(item: ProjectConfigItem): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以维护模块配置');
      return;
    }
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.put<ProjectConfigItem, { enabled: boolean }>(`/api/admin/projects/${projectId}/modules/${item.id}`, { enabled: !item.enabled }));
    await this.loadModules(projectId);
  }

  protected async removeModule(item: ProjectConfigItem): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以维护模块配置');
      return;
    }
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${projectId}/modules/${item.id}`));
    await this.loadModules(projectId);
  }

  protected async updateModuleSort(item: ProjectConfigItem): Promise<void> {
    const projectId = this.configProjectId();
    if (!projectId) return;
    await this.updateConfigSort('module', item.id, item.sort, '模块排序', `/api/admin/projects/${projectId}/modules/${item.id}/sort`, () => this.loadModules(projectId));
  }

  protected async addEnvironment(): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以维护环境配置');
      return;
    }
    if (this.environmentForm.invalid) return;
    const projectId = this.configProjectId();
    if (!projectId) return;

    const value = this.environmentForm.getRawValue();
    const payload: { name: string; enabled: boolean; sort?: number } = {
      name: value.name.trim(),
      enabled: value.enabled ?? true
    };
    if (value.sort != null) payload.sort = value.sort;

    try {
      await firstValueFrom(this.api.post<ProjectConfigItem, { name: string; enabled: boolean; sort?: number }>(`/api/admin/projects/${projectId}/environments`, payload));
      this.environmentForm.reset({ name: '', enabled: true, sort: null });
      await this.loadEnvironments(projectId);
      this.message.success('环境已新增');
    } catch (error) {
      this.message.error(this.getErrorMessage(error, '新增环境失败'));
    }
  }

  protected async toggleEnvironmentEnabled(item: ProjectConfigItem): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以维护环境配置');
      return;
    }
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.put<ProjectConfigItem, { enabled: boolean }>(`/api/admin/projects/${projectId}/environments/${item.id}`, { enabled: !item.enabled }));
    await this.loadEnvironments(projectId);
  }

  protected async removeEnvironment(item: ProjectConfigItem): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以维护环境配置');
      return;
    }
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${projectId}/environments/${item.id}`));
    await this.loadEnvironments(projectId);
  }

  protected async updateEnvironmentSort(item: ProjectConfigItem): Promise<void> {
    const projectId = this.configProjectId();
    if (!projectId) return;
    await this.updateConfigSort('environment', item.id, item.sort, '环境排序', `/api/admin/projects/${projectId}/environments/${item.id}/sort`, () => this.loadEnvironments(projectId));
  }

  protected async addVersion(): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以维护版本配置');
      return;
    }
    if (this.versionForm.invalid) return;
    const projectId = this.configProjectId();
    if (!projectId) return;

    const value = this.versionForm.getRawValue();
    const payload: { version: string; enabled: boolean; sort?: number } = {
      version: value.version.trim(),
      enabled: value.enabled ?? true
    };
    if (value.sort != null) payload.sort = value.sort;

    try {
      await firstValueFrom(this.api.post<ProjectVersionItem, { version: string; enabled: boolean; sort?: number }>(`/api/admin/projects/${projectId}/versions`, payload));
      this.versionForm.reset({ version: '', enabled: true, sort: null });
      await this.loadVersions(projectId);
      this.message.success('版本已新增');
    } catch (error) {
      this.message.error(this.getErrorMessage(error, '新增版本失败'));
    }
  }

  protected async toggleVersionEnabled(item: ProjectVersionItem): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以维护版本配置');
      return;
    }
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.put<ProjectVersionItem, { enabled: boolean }>(`/api/admin/projects/${projectId}/versions/${item.id}`, { enabled: !item.enabled }));
    await this.loadVersions(projectId);
  }

  protected async removeVersion(item: ProjectVersionItem): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以维护版本配置');
      return;
    }
    const projectId = this.configProjectId();
    if (!projectId) return;
    await firstValueFrom(this.api.delete<{ id: string }>(`/api/admin/projects/${projectId}/versions/${item.id}`));
    await this.loadVersions(projectId);
  }

  protected async updateVersionSort(item: ProjectVersionItem): Promise<void> {
    const projectId = this.configProjectId();
    if (!projectId) return;
    await this.updateConfigSort('version', item.id, item.sort, '版本排序', `/api/admin/projects/${projectId}/versions/${item.id}/sort`, () => this.loadVersions(projectId));
  }

  protected getSortDraft(kind: ConfigSortKind, id: string, fallback: number): number {
    return this.sortDrafts()[this.sortKey(kind, id)] ?? fallback;
  }

  protected setSortDraft(kind: ConfigSortKind, id: string, value: number | null): void {
    const nextValue = typeof value === 'number' ? value : 0;
    this.sortDrafts.update((current) => ({
      ...current,
      [this.sortKey(kind, id)]: nextValue
    }));
  }

  protected hasSortChanged(kind: ConfigSortKind, id: string, currentSort: number): boolean {
    return this.getSortDraft(kind, id, currentSort) !== currentSort;
  }

  protected isSortSaving(kind: ConfigSortKind, id: string): boolean {
    return this.sortSaving()[this.sortKey(kind, id)] ?? false;
  }

  protected copyProjectKey(projectKey: string): void {
    this.clipboard.copy(projectKey);
    this.message.success('projectKey 已复制');
  }

  private async loadConfigData(projectId: string): Promise<void> {
    await Promise.all([
      this.loadUsers(),
      this.loadMembers(projectId),
      this.loadModules(projectId),
      this.loadEnvironments(projectId),
      this.loadVersions(projectId)
    ]);
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
    this.replaceSortDrafts('module', result.items);
  }

  private async loadEnvironments(projectId: string): Promise<void> {
    const result = await firstValueFrom(this.api.get<{ items: ProjectConfigItem[] }>(`/api/admin/projects/${projectId}/environments`));
    this.environments.set(result.items);
    this.replaceSortDrafts('environment', result.items);
  }

  private async loadVersions(projectId: string): Promise<void> {
    const result = await firstValueFrom(this.api.get<{ items: ProjectVersionItem[] }>(`/api/admin/projects/${projectId}/versions`));
    this.versions.set(result.items);
    this.replaceSortDrafts('version', result.items);
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
      this.projectContextService.updateProjects(result.items);
      this.projects.set(result.items);
      this.total.set(result.total);
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载项目列表失败'));
    } finally {
      this.listLoading.set(false);
    }
  }

  private sortKey(kind: ConfigSortKind, id: string): string {
    return `${kind}:${id}`;
  }

  private replaceSortDrafts(kind: ConfigSortKind, items: SortableConfigItem[]): void {
    const next = { ...this.sortDrafts() };
    for (const key of Object.keys(next)) {
      if (key.startsWith(`${kind}:`)) {
        delete next[key];
      }
    }
    for (const item of items) {
      next[this.sortKey(kind, item.id)] = item.sort;
    }
    this.sortDrafts.set(next);
  }

  private setSortSaving(kind: ConfigSortKind, id: string, saving: boolean): void {
    const key = this.sortKey(kind, id);
    this.sortSaving.update((current) => {
      const next = { ...current };
      if (saving) {
        next[key] = true;
      } else {
        delete next[key];
      }
      return next;
    });
  }

  private async updateConfigSort(
    kind: ConfigSortKind,
    id: string,
    currentSort: number,
    label: string,
    url: string,
    reload: () => Promise<void>
  ): Promise<void> {
    if (!this.canManageMembers()) {
      this.message.warning('只有项目管理员可以维护排序');
      return;
    }

    const sort = this.getSortDraft(kind, id, currentSort);
    if (sort === currentSort) return;

    this.setSortSaving(kind, id, true);
    try {
      await firstValueFrom(this.api.put<SortableConfigItem, { sort: number }>(url, { sort }));
      await reload();
      this.message.success(`${label}已更新`);
    } catch (error) {
      this.message.error(this.getErrorMessage(error, `更新${label}失败`));
    } finally {
      this.setSortSaving(kind, id, false);
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}
