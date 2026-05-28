import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { forkJoin } from 'rxjs';

import { ListStateComponent, PageHeaderComponent } from '@shared/ui';
import { ProjectFeaturePointDrawerComponent } from '../../components/project-feature-point-drawer/project-feature-point-drawer.component';
import type { FeaturePointDrawerSaveInput } from '../../components/project-feature-point-drawer/project-feature-point-drawer.component';
import { ProjectFeaturePointGroupDrawerComponent } from '../../components/project-feature-point-group-drawer/project-feature-point-group-drawer.component';
import type { FeaturePointGroupDrawerSaveInput, FeaturePointGroupDrawerTarget } from '../../components/project-feature-point-group-drawer/project-feature-point-group-drawer.component';
import { ProjectFeatureProgressOverallDrawerComponent } from '../../components/project-feature-progress-overall-drawer/project-feature-progress-overall-drawer.component';
import type { FeatureProgressOverallSaveInput } from '../../components/project-feature-progress-overall-drawer/project-feature-progress-overall-drawer.component';
import { ProjectFeatureProgressStatsComponent } from '../../components/project-feature-progress-stats/project-feature-progress-stats.component';
import { ProjectFeatureProgressToolbarComponent } from '../../components/project-feature-progress-toolbar/project-feature-progress-toolbar.component';
import { ProjectFeatureProgressTreeComponent } from '../../components/project-feature-progress-tree/project-feature-progress-tree.component';
import type {
  FeatureProgressGroupDeleteTarget,
  FeatureProgressGroupEditTarget,
  FeatureProgressModuleGroup,
  FeatureProgressSubGroup,
} from '../../components/project-feature-progress-tree/project-feature-progress-tree.component';
import type {
  ProjectFeaturePoint,
  ProjectFeaturePointStatus,
  ProjectFeatureProgressModuleNode,
  ProjectFeatureProgressView,
  ProjectMemberEntity,
} from '../../models/project.model';
import { ProjectApiService } from '../../services/project-api.service';

