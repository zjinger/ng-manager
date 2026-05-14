import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { DialogShellComponent } from '@shared/ui/dialog';
import type { SystemRoleDetail, SystemPermissionEntity, RoleUserEntity } from '../../models/system-rbac.model';
import { PermissionEditorListComponent } from '../../components/permission-editor-list.component';
import { SystemRoleSummaryComponent } from '../../components/system-role-summary.component';
import { createStringSet, getRolePermissionIdSet, toggleStringSetValue } from '../../utils/system-rbac-ui';

@Component({
  selector: 'app-role-detail-dialog',
  imports: [
    NzButtonModule,
    NzIconModule,
    NzTabsModule,
    NzSpinModule,
    NzPopconfirmModule,
    DialogShellComponent,
    PermissionEditorListComponent,
    SystemRoleSummaryComponent
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [title]="'角色详情 — ' + (role()?.name || '')"
      [icon]="'safety-certificate'"
      [width]="780"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        @if (role(); as r) {
          <app-system-role-summary
            [role]="r"
            [compact]="true"
            [showStatus]="false"
          />

          <nz-tabs
            nzSize="small"
            [nzSelectedIndex]="activeTab()"
            [nzDestroyInactiveTabPane]="true"
            (nzSelectedIndexChange)="onTabChange($event)"
          >
            <nz-tab nzTitle="权限管理">
              <app-permission-editor-list
                [permissions]="permissions()"
                [checkedPermissionIds]="checkedPermissionIds()"
                [disabled]="isBuiltIn()"
                [saving]="permissionsSaving()"
                (toggle)="handlePermissionToggle($event.permissionId, $event.checked)"
                (save)="emitSavePermissions()"
              />
            </nz-tab>

            <nz-tab [nzTitle]="'成员管理 (' + users().length + ')'">
              <div class="members-header">
                <button nz-button nzType="primary" nzSize="small" (click)="addUsers.emit()">
                  <nz-icon nzType="user-add" /> 添加用户
                </button>
              </div>

              @if (usersLoading()) {
                <nz-spin nzSimple />
              } @else if (users().length === 0) {
                <div class="members-empty">暂无成员</div>
              } @else {
                <div class="members-list">
                  @for (user of users(); track user.id) {
                    <div class="member-item">
                      <div class="member-avatar">{{ getInitial(user.displayName || user.username) }}</div>
                      <div class="member-info">
                        <div class="member-name">{{ user.displayName || user.username }}</div>
                        <div class="member-email">{{ user.email || '—' }}</div>
                      </div>
                      <span class="member-date">自 {{ formatDate(user.createdAt) }}</span>
                      @if (canRemoveUser(user)) {
                        <nz-popconfirm nzPopconfirmTitle="确定移除该用户？" (nzOnConfirm)="removeUser.emit(user.userId)">
                          <button nz-button nzDanger nzSize="small" nz-popconfirm>
                            <nz-icon nzType="delete" /> 移除
                          </button>
                        </nz-popconfirm>
                      }
                    </div>
                  }
                </div>
              }
            </nz-tab>
          </nz-tabs>
        }
      </div>

      <div dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">关闭</button>
      </div>
    </app-dialog-shell>
  `,
  styles: [`
    .members-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 16px;
    }

    .members-empty {
      text-align: center;
      padding: 40px 0;
      color: var(--text-muted);
    }

    .members-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .member-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--bg-subtle);
      border-radius: 6px;
    }

    .member-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--primary-400), var(--primary-600));
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }

    .member-info {
      flex: 1;
      min-width: 0;
    }

    .member-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .member-email {
      font-size: 12px;
      color: var(--text-muted);
    }

    .member-date {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RoleDetailDialogComponent {
  readonly open = input(false);
  readonly role = input<SystemRoleDetail | null>(null);
  readonly permissions = input<SystemPermissionEntity[]>([]);
  readonly users = input<RoleUserEntity[]>([]);
  readonly usersLoading = input(false);
  readonly permissionsSaving = input(false);

  readonly cancel = output<void>();
  readonly savePermissions = output<string[]>();
  readonly addUsers = output<void>();
  readonly removeUser = output<string>();

  readonly activeTab = signal(0);
  readonly checkedPermissionIds = signal<Set<string>>(createStringSet());

  readonly isBuiltIn = computed(() => this.role()?.isBuiltin ?? true);

  constructor() {
    effect(() => {
      const r = this.role();
      this.checkedPermissionIds.set(getRolePermissionIdSet(r));
    });
  }

  onTabChange(index: number): void {
    this.activeTab.set(index);
  }

  handlePermissionToggle(permissionId: string, checked: boolean): void {
    this.checkedPermissionIds.update((ids) => toggleStringSetValue(ids, permissionId, checked));
  }

  getInitial(name: string): string {
    return name.charAt(0).toUpperCase();
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  canRemoveUser(user: RoleUserEntity): boolean {
    const role = this.role();
    if (!role) return false;
    if (role.isBuiltin && role.code === 'super_admin') return false;
    return true;
  }

  emitSavePermissions(): void {
    this.savePermissions.emit(Array.from(this.checkedPermissionIds()));
  }
}
