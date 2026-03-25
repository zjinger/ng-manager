import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { ProjectContextStore } from '../../../../core/state/project-context.store';

import { FilterBarComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { ProjectListTableComponent } from '../../components/project-list-table/project-list-table.component';
import { ProjectConfigDialogComponent } from '../../dialogs/project-config-dialog/project-config-dialog.component';
import { ProjectCreateDialogComponent } from '../../dialogs/project-create-dialog/project-create-dialog.component';
import { ProjectEditDialogComponent } from '../../dialogs/project-edit-dialog/project-edit-dialog.component';
import { ProjectMembersDialogComponent } from '../../dialogs/project-members-dialog/project-members-dialog.component';
import type {
  CreateProjectMetaItemInput,
  CreateProjectVersionItemInput,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectMemberRole,
  ProjectMetaItem,
  ProjectStatus,
  ProjectSummary,
  ProjectVersionItem,
  UpdateProjectInput,
  UpdateProjectMetaItemInput,
  UpdateProjectVersionItemInput
} from '../../models/project.model';
import { ProjectApiService } from '../../services/project-api.service';
import { ProjectListStore } from '../../store/project-list.store';
import { RdApiService } from '../../../rd/services/rd-api.service';
import type { CreateRdStageInput, RdStageEntity, UpdateRdStageInput } from '../../../rd/models/rd.model';

@Component({
  selector: 'app-project-list-page',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    FilterBarComponent,
    ListStateComponent,
    ProjectListTableComponent,
    ProjectCreateDialogComponent,
    ProjectEditDialogComponent,
    ProjectConfigDialogComponent,
    ProjectMembersDialogComponent
  ],
  providers: [ProjectListStore],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './project-list-page.component.html',
  styleUrls: ['./project-list-page.component.less']
})
export class ProjectListPageComponent {
  readonly store = inject(ProjectListStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly rdApi = inject(RdApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly message = inject(NzMessageService);

  readonly keyword = signal('');
  readonly status = signal<ProjectStatus | ''>('');
  readonly dialogOpen = signal(false);
  readonly editDialogOpen = signal(false);
  readonly configDialogOpen = signal(false);
  readonly membersDialogOpen = signal(false);
  readonly selectedProject = signal<ProjectSummary | null>(null);
  readonly configProject = signal<ProjectSummary | null>(null);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly users = signal<ProjectMemberCandidate[]>([]);
  readonly modules = signal<ProjectMetaItem[]>([]);
  readonly environments = signal<ProjectMetaItem[]>([]);
  readonly versions = signal<ProjectVersionItem[]>([]);
  readonly stages = signal<RdStageEntity[]>([]);
  readonly membersLoading = signal(false);
  readonly configLoading = signal(false);
  readonly membersBusy = signal(false);
  readonly editBusy = signal(false);
  readonly configBusy = signal(false);
  readonly pendingModuleMap = signal<Record<string, true>>({});
  readonly pendingEnvironmentMap = signal<Record<string, true>>({});
  readonly pendingVersionMap = signal<Record<string, true>>({});
  readonly pendingStageMap = signal<Record<string, true>>({});
  readonly pendingModuleIds = computed(() => Object.keys(this.pendingModuleMap()));
  readonly pendingEnvironmentIds = computed(() => Object.keys(this.pendingEnvironmentMap()));
  readonly pendingVersionIds = computed(() => Object.keys(this.pendingVersionMap()));
  readonly pendingStageIds = computed(() => Object.keys(this.pendingStageMap()));
  readonly subtitle = computed(() => `当前共 ${this.store.total()} 个项目`);

  constructor() {
    this.store.initialize();
  }

  applyFilters(): void {
    this.store.updateQuery({
      keyword: this.keyword().trim(),
      status: this.status()
    });
  }

  createProject(input: Parameters<ProjectListStore['create']>[0]): void {
    this.store.create(input, (created) => {
      this.dialogOpen.set(false);
      this.projectContext.loadProjects().subscribe({
        next: () => this.projectContext.setCurrentProjectId(created.id),
      });
    });
  }

  openEditDialog(project: ProjectSummary): void {
    this.selectedProject.set(project);
    this.editDialogOpen.set(true);
  }

  saveProject(input: UpdateProjectInput): void {
    const project = this.selectedProject();
    if (!project) {
      return;
    }
    this.editBusy.set(true);
    this.projectApi.update(project.id, input).subscribe({
      next: () => {
        this.editBusy.set(false);
        this.message.success('项目已更新');
        this.editDialogOpen.set(false);
        this.store.load();
      },
      error: () => {
        this.editBusy.set(false);
        this.message.error('项目更新失败');
      }
    });
  }

  archiveProject(project: ProjectSummary): void {
    this.updateProjectStatus(project.id, 'inactive');
  }

  restoreProject(project: ProjectSummary): void {
    this.updateProjectStatus(project.id, 'active');
  }

  openConfigDialog(project: ProjectSummary): void {
    this.configProject.set(project);
    this.configDialogOpen.set(true);
    this.loadProjectMeta(project.id);
  }

  closeConfigDialog(): void {
    this.configDialogOpen.set(false);
    this.configProject.set(null);
    this.modules.set([]);
    this.environments.set([]);
    this.versions.set([]);
    this.stages.set([]);
    this.pendingModuleMap.set({});
    this.pendingEnvironmentMap.set({});
    this.pendingVersionMap.set({});
    this.pendingStageMap.set({});
  }

  openMembersDialog(project: ProjectSummary): void {
    this.selectedProject.set(project);
    this.membersDialogOpen.set(true);
    this.loadMembers(project.id);
    this.loadMemberCandidates(project.id);
  }

  closeMembersDialog(): void {
    this.membersDialogOpen.set(false);
    this.selectedProject.set(null);
    this.members.set([]);
  }

  addMember(input: { userId: string; roleCode?: ProjectMemberRole | 'member'; isOwner?: boolean }): void {
    const project = this.selectedProject();
    if (!project) {
      return;
    }
    this.membersBusy.set(true);
    this.projectApi.addMember(project.id, input).subscribe({
      next: () => {
        this.membersBusy.set(false);
        this.message.success('成员添加成功');
        this.loadMembers(project.id);
        this.loadMemberCandidates(project.id);
      },
      error: () => {
        this.membersBusy.set(false);
        this.message.error('成员添加失败');
      }
    });
  }

  removeMember(member: ProjectMemberEntity): void {
    const project = this.selectedProject();
    if (!project) {
      return;
    }
    this.membersBusy.set(true);
    this.projectApi.removeMember(project.id, member.id).subscribe({
      next: () => {
        this.membersBusy.set(false);
        this.message.success('成员已移除');
        this.loadMembers(project.id);
        this.loadMemberCandidates(project.id);
      },
      error: () => {
        this.membersBusy.set(false);
        this.message.error('成员移除失败');
      }
    });
  }

  createModule(input: CreateProjectMetaItemInput): void {
    this.withConfigProject((projectId) => {
      this.configBusy.set(true);
      this.projectApi.addModule(projectId, input).subscribe({
        next: () => {
          this.message.success('模块已新增');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.configBusy.set(false);
          this.message.error('新增模块失败');
        }
      });
    });
  }

  updateModule(event: { id: string; patch: UpdateProjectMetaItemInput }): void {
    this.withConfigProject((projectId) => {
      this.setPending(this.pendingModuleMap, event.id, true);
      this.applyMetaPatchLocal(this.modules, event.id, event.patch);
      this.projectApi.updateModule(projectId, event.id, event.patch).subscribe({
        next: () => {
          this.setPending(this.pendingModuleMap, event.id, false);
          this.message.success('模块已更新');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.setPending(this.pendingModuleMap, event.id, false);
          this.message.error('更新模块失败');
          this.reloadMeta(projectId);
        }
      });
    });
  }

  removeModule(moduleId: string): void {
    this.withConfigProject((projectId) => {
      this.setPending(this.pendingModuleMap, moduleId, true);
      this.projectApi.removeModule(projectId, moduleId).subscribe({
        next: () => {
          this.setPending(this.pendingModuleMap, moduleId, false);
          this.message.success('模块已删除');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.setPending(this.pendingModuleMap, moduleId, false);
          this.message.error('删除模块失败');
        }
      });
    });
  }

  createEnvironment(input: CreateProjectMetaItemInput): void {
    this.withConfigProject((projectId) => {
      this.configBusy.set(true);
      this.projectApi.addEnvironment(projectId, input).subscribe({
        next: () => {
          this.message.success('环境已新增');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.configBusy.set(false);
          this.message.error('新增环境失败');
        }
      });
    });
  }

  updateEnvironment(event: { id: string; patch: UpdateProjectMetaItemInput }): void {
    this.withConfigProject((projectId) => {
      this.setPending(this.pendingEnvironmentMap, event.id, true);
      this.applyMetaPatchLocal(this.environments, event.id, event.patch);
      this.projectApi.updateEnvironment(projectId, event.id, event.patch).subscribe({
        next: () => {
          this.setPending(this.pendingEnvironmentMap, event.id, false);
          this.message.success('环境已更新');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.setPending(this.pendingEnvironmentMap, event.id, false);
          this.message.error('更新环境失败');
          this.reloadMeta(projectId);
        }
      });
    });
  }

  removeEnvironment(environmentId: string): void {
    this.withConfigProject((projectId) => {
      this.setPending(this.pendingEnvironmentMap, environmentId, true);
      this.projectApi.removeEnvironment(projectId, environmentId).subscribe({
        next: () => {
          this.setPending(this.pendingEnvironmentMap, environmentId, false);
          this.message.success('环境已删除');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.setPending(this.pendingEnvironmentMap, environmentId, false);
          this.message.error('删除环境失败');
        }
      });
    });
  }

  createVersion(input: CreateProjectVersionItemInput): void {
    this.withConfigProject((projectId) => {
      this.configBusy.set(true);
      this.projectApi.addVersion(projectId, input).subscribe({
        next: () => {
          this.message.success('版本已新增');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.configBusy.set(false);
          this.message.error('新增版本失败');
        }
      });
    });
  }

  updateVersion(event: { id: string; patch: UpdateProjectVersionItemInput }): void {
    this.withConfigProject((projectId) => {
      this.setPending(this.pendingVersionMap, event.id, true);
      this.applyVersionPatchLocal(this.versions, event.id, event.patch);
      this.projectApi.updateVersion(projectId, event.id, event.patch).subscribe({
        next: () => {
          this.setPending(this.pendingVersionMap, event.id, false);
          this.message.success('版本已更新');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.setPending(this.pendingVersionMap, event.id, false);
          this.message.error('更新版本失败');
          this.reloadMeta(projectId);
        }
      });
    });
  }

  removeVersion(versionId: string): void {
    this.withConfigProject((projectId) => {
      this.setPending(this.pendingVersionMap, versionId, true);
      this.projectApi.removeVersion(projectId, versionId).subscribe({
        next: () => {
          this.setPending(this.pendingVersionMap, versionId, false);
          this.message.success('版本已删除');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.setPending(this.pendingVersionMap, versionId, false);
          this.message.error('删除版本失败');
        }
      });
    });
  }

  createStage(input: CreateRdStageInput): void {
    this.withConfigProject(() => {
      this.configBusy.set(true);
      this.rdApi.createStage(input).subscribe({
        next: () => {
          this.message.success('研发阶段已新增');
          this.reloadMeta(input.projectId);
        },
        error: () => {
          this.configBusy.set(false);
          this.message.error('新增研发阶段失败');
        }
      });
    });
  }

  updateStage(event: { id: string; patch: UpdateRdStageInput }): void {
    this.withConfigProject((projectId) => {
      this.setPending(this.pendingStageMap, event.id, true);
      this.applyStagePatchLocal(this.stages, event.id, event.patch);
      this.rdApi.updateStage(event.id, event.patch).subscribe({
        next: () => {
          this.setPending(this.pendingStageMap, event.id, false);
          this.message.success('研发阶段已更新');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.setPending(this.pendingStageMap, event.id, false);
          this.message.error('更新研发阶段失败');
          this.reloadMeta(projectId);
        }
      });
    });
  }

  removeStage(stageId: string): void {
    this.withConfigProject((projectId) => {
      this.setPending(this.pendingStageMap, stageId, true);
      this.rdApi.updateStage(stageId, { enabled: false }).subscribe({
        next: () => {
          this.setPending(this.pendingStageMap, stageId, false);
          this.message.success('研发阶段已停用');
          this.reloadMeta(projectId);
        },
        error: () => {
          this.setPending(this.pendingStageMap, stageId, false);
          this.message.error('停用研发阶段失败');
        }
      });
    });
  }

  private loadMembers(projectId: string): void {
    this.membersLoading.set(true);
    this.projectApi.listMembers(projectId).subscribe({
      next: (items) => {
        this.members.set(items);
        this.membersLoading.set(false);
      },
      error: () => {
        this.membersLoading.set(false);
      }
    });
  }

  private loadMemberCandidates(projectId: string): void {
    this.projectApi.listMemberCandidates(projectId).subscribe({
      next: (items) => this.users.set(items),
      error: () => this.users.set([])
    });
  }

  private updateProjectStatus(projectId: string, status: ProjectStatus): void {
    this.editBusy.set(true);
    this.projectApi.update(projectId, { status }).subscribe({
      next: () => {
        this.editBusy.set(false);
        this.message.success(status === 'inactive' ? '项目已归档' : '项目已恢复');
        this.store.load();
      },
      error: () => {
        this.editBusy.set(false);
        this.message.error('更新项目状态失败');
      }
    });
  }

  private withConfigProject(handler: (projectId: string) => void): void {
    const project = this.configProject();
    if (!project) {
      return;
    }
    handler(project.id);
  }

  private reloadMeta(projectId: string): void {
    this.loadProjectMeta(projectId);
    this.configBusy.set(false);
  }

  private loadProjectMeta(projectId: string): void {
    this.configLoading.set(true);
    this.projectApi.listModules(projectId).subscribe({
      next: (modules) => {
        this.modules.set(modules);
        this.projectApi.listEnvironments(projectId).subscribe({
          next: (environments) => {
            this.environments.set(environments);
            this.projectApi.listVersions(projectId).subscribe({
              next: (versions) => {
                this.versions.set(versions);
                this.rdApi.listStages(projectId).subscribe({
                  next: (stages) => {
                    this.stages.set(stages);
                    this.configLoading.set(false);
                  },
                  error: () => {
                    this.stages.set([]);
                    this.configLoading.set(false);
                  }
                });
              },
              error: () => {
                this.versions.set([]);
                this.stages.set([]);
                this.configLoading.set(false);
              }
            });
          },
          error: () => {
            this.environments.set([]);
            this.versions.set([]);
            this.stages.set([]);
            this.configLoading.set(false);
          }
        });
      },
      error: () => {
        this.modules.set([]);
        this.environments.set([]);
        this.versions.set([]);
        this.stages.set([]);
        this.configLoading.set(false);
      }
    });
  }

  private setPending(mapSignal: { update: (fn: (value: Record<string, true>) => Record<string, true>) => void }, id: string, busy: boolean): void {
    mapSignal.update((current) => {
      if (busy) {
        return { ...current, [id]: true };
      }
      const next = { ...current };
      delete next[id];
      return next;
    });
  }

  private sortMetaItems(items: ProjectMetaItem[]): ProjectMetaItem[] {
    return [...items].sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));
  }

