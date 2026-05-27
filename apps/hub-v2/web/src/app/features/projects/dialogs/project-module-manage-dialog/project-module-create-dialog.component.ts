import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCascaderModule } from 'ng-zorro-antd/cascader';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import {
  type CreateProjectMetaItemInput,
  type ProjectMetaItem,
  type ProjectModuleNodeType,
  type ProjectModulePriority
} from '../../models/project.model';

type ParentCascaderOption = {
  value: string;
  label: string;
  kind: ProjectModuleNodeType;
  children?: ParentCascaderOption[];
  isLeaf?: boolean;
};

@Component({
  selector: 'app-project-module-create-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzCascaderModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    DialogShellComponent
  ],
  templateUrl: './project-module-create-dialog.component.html',
  styleUrls: ['./project-module-create-dialog.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectModuleCreateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly modules = input<ProjectMetaItem[]>([]);

  readonly cancel = output<void>();
  readonly create = output<CreateProjectMetaItemInput>();

  readonly createNodeType = signal<ProjectModuleNodeType>('module');
  readonly createParentPath = signal<string[] | null>(null);
  readonly createName = signal('');
  readonly createProjectNo = signal('');
  readonly createDescription = signal('');
  readonly createPriority = signal<ProjectModulePriority>('medium');
  readonly createSort = signal(0);
  readonly createEnabled = signal(true);
  readonly parentTriggerWidth = signal(0);

  readonly priorityOptions: Array<{ label: string; value: ProjectModulePriority }> = [
    { label: '紧急', value: 'critical' },
    { label: '高', value: 'high' },
    { label: '中', value: 'medium' },
    { label: '低', value: 'low' }
  ];

  readonly parentMenuStyle = computed(() =>
    this.parentTriggerWidth() > 0
      ? { '--project-module-parent-cascader-col-width': `${this.parentTriggerWidth()}px` }
      : null
  );

  readonly parentCascaderOptions = computed(() =>
    this.buildParentCascaderOptions(this.modules(), this.createNodeType())
  );

  @ViewChild('parentCascaderRef', { read: ElementRef }) parentCascaderRef?: ElementRef<HTMLElement>;

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.resetForm();
      this.scheduleSyncParentMenuWidth();
    });
  }

  canSubmitCreate(): boolean {
    return !!this.createName().trim();
  }

  onCreateNodeTypeChange(value: ProjectModuleNodeType | null): void {
    const nextType = value || 'module';
    this.createNodeType.set(nextType);
    const parent = this.modules().find((item) => item.id === this.selectedParentId());
    if (nextType === 'subsystem' && parent?.nodeType === 'module') {
      this.createParentPath.set(null);
    }
  }

  onParentPathChange(value: unknown): void {
    const path =
      Array.isArray(value) && value.length > 0 ? value.map((item) => `${item}`.trim()).filter(Boolean) : null;
    this.createParentPath.set(path);
  }

  onParentCascaderVisibleChange(visible: boolean): void {
    if (visible) {
      this.scheduleSyncParentMenuWidth();
    }
  }

  parentOptionIcon(option: ParentCascaderOption | null | undefined): string {
    return option?.kind === 'subsystem' ? 'cluster' : 'appstore';
  }

  submitCreate(): void {
    if (!this.canSubmitCreate()) {
      return;
    }
    const name = this.createName().trim();
    this.create.emit({
      name,
      nodeType: this.createNodeType(),
      parentId: this.selectedParentId(),
      projectNo: this.createProjectNo().trim() || undefined,
      priority: this.createPriority(),
      sort: Number.isFinite(this.createSort()) ? Math.max(0, Math.trunc(this.createSort())) : 0,
      enabled: this.createEnabled(),
      description: this.createDescription().trim() || undefined
    });
    this.cancel.emit();
  }

  private resetForm(): void {
    this.createNodeType.set('module');
    this.createParentPath.set(null);
    this.createName.set('');
    this.createProjectNo.set('');
    this.createDescription.set('');
    this.createPriority.set('medium');
    this.createSort.set(0);
    this.createEnabled.set(true);
  }

  private selectedParentId(): string | null {
    const path = this.createParentPath();
    return path?.[path.length - 1] ?? null;
  }

  private buildParentCascaderOptions(
    modules: ProjectMetaItem[],
    createNodeType: ProjectModuleNodeType
  ): ParentCascaderOption[] {
    const sorted = [...modules].sort((a, b) => this.compareNodes(a, b));
    const idSet = new Set(sorted.map((item) => item.id));
    const childrenByParent = new Map<string | null, ProjectMetaItem[]>();

    for (const item of sorted) {
      const parentId = item.parentId && idSet.has(item.parentId) ? item.parentId : null;
      const list = childrenByParent.get(parentId) ?? [];
      list.push(item);
      childrenByParent.set(parentId, list);
    }

    const allowNode = (item: ProjectMetaItem): boolean =>
      createNodeType === 'module' || item.nodeType === 'subsystem';

    const toOption = (item: ProjectMetaItem): ParentCascaderOption | null => {
      if (!allowNode(item)) {
        return null;
      }
      const children = (childrenByParent.get(item.id) ?? [])
        .map(toOption)
        .filter((option): option is ParentCascaderOption => !!option);
      return {
        value: item.id,
        label: `${item.name}（${this.typeLabel(item.nodeType)}）`,
        kind: item.nodeType,
        children: children.length > 0 ? children : undefined,
        isLeaf: children.length === 0
      };
    };

    return (childrenByParent.get(null) ?? [])
      .map(toOption)
      .filter((option): option is ParentCascaderOption => !!option);
  }

  private typeLabel(type: ProjectModuleNodeType): string {
    return type === 'subsystem' ? '子项目' : '模块';
  }

  private compareNodes(a: ProjectMetaItem, b: ProjectMetaItem): number {
    if (a.nodeType !== b.nodeType) {
      return a.nodeType === 'subsystem' ? -1 : 1;
    }
    if (a.sort !== b.sort) {
      return a.sort - b.sort;
    }
    return a.createdAt.localeCompare(b.createdAt);
  }

  private scheduleSyncParentMenuWidth(): void {
    this.syncParentMenuWidthWithRetry(0);
  }

  private syncParentMenuWidthWithRetry(attempt: number): void {
    requestAnimationFrame(() => {
      const width = this.measureParentTriggerWidth();
      if (width > 0) {
        if (width !== this.parentTriggerWidth()) {
          this.parentTriggerWidth.set(width);
        }
        return;
      }
      if (attempt < 5) {
        this.syncParentMenuWidthWithRetry(attempt + 1);
      }
    });
  }

  private measureParentTriggerWidth(): number {
    const host = this.parentCascaderRef?.nativeElement;
    if (!host) {
      return 0;
    }
    const selector = host.querySelector('.ant-select-selector') as HTMLElement | null;
    const measured = Math.round((selector ?? host).getBoundingClientRect().width) - 1;
    return Math.max(0, measured);
  }
}
