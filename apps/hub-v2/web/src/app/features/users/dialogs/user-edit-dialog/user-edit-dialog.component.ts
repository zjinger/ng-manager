import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { forkJoin, map } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DialogShellComponent, TabsComponent } from '@shared/ui';
import { UserBasicFormComponent } from '../../components/user-basic-form';
import { UserHistoryTabComponent } from '../../components/user-history-tab';
import { UserStatusSectionComponent } from '../../components/user-status-section';
import { UserPermissionsTabComponent } from '../../components/user-permissions-tab';
import { UserSecurityTabComponent } from '../../components/user-security-tab';
import type { DepartmentEntity } from '../../../organization/models/organization.model';
import type { UpdateUserInput, UserEntity } from '../../models/user.model';
import { DEFAULT_USER_DRAFT, type EditTab, type UserDraft } from '../../models/user-form.types';
import type { SystemPermissionEntity, SystemRoleEntity } from '../../../admin/models/system-rbac.model';
import { UserRbacApiService } from '../../services/user-rbac-api.service';

export interface UserEditSubmitEvent {
  input: UpdateUserInput;
  roleIds: string[];
  passwordDraft: string | null;
}

@Component({
  selector: 'app-user-edit-dialog',
  standalone: true,
  imports: [
    NzButtonModule,
    NzIconModule,
    DialogShellComponent,
    TabsComponent,
    UserBasicFormComponent,
    UserHistoryTabComponent,
    UserStatusSectionComponent,
    UserPermissionsTabComponent,
    UserSecurityTabComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="760"
      title="编辑用户"
      [showAvatar]="true"
      [avatarPreviewUrl]="user().avatarUrl"
      [displayName]="draft().displayName || draft().username || '未命名用户'"
      [description]="(user().displayName || user().username) + ' · ' + user().username"
      (cancel)="cancel.emit()"
    >
      <div dialog-body class="user-edit-dialog">
        <app-tabs
          [tabs]="editTabs"
          [activeId]="activeTab()"
          (tabChange)="activeTab.set($any($event))"
        />

        @switch (activeTab()) {
          @case ('basic') {
            <app-user-basic-form
              [draft]="draft()"
              [departments]="departments()"
              [userOptions]="userOptions()"
              [titleOptions]="titleOptions()"
              [projectTitleOptions]="projectTitleOptions()"
              [usernameEditable]="false"
              [usernameInvalid]="false"
              (fieldChange)="updateField($event.field, $event.value)"
            />

            <app-user-status-section
              [draft]="draft()"
              [showStatusSelect]="true"
              (fieldChange)="updateField($event.field, $event.value)"
            />
          }

          @case ('security') {
            <app-user-security-tab
              [user]="user()"
              [loginEnabled]="draft().status === 'active' && draft().loginEnabled"
              [mustChangePassword]="mustChangePassword()"
              [busy]="busy()"
              (mustChangePasswordChange)="mustChangePassword.set($event)"
              (passwordDraftChange)="passwordDraft.set($event)"
              (passwordDraftValidityChange)="passwordDraftValid.set($event)"
            />
          }

          @case ('permissions') {
            <app-user-permissions-tab
              [roles]="availableRoles()"
              [selectedRoleIds]="selectedRoleIds()"
              [permissionsByRoleId]="rolePermissionsByRoleId()"
              [readonly]="rolesLoading()"
              (selectionChange)="selectedRoleIds.set($event)"
            />
          }

          @case ('history') {
            <app-user-history-tab [user]="user()" />
          }
        }
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button
          nz-button
          nzType="primary"
          [nzLoading]="busy()"
          [disabled]="!canSubmit()"
          (click)="submitForm()"
          type="button"
        >
          <nz-icon nzType="check" nzTheme="outline"></nz-icon>
          保存修改
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: `
    .user-edit-dialog {
      display: grid;
      gap: 20px;
    }

  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserEditDialogComponent {
  private readonly message = inject(NzMessageService);
  private readonly userRbacApi = inject(UserRbacApiService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly user = input.required<UserEntity>();
  readonly departments = input<DepartmentEntity[]>([]);
  readonly userOptions = input<UserEntity[]>([]);
  readonly titleOptions = input<Array<{ label: string; value: string }>>([]);
  readonly projectTitleOptions = input<Array<{ label: string; value: string }>>([]);
  readonly update = output<UserEditSubmitEvent>();
  readonly cancel = output<void>();

  readonly activeTab = signal<EditTab>('basic');
  readonly draft = signal<UserDraft>({ ...DEFAULT_USER_DRAFT });
  readonly mustChangePassword = signal(false);
  readonly passwordDraft = signal<string | null>(null);
  readonly passwordDraftValid = signal(true);

  readonly availableRoles = signal<SystemRoleEntity[]>([]);
  readonly selectedRoleIds = signal<string[]>([]);
  readonly rolePermissionsByRoleId = signal<Record<string, SystemPermissionEntity[]>>({});
  readonly rolesLoading = signal(false);

  readonly editTabs: { id: EditTab; label: string; icon?: string }[] = [
    { id: 'basic', label: '基本信息', icon: 'user' },
    { id: 'security', label: '安全设置', icon: 'safety-certificate' },
    { id: 'permissions', label: '权限配置', icon: 'key' },
    { id: 'history', label: '操作记录', icon: 'history' },
  ];

  readonly canSubmit = computed(() => {
    return !!this.draft().displayName.trim() && this.passwordDraftValid();
  });

  constructor() {
    effect(() => {
      const user = this.user();
      if (!this.open()) {
        return;
      }
      this.activeTab.set('basic');
      this.mustChangePassword.set(user.mustChangePassword);
      this.passwordDraft.set(null);
      this.passwordDraftValid.set(true);
      this.draft.set(
        user
          ? {
              username: user.username,
              displayName: user.displayName || '',
              email: user.email || '',
              mobile: user.mobile || '',
              organizationTitleCode: user.organizationTitleCode || '',
              defaultProjectTitleCode: user.defaultProjectTitleCode || '',
              remark: user.remark || '',
              status: user.status,
              loginEnabled: user.loginEnabled,
              primaryDepartmentId: user.primaryDepartment?.departmentId || user.departments[0]?.departmentId || '',
              managerUserId: user.managerUserId || '',
            }
          : { ...DEFAULT_USER_DRAFT }
      );
      this.loadRoles(user.id);
    });
  }

  updateField(field: keyof UserDraft, value: any): void {
    this.draft.update((draft) => ({ ...draft, [field]: value }));
  }

  submitForm(): void {
    const currentUser = this.user();
    const draft = this.draft();
    if (!this.canSubmit()) {
      return;
    }

    const departments = [
      ...(draft.primaryDepartmentId
        ? [{ departmentId: draft.primaryDepartmentId }]
        : []),
    ];

    const normalizedTitleCode = draft.organizationTitleCode?.trim() || '';
    const isActiveTitle = this.titleOptions().some((item) => item.value === normalizedTitleCode);
    const keepHistoricalInactiveTitle =
      !!currentUser.organizationTitleCode && normalizedTitleCode === currentUser.organizationTitleCode && !isActiveTitle;
    const normalizedProjectTitleCode = draft.defaultProjectTitleCode?.trim() || '';
    const isActiveProjectTitle = this.projectTitleOptions().some((item) => item.value === normalizedProjectTitleCode);
    const keepHistoricalInactiveProjectTitle =
      !!currentUser.defaultProjectTitleCode &&
      normalizedProjectTitleCode === currentUser.defaultProjectTitleCode &&
      !isActiveProjectTitle;

    const loginEnabled = draft.status === 'active' && draft.loginEnabled;

    this.update.emit({
      input: {
        displayName: draft.displayName.trim() || null,
        email: draft.email.trim() || null,
        mobile: draft.mobile.trim() || null,
        organizationTitleCode: keepHistoricalInactiveTitle ? undefined : (normalizedTitleCode || null),
        defaultProjectTitleCode: keepHistoricalInactiveProjectTitle ? undefined : (normalizedProjectTitleCode || null),
        remark: draft.remark.trim() || null,
        status: draft.status,
        loginEnabled,
        mustChangePassword: loginEnabled ? this.mustChangePassword() : currentUser.mustChangePassword,
        departments,
        managerUserId: draft.managerUserId.trim() || null,
      },
      roleIds: this.selectedRoleIds(),
      passwordDraft: loginEnabled ? this.passwordDraft() : null,
    });
  }

  private loadRoles(userId: string): void {
    this.rolesLoading.set(true);
    this.rolePermissionsByRoleId.set({});
    forkJoin({
      roles: this.userRbacApi.listRoles({ status: 'active' }),
      selected: this.userRbacApi.listUserSystemRoles(userId),
    }).subscribe({
      next: ({ roles, selected }) => {
        this.availableRoles.set(roles);
        this.selectedRoleIds.set(selected.map((item) => item.roleId));
        this.loadRolePermissions(roles);
      },
      error: () => {
        this.availableRoles.set([]);
        this.selectedRoleIds.set([]);
        this.rolePermissionsByRoleId.set({});
        this.rolesLoading.set(false);
        this.message.error('加载用户角色失败');
      },
    });
  }

  private loadRolePermissions(roles: SystemRoleEntity[]): void {
    if (roles.length === 0) {
      this.rolesLoading.set(false);
      return;
    }

    forkJoin(
      roles.map((role) =>
        this.userRbacApi
          .getRolePermissions(role.id)
          .pipe(map((permissions) => [role.id, permissions] as const))
      )
    ).subscribe({
      next: (entries) => {
        this.rolePermissionsByRoleId.set(Object.fromEntries(entries));
        this.rolesLoading.set(false);
      },
      error: () => {
        this.rolePermissionsByRoleId.set({});
        this.rolesLoading.set(false);
        this.message.error('加载角色权限失败');
      },
    });
  }
}
