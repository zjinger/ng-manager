import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { PROJECT_TYPE_LABELS, type ProjectMemberEntity, type ProjectMetaItem, type ProjectSummary, type ProjectType } from '../../models/project.model';
import { ProjectSubmoduleStructureComponent } from '../project-submodule-structure/project-submodule-structure.component';

@Component({
  selector: 'app-project-list-expand-panel',
  standalone: true,
  imports: [NzAvatarModule, NzButtonModule, NzIconModule, ProjectSubmoduleStructureComponent],
  templateUrl: './project-list-expand-panel.component.html',
  styleUrls: ['./project-list-expand-panel.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectListExpandPanelComponent {
  readonly project = input.required<ProjectSummary>();
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly membersLoading = input(false);
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly modulesLoading = input(false);

  readonly manageMembers = output<ProjectSummary>();
  readonly manageModules = output<ProjectSummary>();
  readonly editModuleConfig = output<string>();
  readonly manageModuleMembers = output<string>();

  projectTypeLabel(type: ProjectType): string {
    return PROJECT_TYPE_LABELS[type] ?? type;
  }

  projectTypeDetail(item: ProjectSummary): string | null {
    const parts = [
      item.contractNo ? `合同 ${item.contractNo}` : null,
      item.deliveryDate ? `交付 ${item.deliveryDate}` : null
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  memberInitial(name: string): string {
    return (name || '?').slice(0, 1).toUpperCase();
  }

  memberRoleLabel(member: ProjectMemberEntity): string {
    if (member.isOwner) {
      return '项目负责人';
    }
    if (member.roleCode === 'project_admin') {
      return '项目管理员';
    }
    return '成员';
  }

  memberRoleTone(member: ProjectMemberEntity): 'owner' | 'manager' | 'member' {
    if (member.isOwner) {
      return 'owner';
    }
    if (member.roleCode === 'project_admin') {
      return 'manager';
    }
    return 'member';
  }

  mainModuleCount(): number {
    return this.modules().filter((item) => item.nodeType === 'module').length;
  }
}
