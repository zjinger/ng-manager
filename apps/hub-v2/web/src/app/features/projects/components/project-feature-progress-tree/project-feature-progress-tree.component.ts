import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTagModule } from 'ng-zorro-antd/tag';

import type { ProjectFeaturePoint, ProjectFeaturePointStatus } from '../../models/project.model';

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
          <span>操作</span>
        </div>

        @for (group of groups(); track group.key) {
          <section class="feature-tree__group">
            <div class="feature-tree__row feature-tree__row--module" (click)="toggleModule(group.key)">
              <span class="feature-tree__main">
                <span class="feature-tree__toggle" [class.feature-tree__toggle--collapsed]="isModuleCollapsed(group.key)">
                  <span nz-icon nzType="down"></span>
                </span>
                <span class="feature-tree__node-icon">
                  <span nz-icon nzType="partition"></span>
                </span>
                  <span class="feature-tree__text">
                    <span class="feature-tree__title">
                      <strong>{{ group.name }}</strong>
                      <span class="feature-tree__badge">模块</span>
                    </span>
                    <small>{{ group.subgroups.length }} 个子模块 · {{ group.featureCount }} 个功能点 · 已完成 {{ group.completedCount }} 个</small>
                  </span>
              </span>
              <span class="feature-tree__progress">
                <span class="feature-tree__bar"><span [style.width.%]="group.progress"></span></span>
                <strong>{{ group.progress }}%</strong>
                @if (group.manualProgress !== null) {
                  <nz-tag nzColor="processing" [title]="'自动计算：' + group.computedProgress + '%'">手动</nz-tag>
                }
              </span>
              <span class="feature-tree__status">{{ progressText(group.progress) }}</span>
              <span class="feature-tree__actions">
                @if (canManage() && !group.virtual) {
                  <button nz-button nzType="link" type="button" (click)="editGroup.emit({ level: 'module', group }); $event.stopPropagation()">编辑</button>
                  <button
                    nz-button
                    nzType="link"
                    nzDanger
                    type="button"
                    nz-popconfirm
                    nzPopconfirmTitle="确认删除该模块？"
                    (click)="$event.stopPropagation()"
                    (nzOnConfirm)="deleteGroup.emit({ level: 'module', id: group.id, name: group.name, featureCount: group.featureCount, childCount: group.subgroups.length })"
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
                      <span nz-icon nzType="down"></span>
                    </span>
                    <span class="feature-tree__node-icon">
                      <span nz-icon nzType="branches"></span>
                    </span>
                    <span class="feature-tree__text">
                      <span class="feature-tree__title">
                        <strong>{{ subgroup.name }}</strong>
                        <span class="feature-tree__badge feature-tree__badge--sub">子模块</span>
                      </span>
                      <small>{{ subgroup.features.length }} 个功能点 · 已完成 {{ subgroup.completedCount }} 个</small>
                    </span>
                  </span>
                  <span class="feature-tree__progress">
                    <span class="feature-tree__bar"><span [style.width.%]="subgroup.progress"></span></span>
                    <strong>{{ subgroup.progress }}%</strong>
                    @if (subgroup.manualProgress !== null) {
                      <nz-tag nzColor="processing" [title]="'自动计算：' + subgroup.computedProgress + '%'">手动</nz-tag>
                    }
                  </span>
                  <span class="feature-tree__status">{{ progressText(subgroup.progress) }}</span>
                  <span class="feature-tree__actions">
                    @if (canManage() && !subgroup.virtual) {
                      <button nz-button nzType="link" type="button" (click)="editGroup.emit({ level: 'submodule', group: subgroup, parent: group }); $event.stopPropagation()">编辑</button>
                      <button
                        nz-button
                        nzType="link"
                        nzDanger
                        type="button"
                        nz-popconfirm
                        nzPopconfirmTitle="确认删除该子模块？"
                        (click)="$event.stopPropagation()"
                        (nzOnConfirm)="deleteGroup.emit({ level: 'submodule', id: subgroup.id, name: subgroup.name, featureCount: subgroup.featureCount, childCount: 0 })"
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
                          <small>{{ ownerText(feature) ? ownerText(feature) + ' · ' : '' }}{{ feature.remark || '' }}</small>
                        </span>
                      </span>
                      <span class="feature-tree__progress">
                        <span class="feature-tree__bar"><span [style.width.%]="feature.progress"></span></span>
                        <strong>{{ feature.progress }}%</strong>
                      </span>
                      <span class="feature-tree__status">
                        <nz-tag [nzColor]="statusColor(feature.status)">{{ statusLabel(feature.status) }}</nz-tag>
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

      .feature-tree__group + .feature-tree__group {
        border-top: 1px solid var(--border-color-soft);
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
  readonly groups = input<FeatureProgressModuleGroup[]>([]);
  readonly canManage = input(false);

  readonly edit = output<ProjectFeaturePoint>();
  readonly delete = output<string>();
  readonly editGroup = output<FeatureProgressGroupEditTarget>();
  readonly deleteGroup = output<FeatureProgressGroupDeleteTarget>();

  private readonly collapsedModules = signal<ReadonlySet<string>>(new Set());
  private readonly collapsedSubmodules = signal<ReadonlySet<string>>(new Set());

  readonly featureCount = computed(() => this.groups().reduce((sum, group) => sum + group.featureCount, 0));

  isModuleCollapsed(key: string): boolean {
    return this.collapsedModules().has(key);
  }

  isSubmoduleCollapsed(key: string): boolean {
    return this.collapsedSubmodules().has(key);
  }

  toggleModule(key: string): void {
    const next = new Set(this.collapsedModules());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.collapsedModules.set(next);
  }

  toggleSubmodule(key: string): void {
    const next = new Set(this.collapsedSubmodules());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.collapsedSubmodules.set(next);
  }

  statusLabel(status: ProjectFeaturePointStatus): string {
    if (status === 'done') return '已完成';
    if (status === 'in_progress') return '进行中';
    if (status === 'paused') return '暂停';
    return '未开始';
  }

  statusColor(status: ProjectFeaturePointStatus): string {
    if (status === 'done') return 'success';
    if (status === 'in_progress') return 'processing';
    if (status === 'paused') return 'warning';
    return 'default';
  }

  progressText(progress: number): string {
    if (progress >= 100) return '已完成';
    if (progress <= 0) return '未开始';
    return '进行中';
  }

  ownerText(feature: ProjectFeaturePoint): string {
    return feature.ownerNames?.length ? feature.ownerNames.join('、') : feature.ownerName || '';
  }
}
