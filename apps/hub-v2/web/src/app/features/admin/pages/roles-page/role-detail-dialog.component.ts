import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTabsModule } from 'ng-zorro-antd/tabs';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { DialogShellComponent } from '@shared/ui/dialog';
import type { SystemRoleDetail, SystemPermissionEntity, RoleUserEntity } from '../../models/system-rbac.model';

interface PermissionGroup {
  groupCode: string;
  groupName: string;
  permissions: SystemPermissionEntity[];
}

@Component({
  selector: 'app-role-detail-dialog',
  imports: [
    NzButtonModule,
    NzIconModule,
    NzTabsModule,
    NzCheckboxModule,
    NzTagModule,
    NzSpinModule,
    NzPopconfirmModule,
    DialogShellComponent
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
          <div class="role-header">
            <span class="role-badge" [class]="'role-badge--' + getBadgeClass(r)">{{ r.name }}</span>
            @if (r.isBuiltin) {
              <nz-tag nzColor="blue">系统内置 · 不可编辑</nz-tag>
            } @else {
              <nz-tag nzColor="orange">自定义</nz-tag>
            }
            <span class="role-header__member-count">
              <nz-icon nzType="team" /> {{ r.userCount }} 名成员
            </span>
          </div>

          @if (r.description) {
            <p class="role-desc">{{ r.description }}</p>
          }

          <nz-tabs
            nzSize="small"
            [nzSelectedIndex]="activeTab()"
            [nzDestroyInactiveTabPane]="true"
            (nzSelectedIndexChange)="onTabChange($event)"
          >
            <nz-tab nzTitle="权限管理">
              @if (permissionsSaving()) {
                <div class="saving-overlay">
                  <nz-spin nzSimple />
                </div>
              }
              @for (group of permissionGroups(); track group.groupCode) {
                <div class="perm-group">
                  <div class="perm-group__header">{{ group.groupName }}</div>
                  <div class="perm-group__items">
                    @for (perm of group.permissions; track perm.id) {
                    <div class="perm-row">
                      <label nz-checkbox [nzChecked]="isPermissionChecked(perm.id)" [nzDisabled]="isBuiltIn()" (nzCheckedChange)="togglePermission(perm.id, $event)"></label>
                      <div class="perm-content">
                        <span class="perm-name">{{ perm.name }}</span>
                        <span class="perm-code">{{ perm.code }}</span>
                      </div>
                    </div>
                    }
                  </div>
                </div>
              }
              @if (!isBuiltIn()) {
                <div class="perm-actions">
                  <button nz-button nzType="primary" [nzLoading]="permissionsSaving()" (click)="emitSavePermissions()">
                    <nz-icon nzType="save" /> 保存权限配置
                  </button>
                </div>
              }
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
    .role-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color-soft);
    }

    .role-badge {
      font-size: 13px;
      padding: 3px 12px;
      border-radius: 4px;
      font-weight: 600;
    }

    .role-badge--super-admin { background: #FEE2E2; color: #DC2626; }
    .role-badge--admin { background: #EDE9FE; color: #7C3AED; }
    .role-badge--member { background: var(--bg-subtle); color: var(--text-secondary); }
    .role-badge--custom { background: var(--primary-50); color: var(--primary-600); }

    .role-header__member-count {
      margin-left: auto;
      font-size: 13px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .role-desc {
      font-size: 14px;
      color: var(--text-secondary);
      line-height: 1.7;
      margin-bottom: 20px;
    }

    .perm-group {
      margin-bottom: 20px;
    }

    .perm-group__header {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-heading);
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid var(--border-color-soft);
    }

    .perm-group__items {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .perm-row {
      display: grid;
      grid-template-columns: 24px 1fr;
      align-items: center;
      gap: 8px;
      min-height: 32px;
      padding: 2px 0;
    }

    .perm-content {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .perm-name {
      font-size: 13px;
      color: var(--text-primary);
      white-space: nowrap;
    }

    .perm-code {
      font-size: 11px;
      color: var(--text-muted);
      font-family: monospace;
      white-space: nowrap;
    }

    .perm-actions {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border-color-soft);
    }

    .saving-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.7);
      z-index: 10;
    }

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
  readonly checkedPermissionIds = signal<Set<string>>(new Set());

  readonly isBuiltIn = computed(() => this.role()?.isBuiltin ?? true);

  readonly permissionGroups = computed<PermissionGroup[]>(() => {
    const perms = this.permissions();
    const groups = new Map<string, PermissionGroup>();
    for (const perm of perms) {
      if (!groups.has(perm.groupCode)) {
        groups.set(perm.groupCode, { groupCode: perm.groupCode, groupName: perm.groupName, permissions: [] });
      }
      groups.get(perm.groupCode)!.permissions.push(perm);
    }
    return Array.from(groups.values());
  });

  constructor() {
    effect(() => {
      const r = this.role();
      if (r && r.permissions) {
        this.checkedPermissionIds.set(new Set(r.permissions.map((p) => p.id)));
      } else {
        this.checkedPermissionIds.set(new Set());
      }
    });
  }

  onTabChange(index: number): void {
    this.activeTab.set(index);
  }

  isPermissionChecked(permissionId: string): boolean {
    return this.checkedPermissionIds().has(permissionId);
  }

  togglePermission(permissionId: string, checked: boolean): void {
    this.checkedPermissionIds.update((ids) => {
      const next = new Set(ids);
      if (checked) {
        next.add(permissionId);
      } else {
        next.delete(permissionId);
      }
      return next;
    });
  }

  getBadgeClass(role: SystemRoleDetail): string {
    if (role.code === 'super_admin') return 'super-admin';
    if (role.code === 'admin') return 'admin';
    if (role.code === 'member') return 'member';
    return 'custom';
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
