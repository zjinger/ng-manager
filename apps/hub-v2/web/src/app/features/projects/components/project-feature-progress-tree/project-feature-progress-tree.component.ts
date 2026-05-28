import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS, type ProjectFeaturePoint, type ProjectFeaturePointStatus, type ProjectFeatureProgressStatusOption } from '../../models/project.model';

export interface FeatureProgressSubGroup {
  id: string;
  key: string;
  name: string;
  progress: number;
  computedProgress: number;
  manualProgress: number | null;
  completedCount: number;
  featureCount: number;
  sort: number;
  remark: string | null;
  virtual?: boolean;
  features: ProjectFeaturePoint[];
}

export interface FeatureProgressModuleGroup {
  id: string;
  key: string;
  name: string;
  progress: number;
  computedProgress: number;
  manualProgress: number | null;
  completedCount: number;
  featureCount: number;
  sort: number;
  remark: string | null;
  virtual?: boolean;
  subgroups: FeatureProgressSubGroup[];
}

export interface FeatureProgressTitleGroup {
  key: string;
  title: string;
  progress: number;
  completedCount: number;
  featureCount: number;
  groups: FeatureProgressModuleGroup[];
}

export interface FeatureProgressGroupDisplayPatch {
  name: string;
  progress: number;
  computedProgress: number;
  manualProgress: number | null;
  sort: number;
  remark: string | null;
}

export type FeatureProgressGroupEditTarget =
  | { level: 'module'; group: FeatureProgressModuleGroup }
  | { level: 'submodule'; group: FeatureProgressSubGroup; parent: FeatureProgressModuleGroup };

export type FeatureProgressGroupDeleteTarget =
  | { level: 'module'; id: string; name: string; featureCount: number; childCount: number }
  | { level: 'submodule'; id: string; name: string; featureCount: number; childCount: 0 };

