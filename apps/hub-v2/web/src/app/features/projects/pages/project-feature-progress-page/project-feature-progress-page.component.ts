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
import type { FeatureProgressOverallSaveInput } from '../../components/project-feature-progress-overall-drawer/project-feature-progress-overall-drawer.component';
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
  ProjectFeaturePointGroup,
  ProjectFeatureProgressStatusOption,
  ProjectFeaturePointStatus,
  ProjectFeatureProgressModuleNode,
  ProjectFeatureProgressView,
  ProjectMemberEntity,
} from '../../models/project.model';
import { ProjectFeatureProgressExcelImportService, type ProjectFeatureProgressImportRow } from '../../services/project-feature-progress-excel-import.service';
import { ProjectApiService } from '../../services/project-api.service';

interface FeatureProgressImportPreview {
  fileName: string;
  sheetName: string;
  rows: ProjectFeatureProgressImportRow[];
  duplicateCount: number;
  warnings: string[];
}

interface FeatureSearchEntry {
  feature: ProjectFeaturePoint;
  searchText: string;
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
            [summary]="data.summary"
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
            [sections]="featureTree()"
            [canManage]="canManage()"
            [collapseSectionsByDefault]="!hasActiveFilter()"
            [progressStatusOptions]="data.settings.statusOptions"
            [progressPatches]="groupProgressPatches()"
            (edit)="startEdit($event)"
            (delete)="deleteFeaturePoint($event)"
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
            [summary]="data.summary"
            [settings]="data.settings"
            (save)="saveOverallProgress($event)"
            (saveSettings)="saveFeatureProgressSettings($event.statusOptions)"
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

  readonly statusOptions = computed<Array<{ value: ProjectFeaturePointStatus; label: string }>>(() =>
    (this.vm()?.settings.statusOptions ?? DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS).map((option) => ({
      value: option.key,
      label: option.label,
    }))
  );

  readonly projectId = computed(() => this.projectContext.currentProjectId());
  readonly subtitle = computed(() => this.projectContext.currentProject()?.name || '请先选择项目');
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

  readonly filteredFeatures = computed(() => {
    const keyword = this.keyword().trim().toLowerCase();
    const moduleName = this.moduleFilter();
    const status = this.statusFilter();
    const progressStatusByFeatureId = this.featureProgressStatusByFeatureId();
    return this.featureSearchEntries().filter(({ feature, searchText }) => {
      if (moduleName && this.groupName(feature.moduleName) !== moduleName) return false;
      if (status && progressStatusByFeatureId.get(feature.id) !== status) return false;
      if (!keyword) return true;
      return searchText.includes(keyword);
    }).map((entry) => entry.feature);
  });

  readonly featureProgressStatusByFeatureId = computed(() => {
    const data = this.vm();
    const result = new Map<string, ProjectFeaturePointStatus>();
    if (!data) return result;

    const visitNode = (node: ProjectFeatureProgressModuleNode): void => {
      const status = this.progressStatusKey(node.displayProgress, data.settings.statusOptions);
      node.featurePoints.forEach((feature) => result.set(feature.id, status));
      node.children.forEach(visitNode);
    };

    data.modules.forEach(visitNode);
    const ungroupedStatus = this.progressStatusKey(0, data.settings.statusOptions);
    data.ungrouped.featurePoints.forEach((feature) => result.set(feature.id, ungroupedStatus));
    return result;
  });

