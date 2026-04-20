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
  readonly openDetail = output<{ moduleId: string; tab: 'basic' | 'members' }>();

  readonly createOpen = signal(false);
  readonly createNodeType = signal<'subsystem' | 'module'>('module');
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

  subsystemItems(): ProjectMetaItem[] {
    return this.modules().filter((item) => item.nodeType === 'subsystem');
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
      parentId: nodeType === 'module' ? this.createParentId() : null,
      projectNo: nodeType === 'subsystem' ? this.createProjectNo().trim() || undefined : undefined,
      priority: this.createPriority(),
      sort: Number.isFinite(this.createSort()) ? Math.max(0, Math.trunc(this.createSort())) : 0,
      enabled: this.createEnabled(),
      description: this.createDescription().trim() || undefined
    });
    this.closeCreate();
  }
}
