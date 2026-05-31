import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import type {
  CreateRdStageInput,
  CreateRdStageTaskTemplateInput,
  RdStageEntity,
  RdStageTaskTemplateEntity,
  UpdateRdStageInput,
  UpdateRdStageTaskTemplateInput,
} from '../../../../rd/models/rd.model';
import type { ProjectSummary } from '../../../models/project.model';

interface StageEditDraft {
  name: string;
  sort: number;
  enabled: boolean;
}

interface StageTaskTemplateEditDraft {
  title: string;
  description: string;
  sortOrder: number;
  enabled: boolean;
}

@Component({
  selector: 'app-project-config-rd-stages-tab',
  standalone: true,
  imports: [
    FormsModule,
    NzIconModule,
    NzInputModule,
    NzSwitchModule,
    NzTooltipModule,
  ],
  templateUrl: './project-config-rd-stages-tab.component.html',
  styleUrls: ['./project-config-rd-stages-tab.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectConfigRdStagesTabComponent {
  readonly busy = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly stages = input<RdStageEntity[]>([]);
  readonly stageTaskTemplates = input<RdStageTaskTemplateEntity[]>([]);
  readonly pendingStageIds = input<string[]>([]);
  readonly pendingStageTaskTemplateIds = input<string[]>([]);
  readonly canManageConfig = input(false);

  readonly createStage = output<CreateRdStageInput>();
  readonly updateStage = output<{ id: string; patch: UpdateRdStageInput }>();
  readonly createStageTaskTemplate = output<CreateRdStageTaskTemplateInput>();
  readonly updateStageTaskTemplate = output<{ id: string; patch: UpdateRdStageTaskTemplateInput }>();

  readonly stageDraft = signal('');
  readonly stageTaskTemplateDraftByStage = signal<Record<string, string>>({});
  readonly expandedStageIds = signal<Record<string, boolean>>({});
  readonly addingStage = signal(false);
  readonly addingTaskStageId = signal<string | null>(null);
  readonly editingStageId = signal<string | null>(null);
  readonly stageEditDrafts = signal<Record<string, StageEditDraft>>({});
  readonly editingStageTaskTemplateId = signal<string | null>(null);
  readonly stageTaskTemplateEditDrafts = signal<Record<string, StageTaskTemplateEditDraft>>({});

  isStagePending(id: string): boolean {
    return this.pendingStageIds().includes(id);
  }

  isStageTaskTemplatePending(id: string): boolean {
    return this.pendingStageTaskTemplateIds().includes(id);
  }

  asNumber(value: unknown): number {
    const n = Number(value);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }

  submitStageCreate(): void {
    const name = this.stageDraft().trim();
    const projectId = this.project()?.id;
    if (!name || !projectId) {
      return;
    }
    this.createStage.emit({ projectId, name });
    this.stageDraft.set('');
    this.addingStage.set(false);
  }

  sortedStages(): RdStageEntity[] {
    return [...this.stages()].sort((a, b) => a.sort - b.sort || a.createdAt.localeCompare(b.createdAt));
  }

  defaultExpandedStageId(): string | null {
    const stages = this.sortedStages();
    return stages.find((item) => item.enabled)?.id ?? stages[0]?.id ?? null;
  }

  isStageExpanded(item: RdStageEntity): boolean {
    const explicit = this.expandedStageIds()[item.id];
    if (typeof explicit === 'boolean') {
      return explicit;
    }
    if (!item.enabled) {
      return false;
    }
    return item.id === this.defaultExpandedStageId();
  }

  toggleStage(item: RdStageEntity): void {
    const expanded = this.isStageExpanded(item);
    this.expandedStageIds.update((current) => ({
      ...current,
      [item.id]: !expanded,
    }));
  }

  openStageCreator(): void {
    this.addingStage.set(true);
  }

  closeStageCreator(): void {
    this.stageDraft.set('');
    this.addingStage.set(false);
  }

  startStageEdit(item: RdStageEntity): void {
    this.editingStageId.set(item.id);
    this.stageEditDrafts.update((current) => ({
      ...current,
      [item.id]: { name: item.name, sort: item.sort, enabled: item.enabled },
    }));
  }

  cancelStageEdit(): void {
    this.editingStageId.set(null);
  }

  stageEditDraft(id: string): StageEditDraft {
    return this.stageEditDrafts()[id] ?? { name: '', sort: 0, enabled: true };
  }

  setStageEditName(id: string, name: string): void {
    this.stageEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.stageEditDraft(id), name },
    }));
  }

  setStageEditSort(id: string, sort: unknown): void {
    this.stageEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.stageEditDraft(id), sort: this.asNumber(sort) },
    }));
  }

  setStageEditEnabled(id: string, enabled: boolean): void {
    this.stageEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.stageEditDraft(id), enabled },
    }));
  }

  saveStageEdit(item: RdStageEntity): void {
    const draft = this.stageEditDraft(item.id);
    this.saveStage(item, draft.name, draft.sort, draft.enabled);
    this.editingStageId.set(null);
  }

  stageTaskTemplatesByStage(stageId: string): RdStageTaskTemplateEntity[] {
    return this.stageTaskTemplates()
      .filter((item) => item.stageId === stageId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  }

  stageTaskTemplateDraft(stageId: string): string {
    return this.stageTaskTemplateDraftByStage()[stageId] ?? '';
  }

  setStageTaskTemplateDraft(stageId: string, value: string): void {
    this.stageTaskTemplateDraftByStage.update((current) => ({
      ...current,
      [stageId]: value,
    }));
  }

  submitStageTaskTemplateCreate(stageId: string): void {
    const title = this.stageTaskTemplateDraft(stageId).trim();
    if (!title) {
      return;
    }
    this.createStageTaskTemplate.emit({ stageId, title });
    this.setStageTaskTemplateDraft(stageId, '');
    this.addingTaskStageId.set(null);
  }

  openStageTaskTemplateCreator(stageId: string): void {
    this.addingTaskStageId.set(stageId);
    this.expandedStageIds.update((current) => ({
      ...current,
      [stageId]: true,
    }));
  }

  closeStageTaskTemplateCreator(stageId: string): void {
    this.setStageTaskTemplateDraft(stageId, '');
    this.addingTaskStageId.set(null);
  }

  startStageTaskTemplateEdit(item: RdStageTaskTemplateEntity): void {
    this.editingStageTaskTemplateId.set(item.id);
    this.stageTaskTemplateEditDrafts.update((current) => ({
      ...current,
      [item.id]: {
        title: item.title,
        description: item.description ?? '',
        sortOrder: item.sortOrder,
        enabled: item.enabled,
      },
    }));
  }

  cancelStageTaskTemplateEdit(): void {
    this.editingStageTaskTemplateId.set(null);
  }

  stageTaskTemplateEditDraft(id: string): StageTaskTemplateEditDraft {
    return this.stageTaskTemplateEditDrafts()[id] ?? { title: '', description: '', sortOrder: 0, enabled: true };
  }

  setStageTaskTemplateEditTitle(id: string, title: string): void {
    this.stageTaskTemplateEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.stageTaskTemplateEditDraft(id), title },
    }));
  }

  setStageTaskTemplateEditDescription(id: string, description: string): void {
    this.stageTaskTemplateEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.stageTaskTemplateEditDraft(id), description },
    }));
  }

  setStageTaskTemplateEditSort(id: string, sortOrder: unknown): void {
    this.stageTaskTemplateEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.stageTaskTemplateEditDraft(id), sortOrder: this.asNumber(sortOrder) },
    }));
  }

  setStageTaskTemplateEditEnabled(id: string, enabled: boolean): void {
    this.stageTaskTemplateEditDrafts.update((current) => ({
      ...current,
      [id]: { ...this.stageTaskTemplateEditDraft(id), enabled },
    }));
  }

  saveStageTaskTemplateEdit(item: RdStageTaskTemplateEntity): void {
    const draft = this.stageTaskTemplateEditDraft(item.id);
    this.saveStageTaskTemplate(item, draft.title, draft.description, draft.sortOrder, draft.enabled);
    this.editingStageTaskTemplateId.set(null);
  }

  templateDescriptionSummary(description: string | null): string {
    const value = (description ?? '').trim();
    return value || '无描述';
  }

  saveStage(item: RdStageEntity, name: string, sort: number, enabled: boolean): void {
    const patch: UpdateRdStageInput = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if (sort !== item.sort) patch.sort = sort;
    if (enabled !== item.enabled) patch.enabled = enabled;
    if (Object.keys(patch).length > 0) {
      this.updateStage.emit({ id: item.id, patch });
    }
  }

  saveStageTaskTemplate(
    item: RdStageTaskTemplateEntity,
    title: string,
    description: string,
    sortOrder: number,
    enabled: boolean,
  ): void {
    const patch: UpdateRdStageTaskTemplateInput = {};
    if (title.trim() !== item.title) patch.title = title.trim();
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sortOrder !== item.sortOrder) patch.sortOrder = sortOrder;
    if (enabled !== item.enabled) patch.enabled = enabled;
    if (Object.keys(patch).length > 0) {
      this.updateStageTaskTemplate.emit({ id: item.id, patch });
    }
  }
}
