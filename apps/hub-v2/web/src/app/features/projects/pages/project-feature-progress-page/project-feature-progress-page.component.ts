import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { finalize, forkJoin, from, mergeMap, toArray } from 'rxjs';

import { DialogShellComponent, ListStateComponent, PageHeaderComponent } from '@shared/ui';
import { ProjectFeaturePointDrawerComponent } from '../../components/project-feature-point-drawer/project-feature-point-drawer.component';
import type { FeaturePointDrawerSaveInput } from '../../components/project-feature-point-drawer/project-feature-point-drawer.component';
import { ProjectFeaturePointGroupDrawerComponent } from '../../components/project-feature-point-group-drawer/project-feature-point-group-drawer.component';
import type { FeaturePointGroupDrawerSaveInput, FeaturePointGroupDrawerTarget } from '../../components/project-feature-point-group-drawer/project-feature-point-group-drawer.component';
import { ProjectFeatureProgressOverallDrawerComponent } from '../../components/project-feature-progress-overall-drawer/project-feature-progress-overall-drawer.component';
import type { FeatureProgressSettingsSaveInput } from '../../components/project-feature-progress-overall-drawer/project-feature-progress-overall-drawer.component';
import { ProjectFeatureProgressStatsComponent } from '../../components/project-feature-progress-stats/project-feature-progress-stats.component';
import { ProjectFeatureProgressToolbarComponent } from '../../components/project-feature-progress-toolbar/project-feature-progress-toolbar.component';
import { ProjectFeatureProgressTreeComponent } from '../../components/project-feature-progress-tree/project-feature-progress-tree.component';
import { DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS } from '../../models/project.model';
import type {
  FeatureProgressGroupDeleteTarget,
  FeatureProgressGroupEditTarget,
  FeatureProgressGroupDisplayPatch,
  FeatureProgressTitleGroup,
} from '../../components/project-feature-progress-tree/project-feature-progress-tree.component';
import type {
  ProjectFeaturePoint,
  ProjectFeaturePointGroupUpdateResult,
  ProjectFeatureProgressIncrementalResult,
  ProjectFeatureProgressSectionPatch,
  ProjectFeatureProgressSettings,
  ProjectFeatureProgressSummary,
  ProjectFeatureProgressStatusOption,
  ProjectFeaturePointStatus,
  ProjectFeatureProgressModuleNode,
  ProjectFeatureProgressView,
  ProjectMemberEntity,
} from '../../models/project.model';
import { ProjectFeatureProgressExcelImportService, type ProjectFeatureProgressImportRow } from '../../services/project-feature-progress-excel-import.service';
import { ProjectApiService } from '../../services/project-api.service';
import { ProjectFeatureProgressPatchService } from './services/project-feature-progress-patch.service';
import { ProjectFeatureProgressTreeBuilderService } from './services/project-feature-progress-tree-builder.service';

interface FeatureProgressImportPreview {
  fileName: string;
  sheetName: string;
  rows: ProjectFeatureProgressImportRow[];
  duplicateCount: number;
  warnings: string[];
}

interface FeatureProgressTitleEditor {
  section: FeatureProgressTitleGroup;
  featureIds: string[];
}

