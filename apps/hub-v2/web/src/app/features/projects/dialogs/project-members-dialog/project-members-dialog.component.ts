import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ROLE_OPTIONS } from '@app/shared/constants';
import { DialogShellComponent } from '@shared/ui';
import { ProjectTitleApiService } from '../../../admin/services/project-title-api.service';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPopconfirmDirective, NzPopconfirmModule } from "ng-zorro-antd/popconfirm";
import type {
  AddProjectMemberInput,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectMemberRole,
  ProjectSummary
} from '../../models/project.model';
import { NzTooltipDirective } from "ng-zorro-antd/tooltip";

type RoleOption = {
  label: string;
  value: ProjectMemberRole;
};

const SUPPORTED_ROLE_CODES = new Set<string>(ROLE_OPTIONS.map((item) => item.value));
const FALLBACK_ROLE_OPTIONS = ROLE_OPTIONS as RoleOption[];

@Component({
  selector: 'app-project-members-dialog',
  standalone: true,
  imports: [FormsModule, NzAvatarModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzPopconfirmModule, NzFormModule, NzIconModule, NzGridModule, DialogShellComponent, NzPopconfirmDirective, NzTooltipDirective],
  templateUrl: './project-members-dialog.component.html',
  styleUrls: ['./project-members-dialog.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectMembersDialogComponent {
  private readonly projectTitleApi = inject(ProjectTitleApiService);

  readonly open = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly users = input<ProjectMemberCandidate[]>([]);
  readonly loading = input(false);
  readonly busy = input(false);
  readonly canTransferOwner = input(false);
  readonly canPromoteAdmin = input(false);
  readonly canManageMembers = input(false);
  

  readonly add = output<AddProjectMemberInput>();
  readonly promoteAdmin = output<ProjectMemberEntity>();
  readonly revokeAdmin = output<ProjectMemberEntity>();
  readonly transferOwner = output<ProjectMemberEntity>();
  readonly remove = output<ProjectMemberEntity>();
  readonly cancel = output<void>();

  readonly selectedUserId = signal('');
  readonly roleCode = signal<ProjectMemberRole>('member');
  readonly projectRoleOptions = signal<RoleOption[]>([]);

  readonly availableUsers = computed(() => {
    const memberIds = new Set(this.members().map((item) => item.userId));
    return this.users().filter((item) => !memberIds.has(item.id));
  });

  readonly roleOptions = computed<RoleOption[]>(() => {
    const options = this.projectRoleOptions();
    return options.length > 0 ? options : FALLBACK_ROLE_OPTIONS;
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.loadProjectRoleOptions();
      }
    });
  }

  submitAdd(): void {
    if (!this.selectedUserId()) {
      return;
    }
    this.add.emit({
      userId: this.selectedUserId(),
      roleCode: this.roleCode()
    });
    this.selectedUserId.set('');
    this.roleCode.set(this.defaultRoleCode());
  }

  avatarText(name: string): string {
    return (name || '?').slice(0, 1).toUpperCase();
  }

  roleleLabel(roleCode: string): string {
    const option = this.roleOptions().find((item) => item.value === roleCode);
    return option ? option.label : roleCode;
  }

  userSelected(userId: string): void {
    this.selectedUserId.set(userId);
    const candidate = this.users().find((item) => item.id === userId);
    const defaultRole = this.normalizeRoleCode(candidate?.defaultProjectTitleCode);
    this.roleCode.set(defaultRole ?? this.defaultRoleCode());
  }

  setRoleCode(roleCode: string | null): void {
    this.roleCode.set(this.normalizeRoleCode(roleCode) ?? this.defaultRoleCode());
  }

  private loadProjectRoleOptions(): void {
    this.projectTitleApi.listTitles({ status: 'active' }).subscribe({
      next: (items) => {
        const options = items
          .filter((item) => SUPPORTED_ROLE_CODES.has(item.code))
          .map((item) => ({ label: item.name, value: item.code as ProjectMemberRole }));
        this.projectRoleOptions.set(options);
        if (!this.normalizeRoleCode(this.roleCode())) {
          this.roleCode.set(this.defaultRoleCode());
        }
      },
      error: () => {
        this.projectRoleOptions.set([]);
      },
    });
  }

  private defaultRoleCode(): ProjectMemberRole {
    return this.roleOptions().find((item) => item.value !== 'project_admin')?.value ?? this.roleOptions()[0]?.value ?? 'member';
  }

  private normalizeRoleCode(roleCode: string | null | undefined): ProjectMemberRole | null {
    if (!roleCode || !this.roleOptions().some((item) => item.value === roleCode)) {
      return null;
    }
    return roleCode as ProjectMemberRole;
  }
}
