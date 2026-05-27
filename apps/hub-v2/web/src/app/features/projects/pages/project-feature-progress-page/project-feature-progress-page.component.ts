import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { ListStateComponent, PageHeaderComponent } from '@shared/ui';
import type {
  ProjectFeaturePoint,
  ProjectFeaturePointStatus,
  ProjectFeatureProgressModuleNode,
  ProjectFeatureProgressView,
  ProjectMemberEntity,
  ProjectMetaItem,
} from '../../models/project.model';
import { ProjectApiService } from '../../services/project-api.service';

type ProgressRow =
  | { kind: 'module'; id: string; level: number; node: ProjectFeatureProgressModuleNode }
  | { kind: 'feature'; id: string; level: number; feature: ProjectFeaturePoint; moduleName: string };

type ReportRow = {
  id: string;
  moduleName: string;
  submoduleName: string;
  featureName: string;
  progress: number;
  remark: string | null;
};

@Component({
  selector: 'app-project-feature-progress-page',
  standalone: true,
  imports: [
    FormsModule,
    ListStateComponent,
    PageHeaderComponent,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzSwitchModule,
    NzTagModule,
  ],
  template: `
    <section class="feature-progress-page">
      <app-page-header
        title="项目进度汇报"
        [subtitle]="projectContext.currentProject()?.name || '请先选择项目'"
      >
        <div class="header-actions">
          <button nz-button (click)="reload()" [disabled]="!projectId() || loading()">
            <span nz-icon nzType="reload"></span>
            刷新
          </button>
          @if (canManage()) {
            <button nz-button nzType="primary" (click)="enableProgress()" [disabled]="!projectId() || vm()?.enabled">
              <span nz-icon nzType="check-circle"></span>
              启用功能点进度
            </button>
          }
        </div>
      </app-page-header>

      @if (!projectId()) {
        <app-list-state
          [empty]="true"
          emptyTitle="请先选择项目"
          emptyDescription="选择项目后再维护功能点进度汇报。"
        />
      } @else {
        <app-list-state [loading]="loading()" [empty]="false" loadingText="正在加载项目进度…">
          @if (error()) {
            <section class="state-panel state-panel--error">
              <h2>项目进度加载失败</h2>
              <p>{{ error() }}</p>
              <button nz-button nzType="primary" (click)="reload()">重新加载</button>
            </section>
          } @else if (vm(); as data) {
            @if (!data.enabled) {
              <section class="state-panel">
                <h2>当前项目未启用功能点进度</h2>
                <p>启用后可手动维护功能点、模块和项目整体的汇报进度。</p>
                @if (canManage()) {
                  <button nz-button nzType="primary" (click)="enableProgress()">
                    <span nz-icon nzType="check-circle"></span>
                    启用功能点进度
                  </button>
                } @else {
                  <nz-tag nzColor="default">仅项目负责人或管理员可启用</nz-tag>
                }
              </section>
            } @else {
              <section class="summary-band">
                <div class="summary-progress">
                  <span>整体完成</span>
                  <strong>{{ data.summary.displayProgress }}%</strong>
                  @if (data.summary.overrideProgress !== null) {
                    <nz-tag nzColor="processing">手动口径</nz-tag>
                  }
                </div>
                <div class="metric"><span>功能点</span><strong>{{ data.summary.totalCount }}</strong></div>
                <div class="metric"><span>已完成</span><strong>{{ data.summary.completedCount }}</strong></div>
                <div class="metric"><span>进行中</span><strong>{{ data.summary.inProgressCount }}</strong></div>
                <div class="metric"><span>未开始</span><strong>{{ data.summary.notStartedCount }}</strong></div>
              </section>

              <section class="tool-band">
                <input
                  nz-input
                  placeholder="搜索功能点、模块或备注"
                  [ngModel]="keyword()"
                  (ngModelChange)="keyword.set($event)"
                />
                <nz-select
                  [ngModel]="statusFilter()"
                  (ngModelChange)="statusFilter.set($event)"
                  class="status-filter"
                >
                  <nz-option nzValue="" nzLabel="全部状态"></nz-option>
                  @for (option of statusOptions; track option.value) {
                    <nz-option [nzValue]="option.value" [nzLabel]="option.label"></nz-option>
                  }
                </nz-select>
                @if (canManage()) {
                  <button nz-button nzType="primary" (click)="startCreate()">
                    <span nz-icon nzType="plus"></span>
                    新增功能点
                  </button>
                }
              </section>

              @if (canManage() && editorOpen()) {
                <section class="edit-panel">
                  <div class="edit-grid">
                    <label>
                      <span>功能点名称</span>
                      <input nz-input [ngModel]="draftName()" (ngModelChange)="draftName.set($event)" />
                    </label>
                    <label>
                      <span>关联模块</span>
                      <nz-select [ngModel]="draftModuleId()" (ngModelChange)="draftModuleId.set($event)">
                        <nz-option nzValue="" nzLabel="未分组"></nz-option>
                        @for (module of modules(); track module.id) {
                          <nz-option [nzValue]="module.id" [nzLabel]="moduleLabel(module)"></nz-option>
                        }
                      </nz-select>
                    </label>
                    <label>
                      <span>负责人</span>
                      <nz-select [ngModel]="draftOwnerUserId()" (ngModelChange)="draftOwnerUserId.set($event)">
                        <nz-option nzValue="" nzLabel="未指定"></nz-option>
                        @for (member of members(); track member.id) {
                          <nz-option [nzValue]="member.userId" [nzLabel]="member.displayName"></nz-option>
                        }
                      </nz-select>
                    </label>
                    <label>
                      <span>状态</span>
                      <nz-select [ngModel]="draftStatus()" (ngModelChange)="draftStatus.set($event)">
                        @for (option of statusOptions; track option.value) {
                          <nz-option [nzValue]="option.value" [nzLabel]="option.label"></nz-option>
                        }
                      </nz-select>
                    </label>
                    <label>
                      <span>进度</span>
                      <nz-input-number
                        [ngModel]="draftProgress()"
                        (ngModelChange)="draftProgress.set(normalizeProgress($event))"
                        [nzMin]="0"
                        [nzMax]="100"
                      ></nz-input-number>
                    </label>
                    <label>
                      <span>排序</span>
                      <nz-input-number
                        [ngModel]="draftSort()"
                        (ngModelChange)="draftSort.set(normalizeSort($event))"
                        [nzMin]="0"
                      ></nz-input-number>
                    </label>
                  </div>
                  <label class="remark-field">
                    <span>备注</span>
                    <textarea nz-input rows="2" [ngModel]="draftRemark()" (ngModelChange)="draftRemark.set($event)"></textarea>
                  </label>
                  <div class="panel-actions">
                    <button nz-button nzType="primary" (click)="saveFeaturePoint()" [disabled]="saving()">保存</button>
                    <button nz-button (click)="cancelEdit()">取消</button>
                  </div>
                </section>
              }

              @if (canManage()) {
                <section class="override-panel">
                  <div>
                    <strong>汇报口径覆盖</strong>
                    <p>模块和项目整体默认自动汇总，也可在这里填手动汇报进度。</p>
                  </div>
                  <nz-select [ngModel]="overrideTarget()" (ngModelChange)="overrideTarget.set($event)" class="override-target">
                    <nz-option [nzValue]="'project:' + projectId()" nzLabel="项目整体"></nz-option>
                    @for (module of modules(); track module.id) {
                      <nz-option [nzValue]="'module:' + module.id" [nzLabel]="moduleLabel(module)"></nz-option>
                    }
                  </nz-select>
                  <nz-input-number
                    [ngModel]="overrideProgress()"
                    (ngModelChange)="overrideProgress.set(normalizeProgress($event))"
                    [nzMin]="0"
                    [nzMax]="100"
                  ></nz-input-number>
                  <input
                    nz-input
                    placeholder="覆盖原因或汇报备注"
                    [ngModel]="overrideRemark()"
                    (ngModelChange)="overrideRemark.set($event)"
                  />
                  <button nz-button nzType="primary" (click)="saveOverride()" [disabled]="saving()">保存覆盖</button>
                  <button nz-button (click)="clearOverride()" [disabled]="saving()">清除覆盖</button>
                </section>
              }

              <section class="progress-table-wrap">
                <table class="progress-table">
                  <thead>
                    <tr>
                      <th>区块 / 功能点</th>
                      <th>状态</th>
                      <th>完成情况</th>
                      <th>负责人</th>
                      <th>备注</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of filteredRows(); track row.id) {
                      <tr [class.module-row]="row.kind === 'module'" [class.feature-row]="row.kind === 'feature'">
                        <td>
                          <div class="name-cell" [style.padding-left.px]="row.level * 18">
                            @if (row.kind === 'module') {
                              <button nz-button nzType="text" class="icon-btn" (click)="toggleModule(row.node.id)">
                                <span nz-icon [nzType]="isCollapsed(row.node.id) ? 'right' : 'down'"></span>
                              </button>
                              <strong>{{ row.node.name }}</strong>
                              <small>{{ row.node.nodeType === 'subsystem' ? '模块' : '子模块' }} · {{ row.node.featureCount }} 项</small>
                            } @else {
                              <span class="leaf-dot"></span>
                              <span>{{ row.feature.name }}</span>
                            }
                          </div>
                        </td>
                        <td>
                          @if (row.kind === 'feature') {
                            <nz-tag [nzColor]="statusColor(row.feature.status)">{{ statusLabel(row.feature.status) }}</nz-tag>
                          } @else {
                            <nz-tag nzColor="default">汇总</nz-tag>
                          }
                        </td>
                        <td>
                          <div class="progress-cell">
                            <div class="bar"><span [style.width.%]="row.kind === 'module' ? row.node.displayProgress : row.feature.progress"></span></div>
                            <strong>{{ row.kind === 'module' ? row.node.displayProgress : row.feature.progress }}%</strong>
                            @if (row.kind === 'module' && row.node.overrideProgress !== null) {
                              <nz-tag nzColor="processing">手动</nz-tag>
                            }
                          </div>
                        </td>
                        <td>{{ row.kind === 'feature' ? (row.feature.ownerName || '-') : '-' }}</td>
                        <td>{{ row.kind === 'feature' ? (row.feature.remark || '-') : (row.node.overrideRemark || '-') }}</td>
                        <td>
                          @if (canManage() && row.kind === 'feature') {
                            <button nz-button nzType="link" (click)="startEdit(row.feature)">编辑</button>
                            <button
                              nz-button
                              nzType="link"
                              nzDanger
                              nz-popconfirm
                              nzPopconfirmTitle="确认删除该功能点？"
                              (nzOnConfirm)="deleteFeaturePoint(row.feature.id)"
                            >
                              删除
                            </button>
                          } @else {
                            <span class="muted">-</span>
                          }
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="empty-cell">暂无功能点数据</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </section>

              <section class="report-section">
                <h2>领导汇报视图</h2>
                <table class="report-table">
                  <thead>
                    <tr>
                      <th>序号</th>
                      <th>模块</th>
                      <th>子模块</th>
                      <th>功能点计划项名称</th>
                      <th>完成情况</th>
                      <th>备注</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (row of reportRows(); track row.id; let index = $index) {
                      <tr>
                        <td>{{ index + 1 }}</td>
                        <td>{{ row.moduleName }}</td>
                        <td>{{ row.submoduleName }}</td>
                        <td>{{ row.featureName }}</td>
                        <td>{{ row.progress }}%</td>
                        <td>{{ row.remark || '-' }}</td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="6" class="empty-cell">暂无可汇报功能点</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </section>
            }
          }
        </app-list-state>
      }
    </section>
  `,
  styles: [
    `
      .feature-progress-page {
        display: grid;
        gap: 18px;
      }
      .header-actions,
      .panel-actions {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      .state-panel,
      .summary-band,
      .tool-band,
      .edit-panel,
      .override-panel,
      .progress-table-wrap,
      .report-section {
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--bg-container);
      }
      .state-panel {
        padding: 28px;
      }
      .state-panel--error {
        border-color: var(--color-danger-light);
      }
      .state-panel h2,
      .report-section h2 {
        margin: 0 0 8px;
        color: var(--text-heading);
      }
      .state-panel p,
      .override-panel p {
        margin: 0 0 16px;
        color: var(--text-muted);
      }
      .summary-band {
        display: grid;
        grid-template-columns: minmax(220px, 1.2fr) repeat(4, minmax(120px, 1fr));
        gap: 1px;
        overflow: hidden;
      }
      .summary-progress,
      .metric {
        min-height: 96px;
        padding: 18px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        background: var(--bg-elevated);
      }
      .summary-progress strong {
        font-size: 34px;
        line-height: 1;
        color: var(--primary-600);
      }
      .metric strong {
        font-size: 24px;
        color: var(--text-heading);
      }
      .summary-progress span,
      .metric span {
        color: var(--text-muted);
      }
      .tool-band,
      .override-panel {
        padding: 14px;
        display: flex;
        gap: 10px;
        align-items: center;
      }
      .tool-band input {
        max-width: 360px;
      }
      .status-filter {
        width: 150px;
      }
      .edit-panel {
        padding: 16px;
        display: grid;
        gap: 14px;
      }
      .edit-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }
      label {
        display: grid;
        gap: 6px;
      }
      label > span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .remark-field textarea {
        resize: vertical;
      }
      .override-target {
        width: 220px;
      }
      .override-panel input {
        min-width: 220px;
      }
      .progress-table-wrap,
      .report-section {
        overflow: auto;
      }
      .progress-table,
      .report-table {
        width: 100%;
        border-collapse: collapse;
      }
      th,
      td {
        border-bottom: 1px solid var(--border-color);
        padding: 10px 12px;
        text-align: left;
        vertical-align: middle;
      }
      th {
        background: var(--bg-elevated);
        color: var(--text-secondary);
        font-weight: 600;
        white-space: nowrap;
      }
      .module-row td {
        background: color-mix(in srgb, var(--primary-50) 45%, var(--bg-container));
      }
      .name-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 260px;
      }
      .name-cell small {
        color: var(--text-muted);
      }
      .icon-btn {
        width: 26px;
        height: 26px;
        padding: 0;
      }
      .leaf-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: var(--primary-500);
        flex: 0 0 auto;
      }
      .progress-cell {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 180px;
      }
      .bar {
        width: 96px;
        height: 8px;
        border-radius: 999px;
        background: var(--border-color);
        overflow: hidden;
      }
      .bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--primary-600);
      }
      .report-section {
        padding-top: 14px;
      }
      .report-section h2 {
        padding: 0 14px;
      }
      .report-table th {
        background: #6fba3e;
        color: #0f2108;
      }
      .report-table td,
      .report-table th {
        border: 1px solid var(--border-color);
        text-align: center;
      }
      .empty-cell {
        text-align: center;
        color: var(--text-muted);
        padding: 28px;
      }
      .muted {
        color: var(--text-muted);
      }
      @media (max-width: 1100px) {
        .summary-band,
        .edit-grid {
          grid-template-columns: 1fr 1fr;
        }
        .tool-band,
        .override-panel {
          align-items: stretch;
          flex-direction: column;
        }
        .tool-band input,
        .status-filter,
        .override-target,
        .override-panel input {
          width: 100%;
          max-width: none;
        }
      }
      @media (max-width: 760px) {
        .summary-band,
        .edit-grid {
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
  private readonly authStore = inject(AuthStore);
  private readonly message = inject(NzMessageService);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly vm = signal<ProjectFeatureProgressView | null>(null);
  readonly modules = signal<ProjectMetaItem[]>([]);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly collapsedModuleIds = signal<string[]>([]);
  readonly keyword = signal('');
  readonly statusFilter = signal<ProjectFeaturePointStatus | ''>('');
  readonly editorOpen = signal(false);
  readonly editingFeatureId = signal<string | null>(null);
  readonly draftName = signal('');
  readonly draftModuleId = signal('');
  readonly draftOwnerUserId = signal('');
  readonly draftStatus = signal<ProjectFeaturePointStatus>('todo');
  readonly draftProgress = signal(0);
  readonly draftSort = signal(10);
  readonly draftRemark = signal('');
  readonly overrideTarget = signal('');
  readonly overrideProgress = signal(0);
  readonly overrideRemark = signal('');

  readonly statusOptions: Array<{ value: ProjectFeaturePointStatus; label: string }> = [
    { value: 'todo', label: '未开始' },
    { value: 'in_progress', label: '进行中' },
    { value: 'done', label: '已完成' },
    { value: 'paused', label: '暂停' },
  ];

  readonly projectId = computed(() => this.projectContext.currentProjectId());
  readonly canManage = computed(() => {
    const user = this.authStore.currentUser();
    const userId = user?.userId?.trim();
    if (user?.permissionCodes.includes('project.manage.all')) {
      return true;
    }
    return !!userId && this.members().some((member) => member.userId === userId && (member.isOwner || member.roleCode === 'project_admin'));
  });

  readonly rows = computed<ProgressRow[]>(() => {
    const data = this.vm();
    if (!data?.enabled) return [];
    const rows: ProgressRow[] = [];
    for (const node of data.modules) {
      this.appendModuleRows(rows, node, 0);
    }
    if (data.ungrouped.featurePoints.length > 0) {
      rows.push({
        kind: 'module',
        id: 'module:ungrouped',
        level: 0,
        node: {
          id: 'ungrouped',
          projectId: data.projectId,
          name: data.ungrouped.name,
          code: null,
          nodeType: 'module',
          parentId: null,
          sort: 999999,
          featureCount: data.ungrouped.featureCount,
          children: [],
          featurePoints: data.ungrouped.featurePoints,
          computedProgress: data.ungrouped.computedProgress,
          overrideProgress: null,
          displayProgress: data.ungrouped.displayProgress,
          overrideRemark: null,
        },
      });
      if (!this.isCollapsed('ungrouped')) {
        for (const feature of data.ungrouped.featurePoints) {
          rows.push({ kind: 'feature', id: `feature:${feature.id}`, level: 1, feature, moduleName: data.ungrouped.name });
        }
      }
    }
    return rows;
  });

  readonly filteredRows = computed(() => {
    const keyword = this.keyword().trim().toLowerCase();
    const status = this.statusFilter();
    if (!keyword && !status) return this.rows();
    return this.rows().filter((row) => {
      if (status && (row.kind !== 'feature' || row.feature.status !== status)) {
        return false;
      }
      if (!keyword) return true;
      if (row.kind === 'module') {
        return row.node.name.toLowerCase().includes(keyword) || (row.node.overrideRemark ?? '').toLowerCase().includes(keyword);
      }
      return (
        row.feature.name.toLowerCase().includes(keyword) ||
        (row.feature.moduleName ?? '').toLowerCase().includes(keyword) ||
        (row.feature.ownerName ?? '').toLowerCase().includes(keyword) ||
        (row.feature.remark ?? '').toLowerCase().includes(keyword)
      );
    });
  });

  readonly reportRows = computed<ReportRow[]>(() => {
    const data = this.vm();
    if (!data?.enabled) return [];
    const rows: ReportRow[] = [];
    const visit = (node: ProjectFeatureProgressModuleNode, ancestors: ProjectFeatureProgressModuleNode[]) => {
      for (const feature of node.featurePoints) {
        const root = ancestors[0] ?? node;
        const leaf = ancestors.length > 0 ? node : null;
        rows.push({
          id: feature.id,
          moduleName: root.name,
          submoduleName: leaf ? leaf.name : '-',
          featureName: feature.name,
          progress: feature.progress,
          remark: feature.remark,
        });
      }
      for (const child of node.children) {
        visit(child, [...ancestors, node]);
      }
    };
    for (const node of data.modules) {
      visit(node, []);
    }
    for (const feature of data.ungrouped.featurePoints) {
      rows.push({
        id: feature.id,
        moduleName: '未分组',
        submoduleName: '-',
        featureName: feature.name,
        progress: feature.progress,
        remark: feature.remark,
      });
    }
    return rows;
  });

  constructor() {
    effect(() => {
      const projectId = this.projectId();
      this.resetEditor();
      this.overrideTarget.set(projectId ? `project:${projectId}` : '');
      this.loadForProject(projectId);
    });
  }

  reload(): void {
    this.loadForProject(this.projectId());
  }

  enableProgress(): void {
    const projectId = this.projectId();
    if (!projectId) return;
    this.saving.set(true);
    this.projectApi.updateFeatureProgressSettings(projectId, { enabled: true }).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success('功能点进度已启用');
        this.reload();
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  startCreate(): void {
    this.resetEditor();
    this.editorOpen.set(true);
    this.draftSort.set(this.nextSort());
  }

  startEdit(feature: ProjectFeaturePoint): void {
    this.editorOpen.set(true);
    this.editingFeatureId.set(feature.id);
    this.draftName.set(feature.name);
    this.draftModuleId.set(feature.moduleId ?? '');
    this.draftOwnerUserId.set(feature.ownerUserId ?? '');
    this.draftStatus.set(feature.status);
    this.draftProgress.set(feature.progress);
    this.draftSort.set(feature.sort);
    this.draftRemark.set(feature.remark ?? '');
  }

  cancelEdit(): void {
    this.resetEditor();
  }

  saveFeaturePoint(): void {
    const projectId = this.projectId();
    const name = this.draftName().trim();
    if (!projectId || !name) {
      this.message.warning('请填写功能点名称');
      return;
    }
    const payload = {
      name,
      moduleId: this.draftModuleId().trim() || null,
      ownerUserId: this.draftOwnerUserId().trim() || null,
      status: this.draftStatus(),
      progress: this.normalizeProgress(this.draftProgress()),
      sort: this.normalizeSort(this.draftSort()),
      remark: this.draftRemark().trim() || null,
    };
    const editingId = this.editingFeatureId();
    this.saving.set(true);
    const request = editingId
      ? this.projectApi.updateFeaturePoint(projectId, editingId, payload)
      : this.projectApi.addFeaturePoint(projectId, payload);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success(editingId ? '功能点已更新' : '功能点已新增');
        this.resetEditor();
        this.reload();
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  deleteFeaturePoint(featurePointId: string): void {
    const projectId = this.projectId();
    if (!projectId) return;
    this.saving.set(true);
    this.projectApi.removeFeaturePoint(projectId, featurePointId).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success('功能点已删除');
        this.reload();
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  saveOverride(): void {
    const projectId = this.projectId();
    const target = this.parseOverrideTarget();
    if (!projectId || !target) return;
    this.saving.set(true);
    this.projectApi
      .upsertFeatureProgressOverride(projectId, {
        ...target,
        progress: this.normalizeProgress(this.overrideProgress()),
        remark: this.overrideRemark().trim() || null,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.message.success('汇报口径已保存');
          this.reload();
        },
        error: () => {
          this.saving.set(false);
        },
      });
  }

  clearOverride(): void {
    const projectId = this.projectId();
    const target = this.parseOverrideTarget();
    if (!projectId || !target) return;
    this.saving.set(true);
    this.projectApi.removeFeatureProgressOverride(projectId, target.targetType, target.targetId).subscribe({
      next: () => {
        this.saving.set(false);
        this.message.success('手动覆盖已清除');
        this.overrideRemark.set('');
        this.reload();
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }

  toggleModule(moduleId: string): void {
    this.collapsedModuleIds.update((ids) =>
      ids.includes(moduleId) ? ids.filter((item) => item !== moduleId) : [...ids, moduleId]
    );
  }

  isCollapsed(moduleId: string): boolean {
    return this.collapsedModuleIds().includes(moduleId);
  }

  normalizeProgress(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  }

  normalizeSort(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  }

  moduleLabel(module: ProjectMetaItem): string {
    const prefix = module.nodeType === 'subsystem' ? '模块' : '子模块';
    return module.parentName ? `${prefix} / ${module.parentName} / ${module.name}` : `${prefix} / ${module.name}`;
  }

  statusLabel(status: ProjectFeaturePointStatus): string {
    return this.statusOptions.find((item) => item.value === status)?.label ?? status;
  }

  statusColor(status: ProjectFeaturePointStatus): string {
    if (status === 'done') return 'success';
    if (status === 'in_progress') return 'processing';
    if (status === 'paused') return 'warning';
    return 'default';
  }

  private loadForProject(projectId: string | null): void {
    this.error.set('');
    this.vm.set(null);
    this.modules.set([]);
    this.members.set([]);
    this.collapsedModuleIds.set([]);
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
    this.projectApi.listModules(projectId).subscribe({
      next: (items) => this.modules.set(items),
      error: () => this.modules.set([]),
    });
    this.projectApi.listMembers(projectId).subscribe({
      next: (items) => this.members.set(items),
      error: () => this.members.set([]),
    });
  }

  private appendModuleRows(rows: ProgressRow[], node: ProjectFeatureProgressModuleNode, level: number): void {
    rows.push({ kind: 'module', id: `module:${node.id}`, level, node });
    if (this.isCollapsed(node.id)) return;
    for (const child of node.children) {
      this.appendModuleRows(rows, child, level + 1);
    }
    for (const feature of node.featurePoints) {
      rows.push({ kind: 'feature', id: `feature:${feature.id}`, level: level + 1, feature, moduleName: node.name });
    }
  }

  private resetEditor(): void {
    this.editorOpen.set(false);
    this.editingFeatureId.set(null);
    this.draftName.set('');
    this.draftModuleId.set('');
    this.draftOwnerUserId.set('');
    this.draftStatus.set('todo');
    this.draftProgress.set(0);
    this.draftSort.set(10);
    this.draftRemark.set('');
  }

  private nextSort(): number {
    const points = this.reportRows();
    return points.length > 0 ? (points.length + 1) * 10 : 10;
  }

  private parseOverrideTarget(): { targetType: 'project' | 'module'; targetId: string } | null {
    const value = this.overrideTarget();
    const [targetType, targetId] = value.split(':');
    if ((targetType === 'project' || targetType === 'module') && targetId) {
      return { targetType, targetId };
    }
    return null;
  }
}
