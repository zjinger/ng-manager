import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import type {
  CreateProjectMetaItemInput,
  ProjectMetaItem,
  UpdateProjectMetaItemInput,
} from '../../../models/project.model';

interface ProjectMetaEditDraft {
  name: string;
  description: string;
  sort: number;
  enabled: boolean;
}

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
    NzTooltipModule,
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
  readonly addingEnvironment = signal(false);
  readonly editingEnvironmentId = signal<string | null>(null);
  readonly environmentEditDrafts = signal<Record<string, ProjectMetaEditDraft>>({});

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
    this.addingEnvironment.set(false);
  }

  openEnvironmentCreator(): void {
    this.addingEnvironment.set(true);
  }

  closeEnvironmentCreator(): void {
    this.environmentDraft.set('');
    this.addingEnvironment.set(false);
  }

  startEnvironmentEdit(item: ProjectMetaItem): void {
    this.editingEnvironmentId.set(item.id);
    this.environmentEditDrafts.update((current) => ({
      ...current,
      [item.id]: {
        name: item.name,
        description: item.description ?? '',
        sort: item.sort,
        enabled: item.enabled,
      },
    }));
  }

  cancelEnvironmentEdit(): void {
    this.editingEnvironmentId.set(null);
  }

  environmentEditDraft(id: string): ProjectMetaEditDraft {
    return this.environmentEditDrafts()[id] ?? { name: '', description: '', sort: 0, enabled: true };
  }

  setEnvironmentEditName(id: string, name: string): void {
    this.environmentEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.environmentEditDraft(id), name },
    }));
  }

  setEnvironmentEditDescription(id: string, description: string): void {
    this.environmentEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.environmentEditDraft(id), description },
    }));
  }

  setEnvironmentEditSort(id: string, sort: unknown): void {
    this.environmentEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.environmentEditDraft(id), sort: this.asNumber(sort) },
    }));
  }

  setEnvironmentEditEnabled(id: string, enabled: boolean): void {
    this.environmentEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.environmentEditDraft(id), enabled },
    }));
  }

  saveEnvironmentEdit(item: ProjectMetaItem): void {
    const draft = this.environmentEditDraft(item.id);
    this.saveEnvironment(item, draft.name, draft.description, draft.sort, draft.enabled);
    this.editingEnvironmentId.set(null);
  }

  descriptionSummary(description: string | null): string {
    const value = (description ?? '').trim();
    return value || '无描述';
  }

  saveEnvironment(item: ProjectMetaItem, name: string, description: string, sort: number, enabled: boolean): void {
    const patch: UpdateProjectMetaItemInput = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (enabled !== item.enabled) patch.enabled = enabled;
    if (Object.keys(patch).length > 0) {
      this.updateEnvironment.emit({ id: item.id, patch });
    }
  }
}
