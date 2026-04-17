import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';

import { PROJECT_TYPE_LABELS, type ProjectMemberEntity, type ProjectMetaItem, type ProjectSummary, type ProjectType } from '../../models/project.model';

@Component({
  selector: 'app-project-list-expand-panel',
  standalone: true,
  imports: [NzAvatarModule, NzButtonModule, NzIconModule],
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

  readonly expandedSubsystemIds = new Set<string>();

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

  subsystemInitial(name: string): string {
    return (name || 'S').slice(0, 1).toUpperCase();
  }

  toggleSubsystem(subsystemId: string, event: Event): void {
    event.stopPropagation();
    if (this.expandedSubsystemIds.has(subsystemId)) {
      this.expandedSubsystemIds.delete(subsystemId);
    } else {
      this.expandedSubsystemIds.add(subsystemId);
    }
  }

  subsystemTree(): Array<
    | {
        kind: 'subsystem';
        id: string;
        name: string;
        description: string | null;
        moduleCount: number;
        moduleNames: string[];
      }
    | {
        kind: 'module';
        id: string;
        parentId: string;
        name: string;
        description: string | null;
      }
  > {
    const items = this.modules();
    const modulesByParent = new Map<string, ProjectMetaItem[]>();
    for (const item of items) {
      if (item.nodeType === 'module' && item.parentId) {
        const list = modulesByParent.get(item.parentId) ?? [];
        list.push(item);
        modulesByParent.set(item.parentId, list);
      }
    }
    const result: ReturnType<typeof this.subsystemTree> = [];
    for (const sub of items.filter((item) => item.nodeType === 'subsystem')) {
      const modules = modulesByParent.get(sub.id) ?? [];
      result.push({
        kind: 'subsystem',
        id: sub.id,
        name: sub.name,
        description: sub.description ?? null,
        moduleCount: modules.length,
        moduleNames: modules.map((m) => m.name)
      });
      for (const mod of modules) {
        result.push({
          kind: 'module',
          id: mod.id,
          parentId: sub.id,
          name: mod.name,
          description: mod.description ?? null
        });
      }
    }
    return result;
  }

  isSubsystemExpanded(subsystemId: string): boolean {
    return this.expandedSubsystemIds.has(subsystemId);
  }
}

