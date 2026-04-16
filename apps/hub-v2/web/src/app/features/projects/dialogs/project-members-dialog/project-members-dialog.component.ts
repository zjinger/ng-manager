import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ROLE_OPTIONS } from '@app/shared/constants';
import { DialogShellComponent } from '@shared/ui';
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

@Component({
  selector: 'app-project-members-dialog',
  standalone: true,
  imports: [FormsModule, NzAvatarModule, NzButtonModule, NzIconModule, NzInputModule, NzSelectModule, NzPopconfirmModule, NzFormModule, NzIconModule, NzGridModule, DialogShellComponent, NzPopconfirmDirective],
  templateUrl: './project-members-dialog.component.html',
  styleUrls: ['./project-members-dialog.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectMembersDialogComponent {
  readonly open = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly users = input<ProjectMemberCandidate[]>([]);
  readonly loading = input(false);
  readonly busy = input(false);
  readonly canTransferOwner = input(false);
  readonly canPromoteAdmin = input(false);

  readonly add = output<AddProjectMemberInput>();
  readonly promoteAdmin = output<ProjectMemberEntity>();
  readonly revokeAdmin = output<ProjectMemberEntity>();
  readonly transferOwner = output<ProjectMemberEntity>();
  readonly remove = output<ProjectMemberEntity>();
  readonly cancel = output<void>();

  readonly selectedUserId = signal('');
  readonly roleCode = signal<ProjectMemberRole>('member');

  readonly availableUsers = computed(() => {
    const memberIds = new Set(this.members().map((item) => item.userId));
    return this.users().filter((item) => !memberIds.has(item.id));
  });

  readonly roleOptions = ROLE_OPTIONS;

  submitAdd(): void {
    if (!this.selectedUserId()) {
      return;
    }
    this.add.emit({
      userId: this.selectedUserId(),
      roleCode: this.roleCode()
    });
    this.selectedUserId.set('');
    this.roleCode.set('member');
  }

  avatarText(name: string): string {
    return (name || '?').slice(0, 1).toUpperCase();
  }

  roleleLabel(roleCode: string): string {
    const option = this.roleOptions.find((item) => item.value === roleCode);
    return option ? option.label : roleCode;
  }

  userSelected(userId: string): void {
    this.selectedUserId.set(userId);
    const user = this.availableUsers().find((item) => item.id === userId);
    if (user) {
      this.roleCode.set(user.titleCode || 'member');
    }
  }
}