@Component({
  selector: 'app-project-feature-progress-page',
  standalone: true,
  imports: [
    ListStateComponent,
    PageHeaderComponent,
    NzButtonModule,
    NzIconModule,
    ProjectFeaturePointDrawerComponent,
    ProjectFeaturePointGroupDrawerComponent,
    ProjectFeatureProgressOverallDrawerComponent,
    ProjectFeatureProgressStatsComponent,
    ProjectFeatureProgressToolbarComponent,
    ProjectFeatureProgressTreeComponent,
  ],
  template: `
    <app-page-header title="功能点进度管理" [subtitle]="subtitle()">
      <div class="page-actions">
        <button nz-button (click)="reload()" [disabled]="!projectId() || loading()">
          <span nz-icon nzType="reload"></span>
          刷新
        </button>
      </div>
    </app-page-header>

    @if (!projectId()) {
      <app-list-state
        [empty]="true"
        emptyTitle="请先选择项目"
        emptyDescription="选择项目后再维护功能点进度。"
      />
    } @else {
      <app-list-state [loading]="loading()" [empty]="false" loadingText="正在加载功能点进度…">
        @if (error()) {
          <section class="state-card state-card--error">
            <h2>功能点进度加载失败</h2>
            <p>{{ error() }}</p>
            <button nz-button nzType="primary" (click)="reload()">重新加载</button>
          </section>
        } @else if (vm(); as data) {
          <app-project-feature-progress-stats
            [summary]="data.summary"
            [canManage]="canManage()"
            (editOverall)="startEditOverall()"
          />

          <app-project-feature-progress-toolbar
            [keyword]="keyword()"
            [moduleFilter]="moduleFilter()"
            [statusFilter]="statusFilter()"
            [moduleOptions]="moduleOptions()"
            [statusOptions]="statusOptions"
            [canManage]="canManage()"
            (keywordChange)="keyword.set($event)"
            (moduleFilterChange)="moduleFilter.set($event)"
            (statusFilterChange)="statusFilter.set($event)"
            (create)="startCreate()"
          />

          <app-project-feature-progress-tree
            [groups]="featureTree()"
            [canManage]="canManage()"
            (edit)="startEdit($event)"
            (delete)="deleteFeaturePoint($event)"
            (editGroup)="startEditGroup($event)"
            (deleteGroup)="deleteFeaturePointGroup($event)"
          />

          <app-project-feature-point-drawer
            [open]="editorOpen()"
            [saving]="saving()"
            [members]="members()"
            [featurePoints]="allFeatures()"
            [moduleGroups]="data.modules"
            [feature]="editingFeature()"
            [nextSort]="nextSort()"
            [statusOptions]="statusOptions"
            (save)="saveFeaturePoint($event)"
            (cancel)="cancelEdit()"
          />

          <app-project-feature-point-group-drawer
            [open]="groupEditorOpen()"
            [saving]="saving()"
            [target]="editingGroup()"
            (save)="saveFeaturePointGroup($event)"
            (cancel)="cancelGroupEdit()"
          />

          <app-project-feature-progress-overall-drawer
            [open]="overallEditorOpen()"
            [saving]="saving()"
            [summary]="data.summary"
            (save)="saveOverallProgress($event)"
            (clear)="clearOverallProgress()"
            (cancel)="overallEditorOpen.set(false)"
          />
        }
      </app-list-state>
    }
  `,
  styles: [
    `
      .page-actions {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .state-card {
        padding: 24px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--bg-container);
      }

      .state-card--error {
        border-color: var(--color-danger-light);
      }

      .state-card h2 {
        margin: 0;
        color: var(--text-heading);
        font-size: 16px;
      }

      .state-card p {
        margin: 6px 0 14px;
        color: var(--text-muted);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFeatureProgressPageComponent {
  readonly projectContext = inject(ProjectContextStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly authStore = inject(AuthStore);
  private readonly message = inject(NzMessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly vm = signal<ProjectFeatureProgressView | null>(null);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly keyword = signal('');
  readonly moduleFilter = signal('');
  readonly statusFilter = signal<ProjectFeaturePointStatus | ''>('');
  readonly editorOpen = signal(false);
  readonly editingFeatureId = signal<string | null>(null);
  readonly groupEditorOpen = signal(false);
  readonly editingGroup = signal<FeaturePointGroupDrawerTarget | null>(null);
  readonly overallEditorOpen = signal(false);

  readonly statusOptions: Array<{ value: ProjectFeaturePointStatus; label: string }> = [
    { value: 'todo', label: '未开始' },
    { value: 'in_progress', label: '进行中' },
    { value: 'done', label: '已完成' },
    { value: 'paused', label: '暂停' },
  ];

  readonly projectId = computed(() => this.projectContext.currentProjectId());
  readonly subtitle = computed(() => this.projectContext.currentProject()?.name || '请先选择项目');
  readonly canManage = computed(() => {
    const user = this.authStore.currentUser();
    const userId = user?.userId?.trim();
    if (user?.permissionCodes.includes('project.manage.all')) {
      return true;
    }
    return !!userId && this.members().some((member) => member.userId === userId && (member.isOwner || member.roleCode === 'project_admin'));
  });

  readonly allFeatures = computed(() => {
    const data = this.vm();
    if (!data?.enabled) return [];
    return [
      ...this.collectModuleFeatures(data.modules),
      ...data.ungrouped.featurePoints,
    ].sort((left, right) => left.sort - right.sort || left.createdAt.localeCompare(right.createdAt));
  });

  readonly filteredFeatures = computed(() => {
    const keyword = this.keyword().trim().toLowerCase();
    const moduleName = this.moduleFilter();
    const status = this.statusFilter();
    return this.allFeatures().filter((feature) => {
      if (moduleName && this.groupName(feature.moduleName) !== moduleName) return false;
      if (status && feature.status !== status) return false;
      if (!keyword) return true;
      return (
        (feature.moduleName ?? '').toLowerCase().includes(keyword) ||
        (feature.submoduleName ?? '').toLowerCase().includes(keyword) ||
        feature.name.toLowerCase().includes(keyword) ||
        (feature.ownerName ?? '').toLowerCase().includes(keyword) ||
        (feature.ownerNames ?? []).some((ownerName) => ownerName.toLowerCase().includes(keyword)) ||
        (feature.remark ?? '').toLowerCase().includes(keyword)
      );
    });
  });

  readonly moduleOptions = computed(() => {
    const names = new Set<string>();
    const data = this.vm();
    for (const module of data?.modules ?? []) {
      names.add(module.name);
    }
    for (const feature of this.allFeatures()) {
      if (!feature.moduleGroupId) names.add(this.groupName(feature.moduleName));
    }
    return Array.from(names).sort((left, right) => left.localeCompare(right, 'zh-Hans-CN'));
  });

  readonly featureTree = computed(() => {
    const data = this.vm();
    if (!data) return [];
    return this.buildFeatureTree(data.modules, data.ungrouped.featurePoints, this.filteredFeatures);
  });
  readonly editingFeature = computed(() => {
    const editingId = this.editingFeatureId();
    return editingId ? this.allFeatures().find((feature) => feature.id === editingId) ?? null : null;
  });
  readonly nextSort = computed(() => {
    const points = this.allFeatures();
    return points.length > 0 ? Math.max(...points.map((item) => item.sort)) + 10 : 10;
  });

  constructor() {
    effect(() => {
      const projectId = this.projectId();
      this.resetEditor();
      this.loadForProject(projectId);
    });
  }

  reload(): void {
    this.loadForProject(this.projectId());
  }

  startCreate(): void {
    if (!this.canManage()) return;
    this.resetEditor();
    this.editorOpen.set(true);
  }

  startEdit(feature: ProjectFeaturePoint): void {
    if (!this.canManage()) return;
    this.editingFeatureId.set(feature.id);
    this.editorOpen.set(true);
  }

  cancelEdit(): void {
    this.resetEditor();
  }

  startEditGroup(target: FeatureProgressGroupEditTarget): void {
    if (!this.canManage()) return;
    if (target.level === 'module') {
      this.editingGroup.set({
        id: target.group.id,
        level: 'module',
        name: target.group.name,
        manualProgress: target.group.manualProgress,
        computedProgress: target.group.computedProgress,
        sort: target.group.sort,
        remark: target.group.remark,
      });
    } else {
      this.editingGroup.set({
        id: target.group.id,
        level: 'submodule',
        name: target.group.name,
        parentName: target.parent.name,
        manualProgress: target.group.manualProgress,
        computedProgress: target.group.computedProgress,
        sort: target.group.sort,
        remark: target.group.remark,
      });
    }
    this.groupEditorOpen.set(true);
  }

  cancelGroupEdit(): void {
    this.groupEditorOpen.set(false);
    this.editingGroup.set(null);
  }

  startEditOverall(): void {
    if (!this.canManage()) return;
    this.overallEditorOpen.set(true);
  }

  saveFeaturePoint(input: FeaturePointDrawerSaveInput): void {
    if (!this.canManage()) return;
    const projectId = this.projectId();
    if (!projectId || !input.name.trim()) {
      this.message.warning('请填写功能点名称');
      return;
    }

    const payload = {
      name: input.name.trim(),
      moduleId: input.moduleId,
      moduleGroupId: input.moduleGroupId,
      submoduleGroupId: input.submoduleGroupId,
      moduleName: input.moduleName,
      submoduleName: input.submoduleName,
      ownerUserId: input.ownerUserId,
      ownerUserIds: input.ownerUserIds,
      status: input.status,
      progress: input.progress,
      sort: input.sort,
      remark: input.remark,
    };
    const editingId = this.editingFeatureId();
    this.saving.set(true);
    if (editingId) {
      this.projectApi.updateFeaturePoint(projectId, editingId, payload).subscribe({
        next: () => {
          this.saving.set(false);
          this.message.success('功能点已更新');
          this.resetEditor();
          this.reload();
        },
        error: () => this.saving.set(false),
      });
      return;
    }

    forkJoin(
      input.names.map((name, index) =>
        this.projectApi.addFeaturePoint(projectId, {
          ...payload,
          name,
          sort: payload.sort + index * 10,
        })
      )
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success(`已新增 ${input.names.length} 个功能点`);
        this.resetEditor();
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  deleteFeaturePoint(featurePointId: string): void {
    if (!this.canManage()) return;
    const projectId = this.projectId();
    if (!projectId) return;
    this.saving.set(true);
    this.projectApi.removeFeaturePoint(projectId, featurePointId).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success('功能点已删除');
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  saveFeaturePointGroup(input: FeaturePointGroupDrawerSaveInput): void {
    if (!this.canManage()) return;
    const projectId = this.projectId();
    if (!projectId) return;
    this.saving.set(true);
    this.projectApi.updateFeaturePointGroup(projectId, input.id, {
      name: input.name,
      manualProgress: input.manualProgress,
      sort: input.sort,
      remark: input.remark,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success('模块进度已更新');
        this.cancelGroupEdit();
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  deleteFeaturePointGroup(target: FeatureProgressGroupDeleteTarget): void {
    if (!this.canManage()) return;
    const projectId = this.projectId();
    if (!projectId) return;
    if (target.featureCount > 0 || target.childCount > 0) {
      this.message.warning('当前分组下仍有功能点，暂不支持删除');
      return;
    }
    this.saving.set(true);
    this.projectApi.removeFeaturePointGroup(projectId, target.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success('分组已删除');
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  saveOverallProgress(input: FeatureProgressOverallSaveInput): void {
    if (!this.canManage()) return;
    const projectId = this.projectId();
    if (!projectId) return;
    this.saving.set(true);
    this.projectApi.upsertFeatureProgressOverride(projectId, {
      targetType: 'project',
      targetId: projectId,
      progress: input.progress,
      remark: input.remark,
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success('整体进度已更新');
        this.overallEditorOpen.set(false);
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  clearOverallProgress(): void {
    if (!this.canManage()) return;
    const projectId = this.projectId();
    if (!projectId) return;
    this.saving.set(true);
    this.projectApi.removeFeatureProgressOverride(projectId, 'project', projectId).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success('整体手动进度已清除');
        this.overallEditorOpen.set(false);
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  private loadForProject(projectId: string | null): void {
    this.error.set('');
    this.vm.set(null);
    this.members.set([]);
    if (!projectId) return;
    this.loading.set(true);
    this.projectApi.getFeatureProgress(projectId).subscribe({
      next: (vm) => {
        this.vm.set(vm);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.error.set(error instanceof Error ? error.message : '请稍后重试。');
      },
    });
    this.projectApi.listMembers(projectId).subscribe({
      next: (items) => this.members.set(items),
      error: () => this.members.set([]),
    });
  }

  private collectModuleFeatures(nodes: ProjectFeatureProgressModuleNode[]): ProjectFeaturePoint[] {
    return nodes.flatMap((node) => [
      ...node.featurePoints,
      ...this.collectModuleFeatures(node.children),
    ]);
  }

  private resetEditor(): void {
    this.editorOpen.set(false);
    this.editingFeatureId.set(null);
    this.groupEditorOpen.set(false);
    this.editingGroup.set(null);
  }

  private buildFeatureTree(
    nodes: ProjectFeatureProgressModuleNode[],
    ungroupedFeatures: ProjectFeaturePoint[],
    featureSource: () => ProjectFeaturePoint[]
  ): FeatureProgressModuleGroup[] {
    const filteredIds = new Set(featureSource().map((feature) => feature.id));
    const groups = nodes
      .map((node) => this.buildModuleGroup(node, filteredIds))
      .filter((group): group is FeatureProgressModuleGroup => !!group && group.featureCount > 0)
      .sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, 'zh-Hans-CN'));
    const filteredUngrouped = this.sortFeatures(ungroupedFeatures.filter((feature) => filteredIds.has(feature.id)));
    if (filteredUngrouped.length > 0) {
      const progress = this.averageProgress(filteredUngrouped);
      const completedCount = filteredUngrouped.filter((feature) => feature.progress >= 100).length;
      groups.push({
        id: 'ungrouped',
        key: 'ungrouped',
        name: '未分组',
        progress,
        computedProgress: progress,
        manualProgress: null,
        completedCount,
        featureCount: filteredUngrouped.length,
        sort: Number.MAX_SAFE_INTEGER,
        remark: null,
        virtual: true,
        subgroups: [
          {
            id: 'ungrouped:direct',
            key: 'ungrouped:direct',
            name: '未分组',
            progress,
            computedProgress: progress,
            manualProgress: null,
            completedCount,
            featureCount: filteredUngrouped.length,
            sort: 0,
            remark: null,
            virtual: true,
            features: filteredUngrouped,
          },
        ],
      });
    }
    return groups;
  }

  private buildModuleGroup(node: ProjectFeatureProgressModuleNode, filteredIds: Set<string>): FeatureProgressModuleGroup | null {
    const directFeatures = this.sortFeatures(node.featurePoints.filter((feature) => filteredIds.has(feature.id)));
    const subgroups = node.children
      .map((child) => this.buildSubGroup(child, filteredIds))
      .filter((group): group is FeatureProgressSubGroup => !!group && group.featureCount > 0)
      .sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, 'zh-Hans-CN'));
    if (directFeatures.length > 0) {
      subgroups.unshift({
        id: `${node.id}:direct`,
        key: `${node.id}:direct`,
        name: '未分组',
        progress: this.averageProgress(directFeatures),
        computedProgress: this.averageProgress(directFeatures),
        manualProgress: null,
        completedCount: directFeatures.filter((feature) => feature.progress >= 100).length,
        featureCount: directFeatures.length,
        sort: -1,
        remark: null,
        virtual: true,
        features: directFeatures,
      });
    }
    const groupFeatures = subgroups.flatMap((subgroup) => subgroup.features);
    if (groupFeatures.length === 0) return null;
    return {
      id: node.id,
      key: node.id,
      name: node.name,
      progress: node.displayProgress,
      computedProgress: node.computedProgress,
      manualProgress: node.manualProgress,
      completedCount: groupFeatures.filter((feature) => feature.progress >= 100).length,
      featureCount: groupFeatures.length,
      sort: node.sort,
      remark: node.overrideRemark,
      subgroups,
    };
  }

  private buildSubGroup(node: ProjectFeatureProgressModuleNode, filteredIds: Set<string>): FeatureProgressSubGroup | null {
    const features = this.sortFeatures([
      ...node.featurePoints,
      ...this.collectModuleFeatures(node.children),
    ].filter((feature) => filteredIds.has(feature.id)));
    if (features.length === 0) return null;
    return {
      id: node.id,
      key: node.id,
      name: node.name,
      progress: node.displayProgress,
      computedProgress: node.computedProgress,
      manualProgress: node.manualProgress,
      completedCount: features.filter((feature) => feature.progress >= 100).length,
      featureCount: features.length,
      sort: node.sort,
      remark: node.overrideRemark,
      features,
    };
  }

  private groupName(value: string | null | undefined): string {
    return value?.trim() || '未分组';
  }

  private averageProgress(features: ProjectFeaturePoint[]): number {
    if (features.length === 0) return 0;
    return Math.round(features.reduce((sum, feature) => sum + feature.progress, 0) / features.length);
  }

  private sortFeatures(features: ProjectFeaturePoint[]): ProjectFeaturePoint[] {
    return [...features].sort((left, right) => left.sort - right.sort || left.createdAt.localeCompare(right.createdAt));
  }
}
