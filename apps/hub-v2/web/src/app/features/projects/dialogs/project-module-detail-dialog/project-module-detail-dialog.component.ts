import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import { DialogShellComponent } from '@shared/ui';
import type {
  AddProjectModuleMemberInput,
  ProjectMemberEntity,
  ProjectMetaItem,
  ProjectModuleNodeType,
  ProjectModuleRdLinkEntity,
  ProjectModuleMemberEntity,
  ProjectModulePriority,
  ReplaceModuleRdLinksInput,
  UpdateProjectMetaItemInput
} from '../../models/project.model';

@Component({
  selector: 'app-project-module-detail-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzCheckboxModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzPaginationModule,
    NzSelectModule,
    NzSwitchModule,
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
  readonly initialTab = input<'basic' | 'members' | 'rdItems'>('basic');
  readonly busy = input(false);
  readonly membersBusy = input(false);
  readonly rdLinksBusy = input(false);
  readonly module = input<ProjectMetaItem | null>(null);
  readonly modules = input<ProjectMetaItem[]>([]);
  readonly projectMembers = input<ProjectMemberEntity[]>([]);
  readonly moduleMembers = input<ProjectModuleMemberEntity[]>([]);
  readonly moduleRdLinks = input<ProjectModuleRdLinkEntity[]>([]);
  readonly rdItems = input<Array<{ id: string; rdNo: string; title: string; status: string }>>([]);
  readonly canManageModules = input(false);

  readonly cancel = output<void>();
  readonly save = output<UpdateProjectMetaItemInput>();
  readonly addMember = output<AddProjectModuleMemberInput>();
  readonly removeMember = output<string>();
  readonly saveRdLinks = output<ReplaceModuleRdLinksInput>();

  readonly candidateUserId = signal<string | null>(null);
  readonly candidateRoleCode = signal<ProjectMemberEntity['roleCode']>('member');
  readonly tabIndex = signal(0);
  readonly formNodeType = signal<ProjectModuleNodeType>('module');
  readonly formParentId = signal<string | null>(null);
  readonly formName = signal('');
  readonly formProjectNo = signal('');
  readonly formDescription = signal('');
  readonly formPriority = signal<ProjectModulePriority>('medium');
  readonly formSort = signal(0);
  readonly formEnabled = signal(true);
  readonly selectedRdItemIds = signal<string[]>([]);
  readonly rdPageIndex = signal(1);
  readonly rdPageSize = 8;

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

  readonly pagedRdItems = computed(() => {
    const start = (this.rdPageIndex() - 1) * this.rdPageSize;
    return this.rdItems().slice(start, start + this.rdPageSize);
  });

  constructor() {
    effect(() => {
      const current = this.module();
      if (!this.open() || !current) {
        return;
      }
      const initialTab = this.initialTab();
      if (initialTab === 'members') {
        this.tabIndex.set(1);
      } else if (initialTab === 'rdItems') {
        this.tabIndex.set(2);
      } else {
        this.tabIndex.set(0);
      }
      this.formNodeType.set(current.nodeType);
      this.formParentId.set(current.parentId ?? null);
      this.formName.set(current.name);
      this.formProjectNo.set(current.projectNo ?? '');
      this.formDescription.set(current.description ?? '');
      this.formPriority.set(current.priority ?? 'medium');
      this.formSort.set(current.sort ?? 0);
      this.formEnabled.set(current.enabled !== false);
      this.candidateUserId.set(null);
      this.candidateRoleCode.set('member');
      this.rdPageIndex.set(1);
      this.selectedRdItemIds.set(this.moduleRdLinks().map((item) => item.rdItemId));
    });
  }

  roleLabel(roleCode: ProjectMemberEntity['roleCode']): string {
    const hit = this.roleOptions.find((item) => item.value === roleCode);
    return hit?.label ?? '成员';
  }

  canSubmitBasic(): boolean {
    return !!this.formName().trim();
  }

  typeLabel(type: ProjectModuleNodeType): string {
    return type === 'subsystem' ? '子项目' : '模块';
  }

  availableParentItems(): Array<ProjectMetaItem & { level: number }> {
    const current = this.module();
    if (!current) {
      return [];
    }
    const blockedIds = this.descendantIds(current.id);
    blockedIds.add(current.id);
    const allowModuleParent = this.formNodeType() === 'module';
    return this.flattenModules()
      .filter((item) => !blockedIds.has(item.id))
      .filter((item) => allowModuleParent || item.nodeType === 'subsystem');
  }

  parentOptionLabel(item: ProjectMetaItem & { level: number }): string {
    const prefix = item.level > 0 ? `${'　'.repeat(item.level)}└ ` : '';
    return `${prefix}${item.name}（${this.typeLabel(item.nodeType)}）`;
  }

  onNodeTypeChange(value: ProjectModuleNodeType | null): void {
    const nextType = value || 'module';
    this.formNodeType.set(nextType);
    const parent = this.modules().find((item) => item.id === this.formParentId());
    if (nextType === 'subsystem' && parent?.nodeType === 'module') {
      this.formParentId.set(null);
    }
  }

  submitSave(): void {
    const current = this.module();
    if (!current) {
      return;
    }
    const patch: UpdateProjectMetaItemInput = {};
    const nextNodeType = this.formNodeType();
    const nextParentId = this.formParentId() || null;
    const nextName = this.formName().trim();
    const nextDescription = this.formDescription().trim() || null;
    const nextProjectNo = this.formProjectNo().trim() || null;
    if (nextNodeType !== current.nodeType) patch.nodeType = nextNodeType;
    if (nextParentId !== (current.parentId ?? null)) patch.parentId = nextParentId;
    if (nextName !== current.name) patch.name = nextName;
    if (nextDescription !== current.description) patch.description = nextDescription;
    if (nextProjectNo !== (current.projectNo ?? null)) patch.projectNo = nextProjectNo;

    const nextPriority = this.formPriority() || 'medium';
    const nextSort = Number.isFinite(this.formSort()) ? Math.max(0, Math.trunc(this.formSort())) : 0;
    if (nextPriority !== (current.priority || 'medium')) patch.priority = nextPriority;
    if (nextSort !== current.sort) patch.sort = nextSort;
    if (this.formEnabled() !== current.enabled) patch.enabled = this.formEnabled();

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

  rdLabel(rd: { id: string; rdNo: string; title: string; status: string }): string {
    const base = `${rd.rdNo} · ${rd.title}`;
    return rd.status === 'closed' ? `${base}（已关闭）` : base;
  }

  submitSaveRdLinks(): void {
    if (!this.module()) {
      return;
    }
    const rdItemIds = Array.from(new Set(this.selectedRdItemIds().map((item) => item.trim()).filter(Boolean)));
    this.saveRdLinks.emit({ rdItemIds });
  }

  isRdSelected(rdItemId: string): boolean {
    return this.selectedRdItemIds().includes(rdItemId);
  }

  toggleRdItem(rdItemId: string, checked: boolean): void {
    this.selectedRdItemIds.update((items) => {
      if (checked) {
        return Array.from(new Set([...items, rdItemId]));
      }
      return items.filter((item) => item !== rdItemId);
    });
  }

  isRdOptionDisabled(rd: { id: string; status: string }): boolean {
    if (rd.status !== 'closed') {
      return false;
    }
    return !this.selectedRdItemIds().includes(rd.id);
  }

  private flattenModules(): Array<ProjectMetaItem & { level: number }> {
    const sorted = [...this.modules()].sort((a, b) => this.compareNodes(a, b));
    const childrenByParent = new Map<string | null, ProjectMetaItem[]>();
    const idSet = new Set(sorted.map((item) => item.id));
    for (const item of sorted) {
      const parentId = item.parentId && idSet.has(item.parentId) ? item.parentId : null;
      const list = childrenByParent.get(parentId) ?? [];
      list.push(item);
      childrenByParent.set(parentId, list);
    }
    const result: Array<ProjectMetaItem & { level: number }> = [];
    const walk = (items: ProjectMetaItem[], level: number) => {
      for (const item of items) {
        result.push({ ...item, level });
        walk(childrenByParent.get(item.id) ?? [], level + 1);
      }
    };
    walk(childrenByParent.get(null) ?? [], 0);
    return result;
  }

  private descendantIds(moduleId: string): Set<string> {
    const result = new Set<string>();
    const walk = (parentId: string) => {
      for (const item of this.modules()) {
        if (item.parentId !== parentId || result.has(item.id)) {
          continue;
        }
        result.add(item.id);
        walk(item.id);
      }
    };
    walk(moduleId);
    return result;
  }

  private compareNodes(a: ProjectMetaItem, b: ProjectMetaItem): number {
    if (a.nodeType !== b.nodeType) {
      return a.nodeType === 'subsystem' ? -1 : 1;
    }
    if (a.sort !== b.sort) {
      return a.sort - b.sort;
    }
    return a.createdAt.localeCompare(b.createdAt);
  }
}
