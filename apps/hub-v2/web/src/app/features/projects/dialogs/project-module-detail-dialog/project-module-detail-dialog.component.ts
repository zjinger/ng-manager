import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { DialogShellComponent } from '@shared/ui';
import type {
  AddProjectModuleMemberInput,
  ProjectMemberCandidate,
  ProjectMemberEntity,
  ProjectMetaItem,
  ProjectModuleMemberEntity,
  ProjectModulePriority,
  ProjectModuleStatus,
  UpdateProjectMetaItemInput
} from '../../models/project.model';

@Component({
  selector: 'app-project-module-detail-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzTabsModule,
    NzTagModule,
    NzPopconfirmModule,
    DialogShellComponent
  ],
  templateUrl: './project-module-detail-dialog.component.html',
  styleUrls: ['./project-module-detail-dialog.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectModuleDetailDialogComponent {
  readonly open = input(false);
  readonly initialTab = input<'basic' | 'members'>('basic');
  readonly busy = input(false);
  readonly membersBusy = input(false);
  readonly module = input<ProjectMetaItem | null>(null);
  readonly projectMembers = input<ProjectMemberEntity[]>([]);
  readonly userCandidates = input<ProjectMemberCandidate[]>([]);
  readonly moduleMembers = input<ProjectModuleMemberEntity[]>([]);
  readonly canManageModules = input(false);

  readonly cancel = output<void>();
  readonly save = output<UpdateProjectMetaItemInput>();
  readonly addMember = output<AddProjectModuleMemberInput>();
  readonly removeMember = output<string>();

  readonly candidateUserId = signal<string | null>(null);
  readonly candidateRoleCode = signal<ProjectMemberEntity['roleCode']>('member');
  readonly tabIndex = signal(0);

  readonly priorityOptions: Array<{ label: string; value: ProjectModulePriority }> = [
    { label: '紧急', value: 'critical' },
    { label: '高', value: 'high' },
    { label: '中', value: 'medium' },
    { label: '低', value: 'low' }
  ];

  readonly statusOptions: Array<{ label: string; value: ProjectModuleStatus }> = [
    { label: '待开始', value: 'todo' },
    { label: '进行中', value: 'in_progress' },
    { label: '已发布', value: 'released' },
    { label: '暂停', value: 'paused' }
  ];

  readonly roleOptions: Array<{ label: string; value: ProjectMemberEntity['roleCode'] }> = [
    { label: '成员', value: 'member' },
    { label: '项目管理员', value: 'project_admin' },
    { label: '产品', value: 'product' },
    { label: 'UI', value: 'ui' },
    { label: '前端开发', value: 'frontend_dev' },
    { label: '后端开发', value: 'backend_dev' },
    { label: '测试', value: 'qa' },
    { label: '运维', value: 'ops' }
  ];

  readonly addableMembers = computed(() => {
    const inheritedUserIds = new Set(this.projectMembers().map((item) => item.userId));
    const existingUserIds = new Set(this.moduleMembers().map((item) => item.userId));
    return this.userCandidates().filter(
      (member) => !existingUserIds.has(member.id) && !inheritedUserIds.has(member.id)
    );
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.tabIndex.set(this.initialTab() === 'members' ? 1 : 0);
    });
  }

  roleLabel(roleCode: ProjectMemberEntity['roleCode']): string {
    const hit = this.roleOptions.find((item) => item.value === roleCode);
    return hit?.label ?? '成员';
  }

  submitSave(
    name: string,
    description: string,
    ownerUserId: string | null,
    iconCode: string,
    priority: ProjectModulePriority,
    status: ProjectModuleStatus
  ): void {
    const current = this.module();
    if (!current) {
      return;
    }
    const patch: UpdateProjectMetaItemInput = {};
    if (name.trim() !== current.name) patch.name = name.trim();
    if ((description.trim() || null) !== current.description) patch.description = description.trim() || null;
    if ((ownerUserId || null) !== (current.ownerUserId || null)) patch.ownerUserId = ownerUserId || null;
    if ((iconCode.trim() || null) !== (current.iconCode || null)) patch.iconCode = iconCode.trim() || null;
    if ((priority || 'medium') !== (current.priority || 'medium')) patch.priority = priority;
    if ((status || 'todo') !== (current.status || 'todo')) patch.status = status;
    if (Object.keys(patch).length > 0) {
      this.save.emit(patch);
    }
  }

  submitAddMember(): void {
    const userId = this.candidateUserId();
    if (!userId) {
      return;
    }
    this.addMember.emit({ userId, roleCode: this.candidateRoleCode() });
    this.candidateUserId.set(null);
    this.candidateRoleCode.set('member');
  }
}
