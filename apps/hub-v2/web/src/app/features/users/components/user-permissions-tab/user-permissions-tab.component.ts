import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

export interface RoleOption {
  code: string;
  name: string;
  description: string;
  icon: string;
  color: 'red' | 'purple' | 'blue' | 'gray' | 'orange';
}

export interface PermissionOverrides {
  allowExport: boolean;
  allowDelete: boolean;
  allowApiAccess: boolean;
  viewAuditLog: boolean;
}

const DEMO_ROLES: RoleOption[] = [
  { code: 'super_admin', name: '超级管理员', description: '系统全部权限', icon: 'crown', color: 'red' },
  { code: 'admin', name: '管理员', description: '用户与部门管理', icon: 'shield', color: 'purple' },
  { code: 'manager', name: '项目经理', description: '项目与任务管理', icon: 'apartment', color: 'blue' },
  { code: 'member', name: '开发者', description: '代码与文档权限', icon: 'code', color: 'gray' },
  { code: 'guest', name: '访客', description: '只读访问权限', icon: 'eye', color: 'orange' },
  { code: 'support', name: '客服', description: '工单与客户管理', icon: 'customer-service', color: 'blue' },
];

const DEMO_OVERRIDES = [
  { key: 'allowExport', name: '允许导出数据', description: '覆盖角色默认的导出限制' },
  { key: 'allowDelete', name: '允许删除资源', description: '覆盖角色默认的删除限制' },
  { key: 'allowApiAccess', name: '允许 API 访问', description: '允许通过 API 进行数据操作' },
  { key: 'viewAuditLog', name: '查看审计日志', description: '允许查看系统操作审计记录' },
];

@Component({
  selector: 'app-user-permissions-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzIconModule,
    NzSwitchModule,
  ],
  template: `
    <section class="user-form-section">
      <div class="user-form-section__title">
        <nz-icon nzType="user-switch" nzTheme="outline" />
        角色分配
      </div>
      <div class="role-select-grid">
        @for (role of roles; track role.code) {
          <div
            class="role-select-card"
            [class.selected]="selectedRole() === role.code"
            (click)="selectRole(role.code)"
          >
            <div class="role-select-icon" [ngClass]="role.color">
              <nz-icon [nzType]="role.icon" nzTheme="outline" />
            </div>
            <div>
              <div class="role-select-name">{{ role.name }}</div>
              <div class="role-select-desc">{{ role.description }}</div>
            </div>
          </div>
        }
      </div>
    </section>

    <div class="edit-section-divider"></div>

    <section class="user-form-section">
      <div class="user-form-section__title">
        <nz-icon nzType="control" nzTheme="outline" />
        权限覆盖
      </div>
      <p class="permissions-hint">以下设置会覆盖角色默认权限，仅对当前用户生效</p>
      <div class="permissions-overrides-list">
        @for (perm of permissionItems; track perm.key) {
          <div class="status-toggle-card">
            <div class="status-toggle-info">
              <div class="status-toggle-name">{{ perm.name }}</div>
              <div class="status-toggle-desc">{{ perm.description }}</div>
            </div>
            <nz-switch
              [ngModel]="getOverrideValue(perm.key)"
              (ngModelChange)="toggleOverride(perm.key, $event)"
            />
          </div>
        }
      </div>
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
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .role-select-card {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 2px solid var(--border-color);
      border-radius: var(--border-radius-sm, 6px);
      cursor: pointer;
      transition: all 0.2s ease;
      position: relative;
    }

    .role-select-card:hover {
      border-color: var(--primary-300);
    }

    .role-select-card.selected {
      border-color: var(--primary-500);
      background: var(--primary-50);
    }

    .role-select-card.selected::after {
      content: '\\e999';
      font-family: 'anticon';
      position: absolute;
      top: 6px;
      right: 8px;
      color: var(--primary-500);
      font-size: 14px;
    }

    .role-select-icon {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      flex-shrink: 0;
    }

    .role-select-icon.red {
      background: #FEE2E2;
      color: #DC2626;
    }

    .role-select-icon.purple {
      background: #EDE9FE;
      color: #7C3AED;
    }

    .role-select-icon.blue {
      background: var(--info-light, #DBEAFE);
      color: var(--info, #3B82F6);
    }

    .role-select-icon.gray {
      background: var(--gray-100, #F1F5F9);
      color: var(--gray-600, #475569);
    }

    .role-select-icon.orange {
      background: var(--warning-light, #FEF3C7);
      color: var(--warning, #F59E0B);
    }

    .role-select-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .role-select-desc {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 1px;
    }

    .permissions-hint {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0 0 12px;
    }

    .permissions-overrides-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .status-toggle-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius-sm, 6px);
    }

    .status-toggle-info {
      flex: 1;
      min-width: 0;
    }

    .status-toggle-name {
      font-size: 13px;
      font-weight: 500;
      color: var(--text-primary);
    }

    .status-toggle-desc {
      font-size: 12px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    @media (max-width: 600px) {
      .role-select-grid {
        grid-template-columns: 1fr;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPermissionsTabComponent {
  readonly selectedRole = input<string>('member');
  readonly overrides = input<PermissionOverrides>({
    allowExport: true,
    allowDelete: false,
    allowApiAccess: true,
    viewAuditLog: false,
  });
  readonly roleChange = output<string>();
  readonly overridesChange = output<PermissionOverrides>();

  readonly roles = DEMO_ROLES;
  readonly permissionItems = DEMO_OVERRIDES;

  selectRole(roleCode: string): void {
    this.roleChange.emit(roleCode);
  }

  toggleOverride(key: string, value: boolean): void {
    const current = this.overrides();
    this.overridesChange.emit({
      ...current,
      [key]: value,
    });
  }

  getOverrideValue(key: string): boolean {
    const overrides = this.overrides();
    return (overrides as any)[key] ?? false;
  }
}