  private sortVersionItems(items: ProjectVersionItem[]): ProjectVersionItem[] {
    return [...items].sort((a, b) => (a.sort - b.sort) || a.version.localeCompare(b.version));
  }

  private applyMetaPatchLocal(
    source: { update: (fn: (value: ProjectMetaItem[]) => ProjectMetaItem[]) => void },
    id: string,
    patch: UpdateProjectMetaItemInput
  ): void {
    source.update((items) =>
      this.sortMetaItems(
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                name: patch.name ?? item.name,
                code: patch.code === undefined ? item.code : patch.code,
                description: patch.description === undefined ? item.description : patch.description,
                sort: patch.sort ?? item.sort,
                enabled: patch.enabled ?? item.enabled
              }
            : item
        )
      )
    );
  }

  private applyVersionPatchLocal(
    source: { update: (fn: (value: ProjectVersionItem[]) => ProjectVersionItem[]) => void },
    id: string,
    patch: UpdateProjectVersionItemInput
  ): void {
    source.update((items) =>
      this.sortVersionItems(
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                version: patch.version ?? item.version,
                code: patch.code === undefined ? item.code : patch.code,
                description: patch.description === undefined ? item.description : patch.description,
                sort: patch.sort ?? item.sort,
                enabled: patch.enabled ?? item.enabled
              }
            : item
        )
      )
    );
  }

  private sortStages(items: RdStageEntity[]): RdStageEntity[] {
    return [...items].sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));
  }

  private applyStagePatchLocal(
    source: { update: (fn: (value: RdStageEntity[]) => RdStageEntity[]) => void },
    id: string,
    patch: UpdateRdStageInput
  ): void {
    source.update((items) =>
      this.sortStages(
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                name: patch.name ?? item.name,
                sort: patch.sort ?? item.sort,
                enabled: patch.enabled ?? item.enabled
              }
            : item
        )
      )
    );
  }
}