@Component({
  selector: 'app-project-feature-progress-page',
  standalone: true,
  imports: [
    FormsModule,
    DialogShellComponent,
    ListStateComponent,
    PageHeaderComponent,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
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
            [summary]="effectiveSummary() ?? data.summary"
            [canManage]="canManage()"
            (editOverall)="startEditOverall()"
          />

          <app-project-feature-progress-toolbar
            [keyword]="keywordInput()"
            [moduleFilter]="moduleFilter()"
            [statusFilter]="statusFilter()"
            [moduleOptions]="moduleOptions()"
            [statusOptions]="statusOptions()"
            [canManage]="canManage()"
            (keywordChange)="setKeywordInput($event)"
            (moduleFilterChange)="moduleFilter.set($event)"
            (statusFilterChange)="statusFilter.set($event)"
            (create)="startCreate()"
            (settings)="startEditOverall()"
            (importExcel)="parseExcel($event)"
          />

          @if (importPreview(); as preview) {
            <section class="import-preview">
              <div class="import-preview__main">
                <strong>Excel 解析预览</strong>
                <span>
                  {{ preview.fileName }} · {{ preview.sheetName }} · 识别 {{ preview.rows.length }} 个功能点
                  @if (preview.duplicateCount > 0) {
                    · 将跳过 {{ preview.duplicateCount }} 个已存在功能点
                  }
                </span>
                @if (preview.warnings.length > 0) {
                  <small>{{ preview.warnings.slice(0, 3).join('；') }}</small>
                }
              </div>
              <div class="import-preview__sample">
                @for (row of preview.rows.slice(0, 5); track row.rowNumber) {
                  <span>{{ row.groupTitle || '未分组标题' }} / {{ row.moduleName || '未分组' }} / {{ row.submoduleName || '未分组' }} / {{ row.name }} · {{ row.progress }}%</span>
                }
              </div>
              <div class="import-preview__actions">
                <button nz-button type="button" [disabled]="saving()" (click)="cancelImport()">取消</button>
                <button nz-button nzType="primary" type="button" [disabled]="saving()" (click)="confirmImport()">确认导入</button>
              </div>
            </section>
          }

          <app-project-feature-progress-tree
            [nodes]="visibleNodes()"
            [canManage]="canManage()"
            [forceExpanded]="hasActiveFilter()"
            [progressStatusOptions]="data.settings.statusOptions"
            [progressPatches]="groupProgressPatches()"
            [sectionPatches]="sectionProgressPatches()"
            (toggleNode)="toggleNode($event)"
            (editFeature)="startEdit($event)"
            (deleteFeature)="deleteFeaturePoint($event)"
            (editTitle)="startEditTitle($event)"
            (editGroup)="startEditGroup($event)"
            (deleteGroup)="deleteFeaturePointGroup($event)"
          />

          <app-dialog-shell
            [open]="!!titleEditor()"
            title="修改分组标题"
            subtitle="将批量更新该分组下所有功能点的分组标题。"
            icon="folder"
            width="520px"
            (cancel)="cancelTitleEdit()"
          >
            <div dialog-body class="title-editor">
              <label for="feature-progress-title-input">分组标题</label>
              <input
                id="feature-progress-title-input"
                nz-input
                maxlength="80"
                placeholder="请输入分组标题"
                [ngModel]="titleDraft()"
                (ngModelChange)="titleDraft.set($event)"
              />
              @if (titleEditor(); as editor) {
                <small>当前分组包含 {{ editor.featureIds.length }} 个功能点。</small>
              }
            </div>
            <div dialog-footer class="title-editor__footer">
              <button nz-button type="button" [disabled]="saving()" (click)="cancelTitleEdit()">取消</button>
              <button nz-button nzType="primary" type="button" [disabled]="saving()" (click)="saveTitleEdit()">保存</button>
            </div>
          </app-dialog-shell>

          <app-project-feature-point-drawer
            [open]="editorOpen()"
            [saving]="saving()"
            [members]="members()"
            [featurePoints]="allFeatures()"
            [moduleGroups]="data.modules"
            [feature]="editingFeature()"
            [nextSort]="nextSort()"
            [statusOptions]="statusOptions()"
            (save)="saveFeaturePoint($event)"
            (cancel)="cancelEdit()"
          />

          <app-project-feature-point-group-drawer
            [open]="groupEditorOpen()"
            [saving]="saving()"
            [target]="editingGroup()"
            [statusOptions]="data.settings.statusOptions"
            (save)="saveFeaturePointGroup($event)"
            (cancel)="cancelGroupEdit()"
          />

          <app-project-feature-progress-overall-drawer
            [open]="overallEditorOpen()"
            [saving]="saving()"
            [summary]="effectiveSummary() ?? data.summary"
            [settings]="data.settings"
            (save)="saveProgressSettings($event)"
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

      .import-preview {
        display: grid;
        grid-template-columns: minmax(260px, 1fr) minmax(320px, 1.2fr) auto;
        gap: 16px;
        align-items: start;
        padding: 14px 16px;
        margin-bottom: 16px;
        border: 1px solid color-mix(in srgb, var(--color-primary) 20%, var(--border-color));
        border-radius: var(--border-radius);
        background: color-mix(in srgb, var(--color-primary-light) 34%, var(--bg-container));
      }

      .import-preview__main,
      .import-preview__sample {
        display: grid;
        gap: 4px;
        min-width: 0;
      }

      .import-preview__main span,
      .import-preview__main small,
      .import-preview__sample span {
        color: var(--text-muted);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .import-preview__actions {
        display: flex;
        gap: 8px;
      }

      .title-editor {
        display: grid;
        gap: 8px;
      }

      .title-editor label {
        color: var(--text-heading);
        font-size: 13px;
        font-weight: 600;
      }

      .title-editor small {
        color: var(--text-muted);
      }

      .title-editor__footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }

      @media (max-width: 960px) {
        .import-preview {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFeatureProgressPageComponent {
  readonly projectContext = inject(ProjectContextStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly excelImport = inject(ProjectFeatureProgressExcelImportService);
  private readonly progressPatch = inject(ProjectFeatureProgressPatchService);
  private readonly treeBuilder = inject(ProjectFeatureProgressTreeBuilderService);
  private readonly authStore = inject(AuthStore);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly vm = signal<ProjectFeatureProgressView | null>(null);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly keywordInput = signal('');
  readonly keyword = signal('');
  readonly moduleFilter = signal('');
  readonly statusFilter = signal<ProjectFeaturePointStatus | ''>('');
  readonly editorOpen = signal(false);
  readonly editingFeatureId = signal<string | null>(null);
  readonly groupEditorOpen = signal(false);
  readonly editingGroup = signal<FeaturePointGroupDrawerTarget | null>(null);
  readonly overallEditorOpen = signal(false);
  readonly importPreview = signal<FeatureProgressImportPreview | null>(null);
  readonly titleEditor = signal<FeatureProgressTitleEditor | null>(null);
  readonly titleDraft = signal('');
  readonly groupProgressPatches = signal<Record<string, FeatureProgressGroupDisplayPatch>>({});
  readonly sectionProgressPatches = signal<Record<string, ProjectFeatureProgressSectionPatch>>({});
  readonly summaryPatch = signal<ProjectFeatureProgressSummary | null>(null);
  readonly expandedIds = signal<ReadonlySet<string>>(new Set());

  readonly statusOptions = computed<Array<{ value: ProjectFeaturePointStatus; label: string; progress: number }>>(() =>
    (this.vm()?.settings.statusOptions ?? DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS).map((option) => ({
      value: option.key,
      label: option.label,
      progress: option.progress,
    }))
  );

  readonly projectId = computed(() => this.projectContext.currentProjectId());
  readonly subtitle = computed(() => this.projectContext.currentProject()?.name || '请先选择项目');
  readonly effectiveSummary = computed(() => {
    const data = this.vm();
    if (!data) return null;
    const base = this.summaryPatch() ?? data.summary;
    const submodules = this.collectSubmoduleNodes(data.modules);
    const progressValues = submodules.map((node) => node.displayProgress);
    const computedProgress = this.averageProgressValues(progressValues);
    return {
      ...base,
      computedProgress,
      manualProgress: null,
      overrideProgress: null,
      displayProgress: computedProgress,
      overrideRemark: null,
      completedCount: progressValues.filter((progress) => progress >= 100).length,
      inProgressCount: progressValues.filter((progress) => progress > 0 && progress < 100).length,
      notStartedCount: progressValues.filter((progress) => progress <= 0).length,
    };
  });
  readonly hasActiveFilter = computed(() =>
    !!this.keyword().trim() || !!this.moduleFilter() || !!this.statusFilter()
  );
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

  readonly treeBuild = computed(() =>
    this.treeBuilder.build({
      view: this.vm(),
      keyword: this.keyword(),
      moduleFilter: this.moduleFilter(),
      statusFilter: this.statusFilter(),
      expandedIds: this.expandedIds(),
      expandAll: this.hasActiveFilter(),
      groupPatches: this.groupProgressPatches(),
      sectionPatches: this.sectionProgressPatches(),
      statusOptions: this.vm()?.settings.statusOptions ?? DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS,
    })
  );

  readonly visibleNodes = computed(() => this.treeBuild().visibleNodes);

  readonly moduleOptions = computed(() => {
    return this.treeBuild().moduleOptions;
  });
  readonly editingFeature = computed(() => {
    const editingId = this.editingFeatureId();
    return editingId ? this.allFeatures().find((feature) => feature.id === editingId) ?? null : null;
  });
  readonly nextSort = computed(() => {
    const points = this.allFeatures();
    return points.length > 0 ? Math.max(...points.map((item) => item.sort)) + 10 : 10;
  });

  private keywordTimer: ReturnType<typeof setTimeout> | null = null;
  private loadRequestId = 0;

  constructor() {
    effect(() => {
      const projectId = this.projectId();
      this.resetEditor();
      this.groupProgressPatches.set({});
      this.sectionProgressPatches.set({});
      this.summaryPatch.set(null);
      this.expandedIds.set(new Set());
      this.loadForProject(projectId);
    });

    this.destroyRef.onDestroy(() => {
      this.loadRequestId += 1;
      this.clearKeywordTimer();
    });
  }

  reload(): void {
    this.loadForProject(this.projectId(), { resetView: false });
  }

  setKeywordInput(value: string): void {
    this.keywordInput.set(value);
    this.clearKeywordTimer();
    this.keywordTimer = setTimeout(() => {
      this.keyword.set(value);
      this.keywordTimer = null;
    }, 300);
  }

  toggleNode(key: string): void {
    this.expandedIds.update((ids) => {
      const next = new Set(ids);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async parseExcel(file: File): Promise<void> {
    if (!this.canManage()) return;
    try {
      const result = await this.excelImport.parse(file);
      const existingKeys = this.buildFeatureKeySet(this.allFeatures());
      const seen = new Set<string>();
      let duplicateCount = 0;
      const rows = result.rows.filter((row) => {
        const key = this.featureKey(row);
        if (existingKeys.has(key) || seen.has(key)) {
          duplicateCount += 1;
          return false;
        }
        seen.add(key);
        return true;
      });
      this.importPreview.set({
        fileName: file.name,
        sheetName: result.sheetName,
        rows,
        duplicateCount,
        warnings: result.warnings,
      });
      if (rows.length === 0) {
        this.message.warning('Excel 中的功能点均已存在，无需导入');
      } else {
        this.message.success(`已解析 ${rows.length} 个可导入功能点`);
      }
    } catch (error) {
      this.importPreview.set(null);
      this.message.error(error instanceof Error ? error.message : 'Excel 解析失败');
    }
  }

  cancelImport(): void {
    this.importPreview.set(null);
  }

  confirmImport(): void {
    if (!this.canManage()) return;
    const preview = this.importPreview();
    const projectId = this.projectId();
    if (!projectId || !preview || preview.rows.length === 0) {
      return;
    }

    const baseSort = this.nextSort();
    this.saving.set(true);
    from(preview.rows).pipe(
      mergeMap((row, index) =>
        this.projectApi.addFeaturePoint(projectId, this.excelImport.toCreateInput(row, baseSort + index * 10)),
        8
      ),
      toArray()
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.importPreview.set(null);
        this.message.success(`已导入 ${preview.rows.length} 个功能点`);
        this.reload();
      },
      error: () => this.saving.set(false),
    });
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

  startEditTitle(section: FeatureProgressTitleGroup): void {
    if (!this.canManage()) return;
    const features = this.allFeatures().filter((feature) => this.groupName(feature.groupTitle) === section.title);
    if (features.length === 0) {
      this.message.warning('当前分组下暂无功能点');
      return;
    }
    this.titleEditor.set({
      section,
      featureIds: features.map((feature) => feature.id),
    });
    this.titleDraft.set(section.title === '未分组' ? '' : section.title);
  }

  cancelTitleEdit(): void {
    this.titleEditor.set(null);
    this.titleDraft.set('');
  }

  saveTitleEdit(): void {
    if (!this.canManage()) return;
    const editor = this.titleEditor();
    const projectId = this.projectId();
    const title = this.titleDraft().trim();
    if (!projectId || !editor) return;
    if (!title) {
      this.message.warning('请填写分组标题');
      return;
    }
    if (title === editor.section.title) {
      this.cancelTitleEdit();
      return;
    }

    this.saving.set(true);
    from(editor.featureIds).pipe(
      mergeMap((featureId) => this.projectApi.updateFeaturePoint(projectId, featureId, { groupTitle: title }), 8),
      toArray()
    ).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success(`已更新 ${editor.featureIds.length} 个功能点的分组标题`);
        this.cancelTitleEdit();
        this.reload();
      },
      error: () => this.saving.set(false),
    });
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
        next: (result) => {
          this.saving.set(false);
          this.message.success('功能点已更新');
          this.resetEditor();
          this.applyIncrementalResult(result);
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
      next: (result) => {
        this.saving.set(false);
        this.message.success('功能点已删除');
        this.applyIncrementalResult(result);
      },
      error: () => this.saving.set(false),
    });
  }

  saveFeaturePointGroup(input: FeaturePointGroupDrawerSaveInput): void {
    if (!this.canManage()) return;
    const projectId = this.projectId();
    if (!projectId) return;
    const isSubmodule = this.editingGroup()?.level === 'submodule';
    const targetLabel = isSubmodule ? '子模块' : '模块';
    this.saving.set(true);
    this.projectApi.updateFeaturePointGroup(projectId, input.id, {
      name: input.name,
      manualProgress: isSubmodule ? input.manualProgress : null,
      sort: input.sort,
      remark: input.remark,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (result) => {
        const target = this.editingGroup();
        this.saving.set(false);
        this.cancelGroupEdit();
        this.message.success(`${targetLabel}已保存`);
        this.applyIncrementalResult(result);
        this.applyFeaturePointGroupUpdateResult(result, target);
      },
      error: () => undefined,
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
      next: (result) => {
        this.saving.set(false);
        this.message.success('分组已删除');
        this.applyIncrementalResult(result);
      },
      error: () => this.saving.set(false),
    });
  }

  saveProgressSettings(input: FeatureProgressSettingsSaveInput): void {
    this.saveFeatureProgressSettings(input.statusOptions, { closeDrawer: true });
  }

  private loadForProject(projectId: string | null, options: { resetView?: boolean } = { resetView: true }): void {
    const requestId = ++this.loadRequestId;
    this.error.set('');
    if (options.resetView !== false) {
      this.vm.set(null);
      this.members.set([]);
    }
    if (!projectId) {
      this.vm.set(null);
      this.members.set([]);
      return;
    }
    this.loading.set(true);
    this.projectApi.getFeatureProgress(projectId).subscribe({
      next: (vm) => {
        if (requestId !== this.loadRequestId || vm.projectId !== this.projectId()) return;
        this.vm.set(vm);
        this.groupProgressPatches.set({});
        this.sectionProgressPatches.set({});
        this.summaryPatch.set(null);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        if (requestId !== this.loadRequestId) return;
        this.loading.set(false);
        this.error.set(error instanceof Error ? error.message : '请稍后重试。');
      },
    });
    this.projectApi.listMembers(projectId).subscribe({
      next: (items) => {
        if (requestId !== this.loadRequestId || projectId !== this.projectId()) return;
        this.members.set(items);
      },
      error: () => {
        if (requestId !== this.loadRequestId) return;
        this.members.set([]);
      },
    });
  }

  private collectModuleFeatures(nodes: ProjectFeatureProgressModuleNode[]): ProjectFeaturePoint[] {
    return nodes.flatMap((node) => [
      ...node.featurePoints,
      ...this.collectModuleFeatures(node.children),
    ]);
  }

  private collectSubmoduleNodes(nodes: ProjectFeatureProgressModuleNode[]): ProjectFeatureProgressModuleNode[] {
    return nodes.flatMap((node) => [
      ...(node.parentId ? [node] : []),
      ...this.collectSubmoduleNodes(node.children),
    ]);
  }

  private averageProgressValues(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + Math.max(0, Math.min(100, value)), 0) / values.length);
  }

  private resetEditor(): void {
    this.editorOpen.set(false);
    this.editingFeatureId.set(null);
    this.groupEditorOpen.set(false);
    this.editingGroup.set(null);
    this.cancelTitleEdit();
  }

  private applyIncrementalResult(result: ProjectFeatureProgressIncrementalResult): void {
    const current = this.vm();
    if (!current) {
      return;
    }
    this.vm.set(this.progressPatch.applyIncrementalResult(current, result));
    this.summaryPatch.set(result.summary);
    this.sectionProgressPatches.update((patches) => {
      const next = { ...patches };
      for (const section of result.sections) {
        next[section.key] = section;
      }
      return next;
    });
  }

  private applyFeaturePointGroupUpdateResult(
    result: ProjectFeaturePointGroupUpdateResult,
    target: FeaturePointGroupDrawerTarget | null
  ): void {
    this.summaryPatch.set(result.summary);
    this.groupProgressPatches.update((patches) => {
      const next = { ...patches };
      for (const node of result.nodes) {
        next[node.id] = {
          name: node.name,
          progress: node.displayProgress,
          computedProgress: node.computedProgress,
          manualProgress: node.manualProgress,
          sort: node.sort,
          remark: node.overrideRemark,
        };
      }
      if (result.nodes.length === 0 && target) {
        next[result.group.id] = {
          name: result.group.name,
          progress: result.group.manualProgress ?? target.computedProgress,
          computedProgress: target.computedProgress,
          manualProgress: result.group.manualProgress,
          sort: result.group.sort,
          remark: result.group.manualProgress === null ? null : result.group.remark,
        };
      }
      return next;
    });
    this.sectionProgressPatches.update((patches) => {
      const next = { ...patches };
      for (const section of result.sections) {
        next[section.key] = section;
      }
      return next;
    });
  }

  private applyFeatureProgressSettings(settings: ProjectFeatureProgressSettings): void {
    const current = this.vm();
    if (!current) return;
    this.vm.set({
      ...current,
      settings,
    });
  }

  saveFeatureProgressSettings(
    statusOptions: ProjectFeatureProgressStatusOption[],
    options: { closeDrawer?: boolean } = {}
  ): void {
    if (!this.canManage()) return;
    const projectId = this.projectId();
    if (!projectId) return;
    this.saving.set(true);
    this.projectApi.updateFeatureProgressSettings(projectId, { statusOptions }).subscribe({
      next: (settings) => {
        this.saving.set(false);
        this.message.success('进度状态配置已更新');
        if (options.closeDrawer) {
          this.overallEditorOpen.set(false);
        }
        this.applyFeatureProgressSettings(settings);
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  private groupName(value: string | null | undefined): string {
    return value?.trim() || '未分组';
  }

  private clearKeywordTimer(): void {
    if (this.keywordTimer) {
      clearTimeout(this.keywordTimer);
      this.keywordTimer = null;
    }
  }

  private buildFeatureKeySet(features: ProjectFeaturePoint[]): Set<string> {
    return new Set(features.map((feature) => this.featureKey(feature)));
  }

  private featureKey(feature: Pick<ProjectFeaturePoint, 'groupTitle' | 'moduleName' | 'submoduleName' | 'name'>): string {
    return [
      this.groupName(feature.groupTitle),
      this.groupName(feature.moduleName),
      this.groupName(feature.submoduleName),
      feature.name.trim(),
    ].join('::').toLowerCase();
  }
}