  readonly featureSearchEntries = computed<FeatureSearchEntry[]>(() =>
    this.allFeatures().map((feature) => ({
      feature,
      searchText: this.featureSearchText(feature),
    }))
  );

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
    return this.buildFeatureTree(data.modules, this.filteredFeatures());
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
    const targetLabel = this.editingGroup()?.level === 'submodule' ? '子模块' : '模块';
    this.saving.set(true);
    this.projectApi.updateFeaturePointGroup(projectId, input.id, {
      name: input.name,
      manualProgress: input.manualProgress,
      sort: input.sort,
      remark: input.remark,
    }).pipe(finalize(() => this.saving.set(false))).subscribe({
      next: (group) => {
        const target = this.editingGroup();
        this.saving.set(false);
        this.cancelGroupEdit();
        this.message.success(`${targetLabel}进度已保存`);
        this.applyFeaturePointGroupDisplayPatch(group, target);
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

  private resetEditor(): void {
    this.editorOpen.set(false);
    this.editingFeatureId.set(null);
    this.groupEditorOpen.set(false);
    this.editingGroup.set(null);
    this.cancelTitleEdit();
  }

  private applyFeaturePointGroupDisplayPatch(
    group: ProjectFeaturePointGroup,
    target: FeaturePointGroupDrawerTarget | null
  ): void {
    if (!target) return;
    const computedProgress = target.computedProgress;
    const progress = group.manualProgress ?? computedProgress;
    this.groupProgressPatches.update((patches) => ({
      ...patches,
      [group.id]: {
        name: group.name,
        progress,
        computedProgress,
        manualProgress: group.manualProgress,
        sort: group.sort,
        remark: group.manualProgress === null ? null : group.remark,
      },
    }));
  }

  saveFeatureProgressSettings(statusOptions: ProjectFeatureProgressStatusOption[]): void {
    if (!this.canManage()) return;
    const projectId = this.projectId();
    if (!projectId) return;
    this.saving.set(true);
    this.projectApi.updateFeatureProgressSettings(projectId, { statusOptions }).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success('进度状态配置已更新');
        this.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  private buildFeatureTree(
    nodes: ProjectFeatureProgressModuleNode[],
    features: ProjectFeaturePoint[]
  ): FeatureProgressTitleGroup[] {
    const allVisibleFeatures = this.sortFeatures(features);
    const nodeById = new Map<string, ProjectFeatureProgressModuleNode>();
    this.collectModuleNodes(nodes).forEach((node) => nodeById.set(node.id, node));
    const sectionMap = new Map<string, Map<string, Map<string, ProjectFeaturePoint[]>>>();

    for (const feature of allVisibleFeatures) {
      const sectionKey = this.groupName(feature.groupTitle);
      const moduleKey = `${sectionKey}::${feature.moduleGroupId || this.groupName(feature.moduleName)}`;
      const submoduleKey = `${moduleKey}::${feature.submoduleGroupId || this.groupName(feature.submoduleName)}`;
      if (!sectionMap.has(sectionKey)) sectionMap.set(sectionKey, new Map());
      const moduleMap = sectionMap.get(sectionKey)!;
      if (!moduleMap.has(moduleKey)) moduleMap.set(moduleKey, new Map());
      const submoduleMap = moduleMap.get(moduleKey)!;
      if (!submoduleMap.has(submoduleKey)) submoduleMap.set(submoduleKey, []);
      submoduleMap.get(submoduleKey)!.push(feature);
    }

    return Array.from(sectionMap.entries()).map(([title, moduleMap]) => {
      const groups = Array.from(moduleMap.entries()).map(([moduleKey, submoduleMap]) => {
        const moduleFeatures = Array.from(submoduleMap.values()).flat();
        const firstFeature = moduleFeatures[0]!;
        const moduleNode = firstFeature.moduleGroupId ? nodeById.get(firstFeature.moduleGroupId) ?? null : null;
        const subgroups = Array.from(submoduleMap.entries()).map(([submoduleKey, features]) => {
          const subgroupFirst = features[0]!;
          const submoduleNode = subgroupFirst.submoduleGroupId ? nodeById.get(subgroupFirst.submoduleGroupId) ?? null : null;
          const progress = submoduleNode?.displayProgress ?? 0;
          return {
            id: subgroupFirst.submoduleGroupId || submoduleKey,
            key: submoduleKey,
            name: this.groupName(subgroupFirst.submoduleName),
            progress,
            computedProgress: submoduleNode?.computedProgress ?? progress,
            manualProgress: submoduleNode?.manualProgress ?? null,
            completedCount: progress >= 100 ? 1 : 0,
            featureCount: features.length,
            sort: submoduleNode?.sort ?? subgroupFirst.sort,
            remark: submoduleNode?.overrideRemark ?? null,
            virtual: !subgroupFirst.submoduleGroupId,
            features: this.sortFeatures(features),
          };
        }).sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, 'zh-Hans-CN'));
        const computedProgress = this.averageProgressValues(subgroups.map((subgroup) => subgroup.progress));
        const progress = moduleNode?.manualProgress ?? computedProgress;
        return {
          id: firstFeature.moduleGroupId || moduleKey,
          key: moduleKey,
          name: this.groupName(firstFeature.moduleName),
          progress,
          computedProgress,
          manualProgress: moduleNode?.manualProgress ?? null,
          completedCount: subgroups.filter((subgroup) => subgroup.progress >= 100).length,
          featureCount: moduleFeatures.length,
          sort: moduleNode?.sort ?? firstFeature.sort,
          remark: moduleNode?.overrideRemark ?? null,
          virtual: !firstFeature.moduleGroupId,
          subgroups,
        };
      }).sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, 'zh-Hans-CN'));
      const features = groups.flatMap((group) => group.subgroups.flatMap((subgroup) => subgroup.features));
      return {
        key: title,
        title,
        progress: this.averageProgressValues(groups.map((group) => group.progress)),
        completedCount: groups.filter((group) => group.progress >= 100).length,
        featureCount: features.length,
        groups,
      };
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

  private featureSearchText(feature: ProjectFeaturePoint): string {
    return [
      feature.groupTitle,
      feature.moduleName,
      feature.submoduleName,
      feature.name,
      feature.ownerName,
      ...(feature.ownerNames ?? []),
      feature.remark,
    ]
      .filter((value): value is string => !!value)
      .join('\n')
      .toLowerCase();
  }

  private averageProgressValues(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + Math.max(0, Math.min(100, value)), 0) / values.length);
  }

  private progressStatusKey(
    progress: number,
    options: ProjectFeatureProgressStatusOption[]
  ): ProjectFeaturePointStatus {
    const normalized = Math.max(0, Math.min(100, Math.round(progress)));
    const option = [...options]
      .sort((left, right) => right.progress - left.progress)
      .find((item) => normalized >= item.progress);
    return option?.key ?? 'todo';
  }

  private sortFeatures(features: ProjectFeaturePoint[]): ProjectFeaturePoint[] {
    return [...features].sort((left, right) => left.sort - right.sort || left.createdAt.localeCompare(right.createdAt));
  }

  private collectModuleNodes(nodes: ProjectFeatureProgressModuleNode[]): ProjectFeatureProgressModuleNode[] {
    return nodes.flatMap((node) => [node, ...this.collectModuleNodes(node.children)]);
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
