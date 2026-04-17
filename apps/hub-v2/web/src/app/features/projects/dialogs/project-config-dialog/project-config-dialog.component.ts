import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

import { DialogShellComponent } from '@shared/ui';
import { NzTooltipModule } from "ng-zorro-antd/tooltip";
import type { CreateRdStageInput, RdStageEntity, UpdateRdStageInput } from '../../../rd/models/rd.model';
import type {
  CreateProjectApiTokenInput,
  CreateProjectMetaItemInput,
  CreateProjectVersionItemInput,
  ProjectApiTokenEntity,
  ProjectApiTokenScope,
  ProjectMetaItem,
  ProjectSummary,
  ProjectVersionItem,
  UpdateProjectMetaItemInput,
  UpdateProjectVersionItemInput
} from '../../models/project.model';

@Component({
  selector: 'app-project-config-dialog',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    NzButtonModule,
    NzDatePickerModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzSwitchModule,
    NzTabsModule,
    DialogShellComponent,
    NzTooltipModule
  ],
  templateUrl: './project-config-dialog.component.html',
  styleUrls: ['./project-config-dialog.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectConfigDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly environments = input<ProjectMetaItem[]>([]);
  readonly versions = input<ProjectVersionItem[]>([]);
  readonly stages = input<RdStageEntity[]>([]);
  readonly apiTokens = input<ProjectApiTokenEntity[]>([]);
  readonly latestCreatedToken = input<string | null>(null);
  readonly pendingEnvironmentIds = input<string[]>([]);
  readonly pendingVersionIds = input<string[]>([]);
  readonly pendingStageIds = input<string[]>([]);
  readonly pendingTokenIds = input<string[]>([]);
  readonly canManageConfig = input(false);

  readonly cancel = output<void>();
  readonly createEnvironment = output<CreateProjectMetaItemInput>();
  readonly updateEnvironment = output<{ id: string; patch: UpdateProjectMetaItemInput }>();
  readonly removeEnvironment = output<string>();
  readonly createVersion = output<CreateProjectVersionItemInput>();
  readonly updateVersion = output<{ id: string; patch: UpdateProjectVersionItemInput }>();
  readonly removeVersion = output<string>();
  readonly createStage = output<CreateRdStageInput>();
  readonly updateStage = output<{ id: string; patch: UpdateRdStageInput }>();
  readonly removeStage = output<string>();
  readonly createApiToken = output<CreateProjectApiTokenInput>();
  readonly revokeApiToken = output<string>();
  readonly copyLatestToken = output<string>();
  readonly clearLatestToken = output<void>();

  readonly environmentDraft = signal('');
  readonly versionDraft = signal('');
  readonly stageDraft = signal('');
  readonly tokenNameDraft = signal('');
  readonly tokenScopesDraft = signal<ProjectApiTokenScope[]>(['issues:read', 'rd:read']); //'feedbacks:read'
  readonly tokenExpiresAt = signal<Date | null>(null);

  isEnvironmentPending(id: string): boolean {
    return this.pendingEnvironmentIds().includes(id);
  }

  isVersionPending(id: string): boolean {
    return this.pendingVersionIds().includes(id);
  }

  isStagePending(id: string): boolean {
    return this.pendingStageIds().includes(id);
  }

  isTokenPending(id: string): boolean {
    return this.pendingTokenIds().includes(id);
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

  submitVersionCreate(): void {
    const version = this.versionDraft().trim();
    if (!version) {
      return;
    }
    this.createVersion.emit({ version });
    this.versionDraft.set('');
  }

  submitStageCreate(): void {
    const name = this.stageDraft().trim();
    const projectId = this.project()?.id;
    if (!name || !projectId) {
      return;
    }
    this.createStage.emit({ projectId, name });
    this.stageDraft.set('');
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

  saveVersion(item: ProjectVersionItem, version: string, description: string, sort: number): void {
    const patch: UpdateProjectVersionItemInput = {};
    if (version.trim() !== item.version) patch.version = version.trim();
    if ((description.trim() || null) !== item.description) patch.description = description.trim() || null;
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateVersion.emit({ id: item.id, patch });
    }
  }

  saveStage(item: RdStageEntity, name: string, sort: number): void {
    const patch: UpdateRdStageInput = {};
    if (name.trim() !== item.name) patch.name = name.trim();
    if (sort !== item.sort) patch.sort = sort;
    if (Object.keys(patch).length > 0) {
      this.updateStage.emit({ id: item.id, patch });
    }
  }

  canSubmitTokenCreate(): boolean {
    return this.tokenNameDraft().trim().length > 0 && this.tokenScopesDraft().length > 0;
  }

  submitTokenCreate(): void {
    if (!this.canSubmitTokenCreate()) {
      return;
    }
    this.createApiToken.emit({
      name: this.tokenNameDraft().trim(),
      scopes: this.tokenScopesDraft(),
      expiresAt: this.tokenExpiresAt() ? this.tokenExpiresAt()!.toISOString() : null
    });
    this.tokenNameDraft.set('');
    this.tokenExpiresAt.set(null);
  }

  renderScopes(scopes: ProjectApiTokenScope[]): string {
    return scopes
      .map((scope) => {
        if (scope === 'issues:read') return 'Issue读取';
        if (scope === 'rd:read') return '研发项读取';
        return '反馈读取';
      })
      .join(' / ');
  }
}
