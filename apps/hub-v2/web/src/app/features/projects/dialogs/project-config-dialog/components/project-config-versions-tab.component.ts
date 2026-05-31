import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import type {
  CreateProjectVersionItemInput,
  ProjectVersionItem,
  UpdateProjectVersionItemInput,
} from '../../../models/project.model';

@Component({
  selector: 'app-project-config-versions-tab',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSwitchModule,
  ],
  templateUrl: './project-config-versions-tab.component.html',
  styleUrls: ['./project-config-list-tab.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectConfigVersionsTabComponent {
  readonly busy = input(false);
  readonly versions = input<ProjectVersionItem[]>([]);
  readonly pendingVersionIds = input<string[]>([]);
  readonly canManageConfig = input(false);

  readonly createVersion = output<CreateProjectVersionItemInput>();
  readonly updateVersion = output<{ id: string; patch: UpdateProjectVersionItemInput }>();
  readonly removeVersion = output<string>();

  readonly versionDraft = signal('');

  isVersionPending(id: string): boolean {
    return this.pendingVersionIds().includes(id);
  }

  asNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  submitVersionCreate(): void {
    const version = this.versionDraft().trim();
    if (!version) {
      return;
    }
    this.createVersion.emit({ version });
    this.versionDraft.set('');
  }

  saveVersion(item: ProjectVersionItem, version: string, description: string, sort: number): void {
    const patch: UpdateProjectVersionItemInput = {};
    if (version.trim() !== item.version) patch.version = version.trim();
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateVersion.emit({ id: item.id, patch });
    }
  }
}
