import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import { PROJECT_TYPE_LABELS, type CreateProjectMetaItemInput, type ProjectMemberEntity, type ProjectMetaItem, type ProjectSummary, type ProjectType } from '../../models/project.model';

@Component({
  selector: 'app-project-module-manage-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzAvatarModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    NzSelectModule,
    DialogShellComponent
  ],
  templateUrl: './project-module-manage-dialog.component.html',
  styleUrls: ['./project-module-manage-dialog.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectModuleManageDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly project = input<ProjectSummary | null>(null);
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly projectMembers = input<ProjectMemberEntity[]>([]);
  readonly canManageModules = input(false);

  readonly cancel = output<void>();
  readonly createModule = output<CreateProjectMetaItemInput>();
  readonly removeModule = output<string>();
  readonly openDetail = output<{ moduleId: string; tab: 'basic' | 'members' }>();

  readonly createOpen = signal(false);
  readonly createNodeType = signal<'subsystem' | 'module'>('module');
  readonly createParentId = signal<string | null>(null);
  readonly createName = signal('');
  readonly createProjectNo = signal('');
  readonly createDescription = signal('');

  readonly expandedSubsystemIds = new Set<string>();
  readonly openMenuId = signal<string | null>(null);

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

  subsystemItems(): ProjectMetaItem[] {
    return this.modules().filter((item) => item.nodeType === 'subsystem');
  }

  subsystemTree(): Array<
    | {
        kind: 'subsystem';
        id: string;
        name: string;
        code: string | null;
        projectNo: string | null;
        description: string | null;
        enabled: boolean;
        moduleCount: number;
        moduleNames: string[];
        issueCount: number;
        rdCount: number;
      }
    | {
        kind: 'module';
        id: string;
        parentId: string;
        name: string;
        code: string | null;
        projectNo: string | null;
        description: string | null;
        enabled: boolean;
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
      const mods = modulesByParent.get(sub.id) ?? [];
      result.push({
        kind: 'subsystem',
        id: sub.id,
        name: sub.name,
        code: sub.code ?? null,
        projectNo: sub.projectNo ?? null,
        description: sub.description ?? null,
        enabled: sub.enabled,
        moduleCount: mods.length,
        moduleNames: mods.map((m) => m.name),
        issueCount: 0,
        rdCount: 0
      });
      for (const mod of mods) {
        result.push({
          kind: 'module',
          id: mod.id,
          parentId: sub.id,
          name: mod.name,
          code: mod.code ?? null,
          projectNo: mod.projectNo ?? null,
          description: mod.description ?? null,
          enabled: mod.enabled
        });
      }
    }
    return result;
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

  isSubsystemExpanded(subsystemId: string): boolean {
    return this.expandedSubsystemIds.has(subsystemId);
  }

  toggleActionMenu(id: string): void {
    if (this.openMenuId() === id) {
      this.openMenuId.set(null);
    } else {
      this.openMenuId.set(id);
    }
  }

  closeActionMenu(): void {
    this.openMenuId.set(null);
  }

  openCreate(): void {
    this.createOpen.set(true);
  }

  closeCreate(): void {
    this.createOpen.set(false);
    this.createNodeType.set('module');
    this.createParentId.set(null);
    this.createName.set('');
    this.createProjectNo.set('');
    this.createDescription.set('');
  }

  submitCreate(): void {
    const name = this.createName().trim();
    if (!name) {
      return;
    }
    const nodeType = this.createNodeType();
    this.createModule.emit({
      name,
      nodeType,
      parentId: nodeType === 'module' ? this.createParentId() : null,
      projectNo: nodeType === 'subsystem' ? this.createProjectNo().trim() || undefined : undefined,
      description: this.createDescription().trim() || undefined
    });
    this.closeCreate();
  }
}

