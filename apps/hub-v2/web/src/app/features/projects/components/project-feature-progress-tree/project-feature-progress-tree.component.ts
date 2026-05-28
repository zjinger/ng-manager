import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS } from '../../models/project.model';
import type {
  ProjectFeaturePoint,
  ProjectFeatureProgressSectionPatch,
  ProjectFeatureProgressStatusOption,
} from '../../models/project.model';
import type { FeatureProgressFlatNode } from '../../pages/project-feature-progress-page/models/project-feature-progress-page.model';

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
  imports: [ScrollingModule, NzButtonModule, NzIconModule, NzPopconfirmModule],
  template: `
    <section class="feature-tree-card">
      <div class="feature-tree">
        <div class="feature-tree__head">
          <span>功能结构</span>
          <span>完成进度</span>
          <span>完成情况</span>
          <span>操作</span>
        </div>

        @if (nodes().length > 0) {
          <cdk-virtual-scroll-viewport
            class="feature-tree__viewport"
            itemSize="58"
            minBufferPx="580"
            maxBufferPx="1160"
          >
            <div
              *cdkVirtualFor="let node of nodes(); trackBy: trackByNode"
              class="feature-tree__row"
              [class.feature-tree__row--section]="node.type === 'section'"
              [class.feature-tree__row--module]="node.type === 'module'"
              [class.feature-tree__row--submodule]="node.type === 'submodule'"
              [class.feature-tree__row--feature]="node.type === 'feature'"
              [class.feature-tree__row--force-expanded]="forceExpanded()"
              (click)="toggleExpandableNode(node)"
            >
              <span class="feature-tree__main">
                <span class="feature-tree__branches" aria-hidden="true">
                  @for (guide of node.branchGuides; track $index) {
                    <span
                      class="feature-tree__branch"
                      [class.feature-tree__branch--blank]="guide === 'blank'"
                      [class.feature-tree__branch--line]="guide === 'line'"
                      [class.feature-tree__branch--tee]="guide === 'tee'"
                      [class.feature-tree__branch--elbow]="guide === 'elbow'"
                    ></span>
                  }
                </span>
                @if (node.expandable && !forceExpanded()) {
                  <button
                    class="feature-tree__toggle"
                    type="button"
                    [class.feature-tree__toggle--expanded]="node.expanded"
                    (click)="toggleNode.emit(node.key); $event.stopPropagation()"
                  >
                    <span nz-icon nzType="caret-right"></span>
                  </button>
                } @else {
                  <span class="feature-tree__toggle feature-tree__toggle--spacer"></span>
                }
                <span class="feature-tree__node-icon">
                  <span nz-icon [nzType]="iconType(node)"></span>
                </span>
                <span class="feature-tree__text">
                  <span class="feature-tree__title">
                    <strong>{{ node.name }}</strong>
                    <!-- @if (node.type !== 'section') {
                      <span class="feature-tree__badge" [class.feature-tree__badge--sub]="node.type === 'submodule'">
                        {{ node.typeText }}
                      </span>
                    } -->
                  </span>
                  <small [title]="nodeDescription(node)">{{ nodeDescription(node) }}</small>
                </span>
              </span>

              <span class="feature-tree__progress" [class.feature-tree__progress--hidden]="node.type === 'feature'">
                @if (node.type !== 'feature') {
                  <span class="feature-tree__bar"><span [style.width.%]="node.progress"></span></span>
                  <strong>{{ node.progress }}%</strong>
                }
              </span>

              <span class="feature-tree__status" [class.feature-tree__status--hidden]="node.type === 'feature'">
                {{ node.type === 'feature' ? '' : node.progressText }}
              </span>

              <span class="feature-tree__actions">
                @if (canManage()) {
                  @if (node.type === 'feature' && node.feature) {
                    <button nz-button nzType="link" type="button" (click)="editFeature.emit(node.feature); $event.stopPropagation()">编辑</button>
                    <button
                      nz-button
                      nzType="link"
                      nzDanger
                      type="button"
                      nz-popconfirm
                      nzPopconfirmTitle="确认删除该功能点？"
                      (click)="$event.stopPropagation()"
                      (nzOnConfirm)="editDeleteFeature(node.feature.id)"
                    >
                      删除
                    </button>
                  } @else if (node.type === 'section' && node.section) {
                    <button nz-button nzType="link" type="button" (click)="editTitle.emit(node.section); $event.stopPropagation()">编辑</button>
                  } @else if (node.type === 'module' && node.group) {
                    @if (!node.group.virtual) {
                      <button nz-button nzType="link" type="button" (click)="editModuleGroup(node); $event.stopPropagation()">编辑</button>
                      <button
                        nz-button
                        nzType="link"
                        nzDanger
                        type="button"
                        nz-popconfirm
                        nzPopconfirmTitle="确认删除该模块？"
                        (click)="$event.stopPropagation()"
                        (nzOnConfirm)="deleteGroup.emit({ level: 'module', id: node.group.id, name: node.name, featureCount: node.featureCount ?? 0, childCount: node.childrenCount })"
                      >
                        删除
                      </button>
                    } @else {
                      <span class="feature-tree__muted">-</span>
                    }
                  } @else if (node.type === 'submodule' && node.group && node.parentGroup) {
                    @if (!node.group.virtual) {
                      <button nz-button nzType="link" type="button" (click)="editSubmoduleGroup(node); $event.stopPropagation()">编辑</button>
                      <button
                        nz-button
                        nzType="link"
                        nzDanger
                        type="button"
                        nz-popconfirm
                        nzPopconfirmTitle="确认删除该子模块？"
                        (click)="$event.stopPropagation()"
                        (nzOnConfirm)="deleteGroup.emit({ level: 'submodule', id: node.group.id, name: node.name, featureCount: node.featureCount ?? 0, childCount: 0 })"
                      >
                        删除
                      </button>
                    } @else {
                      <span class="feature-tree__muted">-</span>
                    }
                  } @else {
                    <span class="feature-tree__muted">-</span>
                  }
                } @else {
                  <span class="feature-tree__muted">-</span>
                }
              </span>
            </div>
          </cdk-virtual-scroll-viewport>
        } @else {
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
        min-width: 940px;
      }

      .feature-tree__head {
        height: 44px;
        padding: 0 18px;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 600;
        background: var(--bg-subtle);
        border-bottom: 1px solid var(--border-color-soft);
      }

      .feature-tree__viewport {
        height: max(360px, calc(100vh - 360px));
        overflow-x: hidden;
      }

      .feature-tree__row {
        position: relative;
        height: 58px;
        padding: 0 18px;
        background: var(--bg-container);
        color: inherit;
        border-bottom: 1px solid var(--border-color-soft);
      }

      .feature-tree__row--section {
        color: var(--text-heading);
      }

      .feature-tree__row--module {
        background: color-mix(in srgb, var(--primary-600) 4%, var(--bg-container));
      }

      .feature-tree__row--section,
      .feature-tree__row--module,
      .feature-tree__row--submodule {
        cursor: pointer;
      }

      .feature-tree__row--force-expanded {
        cursor: default;
      }

      .feature-tree__row:hover {
        background: var(--bg-subtle);
      }

      .feature-tree__main,
      .feature-tree__progress,
      .feature-tree__actions,
      .feature-tree__title {
        display: flex;
        align-items: center;
      }

      .feature-tree__main {
        gap: 6px;
        min-width: 0;
        overflow: hidden;
      }

      .feature-tree__branches {
        display: inline-flex;
        align-self: stretch;
        flex: 0 0 auto;
        margin-right: -2px;
      }

      .feature-tree__branch {
        position: relative;
        width: 28px;
        height: 58px;
        flex: 0 0 28px;
      }

      .feature-tree__branch--line::before,
      .feature-tree__branch--tee::before,
      .feature-tree__branch--elbow::before,
      .feature-tree__branch--tee::after,
      .feature-tree__branch--elbow::after {
        content: '';
        position: absolute;
        pointer-events: none;
      }

      .feature-tree__branch--line::before,
      .feature-tree__branch--tee::before {
        left: 50%;
        top: 0;
        bottom: 0;
        border-left: 1px dashed var(--feature-tree-line-color);
      }

      .feature-tree__branch--elbow::before {
        left: 50%;
        top: 0;
        height: 50%;
        border-left: 1px dashed var(--feature-tree-line-color);
      }

      .feature-tree__branch--tee::after,
      .feature-tree__branch--elbow::after {
        left: 50%;
        top: 50%;
        width: 32px;
        border-top: 1px dashed var(--feature-tree-line-color);
      }

      .feature-tree__toggle {
        width: 24px;
        height: 24px;
        flex: 0 0 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 0;
        color: var(--text-muted);
        background: transparent;
        cursor: pointer;
        margin-right: -4px;
        transition: transform 0.16s ease;
      }

      .feature-tree__toggle--expanded {
        transform: rotate(90deg);
      }

      .feature-tree__toggle--spacer {
        cursor: default;
        visibility: hidden;
      }

      .feature-tree__node-icon {
        width: 32px;
        height: 32px;
        flex: 0 0 32px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--border-radius);
        color: var(--primary-600);
        background: color-mix(in srgb, var(--primary-600) 10%, var(--bg-container));
      }

      // .feature-tree__row--feature .feature-tree__node-icon {
      //   // color: var(--color-info);
      //   // background: var(--color-info-light);
      // }

      .feature-tree__text {
        display: grid;
        gap: 2px;
        min-width: 0;
        overflow: hidden;
      }

      .feature-tree__title {
        gap: 8px;
        min-width: 0;
      }

      .feature-tree__title strong,
      .feature-tree__text small {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .feature-tree__title strong {
        color: var(--text-heading);
        font-size: 14px;
      }

      .feature-tree__text small {
        color: var(--text-muted);
        font-size: 12px;
      }

      .feature-tree__badge {
        flex: 0 0 auto;
        padding: 1px 6px;
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
        min-width: 0;
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

      .feature-tree__progress--hidden,
      .feature-tree__status--hidden,
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
  readonly nodes = input<FeatureProgressFlatNode[]>([]);
  readonly canManage = input(false);
  readonly forceExpanded = input(false);
  readonly progressStatusOptions = input<ProjectFeatureProgressStatusOption[]>(DEFAULT_PROJECT_FEATURE_PROGRESS_STATUS_OPTIONS);
  readonly progressPatches = input<Record<string, FeatureProgressGroupDisplayPatch>>({});
  readonly sectionPatches = input<Record<string, ProjectFeatureProgressSectionPatch>>({});

  readonly toggleNode = output<string>();
  readonly editFeature = output<ProjectFeaturePoint>();
  readonly deleteFeature = output<string>();
  readonly editTitle = output<FeatureProgressTitleGroup>();
  readonly editGroup = output<FeatureProgressGroupEditTarget>();
  readonly deleteGroup = output<FeatureProgressGroupDeleteTarget>();

  readonly trackByNode = (_: number, node: FeatureProgressFlatNode): string => node.id;

  toggleExpandableNode(node: FeatureProgressFlatNode): void {
    if (node.expandable && !this.forceExpanded()) {
      this.toggleNode.emit(node.key);
    }
  }

  editDeleteFeature(featureId: string): void {
    this.deleteFeature.emit(featureId);
  }

  editModuleGroup(node: FeatureProgressFlatNode): void {
    if (node.type === 'module' && node.group && 'subgroups' in node.group) {
      this.editGroup.emit({ level: 'module', group: node.group });
    }
  }

  editSubmoduleGroup(node: FeatureProgressFlatNode): void {
    if (node.type === 'submodule' && node.group && node.parentGroup && 'features' in node.group) {
      this.editGroup.emit({ level: 'submodule', group: node.group, parent: node.parentGroup });
    }
  }

  iconType(node: FeatureProgressFlatNode): string {
    if (node.type === 'section') return node.expanded ? 'folder-open' : 'folder';
    if (node.type === 'module') return 'partition';
    if (node.type === 'submodule') return 'branches';
    return 'appstore';
  }

  nodeDescription(node: FeatureProgressFlatNode): string {
    if (node.type === 'section') {
      return `${node.childrenCount} 个一级模块 · ${node.featureCount ?? 0} 个功能点 · 完成模块 ${node.completedCount ?? 0} 个`;
    }
    if (node.type === 'module') {
      return `${node.childrenCount} 个子模块 · ${node.featureCount ?? 0} 个功能点 · 完成子模块 ${node.completedCount ?? 0} 个`;
    }
    if (node.type === 'submodule') {
      return `${node.featureCount ?? 0} 个功能点 · 子模块进度 ${node.progress}%`;
    }
    const feature = node.feature;
    if (!feature) return '';
    const owner = feature.ownerNames?.length ? feature.ownerNames.join('、') : feature.ownerName || '';
    return owner ? `${owner} · ${feature.remark || ''}` : feature.remark || '';
  }
}
