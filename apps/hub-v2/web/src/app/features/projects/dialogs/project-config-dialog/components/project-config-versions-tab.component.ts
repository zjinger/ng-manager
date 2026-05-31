import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import type {
  CreateProjectVersionItemInput,
  ProjectVersionItem,
  UpdateProjectVersionItemInput,
} from '../../../models/project.model';

interface ProjectVersionEditDraft {
  version: string;
  description: string;
  sort: number;
  enabled: boolean;
}

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
    NzTooltipModule,
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
  readonly addingVersion = signal(false);
  readonly editingVersionId = signal<string | null>(null);
  readonly versionEditDrafts = signal<Record<string, ProjectVersionEditDraft>>({});

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
    this.addingVersion.set(false);
  }

  openVersionCreator(): void {
    this.addingVersion.set(true);
  }

  closeVersionCreator(): void {
    this.versionDraft.set('');
    this.addingVersion.set(false);
  }

  startVersionEdit(item: ProjectVersionItem): void {
    this.editingVersionId.set(item.id);
    this.versionEditDrafts.update((current) => ({
      ...current,
      [item.id]: {
        version: item.version,
        description: item.description ?? '',
        sort: item.sort,
        enabled: item.enabled,
      },
    }));
  }

  cancelVersionEdit(): void {
    this.editingVersionId.set(null);
  }

  versionEditDraft(id: string): ProjectVersionEditDraft {
    return this.versionEditDrafts()[id] ?? { version: '', description: '', sort: 0, enabled: true };
  }

  setVersionEditVersion(id: string, version: string): void {
    this.versionEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.versionEditDraft(id), version },
    }));
  }

  setVersionEditDescription(id: string, description: string): void {
    this.versionEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.versionEditDraft(id), description },
    }));
  }

  setVersionEditSort(id: string, sort: unknown): void {
    this.versionEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.versionEditDraft(id), sort: this.asNumber(sort) },
    }));
  }

  setVersionEditEnabled(id: string, enabled: boolean): void {
    this.versionEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.versionEditDraft(id), enabled },
    }));
  }

  saveVersionEdit(item: ProjectVersionItem): void {
    const draft = this.versionEditDraft(item.id);
    this.saveVersion(item, draft.version, draft.description, draft.sort, draft.enabled);
    this.editingVersionId.set(null);
  }

  descriptionSummary(description: string | null): string {
    const value = (description ?? '').trim();
    return value || '无描述';
  }

  saveVersion(item: ProjectVersionItem, version: string, description: string, sort: number, enabled: boolean): void {
    const patch: UpdateProjectVersionItemInput = {};
    if (version.trim() !== item.version) patch.version = version.trim();
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (enabled !== item.enabled) patch.enabled = enabled;
    if (Object.keys(patch).length > 0) {
      this.updateVersion.emit({ id: item.id, patch });
    }
  }
}
