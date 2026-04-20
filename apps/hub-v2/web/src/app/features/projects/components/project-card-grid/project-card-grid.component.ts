import { CommonModule, DatePipe } from '@angular/common';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';

import { ProjectListExpandPanelComponent } from '../project-list-expand-panel/project-list-expand-panel.component';
import {
  PROJECT_TYPE_LABELS,
  type ProjectMemberEntity,
  type ProjectMetaItem,
  type ProjectSummary,
  type ProjectType
} from '../../models/project.model';

@Component({
  selector: 'app-project-card-grid',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    ClipboardModule,
    NzButtonModule,
    NzIconModule,
    NzTooltipModule,
    NzPopconfirmModule,
    ProjectListExpandPanelComponent,
  ],
  templateUrl: './project-card-grid.component.html',
  styleUrls: ['./project-card-grid.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectCardGridComponent {
  private readonly message = inject(NzMessageService);
  private readonly clipboard = inject(Clipboard);
  private readonly brokenAvatarMap = new Map<string, true>();

  readonly items = input.required<ProjectSummary[]>();
  readonly expandedProjectIds = input<string[]>([]);
  readonly modulePreviewMap = input<Record<string, ProjectMetaItem[]>>({});
  readonly moduleLoadingIds = input<string[]>([]);
  readonly memberPreviewMap = input<Record<string, ProjectMemberEntity[]>>({});
  readonly memberLoadingIds = input<string[]>([]);

  readonly manageMembers = output<ProjectSummary>();
  readonly manageModules = output<ProjectSummary>();
  readonly editModuleConfig = output<{ project: ProjectSummary; moduleId: string }>();
  readonly manageModuleMembers = output<{ project: ProjectSummary; moduleId: string }>();
  readonly edit = output<ProjectSummary>();
  readonly manageConfig = output<ProjectSummary>();
  readonly archive = output<ProjectSummary>();
  readonly restore = output<ProjectSummary>();
  readonly toggleExpand = output<ProjectSummary>();

  avatarText(name: string): string {
    return name.slice(0, 2).toUpperCase();
  }

  showAvatar(item: ProjectSummary): boolean {
    return !!item.avatarUrl && !this.brokenAvatarMap.has(item.id);
  }

  markAvatarError(projectId: string): void {
    this.brokenAvatarMap.set(projectId, true);
  }

  copyProjectKey(projectKey: string, event: Event): void {
    event.stopPropagation();
    const ok = this.clipboard.copy(projectKey);
    this.message.success(ok ? 'ProjectKey 已复制' : '复制失败');
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

  projectTypeIcon(type: ProjectType): string {
    const icons: Record<ProjectType, string> = {
      entrust_dev: 'file-protect',
      self_dev: 'code',
      tech_service: 'tool',
    };
    return icons[type] ?? 'folder';
  }

  hasModulePreview(projectId: string): boolean {
    const modules = this.modulePreviewMap()[projectId];
    return !!modules && modules.length > 0;
  }

  modulePreviewCount(projectId: string): number {
    return this.modulePreviewMap()[projectId]?.length ?? 0;
  }

  memberItems(projectId: string): ProjectMemberEntity[] {
    return this.memberPreviewMap()[projectId] ?? [];
  }
}
