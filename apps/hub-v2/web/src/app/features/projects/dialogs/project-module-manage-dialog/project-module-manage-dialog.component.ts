import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { DialogShellComponent } from '@shared/ui';
import {
  type CreateProjectMetaItemInput,
  type ProjectMetaItem,
  type ProjectSummary,
  type UpdateProjectMetaItemInput
} from '../../models/project.model';
import { ProjectSubmoduleStructureComponent } from '../../components/project-submodule-structure/project-submodule-structure.component';
import { ProjectModuleCreateDialogComponent } from './project-module-create-dialog.component';

@Component({
  selector: 'app-project-module-manage-dialog',
  standalone: true,
  imports: [
    DialogShellComponent,
    ProjectSubmoduleStructureComponent,
    ProjectModuleCreateDialogComponent
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

  openCreate(): void {
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
  }

  submitCreate(input: CreateProjectMetaItemInput): void {
    this.createModule.emit(input);
    this.closeCreate();
  }
}
