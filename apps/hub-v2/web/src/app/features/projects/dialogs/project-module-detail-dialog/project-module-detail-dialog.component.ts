import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { DialogShellComponent } from '@shared/ui';
import type {
  AddProjectModuleMemberInput,
  ProjectMemberEntity,
  ProjectMetaItem,
  ProjectModuleMemberEntity,
  ProjectModulePriority,
  UpdateProjectMetaItemInput
} from '../../models/project.model';

@Component({
  selector: 'app-project-module-detail-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzTabsModule,
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
  readonly moduleMembers = input<ProjectModuleMemberEntity[]>([]);
  readonly canManageModules = input(false);

  readonly cancel = output<void>();
  readonly save = output<UpdateProjectMetaItemInput>();
  readonly addMember = output<AddProjectModuleMemberInput>();
  readonly removeMember = output<string>();

  readonly candidateUserId = signal<string | null>(null);
  readonly candidateRoleCode = signal<ProjectMemberEntity['roleCode']>('member');
  readonly tabIndex = signal(0);
  readonly formName = signal('');
  readonly formProjectNo = signal('');
  readonly formDescription = signal('');
  readonly formPriority = signal<ProjectModulePriority>('medium');
  readonly formSort = signal(0);
  readonly formEnabled = signal(true);

  readonly priorityOptions: Array<{ label: string; value: ProjectModulePriority }> = [
    { label: '紧急', value: 'critical' },
    { label: '高', value: 'high' },
    { label: '中', value: 'medium' },
    { label: '低', value: 'low' }
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

  readonly scopedModuleMembers = computed(() => this.moduleMembers().filter((item) => item.source === 'module'));

  readonly addableMembers = computed(() => {
    const existingUserIds = new Set(this.scopedModuleMembers().map((item) => item.userId));
    return this.projectMembers().filter((member) => !existingUserIds.has(member.userId));
  });

  constructor() {
    effect(() => {
      const current = this.module();
      if (!this.open() || !current) {
        return;
      }
      const allowMembersTab = current.nodeType === 'subsystem';
      this.tabIndex.set(this.initialTab() === 'members' && allowMembersTab ? 1 : 0);
      this.formName.set(current.name);
      this.formProjectNo.set(current.projectNo ?? '');
      this.formDescription.set(current.description ?? '');
      this.formPriority.set(current.priority ?? 'medium');
      this.formSort.set(current.sort ?? 0);
      this.formEnabled.set(current.enabled !== false);
      this.candidateUserId.set(null);
      this.candidateRoleCode.set('member');
    });
  }

  roleLabel(roleCode: ProjectMemberEntity['roleCode']): string {
    const hit = this.roleOptions.find((item) => item.value === roleCode);
    return hit?.label ?? '成员';
  }

  canSubmitBasic(): boolean {
    return !!this.formName().trim();
  }

  submitSave(): void {
    const current = this.module();
    if (!current) {
      return;
    }
    const patch: UpdateProjectMetaItemInput = {};
    const nextName = this.formName().trim();
    const nextDescription = this.formDescription().trim() || null;
    if (nextName !== current.name) patch.name = nextName;
    if (nextDescription !== current.description) patch.description = nextDescription;

    const nextPriority = this.formPriority() || 'medium';
    const nextSort = Number.isFinite(this.formSort()) ? Math.max(0, Math.trunc(this.formSort())) : 0;
    if (nextPriority !== (current.priority || 'medium')) patch.priority = nextPriority;
    if (nextSort !== current.sort) patch.sort = nextSort;
    if (this.formEnabled() !== current.enabled) patch.enabled = this.formEnabled();

    if (current.nodeType === 'subsystem') {
      const nextProjectNo = this.formProjectNo().trim() || null;
      if (nextProjectNo !== (current.projectNo ?? null)) patch.projectNo = nextProjectNo;
    }

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
