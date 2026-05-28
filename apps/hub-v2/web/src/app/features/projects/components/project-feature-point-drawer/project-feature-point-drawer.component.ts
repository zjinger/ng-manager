import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzInputNumberModule } from 'ng-zorro-antd/input-number';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type {
  ProjectFeaturePoint,
  ProjectFeatureProgressModuleNode,
  ProjectFeaturePointStatus,
  ProjectMemberEntity,
} from '../../models/project.model';

export interface FeaturePointDrawerSaveInput {
  name: string;
  names: string[];
  moduleId: string | null;
  moduleGroupId: string | null;
  submoduleGroupId: string | null;
  moduleName: string | null;
  submoduleName: string | null;
  ownerUserId: string | null;
  ownerUserIds: string[];
  status: ProjectFeaturePointStatus;
  progress: number;
  sort: number;
  remark: string | null;
}

type ModuleCascaderOption = {
  value: string;
  label: string;
  title: string;
  kind: 'module' | 'submodule';
  children?: ModuleCascaderOption[];
  isLeaf?: boolean;
};

@Component({
  selector: 'app-project-feature-point-drawer',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzCascaderModule,
    NzDrawerModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzInputNumberModule,
    NzSelectModule,
  ],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      nzPlacement="right"
      [nzClosable]="true"
      [nzWidth]="520"
      [nzTitle]="feature() ? '编辑功能点' : '新增功能点'"
      (nzOnClose)="cancel.emit()"
    >
      <ng-template nzDrawerContent>
        <form nz-form nzLayout="vertical" class="feature-point-form" (ngSubmit)="submit()">
          <div nz-row [nzGutter]="16">
            <div nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label nzFor="modulePath">选择已有模块 / 子模块</nz-form-label>
                <nz-form-control>
                  <nz-cascader
                    nzAllowClear
                    nzPlaceHolder="选择已有模块或子模块"
                    [nzChangeOnSelect]="true"
                    [nzOptionRender]="moduleOptionTpl"
                    [nzOptions]="moduleCascaderOptions()"
                    [ngModel]="draftModulePath()"
                    (ngModelChange)="onModulePathChange($event)"
                    name="modulePath"
                  ></nz-cascader>
                  <ng-template #moduleOptionTpl let-option>
                    <span class="feature-point-form__module-option" [attr.data-kind]="option.kind">
                      <span nz-icon [nzType]="moduleOptionIcon(option)"></span>
                      <span>{{ option.title || option.label }}</span>
                    </span>
                  </ng-template>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzFor="moduleName">模块</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    [ngModel]="draftModuleName()"
                    (ngModelChange)="draftModuleName.set($event)"
                    name="moduleName"
                    placeholder="输入新模块或使用上方选择"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col [nzSpan]="12">
              <nz-form-item>
                <nz-form-label nzFor="submoduleName">子模块</nz-form-label>
                <nz-form-control>
                  <input
                    nz-input
                    [ngModel]="draftSubmoduleName()"
                    (ngModelChange)="draftSubmoduleName.set($event)"
                    name="submoduleName"
                    placeholder="输入新子模块，可选"
                  />
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label nzFor="name" nzRequired>功能点名称</nz-form-label>
                <nz-form-control>
                  <textarea
                    nz-input
                    [rows]="feature() ? 2 : 5"
                    [ngModel]="draftName()"
                    (ngModelChange)="draftName.set($event)"
                    name="name"
                    [placeholder]="feature() ? '请输入功能点名称' : '请输入功能点名称，多个功能点请换行填写'"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label nzFor="ownerUserIds">负责人</nz-form-label>
                <nz-form-control>
                  <nz-select
                    nzMode="multiple"
                    [nzAllowClear]="true"
                    [nzMaxTagCount]="3"
                    [ngModel]="draftOwnerUserIds()"
                    (ngModelChange)="draftOwnerUserIds.set($event)"
                    name="ownerUserIds"
                    nzPlaceHolder="请选择负责人"
                  >
                    @for (member of memberOptions(); track member.userId) {
                      <nz-option [nzValue]="member.userId" [nzLabel]="member.displayName"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <!-- 功能点仅作为功能结构展示节点，进度和状态由模块/子模块维护。 -->
            <div nz-col [nzSpan]="8">
              <nz-form-item>
                <nz-form-label nzFor="sort">排序</nz-form-label>
                <nz-form-control>
                  <nz-input-number
                    [ngModel]="draftSort()"
                    (ngModelChange)="draftSort.set(normalizeSort($event))"
                    name="sort"
                    [nzMin]="0"
                  ></nz-input-number>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div nz-col [nzSpan]="24">
              <nz-form-item>
                <nz-form-label nzFor="remark">备注</nz-form-label>
                <nz-form-control>
                  <textarea
                    nz-input
                    rows="4"
                    [ngModel]="draftRemark()"
                    (ngModelChange)="draftRemark.set($event)"
                    name="remark"
                    placeholder="记录当前进展、阻塞点或补充说明"
                  ></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <footer class="feature-point-form__actions">
            <button nz-button type="button" (click)="cancel.emit()" [disabled]="saving()">取消</button>
            <button nz-button nzType="primary" htmlType="submit" [disabled]="saving() || featureNames().length === 0" [nzLoading]="saving()">保存</button>
          </footer>
        </form>
      </ng-template>
    </nz-drawer>
  `,
  styles: [
    `
      .feature-point-form {
        display: block;
      }

      .feature-point-form nz-select,
      .feature-point-form nz-cascader,
      .feature-point-form nz-input-number {
        width: 100%;
      }

      .feature-point-form__module-option {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }

      .feature-point-form__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding-top: 6px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFeaturePointDrawerComponent {
  readonly open = input(false);
  readonly saving = input(false);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly featurePoints = input<ProjectFeaturePoint[]>([]);
  readonly moduleGroups = input<ProjectFeatureProgressModuleNode[]>([]);
  readonly feature = input<ProjectFeaturePoint | null>(null);
  readonly nextSort = input(10);
  readonly statusOptions = input<Array<{ value: ProjectFeaturePointStatus; label: string }>>([]);

  readonly save = output<FeaturePointDrawerSaveInput>();
  readonly cancel = output<void>();

  readonly draftName = signal('');
  readonly draftModulePath = signal<string[] | null>(null);
  readonly draftModuleName = signal('');
  readonly draftSubmoduleName = signal('');
  readonly draftOwnerUserIds = signal<string[]>([]);
  readonly draftStatus = signal<ProjectFeaturePointStatus>('todo');
  readonly draftProgress = signal(0);
  readonly draftSort = signal(10);
  readonly draftRemark = signal('');

  readonly memberOptions = computed(() =>
    this.members()
      .filter((member) => !!member.userId?.trim())
      .sort((left, right) => {
        if (left.isOwner !== right.isOwner) return left.isOwner ? -1 : 1;
        return left.displayName.localeCompare(right.displayName, 'zh-Hans-CN');
      })
  );
  readonly moduleCascaderOptions = computed(() => this.buildFeatureGroupCascaderOptions(this.moduleGroups()));
  readonly featureNames = computed(() => this.splitFeatureNames(this.draftName(), !!this.feature()));

  constructor() {
    effect(() => {
      if (!this.open()) return;

      const feature = this.feature();
      this.draftName.set(feature?.name ?? '');
      this.draftModulePath.set(feature ? this.resolveModulePath(feature) : null);
      this.draftModuleName.set(feature?.moduleName ?? '');
      this.draftSubmoduleName.set(feature?.submoduleName ?? '');
      this.draftOwnerUserIds.set(feature?.ownerUserIds?.length ? feature.ownerUserIds : feature?.ownerUserId ? [feature.ownerUserId] : []);
      this.draftStatus.set(feature?.status ?? 'todo');
      this.draftProgress.set(this.normalizeProgress(feature?.progress ?? 0));
      this.draftSort.set(this.normalizeSort(feature?.sort ?? this.nextSort()));
      this.draftRemark.set(feature?.remark ?? '');
    });
  }

  submit(): void {
    const names = this.featureNames();
    if (names.length === 0) return;
    const moduleSelection = this.resolveModuleSelection();
    this.save.emit({
      name: names[0],
      names,
      moduleId: null,
      moduleGroupId: moduleSelection.moduleGroupId,
      submoduleGroupId: moduleSelection.submoduleGroupId,
      moduleName: moduleSelection.moduleName,
      submoduleName: moduleSelection.submoduleName,
      ownerUserId: this.normalizedOwnerUserIds()[0] ?? null,
      ownerUserIds: this.normalizedOwnerUserIds(),
      status: this.draftStatus(),
      progress: this.normalizeProgress(this.draftProgress()),
      sort: this.normalizeSort(this.draftSort()),
      remark: this.nullableText(this.draftRemark()),
    });
  }

  normalizeProgress(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : 0;
  }

  normalizeSort(value: unknown): number {
    const n = Number(value ?? 0);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  }

  onProgressChange(value: unknown): void {
    const progress = this.normalizeProgress(value);
    this.draftProgress.set(progress);
    if (progress <= 0) {
      this.draftStatus.set('todo');
      return;
    }
    if (progress >= 100) {
      this.draftStatus.set('done');
      return;
    }
    if (progress >= 90) {
      this.draftStatus.set('testing');
      return;
    }
    if (progress >= 50) {
      this.draftStatus.set('developing');
      return;
    }
    if (progress >= 10) {
      this.draftStatus.set('designing');
    }
  }

  onStatusChange(status: ProjectFeaturePointStatus | null): void {
    const nextStatus = status ?? 'todo';
    this.draftStatus.set(nextStatus);
    if (nextStatus === 'todo') {
      this.draftProgress.set(0);
      return;
    }
    if (nextStatus === 'designing') {
      this.draftProgress.set(10);
      return;
    }
    if (nextStatus === 'developing') {
      this.draftProgress.set(50);
      return;
    }
    if (nextStatus === 'testing') {
      this.draftProgress.set(90);
      return;
    }
    if (nextStatus === 'done') {
      this.draftProgress.set(100);
    }
  }

  private nullableText(value: string): string | null {
    return value.trim() || null;
  }

  private normalizedOwnerUserIds(): string[] {
    return Array.from(new Set(this.draftOwnerUserIds().map((id) => id.trim()).filter(Boolean)));
  }

  onModulePathChange(value: unknown): void {
    const path =
      Array.isArray(value) && value.length > 0 ? value.map((item) => `${item}`.trim()).filter(Boolean) : null;
    this.draftModulePath.set(path);
    if (!path?.length) {
      return;
    }
    const module = this.moduleGroups().find((item) => item.id === path[0]);
    const submodule = module?.children.find((item) => item.id === path[1]);
    this.draftModuleName.set(module?.name ?? '');
    this.draftSubmoduleName.set(submodule?.name ?? '');
  }

  moduleOptionIcon(option: ModuleCascaderOption | null | undefined): string {
    return option?.kind === 'module' ? 'cluster' : 'appstore';
  }

  private splitFeatureNames(value: string, single: boolean): string[] {
    const lines = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    const names = single ? lines.slice(0, 1) : lines;
    return Array.from(new Set(names));
  }

  private resolveModuleSelection(): {
    moduleGroupId: string | null;
    submoduleGroupId: string | null;
    moduleName: string | null;
    submoduleName: string | null;
  } {
    const path = this.draftModulePath();
    if (path?.length) {
      return {
        moduleGroupId: path[0] ?? null,
        submoduleGroupId: path[1] ?? null,
        moduleName: this.nullableText(this.draftModuleName()),
        submoduleName: path[1] ? this.nullableText(this.draftSubmoduleName()) : null,
      };
    }
    const moduleName = this.nullableText(this.draftModuleName());
    return {
      moduleGroupId: null,
      submoduleGroupId: null,
      moduleName,
      submoduleName: moduleName ? this.nullableText(this.draftSubmoduleName()) : null,
    };
  }

  private resolveModulePath(feature: ProjectFeaturePoint): string[] | null {
    if (!feature.moduleGroupId) {
      return null;
    }
    return feature.submoduleGroupId ? [feature.moduleGroupId, feature.submoduleGroupId] : [feature.moduleGroupId];
  }

  private buildFeatureGroupCascaderOptions(groups: ProjectFeatureProgressModuleNode[]): ModuleCascaderOption[] {
    return [...groups]
      .sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, 'zh-Hans-CN'))
      .map((group) => {
        const children = [...group.children]
          .sort((left, right) => left.sort - right.sort || left.name.localeCompare(right.name, 'zh-Hans-CN'))
          .map((submodule) => ({
            value: submodule.id,
            label: submodule.name,
            title: `${submodule.name}（子模块）`,
            kind: 'submodule' as const,
            isLeaf: true,
          }));
        return {
          value: group.id,
          label: group.name,
          title: `${group.name}（模块）`,
          kind: 'module',
          children: children.length > 0 ? children : undefined,
          isLeaf: children.length === 0,
        };
      });
  }
}
