import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import {
  type CreateProjectMetaItemInput,
  type ProjectMetaItem,
  type ProjectModuleNodeType,
  type ProjectModulePriority,
  type ProjectSummary,
  type UpdateProjectMetaItemInput
} from '../../models/project.model';
import { ProjectSubmoduleStructureComponent } from '../../components/project-submodule-structure/project-submodule-structure.component';

@Component({
  selector: 'app-project-module-manage-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    DialogShellComponent,
    ProjectSubmoduleStructureComponent
  ],
  templateUrl: './project-module-manage-dialog.component.html',
  styleUrls: ['./project-module-manage-dialog.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectModuleManageDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly canManageModules = input(false);

  readonly cancel = output<void>();
  readonly createModule = output<CreateProjectMetaItemInput>();
  readonly updateModule = output<{ id: string; patch: UpdateProjectMetaItemInput }>();
  readonly removeModule = output<string>();
  readonly openDetail = output<{ moduleId: string; tab: 'basic' | 'members' | 'rdItems' }>();

  readonly createOpen = signal(false);
  readonly createNodeType = signal<ProjectModuleNodeType>('module');
  readonly createParentId = signal<string | null>(null);
  readonly createName = signal('');
  readonly createProjectNo = signal('');
  readonly createDescription = signal('');
  readonly createPriority = signal<ProjectModulePriority>('medium');
  readonly createSort = signal(0);
  readonly createEnabled = signal(true);

  readonly priorityOptions: Array<{ label: string; value: ProjectModulePriority }> = [
    { label: '紧急', value: 'critical' },
    { label: '高', value: 'high' },
    { label: '中', value: 'medium' },
    { label: '低', value: 'low' }
  ];

  canSubmitCreate(): boolean {
    return !!this.createName().trim();
  }

  availableParentItems(): Array<ProjectMetaItem & { level: number }> {
    const allowModuleParent = this.createNodeType() === 'module';
    return this.flattenModules().filter((item) => allowModuleParent || item.nodeType === 'subsystem');
  }

  parentOptionLabel(item: ProjectMetaItem & { level: number }): string {
    const prefix = item.level > 0 ? `${'　'.repeat(item.level)}└ ` : '';
    const type = item.nodeType === 'subsystem' ? '子项目' : '模块';
    return `${prefix}${item.name}（${type}）`;
  }

  onCreateNodeTypeChange(value: ProjectModuleNodeType | null): void {
    const nextType = value || 'module';
    this.createNodeType.set(nextType);
    const parent = this.modules().find((item) => item.id === this.createParentId());
    if (nextType === 'subsystem' && parent?.nodeType === 'module') {
      this.createParentId.set(null);
    }
  }

  openCreate(): void {
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
    this.createNodeType.set('module');
    this.createParentId.set(null);
    this.createName.set('');
    this.createProjectNo.set('');
    this.createDescription.set('');
    this.createPriority.set('medium');
    this.createSort.set(0);
    this.createEnabled.set(true);
  }

  submitCreate(): void {
    if (!this.canSubmitCreate()) {
      return;
    }
    const name = this.createName().trim();
    const nodeType = this.createNodeType();
    this.createModule.emit({
      name,
      nodeType,
      parentId: this.createParentId(),
      projectNo: this.createProjectNo().trim() || undefined,
      priority: this.createPriority(),
      sort: Number.isFinite(this.createSort()) ? Math.max(0, Math.trunc(this.createSort())) : 0,
      enabled: this.createEnabled(),
      description: this.createDescription().trim() || undefined
    });
    this.closeCreate();
  }

  private flattenModules(): Array<ProjectMetaItem & { level: number }> {
    const sorted = [...this.modules()].sort((a, b) => this.compareNodes(a, b));
    const childrenByParent = new Map<string | null, ProjectMetaItem[]>();
    const idSet = new Set(sorted.map((item) => item.id));
    for (const item of sorted) {
      const parentId = item.parentId && idSet.has(item.parentId) ? item.parentId : null;
      const list = childrenByParent.get(parentId) ?? [];
      list.push(item);
      childrenByParent.set(parentId, list);
    }
    const result: Array<ProjectMetaItem & { level: number }> = [];
    const walk = (items: ProjectMetaItem[], level: number) => {
      for (const item of items) {
        result.push({ ...item, level });
        walk(childrenByParent.get(item.id) ?? [], level + 1);
      }
    };
    walk(childrenByParent.get(null) ?? [], 0);
    return result;
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
}
