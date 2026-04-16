import { CommonModule, DatePipe, NgClass } from '@angular/common';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DataTableComponent } from '@shared/ui';
import { PROJECT_TYPE_LABELS, type ProjectMemberEntity, type ProjectMetaItem, type ProjectSummary, type ProjectType } from '../../models/project.model';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';

@Component({
  selector: 'app-project-list-table',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ClipboardModule,
    DataTableComponent,
    NzButtonModule,
    NzIconModule,
    NzTooltipModule,
    NzPopconfirmModule,
    NzAvatarModule,
  ],
  templateUrl: './project-list-table.component.html',
  styleUrls: ['./project-list-table.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectListTableComponent {
  private readonly message = inject(NzMessageService);
  private readonly clipboard = inject(Clipboard);
  readonly items = input.required<ProjectSummary[]>();
  readonly expandedProjectIds = input<string[]>([]);
  readonly modulePreviewMap = input<Record<string, ProjectMetaItem[]>>({});
  readonly moduleLoadingIds = input<string[]>([]);
  readonly memberPreviewMap = input<Record<string, ProjectMemberEntity[]>>({});
  readonly memberLoadingIds = input<string[]>([]);
  readonly manageMembers = output<ProjectSummary>();
  readonly edit = output<ProjectSummary>();
  readonly manageConfig = output<ProjectSummary>();
  readonly archive = output<ProjectSummary>();
  readonly restore = output<ProjectSummary>();
  readonly toggleExpand = output<ProjectSummary>();
  private readonly brokenAvatarMap = new Map<string, true>();

  avatarText(name: string): string {
    return name.slice(0, 3).toUpperCase();
  }

  showAvatar(item: ProjectSummary): boolean {
    return !!item.avatarUrl && !this.brokenAvatarMap.has(item.id);
  }

  markAvatarError(projectId: string): void {
    this.brokenAvatarMap.set(projectId, true);
  }

  copyProjectKey(projectKey: string): void {
    const ok = this.clipboard.copy(projectKey);
    if (ok) {
      this.message.success('projectKey 已复制');
    } else {
      this.message.error('复制 projectKey 失败');
    }
  }

  isExpanded(projectId: string): boolean {
    return this.expandedProjectIds().includes(projectId);
  }

  isModuleLoading(projectId: string): boolean {
    return this.moduleLoadingIds().includes(projectId);
  }

  isMemberLoading(projectId: string): boolean {
    return this.memberLoadingIds().includes(projectId);
  }

  projectTypeLabel(type: ProjectType): string {
    return PROJECT_TYPE_LABELS[type] ?? type;
  }

  projectTypeDetail(item: ProjectSummary): string | null {
    const parts = [
      item.contractNo ? `合同 ${item.contractNo}` : null,
      item.deliveryDate ? `交付 ${item.deliveryDate}` : null,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : null;
  }

  memberItems(projectId: string): ProjectMemberEntity[] {
    return this.memberPreviewMap()[projectId] ?? [];
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

  memberRoleTone(member: ProjectMemberEntity): 'owner' | 'manager' | 'tester' | 'member' {
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

  placeholderProgress(_subsystem: { id: string }): number {
    return 60;
  }

  subsystemRows(projectId: string): Array<{ id: string; name: string; description: string | null; moduleCount: number }> {
    const items = this.modulePreviewMap()[projectId] ?? [];
    const moduleCountMap = new Map<string, number>();
    for (const item of items) {
      if (item.nodeType === 'module' && item.parentId) {
        moduleCountMap.set(item.parentId, (moduleCountMap.get(item.parentId) ?? 0) + 1);
      }
    }
    return items
      .filter((item) => item.nodeType === 'subsystem')
      .map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description ?? null,
        moduleCount: moduleCountMap.get(item.id) ?? 0
      }));
  }
}
