import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import type { SystemPermissionEntity, SystemRoleDetail } from '../../models/system-rbac.model';
import {
  groupSystemPermissions,
  type PermissionMatrixColumn
} from '../../utils/system-rbac-ui';
import { SystemRoleSummaryComponent } from '../../components/system-role-summary.component';

@Component({
  selector: 'app-permission-matrix-card',
  imports: [NzIconModule, NzSpinModule, SystemRoleSummaryComponent],
  template: `
    @if (role(); as currentRole) {
      <div class="permissions-card">
        <div class="permissions-card__header">
          <app-system-role-summary
            [role]="currentRole"
            [summaryText]="checkedPermissionIds().size + ' / ' + permissions().length + ' 项已授权'"
            [fallbackDescription]="'按角色集中查看和维护系统权限。'"
          />
          <span class="permissions-card__readonly">
            {{ currentRole.isBuiltin ? '内置角色仅支持查看' : '按角色维护系统权限' }}
          </span>
        </div>

        @if (loading()) {
          <div class="permissions-card__loading">
            <nz-spin nzSimple />
          </div>
        } @else if (permissionGroups().length === 0) {
          <div class="permissions-card__empty">暂无权限目录</div>
        } @else {
          <div class="permissions-matrix-wrap">
            <table class="permissions-matrix">
              <thead>
                <tr>
                  <th>权限项</th>
                  <th>管理</th>
                </tr>
              </thead>
              <tbody>
                @for (group of permissionGroups(); track group.groupCode) {
                  <tr class="permissions-matrix__group-row">
                    <td colspan="2">{{ group.groupName }}</td>
                  </tr>
                  @for (perm of group.items; track perm.id) {
                    <tr>
                      <td class="permissions-matrix__permission-cell">
                        <div class="permissions-matrix__permission-name">{{ perm.name }}</div>
                        <div class="permissions-matrix__permission-code">{{ perm.code }}</div>
                      </td>
                      <td>
                        <button
                          type="button"
                          class="perm-check"
                          [class.perm-check--granted]="isCellGranted(perm.id)"
                          [class.perm-check--disabled]="currentRole.isBuiltin"
                          [disabled]="currentRole.isBuiltin"
                          [attr.aria-label]="perm.name + ' 管理'"
                          (click)="toggle.emit({ permissionId: perm.id, column: 'manage' })"
                        >
                          <nz-icon [nzType]="getCellIcon(perm.id)" />
                        </button>
                      </td>
                    </tr>
                  }
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .permissions-card {
      background: var(--bg-container);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      overflow: hidden;
    }

    .permissions-card__header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border-color-soft);
    }

    .permissions-card__readonly {
      display: block;
      margin-top: 6px;
      color: var(--text-secondary);
      font-size: 12px;
    }

    .permissions-card__loading,
    .permissions-card__empty {
      padding: 40px 24px;
      display: flex;
      justify-content: center;
      color: var(--text-muted);
    }

    .permissions-matrix-wrap {
      overflow-x: auto;
    }

    .permissions-matrix {
      width: 100%;
      border-collapse: collapse;
      min-width: 520px;
    }

    .permissions-matrix th {
      padding: 10px 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      text-align: center;
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border-color);
      white-space: nowrap;
    }

    .permissions-matrix th:first-child {
      text-align: left;
      width: 280px;
      padding-left: 20px;
    }

    .permissions-matrix td {
      padding: 10px 12px;
      text-align: center;
      border-bottom: 1px solid var(--border-color-soft);
    }

    .permissions-matrix__group-row td {
      background: var(--bg-subtle);
      color: var(--text-secondary);
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      text-align: left;
      padding: 10px 20px;
    }

    .permissions-matrix__permission-cell {
      text-align: left;
      padding-left: 20px;
    }

    .permissions-matrix__permission-name {
      color: var(--text-primary);
      font-size: 13px;
      font-weight: 500;
    }

    .permissions-matrix__permission-code {
      color: var(--text-muted);
      font-size: 11px;
      font-family: monospace;
      margin-top: 4px;
    }

    .perm-check {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      background: var(--bg-container);
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: var(--transition);
      cursor: pointer;
    }

    .perm-check--granted {
      background: var(--primary-50);
      border-color: var(--primary-200);
      color: var(--primary-600);
    }

    .perm-check--disabled {
      background: var(--bg-subtle);
      color: var(--text-disabled, var(--text-muted));
      cursor: not-allowed;
    }

    .perm-check:not(.perm-check--disabled):hover {
      border-color: var(--primary-300);
      color: var(--primary-600);
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionMatrixCardComponent {
  readonly role = input<SystemRoleDetail | null>(null);
  readonly permissions = input<SystemPermissionEntity[]>([]);
  readonly checkedPermissionIds = input<Set<string>>(new Set());
  readonly loading = input(false);

  readonly toggle = output<{ permissionId: string; column: PermissionMatrixColumn }>();

  readonly permissionGroups = computed(() => groupSystemPermissions(this.permissions()));

  isCellGranted(permissionId: string): boolean {
    return this.checkedPermissionIds().has(permissionId);
  }

  getCellIcon(permissionId: string): string {
    return this.checkedPermissionIds().has(permissionId) ? 'check' : 'close';
  }
}
