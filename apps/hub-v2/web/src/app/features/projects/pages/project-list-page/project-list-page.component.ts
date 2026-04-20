import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ListStateComponent, PageHeaderComponent } from '@shared/ui';
import type { CreateRdStageInput, RdStageEntity, UpdateRdStageInput } from '../../../rd/models/rd.model';
import { RdApiService } from '../../../rd/services/rd-api.service';
import { ProjectCardGridComponent } from '../../components/project-card-grid/project-card-grid.component';
import { ProjectFilterBarComponent } from '../../components/project-filter-bar/project-filter-bar.component';
import type { ProjectViewMode } from '../../components/project-filter-bar/project-filter-bar.component';
import { ProjectListTableComponent } from '../../components/project-list-table/project-list-table.component';
import { ProjectConfigDialogComponent } from '../../dialogs/project-config-dialog/project-config-dialog.component';
import { ProjectCreateDialogComponent } from '../../dialogs/project-create-dialog/project-create-dialog.component';
import { ProjectEditDialogComponent } from '../../dialogs/project-edit-dialog/project-edit-dialog.component';
import { ProjectMembersDialogComponent } from '../../dialogs/project-members-dialog/project-members-dialog.component';
import { ProjectModuleDetailDialogComponent } from '../../dialogs/project-module-detail-dialog/project-module-detail-dialog.component';
import { ProjectModuleManageDialogComponent } from '../../dialogs/project-module-manage-dialog/project-module-manage-dialog.component';
import type {
  AddProjectModuleMemberInput,
  CreateProjectApiTokenInput,
  CreateProjectMetaItemInput,
  CreateProjectVersionItemInput,
  ProjectApiTokenEntity,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectMemberRole,
  ProjectModuleMemberEntity,
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

@Component({
  selector: 'app-project-list-page',
  standalone: true,
  imports: [
    FormsModule,
    ClipboardModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    PageHeaderComponent,
    ListStateComponent,
    ProjectCardGridComponent,
    ProjectFilterBarComponent,
    ProjectListTableComponent,
    ProjectCreateDialogComponent,
    ProjectEditDialogComponent,
    ProjectModuleManageDialogComponent,
    ProjectModuleDetailDialogComponent,
    ProjectConfigDialogComponent,
    ProjectMembersDialogComponent,
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
  private readonly authStore = inject(AuthStore);
  private readonly message = inject(NzMessageService);
  private readonly clipboard = inject(Clipboard);

  readonly keyword = signal('');
  readonly status = signal<ProjectStatus | ''>('');
  readonly dialogOpen = signal(false);
  readonly editDialogOpen = signal(false);
  readonly moduleDialogOpen = signal(false);
  readonly moduleDetailDialogOpen = signal(false);
  readonly moduleDetailInitialTab = signal<'basic' | 'members'>('basic');
  readonly configDialogOpen = signal(false);
  readonly membersDialogOpen = signal(false);
  readonly selectedProject = signal<ProjectSummary | null>(null);
  readonly moduleProject = signal<ProjectSummary | null>(null);
  readonly selectedModule = signal<ProjectMetaItem | null>(null);
  readonly configProject = signal<ProjectSummary | null>(null);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly users = signal<ProjectMemberCandidate[]>([]);
  readonly modules = signal<ProjectMetaItem[]>([]);
  readonly moduleMembers = signal<ProjectModuleMemberEntity[]>([]);
  readonly environments = signal<ProjectMetaItem[]>([]);
  readonly versions = signal<ProjectVersionItem[]>([]);
  readonly stages = signal<RdStageEntity[]>([]);
  readonly apiTokens = signal<ProjectApiTokenEntity[]>([]);
  readonly latestCreatedToken = signal<string | null>(null);
  readonly expandedProjectIds = signal<string[]>([]);
  readonly modulePreviewMap = signal<Record<string, ProjectMetaItem[]>>({});
  readonly memberPreviewMap = signal<Record<string, ProjectMemberEntity[]>>({});
  readonly membersLoading = signal(false);
  readonly moduleLoading = signal(false);
  readonly moduleMembersLoading = signal(false);
  readonly configLoading = signal(false);
  readonly membersBusy = signal(false);
  readonly editBusy = signal(false);
  readonly moduleBusy = signal(false);
  readonly moduleMembersBusy = signal(false);
  readonly configBusy = signal(false);
  readonly previewLoadingMap = signal<Record<string, true>>({});
  readonly memberPreviewLoadingMap = signal<Record<string, true>>({});
  readonly pendingModuleMap = signal<Record<string, true>>({});
  readonly pendingEnvironmentMap = signal<Record<string, true>>({});
  readonly pendingVersionMap = signal<Record<string, true>>({});
  readonly pendingStageMap = signal<Record<string, true>>({});
  readonly pendingTokenMap = signal<Record<string, true>>({});
  readonly pendingModuleIds = computed(() => Object.keys(this.pendingModuleMap()));
  readonly pendingEnvironmentIds = computed(() => Object.keys(this.pendingEnvironmentMap()));
  readonly pendingVersionIds = computed(() => Object.keys(this.pendingVersionMap()));
  readonly pendingStageIds = computed(() => Object.keys(this.pendingStageMap()));
  readonly pendingTokenIds = computed(() => Object.keys(this.pendingTokenMap()));
  readonly previewLoadingIds = computed(() => Object.keys(this.previewLoadingMap()));
  readonly memberPreviewLoadingIds = computed(() => Object.keys(this.memberPreviewLoadingMap()));
  // 项目负责人
  readonly isProjectOwner = computed(() => {
    const current = this.authStore.currentUser();
    const userId = current?.userId?.trim();
    if (!userId) {
      return false;
    }
    return this.members().some((member) => member.userId === userId && member.isOwner);
  })

  readonly isProjectAdmin = computed(() => {
    const current = this.authStore.currentUser();
    const userId = current?.userId?.trim();
    if (!userId) {
      return false;
    }
    return this.members().some((member) => member.userId === userId && (member.isOwner || member.roleCode === 'project_admin'));
  });

  readonly canTransferOwner = computed(() => {
    return this.isProjectOwner();
  });

  readonly canPromoteAdmin = computed(() => {
    const current = this.authStore.currentUser();
    const userId = current?.userId?.trim();
    if (!userId) {
      return false;
    }
    return this.members().some((member) => member.userId === userId && member.isOwner);
  });
  readonly subtitle = computed(() => `当前共 ${this.store.total()} 个项目`);

  // View mode: 'list' | 'card'
  readonly viewMode = signal<ProjectViewMode>('list');

  readonly viewToggleOptions = [
    { value: 'list' as const, icon: 'unordered-list', ariaLabel: '列表视图' },
    { value: 'card' as const, icon: 'appstore', ariaLabel: '卡片视图' },
  ];

  constructor() {
    this.store.initialize();
  }

  applyFilters(status: string): void {
    this.status.set(status as ProjectStatus | '');
    this.store.updateQuery({
      keyword: this.keyword().trim(),
      status: status as ProjectStatus | '',
    });
  }

  onSearch(keyword: string): void {
    this.keyword.set(keyword);
    this.store.updateQuery({
      keyword: keyword.trim(),
      status: this.status(),
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
    this.loadMembers(project.id);
    this.loadMemberCandidates(project.id);
  }

  saveProject(input: UpdateProjectInput): void {
    const project = this.selectedProject();
    if (!project) {
      return;
    }
    this.editBusy.set(true);
    this.projectApi.update(project.id, input).subscribe({
      next: (updated) => {
        this.editBusy.set(false);
        this.message.success('项目已更新');
        this.editDialogOpen.set(false);
        this.store.patchOrRefresh(updated);
      },
      error: (error: unknown) => {
        this.editBusy.set(false);
      }
    });
  }

  archiveProject(project: ProjectSummary): void {
    this.updateProjectStatus(project.id, 'inactive');
  }

  restoreProject(project: ProjectSummary): void {
    this.updateProjectStatus(project.id, 'active');
  }

  openModuleDialog(project: ProjectSummary): void {
    this.moduleProject.set(project);
    this.moduleDialogOpen.set(true);
    this.loadProjectModules(project.id);
    this.loadMembers(project.id);
    this.loadMemberCandidates(project.id);
  }

  closeModuleDialog(): void {
    this.moduleDialogOpen.set(false);
    this.closeModuleDetailDialog();
    this.moduleProject.set(null);
    this.modules.set([]);
    this.moduleMembers.set([]);
    this.moduleBusy.set(false);
    this.moduleLoading.set(false);
    this.moduleMembersBusy.set(false);
    this.moduleMembersLoading.set(false);
    this.pendingModuleMap.set({});
  }

  openModuleDetailDialog(moduleId: string, tab: 'basic' | 'members' = 'basic'): void {
    const project = this.moduleProject();
    if (!project) {
      return;
    }
    this.moduleDetailInitialTab.set(tab);
    this.moduleDetailDialogOpen.set(true);
    this.moduleMembers.set([]);
    this.moduleMembersLoading.set(true);
    this.projectApi.getModule(project.id, moduleId).subscribe({
      next: (module) => {
        this.selectedModule.set(module);
      },
      error: () => {
        this.selectedModule.set(this.modules().find((item) => item.id === moduleId) ?? null);
      }
    });
    this.projectApi.listModuleMembers(project.id, moduleId).subscribe({
      next: (items) => {
        this.moduleMembers.set(items);
        this.moduleMembersLoading.set(false);
      },
      error: () => {
        this.moduleMembers.set([]);
        this.moduleMembersLoading.set(false);
      }
    });
  }

  closeModuleDetailDialog(): void {
    this.moduleDetailDialogOpen.set(false);
    this.moduleDetailInitialTab.set('basic');
    this.selectedModule.set(null);
    this.moduleMembers.set([]);
    this.moduleMembersBusy.set(false);
    this.moduleMembersLoading.set(false);
  }

  openModuleDetailFromList(
    project: ProjectSummary,
    moduleId: string,
    tab: 'basic' | 'members'
  ): void {
    this.openModuleDialog(project);
    this.openModuleDetailDialog(moduleId, tab);
  }

  openConfigDialog(project: ProjectSummary): void {
    this.configProject.set(project);
    this.configDialogOpen.set(true);
    this.loadProjectMeta(project.id);
    this.loadMembers(project.id);
  }

  closeConfigDialog(): void {
    this.configDialogOpen.set(false);
    this.configProject.set(null);
    this.environments.set([]);
    this.versions.set([]);
    this.stages.set([]);
    this.apiTokens.set([]);
    this.latestCreatedToken.set(null);
    this.pendingEnvironmentMap.set({});
    this.pendingVersionMap.set({});
    this.pendingStageMap.set({});
    this.pendingTokenMap.set({});
  }

  toggleProjectExpand(project: ProjectSummary): void {
    const expanded = this.expandedProjectIds();
    if (expanded.includes(project.id)) {
      this.expandedProjectIds.set(expanded.filter((item) => item !== project.id));
      return;
    }
    this.expandedProjectIds.set([...expanded, project.id]);
    if (!this.modulePreviewMap()[project.id] && !this.previewLoadingMap()[project.id]) {
      this.loadProjectModulePreview(project.id);
    }
    if (!this.memberPreviewMap()[project.id] && !this.memberPreviewLoadingMap()[project.id]) {
      this.loadProjectMemberPreview(project.id);
    }
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

  promoteMemberAdmin(member: ProjectMemberEntity): void {
    const project = this.selectedProject();
    if (!project) {
      return;
    }
    this.membersBusy.set(true);
    this.projectApi.updateMember(project.id, member.id, { roleCode: 'project_admin' }).subscribe({
      next: () => {
        this.membersBusy.set(false);
        this.message.success('成员权限已更新');
        this.loadMembers(project.id);
      },
      error: (error: unknown) => {
        this.membersBusy.set(false);
      }
    });
  }

  revokeMemberAdmin(member: ProjectMemberEntity): void {
    const project = this.selectedProject();
    if (!project) {
      return;
    }
    this.membersBusy.set(true);
    this.projectApi.updateMember(project.id, member.id, { roleCode: 'member' }).subscribe({
      next: () => {
        this.membersBusy.set(false);
        this.message.success('成员管理员权限已取消');
        this.loadMembers(project.id);
      },
      error: () => {
        this.membersBusy.set(false);
        this.message.error('取消管理员权限失败');
      }
    });
  }

  transferOwner(member: ProjectMemberEntity): void {
    const project = this.selectedProject();
    if (!project) {
      return;
    }
    this.membersBusy.set(true);
    this.projectApi.updateMember(project.id, member.id, { isOwner: true }).subscribe({
      next: () => {
        this.membersBusy.set(false);
        this.message.success('项目负责人已变更，原项目负责人已降级为普通成员');
        this.loadMembers(project.id);
      },
      error: () => {
        this.membersBusy.set(false);
        this.message.error('项目负责人变更失败');
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
    this.withModuleProject((projectId) => {
      this.moduleBusy.set(true);
      this.projectApi.addModule(projectId, input).subscribe({
        next: () => {
          this.message.success('子项目/模块已新增');
          this.reloadModules(projectId);
        },
        error: () => {
          this.moduleBusy.set(false);
          this.message.error('新增子项目/模块失败');
        }
      });
    });
  }

  saveModuleDetail(patch: UpdateProjectMetaItemInput): void {
    const project = this.moduleProject();
    const module = this.selectedModule();
    if (!project || !module) {
      return;
    }
    this.moduleBusy.set(true);
    this.projectApi.updateModule(project.id, module.id, patch).subscribe({
      next: (updated) => {
        this.moduleBusy.set(false);
        this.selectedModule.set(updated);
        this.message.success('模块信息已更新');
        this.reloadModules(project.id);
      },
      error: () => {
        this.moduleBusy.set(false);
        this.message.error('更新模块信息失败');
      }
    });
  }

  addModuleMember(input: AddProjectModuleMemberInput): void {
    const project = this.moduleProject();
    const module = this.selectedModule();
    if (!project || !module) {
      return;
    }
    this.moduleMembersBusy.set(true);
    this.projectApi.addModuleMember(project.id, module.id, input).subscribe({
      next: () => {
        this.moduleMembersBusy.set(false);
        this.message.success('模块成员已添加');
        this.projectApi.listModuleMembers(project.id, module.id).subscribe({
          next: (items) => this.moduleMembers.set(items),
          error: () => this.moduleMembers.set([])
        });
      },
      error: () => {
        this.moduleMembersBusy.set(false);
        this.message.error('添加模块成员失败');
      }
    });
  }

  removeModuleMember(moduleMemberId: string): void {
    const project = this.moduleProject();
    const module = this.selectedModule();
    if (!project || !module) {
      return;
    }
    this.moduleMembersBusy.set(true);
    this.projectApi.removeModuleMember(project.id, module.id, moduleMemberId).subscribe({
      next: () => {
        this.moduleMembersBusy.set(false);
        this.message.success('模块成员已移除');
        this.projectApi.listModuleMembers(project.id, module.id).subscribe({
          next: (items) => this.moduleMembers.set(items),
          error: () => this.moduleMembers.set([])
        });
      },
      error: () => {
        this.moduleMembersBusy.set(false);
        this.message.error('移除模块成员失败');
      }
    });
  }

  updateModule(event: { id: string; patch: UpdateProjectMetaItemInput }): void {
    this.withModuleProject((projectId) => {
      this.setPending(this.pendingModuleMap, event.id, true);
      this.applyMetaPatchLocal(this.modules, event.id, event.patch);
      this.projectApi.updateModule(projectId, event.id, event.patch).subscribe({
        next: () => {
          this.setPending(this.pendingModuleMap, event.id, false);
          this.message.success('子项目/模块已更新');
          this.reloadModules(projectId);
        },
        error: () => {
          this.setPending(this.pendingModuleMap, event.id, false);
          this.message.error('更新子项目/模块失败');
          this.reloadModules(projectId);
        }
      });
    });
  }

  removeModule(moduleId: string): void {
    this.withModuleProject((projectId) => {
      this.setPending(this.pendingModuleMap, moduleId, true);
      this.projectApi.removeModule(projectId, moduleId).subscribe({
        next: () => {
          this.setPending(this.pendingModuleMap, moduleId, false);
          this.message.success('子项目/模块已删除');
          this.reloadModules(projectId);
        },
        error: () => {
          this.setPending(this.pendingModuleMap, moduleId, false);
          this.message.error('删除子项目/模块失败');
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

  createApiToken(input: CreateProjectApiTokenInput): void {
    const project = this.configProject();
    if (!project) {
      return;
    }
    this.configBusy.set(true);
    this.projectApi.createApiToken(project.projectKey, input).subscribe({
      next: (result) => {
        this.configBusy.set(false);
        this.latestCreatedToken.set(result.token);
        this.message.success('API Token 已创建（仅展示一次）');
        this.loadProjectApiTokens(project.projectKey);
      },
      error: () => {
        this.configBusy.set(false);
        this.message.error('创建 API Token 失败');
      }
    });
  }

  revokeApiToken(tokenId: string): void {
    const project = this.configProject();
    if (!project) {
      return;
    }
    this.setPending(this.pendingTokenMap, tokenId, true);
    this.projectApi.revokeApiToken(project.projectKey, tokenId).subscribe({
      next: () => {
        this.setPending(this.pendingTokenMap, tokenId, false);
        this.message.success('API Token 已吊销');
        this.loadProjectApiTokens(project.projectKey);
      },
      error: () => {
        this.setPending(this.pendingTokenMap, tokenId, false);
        this.message.error('吊销 API Token 失败');
      }
    });
  }

  clearLatestCreatedToken(): void {
    this.latestCreatedToken.set(null);
  }

  copyLatestToken(token: string): void {
    if (!token) {
      return;
    }
    const ok = this.clipboard.copy(token);
    if (ok) {
      this.message.success('Token 已复制');
    } else {
      this.message.error('复制 Token 失败，请手动复制');
    }
  }

  private loadMembers(projectId: string): void {
    this.membersLoading.set(true);
    this.projectApi.listMembers(projectId).subscribe({
      next: (items) => {
        this.members.set(items);
        this.setMemberPreview(projectId, items);
        this.syncProjectMemberCount(projectId, items.length);
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

  private syncProjectMemberCount(projectId: string, memberCount: number): void {
    const selectedProject = this.selectedProject();
    if (selectedProject?.id === projectId) {
      const updatedSelectedProject = { ...selectedProject, memberCount };
      this.selectedProject.set(updatedSelectedProject);
      this.store.patchOrRefresh(updatedSelectedProject);
      return;
    }

    const currentProject = this.store.items().find((item) => item.id === projectId);
    if (!currentProject) {
      return;
    }

    this.store.patchOrRefresh({ ...currentProject, memberCount });
  }

  private updateProjectStatus(projectId: string, status: ProjectStatus): void {
    this.editBusy.set(true);
    this.projectApi.update(projectId, { status }).subscribe({
      next: (updated) => {
        this.editBusy.set(false);
        this.message.success(status === 'inactive' ? '项目已归档' : '项目已恢复');
        this.store.patchOrRefresh(updated);
      },
      error: (error: unknown) => {
        this.editBusy.set(false);
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

  private withModuleProject(handler: (projectId: string) => void): void {
    const project = this.moduleProject();
    if (!project) {
      return;
    }
    handler(project.id);
  }

  private reloadModules(projectId: string): void {
    this.loadProjectModules(projectId);
    this.moduleBusy.set(false);
  }

  private reloadMeta(projectId: string): void {
    this.loadProjectMeta(projectId);
    this.configBusy.set(false);
  }

  private loadProjectModules(projectId: string): void {
    this.moduleLoading.set(true);
    this.projectApi.listModules(projectId).subscribe({
      next: (modules) => {
        const sortedModules = this.sortMetaItems(modules);
        this.modules.set(sortedModules);
        this.setModulePreview(projectId, sortedModules);
        this.moduleLoading.set(false);
      },
      error: () => {
        this.modules.set([]);
        this.moduleLoading.set(false);
      }
    });
  }

  private loadProjectMeta(projectId: string): void {
    this.configLoading.set(true);
    this.projectApi.listEnvironments(projectId).subscribe({
      next: (environments) => {
        this.environments.set(environments);
        this.projectApi.listVersions(projectId).subscribe({
          next: (versions) => {
            this.versions.set(versions);
            this.rdApi.listStages(projectId).subscribe({
              next: (stages) => {
                this.stages.set(stages);
                const currentProject = this.configProject();
                this.loadProjectApiTokens(currentProject?.projectKey ?? '', () => this.configLoading.set(false));
              },
              error: () => {
                this.stages.set([]);
                const currentProject = this.configProject();
                this.loadProjectApiTokens(currentProject?.projectKey ?? '', () => this.configLoading.set(false));
              }
            });
          },
          error: () => {
            this.versions.set([]);
            this.stages.set([]);
            this.apiTokens.set([]);
            this.configLoading.set(false);
          }
        });
      },
      error: () => {
        this.environments.set([]);
        this.versions.set([]);
        this.stages.set([]);
        this.apiTokens.set([]);
        this.configLoading.set(false);
      }
    });
  }

  private loadProjectModulePreview(projectId: string): void {
    this.setPending(this.previewLoadingMap, projectId, true);
    this.projectApi.listModules(projectId).subscribe({
      next: (items) => {
        this.setPending(this.previewLoadingMap, projectId, false);
        this.setModulePreview(projectId, this.sortMetaItems(items));
      },
      error: () => {
        this.setPending(this.previewLoadingMap, projectId, false);
        this.setModulePreview(projectId, []);
      }
    });
  }

  private loadProjectMemberPreview(projectId: string): void {
    this.setPending(this.memberPreviewLoadingMap, projectId, true);
    this.projectApi.listMembers(projectId).subscribe({
      next: (items) => {
        this.setPending(this.memberPreviewLoadingMap, projectId, false);
        this.setMemberPreview(projectId, items);
        this.syncProjectMemberCount(projectId, items.length);
      },
      error: () => {
        this.setPending(this.memberPreviewLoadingMap, projectId, false);
        this.setMemberPreview(projectId, []);
      }
    });
  }

  private loadProjectApiTokens(projectKey: string, done?: () => void): void {
    if (!projectKey) {
      this.apiTokens.set([]);
      done?.();
      return;
    }
    this.projectApi.listApiTokens(projectKey).subscribe({
      next: (items) => {
        this.apiTokens.set(items);
        done?.();
      },
      error: () => {
        this.apiTokens.set([]);
        done?.();
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

  private setModulePreview(projectId: string, items: ProjectMetaItem[]): void {
    this.modulePreviewMap.update((current) => ({ ...current, [projectId]: items }));
  }

  private setMemberPreview(projectId: string, items: ProjectMemberEntity[]): void {
    this.memberPreviewMap.update((current) => ({ ...current, [projectId]: items }));
  }

  private sortMetaItems(items: ProjectMetaItem[]): ProjectMetaItem[] {
    const sorted = [...items].sort((a, b) => (a.sort - b.sort) || a.name.localeCompare(b.name));
    const byParent = new Map<string, ProjectMetaItem[]>();
    const roots: ProjectMetaItem[] = [];
    const knownIds = new Set(sorted.map((item) => item.id));

    for (const item of sorted) {
      if (item.parentId && knownIds.has(item.parentId)) {
        const siblings = byParent.get(item.parentId) ?? [];
        siblings.push(item);
        byParent.set(item.parentId, siblings);
        continue;
      }
      roots.push(item);
    }

    const result: ProjectMetaItem[] = [];
    for (const root of roots) {
      result.push(root);
      const children = byParent.get(root.id);
      if (children?.length) {
        result.push(...children);
      }
    }
    return result;
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
              projectNo: patch.projectNo === undefined ? item.projectNo : patch.projectNo,
              parentId: patch.parentId === undefined ? item.parentId : patch.parentId,
              nodeType: patch.nodeType ?? item.nodeType,
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
