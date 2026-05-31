import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import type {
  CreateProjectMetaItemInput,
  ProjectMetaItem,
  UpdateProjectMetaItemInput,
} from '../../../models/project.model';

@Component({
  selector: 'app-project-config-environments-tab',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSwitchModule,
  ],
  templateUrl: './project-config-environments-tab.component.html',
  styleUrls: ['./project-config-list-tab.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectConfigEnvironmentsTabComponent {
  readonly busy = input(false);
  readonly environments = input<ProjectMetaItem[]>([]);
  readonly pendingEnvironmentIds = input<string[]>([]);
  readonly canManageConfig = input(false);

  readonly createEnvironment = output<CreateProjectMetaItemInput>();
  readonly updateEnvironment = output<{ id: string; patch: UpdateProjectMetaItemInput }>();
  readonly removeEnvironment = output<string>();

  readonly environmentDraft = signal('');

  isEnvironmentPending(id: string): boolean {
    return this.pendingEnvironmentIds().includes(id);
  }

  asNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  submitEnvironmentCreate(): void {
    const name = this.environmentDraft().trim();
    if (!name) {
      return;
    }
    this.createEnvironment.emit({ name });
    this.environmentDraft.set('');
  }

  saveEnvironment(item: ProjectMetaItem, name: string, description: string, sort: number): void {
    const patch: UpdateProjectMetaItemInput = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateEnvironment.emit({ id: item.id, patch });
    }
  }
}
