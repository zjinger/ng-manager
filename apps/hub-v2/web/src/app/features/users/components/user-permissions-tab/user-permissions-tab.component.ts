import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { SystemPermissionEntity, SystemRoleEntity } from '../../../admin/models/system-rbac.model';
import { groupSystemPermissions } from '../../../admin/utils/system-rbac-ui';

@Component({
  selector: 'app-user-permissions-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, NzCheckboxModule, NzIconModule],
  template: `
    <section class="user-form-section">
      <div class="user-form-section__title">
        <nz-icon nzType="user-switch" nzTheme="outline" />
        系统角色
      </div>

      @if (roles().length > 0) {
        <div class="role-select-grid">
          @for (role of roles(); track role.id) {
            <button
              type="button"
              class="role-select-card"
              [class.selected]="isSelected(role.id)"
              [disabled]="readonly()"
              (click)="toggleRole(role.id)"
            >
              <label
                nz-checkbox
                class="role-select-check"
                [ngModel]="isSelected(role.id)"
                [nzDisabled]="readonly()"
                (click)="$event.stopPropagation()"
                (ngModelChange)="onCheckboxChange(role.id, $event)"
              ></label>
              <div class="role-select-icon" [attr.data-tone]="toneFor(role)">
                <nz-icon [nzType]="iconFor(role)" nzTheme="outline" />
              </div>
              <div class="role-select-body">
                <div class="role-select-name">{{ role.name }}</div>
                <div class="role-select-desc">{{ role.description || role.purposeName }}</div>
              </div>
            </button>
          }
        </div>
      } @else {
        <div class="empty-box">当前没有可分配的系统角色。</div>
      }
    </section>

    <div class="edit-section-divider"></div>

    <section class="user-form-section">
      <div class="user-form-section__title">
        <nz-icon nzType="key" nzTheme="outline" />
        角色权限预览
      </div>

      @if (selectedRoleIds().length === 0) {
        <div class="empty-box">请选择系统角色后查看权限。</div>
      } @else {
        <div class="role-permission-list">
          @for (entry of selectedRolePermissions(); track entry.role.id) {
            <article class="role-permission-panel">
              <header class="role-permission-panel__header">
                <strong>{{ entry.role.name }}</strong>
                <span>{{ entry.permissionCount }} 项权限</span>
              </header>

              @if (entry.groups.length > 0) {
                <div class="permission-group-list">
                  @for (group of entry.groups; track group.groupCode) {
                    <div class="permission-group">
                      <div class="permission-group__title">{{ group.groupName }}</div>
                      <div class="permission-chip-list">
                        @for (permission of group.items; track permission.id) {
                          <span class="permission-chip" [title]="permission.code">
                            <strong>{{ permission.name }}</strong>
                            <span>{{ permission.code }}</span>
                          </span>
                        }
                      </div>
                    </div>
                  }
                </div>
              } @else {
                <div class="empty-box">该角色暂无已配置权限。</div>
              }
            </article>
          }
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .user-form-section {
      display: flex;
      flex-direction: column;
    }

    .user-form-section__title {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 16px;
    }

    .user-form-section__title nz-icon {
      color: var(--color-primary);
    }

    .edit-section-divider {
      height: 1px;
      background: var(--border-color-soft);
      margin: 20px 0;
    }

    .role-select-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .role-select-card {
      position: relative;
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 14px;
      text-align: left;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: var(--bg-container);
      cursor: pointer;
      transition:
        border-color 0.2s ease,
        background 0.2s ease;
    }

    .role-select-check {
      position: absolute;
      top: 10px;
      right: 10px;
      line-height: 1;
      z-index: 1;
    }

    .role-select-card:hover:not(:disabled) {
      border-color: var(--color-primary);
      background: var(--bg-subtle);
    }

    .role-select-card.selected {
      border-color: var(--color-primary);
      background: var(--color-info-light);
    }

    .role-select-card:disabled {
      opacity: 0.7;
      cursor: default;
    }

    .role-select-icon {
      width: 36px;
      height: 36px;
      flex: 0 0 36px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--bg-subtle);
      color: var(--text-muted);
    }

    .role-select-icon[data-tone='danger'] {
      background: rgba(239, 68, 68, 0.14);
      color: #dc2626;
    }

    .role-select-icon[data-tone='primary'] {
      background: rgba(99, 102, 241, 0.14);
      color: #4f46e5;
    }

    .role-select-icon[data-tone='info'] {
      background: rgba(59, 130, 246, 0.14);
      color: #2563eb;
    }

    .role-select-body {
      min-width: 0;
      display: grid;
      gap: 3px;
    }

    .role-select-name {
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 600;
    }

    .role-select-desc {
      color: var(--text-muted);
      font-size: 12px;
    }

    .empty-box {
      display: grid;
      gap: 4px;
      padding: 14px 16px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: var(--bg-subtle);
    }

    .empty-box {
      color: var(--text-muted);
      font-size: 12px;
    }

    .role-permission-list {
      display: grid;
      gap: 12px;
    }

    .role-permission-panel {
      display: grid;
      gap: 12px;
      padding: 14px 16px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: var(--bg-container);
    }

    .role-permission-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .role-permission-panel__header strong {
      min-width: 0;
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 700;
    }

    .role-permission-panel__header span {
      flex: 0 0 auto;
      color: var(--text-muted);
      font-size: 12px;
    }

    .permission-group-list {
      display: grid;
      gap: 12px;
    }

    .permission-group {
      display: grid;
      gap: 8px;
    }

    .permission-group__title {
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 700;
    }

    .permission-chip-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .permission-chip {
      display: inline-grid;
      gap: 2px;
      max-width: 220px;
      padding: 7px 10px;
      border: 1px solid var(--border-color-soft);
      border-radius: 8px;
      background: var(--bg-subtle);
    }

    .permission-chip strong,
    .permission-chip span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .permission-chip strong {
      color: var(--text-primary);
      font-size: 12px;
      font-weight: 600;
    }

    .permission-chip span {
      color: var(--text-muted);
      font-family: 'SFMono-Regular', Consolas, monospace;
      font-size: 11px;
    }

    @media (max-width: 600px) {
      .role-select-grid {
        grid-template-columns: 1fr;
      }

      .role-permission-panel__header {
        align-items: flex-start;
        flex-direction: column;
      }

      .permission-chip {
        max-width: 100%;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPermissionsTabComponent {
  readonly roles = input.required<SystemRoleEntity[]>();
  readonly selectedRoleIds = input<string[]>([]);
  readonly permissionsByRoleId = input<Record<string, SystemPermissionEntity[]>>({});
  readonly readonly = input(false);
  readonly selectionChange = output<string[]>();

  readonly selectedRolePermissions = computed(() => {
    const selectedRoleIds = new Set(this.selectedRoleIds());
    const permissionsByRoleId = this.permissionsByRoleId();
    return this.roles()
      .filter((role) => selectedRoleIds.has(role.id))
      .map((role) => {
        const permissions = permissionsByRoleId[role.id] ?? [];
        return {
          role,
          permissionCount: permissions.length,
          groups: groupSystemPermissions(permissions),
        };
      });
  });

  isSelected(roleId: string): boolean {
    return this.selectedRoleIds().includes(roleId);
  }

  toggleRole(roleId: string): void {
    if (this.readonly()) {
      return;
    }
    const current = new Set(this.selectedRoleIds());
    if (current.has(roleId)) {
      current.delete(roleId);
    } else {
      current.add(roleId);
    }
    this.selectionChange.emit([...current]);
  }

  onCheckboxChange(roleId: string, checked: boolean): void {
    if (this.readonly()) {
      return;
    }
    const selected = this.isSelected(roleId);
    if (checked === selected) {
      return;
    }
    this.toggleRole(roleId);
  }

  iconFor(role: SystemRoleEntity): string {
    if (role.code === 'super_admin') {
      return 'crown';
    }
    if (role.code === 'admin') {
      return 'safety-certificate';
    }
    return role.purposeCode === 'platform_admin' ? 'setting' : 'team';
  }

  toneFor(role: SystemRoleEntity): 'danger' | 'primary' | 'info' {
    if (role.code === 'super_admin') {
      return 'danger';
    }
    if (role.code === 'admin') {
      return 'primary';
    }
    return 'info';
  }
}