@Component({
  selector: 'app-project-feature-progress-tree',
  standalone: true,
  imports: [NzButtonModule, NzIconModule, NzPopconfirmModule, NzTagModule],
  template: `
    <section class="feature-tree-card">
      <div class="feature-tree">
        <div class="feature-tree__head">
          <span>功能结构</span>
          <span>完成进度</span>
          <span>完成情况</span>
          <span class="feature-tree__head-actions">
            <button nz-button nzType="text" type="button" title="展开全部" [disabled]="expandingAll()" (click)="expandAll()">
              <span nz-icon [nzType]="expandingAll() ? 'loading' : 'fullscreen'"></span>
            </button>
            <button nz-button nzType="text" type="button" title="折叠全部" [disabled]="expandingAll()" (click)="collapseAll()">
              <span nz-icon nzType="fullscreen-exit"></span>
            </button>
          </span>
        </div>

        @for (section of sections(); track section.key) {
          <section class="feature-tree__section">
            <div class="feature-tree__section-title" (click)="toggleSection(section.key)">
              <span class="feature-tree__section-main">
                <span class="feature-tree__toggle" [class.feature-tree__toggle--collapsed]="isSectionCollapsed(section.key)">
                  <span nz-icon [nzType]="isNodeExpanding(section.key) ? 'loading' : 'down'"></span>
                </span>
                <span nz-icon [nzType]="isSectionCollapsed(section.key) ? 'folder' : 'folder-open'"></span>
                <strong>{{ section.title }}</strong>
                @if (canManage()) {
                  <button
                    class="feature-tree__section-edit"
                    nz-button
                    nzType="link"
                    type="button"
                    (click)="editTitle.emit(section); $event.stopPropagation()"
                  >
                    编辑
                  </button>
                }
                <small>{{ section.groups.length }} 个一级模块 · {{ section.featureCount }} 个功能点 · 完成模块 {{ section.completedCount }} 个</small>
              </span>
              <span class="feature-tree__section-progress">
                <span class="feature-tree__bar"><span [style.width.%]="section.progress"></span></span>
                <strong>{{ section.progress }}%</strong>
              </span>
              <span class="feature-tree__section-status">{{ progressText(section.progress) }}</span>
            </div>
          </section>

          @if (!isSectionCollapsed(section.key)) {
            @for (group of section.groups; track group.key) {
              <section class="feature-tree__group">
              <div class="feature-tree__row feature-tree__row--module" (click)="toggleModule(group.key)">
                <span class="feature-tree__main">
                  <span class="feature-tree__toggle" [class.feature-tree__toggle--collapsed]="isModuleCollapsed(group.key)">
                    <span nz-icon [nzType]="isNodeExpanding(group.key) ? 'loading' : 'down'"></span>
                  </span>
                  <span class="feature-tree__node-icon">
                    <span nz-icon nzType="partition"></span>
                  </span>
                    <span class="feature-tree__text">
                      <span class="feature-tree__title">
                        <strong>{{ groupName(group) }}</strong>
                        <span class="feature-tree__badge">模块</span>
                      </span>
                      <small>{{ group.subgroups.length }} 个子模块 · {{ group.featureCount }} 个功能点 · 完成子模块 {{ group.completedCount }} 个</small>
                    </span>
                  </span>
                <span class="feature-tree__progress">
                  <span class="feature-tree__bar"><span [style.width.%]="groupProgress(group)"></span></span>
                  <strong>{{ groupProgress(group) }}%</strong>
                  @if (groupManualProgress(group) !== null) {
                    <nz-tag nzColor="processing" [title]="'自动计算：' + groupComputedProgress(group) + '%'">手动</nz-tag>
                  }
                </span>
                <span class="feature-tree__status">{{ progressText(groupProgress(group)) }}</span>
                <span class="feature-tree__actions">
                  @if (canManage() && !group.virtual) {
                    <button nz-button nzType="link" type="button" (click)="editGroup.emit({ level: 'module', group: patchedModuleGroup(group) }); $event.stopPropagation()">编辑</button>
                    <button
                      nz-button
                      nzType="link"
                      nzDanger
                      type="button"
                      nz-popconfirm
                      nzPopconfirmTitle="确认删除该模块？"
                      (click)="$event.stopPropagation()"
                      (nzOnConfirm)="deleteGroup.emit({ level: 'module', id: group.id, name: groupName(group), featureCount: group.featureCount, childCount: group.subgroups.length })"
                    >
                      删除
                    </button>
                  } @else {
                    <span class="feature-tree__muted">-</span>
                  }
                </span>
              </div>

              @if (!isModuleCollapsed(group.key)) {
                @for (subgroup of group.subgroups; track subgroup.key) {
                  <div class="feature-tree__row feature-tree__row--submodule" (click)="toggleSubmodule(subgroup.key)">
                    <span class="feature-tree__main">
                      <span class="feature-tree__toggle" [class.feature-tree__toggle--collapsed]="isSubmoduleCollapsed(subgroup.key)">
                        <span nz-icon [nzType]="isNodeExpanding(subgroup.key) ? 'loading' : 'down'"></span>
                      </span>
                      <span class="feature-tree__node-icon">
                        <span nz-icon nzType="branches"></span>
                      </span>
                      <span class="feature-tree__text">
                        <span class="feature-tree__title">
                          <strong>{{ groupName(subgroup) }}</strong>
                          <span class="feature-tree__badge feature-tree__badge--sub">子模块</span>
                        </span>
                        <small>{{ subgroup.features.length }} 个功能点 · 子模块进度 {{ groupProgress(subgroup) }}%</small>
                      </span>
                    </span>
                    <span class="feature-tree__progress">
                      <span class="feature-tree__bar"><span [style.width.%]="groupProgress(subgroup)"></span></span>
                      <strong>{{ groupProgress(subgroup) }}%</strong>
                      @if (groupManualProgress(subgroup) !== null) {
                        <nz-tag nzColor="processing" [title]="'自动计算：' + groupComputedProgress(subgroup) + '%'">手动</nz-tag>
                      }
                    </span>
                    <span class="feature-tree__status">{{ progressText(groupProgress(subgroup)) }}</span>
                    <span class="feature-tree__actions">
                      @if (canManage() && !subgroup.virtual) {
                        <button nz-button nzType="link" type="button" (click)="editGroup.emit({ level: 'submodule', group: patchedSubGroup(subgroup), parent: patchedModuleGroup(group) }); $event.stopPropagation()">编辑</button>
                        <button
                          nz-button
                          nzType="link"
                          nzDanger
                          type="button"
                          nz-popconfirm
                          nzPopconfirmTitle="确认删除该子模块？"
                          (click)="$event.stopPropagation()"
                          (nzOnConfirm)="deleteGroup.emit({ level: 'submodule', id: subgroup.id, name: groupName(subgroup), featureCount: subgroup.featureCount, childCount: 0 })"
                        >
                          删除
                        </button>
                      } @else {
                        <span class="feature-tree__muted">-</span>
                      }
                    </span>
                  </div>

                  @if (!isSubmoduleCollapsed(subgroup.key)) {
                    @for (feature of subgroup.features; track feature.id) {
                      <div class="feature-tree__row feature-tree__row--feature">
                        <span class="feature-tree__main">
                          <span class="feature-tree__node-icon feature-tree__node-icon--feature">
                            <span nz-icon nzType="appstore"></span>
                          </span>
                          <span class="feature-tree__text">
                            <span class="feature-tree__title">
                              <strong>{{ feature.name }}</strong>
                            </span>
                            <small class="feature-tree__meta" [title]="featureMetaText(feature)">
                              <span class="feature-tree__meta-text">{{ featureMetaText(feature) }}</span>
                            </small>
                          </span>
                        </span>
                        <span class="feature-tree__progress feature-tree__progress--feature-hidden">
                          <!-- 功能点仅作为展示节点，不展示进度。 -->
                        </span>
                        <span class="feature-tree__status feature-tree__status--feature-hidden">
                          <!-- 功能点仅作为展示节点，不展示状态。 -->
                        </span>
                        <span class="feature-tree__actions">
                          @if (canManage()) {
                            <button nz-button nzType="link" type="button" (click)="edit.emit(feature)">编辑</button>
                            <button
                              nz-button
                              nzType="link"
                              nzDanger
                              type="button"
                              nz-popconfirm
                              nzPopconfirmTitle="确认删除该功能点？"
                              (nzOnConfirm)="delete.emit(feature.id)"
                            >
                              删除
                            </button>
                          } @else {
                            <span class="feature-tree__muted">-</span>
                          }
                        </span>
                      </div>
                    }
                  }
                }
              }
            </section>
            }
          }
        } @empty {
          <div class="feature-tree__empty">暂无功能点数据</div>
        }
      </div>
    </section>
  `,
  styles: [
    `
      .feature-tree-card {
        --feature-tree-line-color: color-mix(in srgb, var(--text-muted) 72%, var(--border-color));
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--bg-container);
        overflow: hidden;
      }

      .feature-tree {
        overflow-x: auto;
      }

      .feature-tree__head,
      .feature-tree__row {
        display: grid;
        grid-template-columns: minmax(420px, 1fr) 220px 150px 150px;
        align-items: center;
        column-gap: 18px;
      }

      .feature-tree__head {
        min-width: 940px;
        padding: 12px 18px;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 600;
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border-color-soft);
      }

      .feature-tree__head-actions {
        display: flex;
        align-items: center;
        gap: 4px;
        justify-content: flex-start;
      }

      .feature-tree__head-actions button {
        width: 28px;
        height: 28px;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .feature-tree__group + .feature-tree__group {
        border-top: 1px solid var(--border-color-soft);
      }

      .feature-tree__section {
        border-top: 1px solid var(--border-color);
        background: color-mix(in srgb, var(--color-primary-light) 48%, var(--bg-container));
      }

      .feature-tree__section:first-of-type {
        border-top: 0;
      }

      .feature-tree__section-title {
        display: grid;
        grid-template-columns: minmax(420px, 1fr) 220px 150px 150px;
        align-items: center;
        min-width: 940px;
        column-gap: 18px;
        padding: 13px 18px;
        color: var(--text-heading);
        cursor: pointer;
        font-size: 13px;
      }

      .feature-tree__section-title:hover {
        background: color-mix(in srgb, var(--primary-600) 5%, transparent);
      }

      .feature-tree__section-main,
      .feature-tree__section-progress {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .feature-tree__section-main {
        min-width: 0;
        font-size: 15px;
      }

      .feature-tree__section-main strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .feature-tree__section-main small {
        flex: 0 1 auto;
        min-width: 0;
        overflow: hidden;
        color: var(--text-muted);
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .feature-tree__section-status {
        color: var(--text-muted);
        font-size: 13px;
      }

      .feature-tree__section-edit {
        height: auto;
        padding: 0 4px;
        font-size: 12px;
      }

      .feature-tree__row {
        width: 100%;
        min-width: 940px;
        min-height: 58px;
        padding: 10px 18px;
        border: 0;
        background: var(--bg-container);
        color: inherit;
        position: relative;
        text-align: left;
      }

      .feature-tree__row--module,
      .feature-tree__row--submodule {
        cursor: pointer;
      }

      .feature-tree__row--module:hover,
      .feature-tree__row--submodule:hover,
      .feature-tree__row--feature:hover {
        background: var(--bg-subtle);
      }

      .feature-tree__row--module {
        background: color-mix(in srgb, var(--primary-600) 4%, var(--bg-container));
      }

      .feature-tree__row--submodule::before,
      .feature-tree__row--submodule::after,
      .feature-tree__row--feature::before,
      .feature-tree__row--feature::after {
        content: '';
        position: absolute;
        pointer-events: none;
      }

      .feature-tree__row--submodule {
        padding-left: 44px;
      }

      .feature-tree__row--submodule::before {
        left: 30px;
        top: 0;
        bottom: 0;
        width: 67px;
        background:
          repeating-linear-gradient(to bottom, var(--feature-tree-line-color) 0 2px, transparent 2px 4px) 0 0 / 1px 50% no-repeat,
          repeating-linear-gradient(to bottom, var(--feature-tree-line-color) 0 2px, transparent 2px 4px) 67px 50% / 1px 50% no-repeat;
      }

      .feature-tree__row--submodule::after {
        left: 30px;
        top: 50%;
        width: 17px;
        border-top: 1px dashed var(--feature-tree-line-color);
      }

      .feature-tree__row--feature {
        padding-left: 130px;
      }

      .feature-tree__row--feature::before {
        left: 97px;
        top: 0;
        bottom: 0;
        border-left: 1px dashed var(--feature-tree-line-color);
      }

      .feature-tree__row--feature::after {
        left: 97px;
        top: 50%;
        width: 30px;
        border-top: 1px dashed var(--feature-tree-line-color);
      }

      .feature-tree__main,
      .feature-tree__progress,
      .feature-tree__actions,
      .feature-tree__title {
        display: flex;
        align-items: center;
      }

      .feature-tree__main {
        gap: 10px;
        min-width: 0;
        overflow: hidden;
      }

      .feature-tree__toggle {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 0;
        color: var(--text-muted);
        background: transparent;
        position: relative;
        z-index: 1;
        transition: transform 0.16s ease;
      }

      .feature-tree__toggle--collapsed {
        transform: rotate(-90deg);
      }

      .feature-tree__node-icon {
        width: 38px;
        height: 38px;
        flex: 0 0 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--border-radius);
        color: var(--primary-600);
        background: color-mix(in srgb, var(--primary-600) 10%, var(--bg-container));
        position: relative;
        z-index: 1;
      }

      .feature-tree__node-icon--feature {
        color: var(--color-info);
        background: var(--color-info-light);
      }

      .feature-tree__text {
        display: grid;
        gap: 4px;
        min-width: 0;
        overflow: hidden;
      }

      .feature-tree__title {
        gap: 8px;
        min-width: 0;
      }

      .feature-tree__title strong {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text-heading);
        font-size: 14px;
      }

      .feature-tree__text small {
        overflow: hidden;
        color: var(--text-muted);
        font-size: 12px;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .feature-tree__meta {
        display: block;
        max-width: 100%;
        overflow: hidden;
      }

      .feature-tree__meta-text {
        display: inline-block;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: bottom;
        white-space: nowrap;
      }

      .feature-tree__meta:hover {
        overflow-x: auto;
        text-overflow: clip;
        scrollbar-width: thin;
      }

      .feature-tree__badge {
        flex: 0 0 auto;
        padding: 2px 7px;
        border-radius: 999px;
        color: var(--primary-600);
        background: color-mix(in srgb, var(--primary-600) 10%, var(--bg-container));
        font-size: 12px;
        font-weight: 600;
      }

      .feature-tree__badge--sub {
        color: var(--color-info);
        background: var(--color-info-light);
      }

      .feature-tree__progress {
        gap: 10px;
      }

      .feature-tree__progress strong {
        width: 42px;
        color: var(--text-heading);
        font-size: 13px;
      }

      .feature-tree__bar {
        width: 130px;
        height: 8px;
        border-radius: 999px;
        overflow: hidden;
        background: var(--border-color-soft);
      }

      .feature-tree__bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--primary-600);
      }

      .feature-tree__status {
        color: var(--text-muted);
        font-size: 13px;
      }

      .feature-tree__actions {
        justify-content: flex-start;
        gap: 4px;
      }

      .feature-tree__muted {
        color: var(--text-muted);
      }

      .feature-tree__empty {
        padding: 52px 18px;
        color: var(--text-muted);
        text-align: center;
      }

    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFeatureProgressTreeComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly sections = input<FeatureProgressTitleGroup[]>([]);
  readonly canManage = input(false);
  readonly collapseSectionsByDefault = input(false);
  readonly progressStatusOptions = input<ProjectFeatureProgressStatusOption[]>(DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS);
  readonly progressPatches = input<Record<string, FeatureProgressGroupDisplayPatch>>({});

  readonly edit = output<ProjectFeaturePoint>();
  readonly delete = output<string>();
  readonly editTitle = output<FeatureProgressTitleGroup>();
  readonly editGroup = output<FeatureProgressGroupEditTarget>();
  readonly deleteGroup = output<FeatureProgressGroupDeleteTarget>();

  private readonly collapsedModules = signal<ReadonlySet<string>>(new Set());
  private readonly collapsedSubmodules = signal<ReadonlySet<string>>(new Set());
  private readonly collapsedSections = signal<ReadonlySet<string>>(new Set());
  private readonly expandingNodes = signal<ReadonlySet<string>>(new Set());
  readonly expandingAll = signal(false);

  private expandFrameId: number | null = null;
  private nodeExpandFrameId: number | null = null;
  private defaultCollapseInitialized = false;
  private previousCollapseSectionsByDefault = false;

  readonly featureCount = computed(() =>
    this.sections().reduce((sum, section) => sum + section.featureCount, 0)
  );

  constructor() {
    effect(() => {
      this.cancelPendingExpand();
      const sections = this.sections();
      const shouldCollapseByDefault = this.collapseSectionsByDefault();
      if (sections.length === 0) {
        this.defaultCollapseInitialized = false;
        this.previousCollapseSectionsByDefault = shouldCollapseByDefault;
        this.clearCollapsedState();
        return;
      }
      if (!shouldCollapseByDefault) {
        this.defaultCollapseInitialized = false;
        this.previousCollapseSectionsByDefault = false;
        this.clearCollapsedState();
        return;
      }
      if (!this.defaultCollapseInitialized || !this.previousCollapseSectionsByDefault) {
        this.setCollapsedState(sections, true);
        this.defaultCollapseInitialized = true;
        this.previousCollapseSectionsByDefault = true;
        return;
      }
      this.pruneCollapsedState(sections);
    });

    this.destroyRef.onDestroy(() => this.cancelPendingExpand());
  }

  isSectionCollapsed(key: string): boolean {
    return this.collapsedSections().has(key);
  }

  isModuleCollapsed(key: string): boolean {
    return this.collapsedModules().has(key);
  }

  isSubmoduleCollapsed(key: string): boolean {
    return this.collapsedSubmodules().has(key);
  }

  isNodeExpanding(key: string): boolean {
    return this.expandingNodes().has(key);
  }

  toggleSection(key: string): void {
    this.cancelPendingExpand();
    const next = new Set(this.collapsedSections());
    if (next.has(key)) {
      this.expandNodeOnNextFrame(key, this.collapsedSections);
    } else {
      next.add(key);
      this.collapsedSections.set(next);
    }
  }

  toggleModule(key: string): void {
    this.cancelPendingExpand();
    const next = new Set(this.collapsedModules());
    if (next.has(key)) {
      this.expandNodeOnNextFrame(key, this.collapsedModules);
    } else {
      next.add(key);
      this.collapsedModules.set(next);
    }
  }

  toggleSubmodule(key: string): void {
    this.cancelPendingExpand();
    const next = new Set(this.collapsedSubmodules());
    if (next.has(key)) {
      this.expandNodeOnNextFrame(key, this.collapsedSubmodules);
    } else {
      next.add(key);
      this.collapsedSubmodules.set(next);
    }
  }

  expandAll(): void {
    this.cancelPendingExpand();
    const submoduleKeys = this.sections().flatMap((section) =>
      section.groups.flatMap((group) => group.subgroups.map((subgroup) => subgroup.key))
    );
    this.collapsedSections.set(new Set());
    this.collapsedModules.set(new Set());
    this.collapsedSubmodules.set(new Set(submoduleKeys));
    if (submoduleKeys.length === 0) {
      return;
    }
    this.expandingAll.set(true);
    this.expandSubmodulesInBatches(submoduleKeys, 0);
  }

  collapseAll(): void {
    this.cancelPendingExpand();
    this.setCollapsedState(this.sections(), true);
  }

  statusLabel(status: ProjectFeaturePointStatus): string {
    if (status === 'done') return '已完成';
    if (status === 'testing') return '测试中';
    if (status === 'developing') return '开发中';
    if (status === 'designing') return '设计中';
    return '未开始';
  }

  statusColor(status: ProjectFeaturePointStatus): string {
    if (status === 'done') return 'success';
    if (status === 'testing') return 'processing';
    if (status === 'developing') return 'warning';
    if (status === 'designing') return 'default';
    return 'default';
  }

  progressText(progress: number): string {
    const normalized = Math.max(0, Math.min(100, Math.round(progress)));
    const option = [...this.progressStatusOptions()]
      .sort((left, right) => right.progress - left.progress)
      .find((item) => normalized >= item.progress);
    return option?.label ?? '未开始';
  }

  groupName(group: FeatureProgressModuleGroup | FeatureProgressSubGroup): string {
    return this.progressPatches()[group.id]?.name ?? group.name;
  }

  groupProgress(group: FeatureProgressModuleGroup | FeatureProgressSubGroup): number {
    return this.progressPatches()[group.id]?.progress ?? group.progress;
  }

  groupComputedProgress(group: FeatureProgressModuleGroup | FeatureProgressSubGroup): number {
    return this.progressPatches()[group.id]?.computedProgress ?? group.computedProgress;
  }

  groupManualProgress(group: FeatureProgressModuleGroup | FeatureProgressSubGroup): number | null {
    const patch = this.progressPatches()[group.id];
    return patch ? patch.manualProgress : group.manualProgress;
  }

  patchedModuleGroup(group: FeatureProgressModuleGroup): FeatureProgressModuleGroup {
    const patch = this.progressPatches()[group.id];
    return patch
      ? {
          ...group,
          name: patch.name,
          progress: patch.progress,
          computedProgress: patch.computedProgress,
          manualProgress: patch.manualProgress,
          sort: patch.sort,
          remark: patch.remark,
        }
      : group;
  }

  patchedSubGroup(group: FeatureProgressSubGroup): FeatureProgressSubGroup {
    const patch = this.progressPatches()[group.id];
    return patch
      ? {
          ...group,
          name: patch.name,
          progress: patch.progress,
          computedProgress: patch.computedProgress,
          manualProgress: patch.manualProgress,
          sort: patch.sort,
          remark: patch.remark,
        }
      : group;
  }

  ownerText(feature: ProjectFeaturePoint): string {
    return feature.ownerNames?.length ? feature.ownerNames.join('、') : feature.ownerName || '';
  }

  featureMetaText(feature: ProjectFeaturePoint): string {
    const owner = this.ownerText(feature);
    return owner ? `${owner} · ${feature.remark || ''}` : feature.remark || '';
  }

  private clearCollapsedState(): void {
    this.collapsedSections.set(new Set());
    this.collapsedModules.set(new Set());
    this.collapsedSubmodules.set(new Set());
  }

  private cancelPendingExpand(): void {
    if (this.nodeExpandFrameId !== null) {
      window.cancelAnimationFrame(this.nodeExpandFrameId);
      this.nodeExpandFrameId = null;
    }
    if (this.expandFrameId !== null) {
      window.cancelAnimationFrame(this.expandFrameId);
      this.expandFrameId = null;
    }
    this.expandingNodes.set(new Set());
    this.expandingAll.set(false);
  }

  private expandNodeOnNextFrame(key: string, target: typeof this.collapsedSections): void {
    this.expandingNodes.set(new Set([key]));
    this.nodeExpandFrameId = window.requestAnimationFrame(() => {
      const next = new Set(target());
      next.delete(key);
      target.set(next);
      this.expandingNodes.set(new Set());
      this.nodeExpandFrameId = null;
    });
  }

  private expandSubmodulesInBatches(keys: string[], start: number): void {
    const batchSize = 12;
    this.expandFrameId = window.requestAnimationFrame(() => {
      const next = new Set(this.collapsedSubmodules());
      for (let index = start; index < Math.min(start + batchSize, keys.length); index += 1) {
        next.delete(keys[index]!);
      }
      this.collapsedSubmodules.set(next);
      const nextStart = start + batchSize;
      if (nextStart < keys.length) {
        this.expandSubmodulesInBatches(keys, nextStart);
        return;
      }
      this.expandFrameId = null;
      this.expandingAll.set(false);
    });
  }

  private setCollapsedState(sections: FeatureProgressTitleGroup[], collapseSections: boolean): void {
    this.collapsedSections.set(collapseSections ? new Set(sections.map((section) => section.key)) : new Set());
    this.collapsedModules.set(new Set(sections.flatMap((section) => section.groups.map((group) => group.key))));
    this.collapsedSubmodules.set(
      new Set(sections.flatMap((section) => section.groups.flatMap((group) => group.subgroups.map((subgroup) => subgroup.key))))
    );
  }

  private pruneCollapsedState(sections: FeatureProgressTitleGroup[]): void {
    const sectionKeys = new Set(sections.map((section) => section.key));
    const moduleKeys = new Set(sections.flatMap((section) => section.groups.map((group) => group.key)));
    const submoduleKeys = new Set(
      sections.flatMap((section) => section.groups.flatMap((group) => group.subgroups.map((subgroup) => subgroup.key)))
    );
    this.collapsedSections.set(this.retainKeys(this.collapsedSections(), sectionKeys));
    this.collapsedModules.set(this.retainKeys(this.collapsedModules(), moduleKeys));
    this.collapsedSubmodules.set(this.retainKeys(this.collapsedSubmodules(), submoduleKeys));
  }

  private retainKeys(keys: ReadonlySet<string>, validKeys: ReadonlySet<string>): ReadonlySet<string> {
    return new Set(Array.from(keys).filter((key) => validKeys.has(key)));
  }
}
