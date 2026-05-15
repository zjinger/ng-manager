import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { LoadingStateComponent } from '@shared/ui/loading-state';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { PageToolbarComponent } from '@shared/ui/page-toolbar';
import type { SystemPermissionEntity, SystemRoleDetail, SystemRoleWithCounts } from '../models/system-rbac.model';
import { SystemRbacApiService } from '../services/system-rbac-api.service';
import {
  areStringSetsEqual,
  createStringSet,
  getRolePermissionIdSet,
  toggleStringSetValue,
  type PermissionMatrixColumn
} from '../utils/system-rbac-ui';
import { PermissionMatrixCardComponent } from './permissions-page/permission-matrix-card.component';

@Component({
  selector: 'app-permissions-page',
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    PageHeaderComponent,
    PageToolbarComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    PermissionMatrixCardComponent
  ],
  template: `
    <app-page-header
      title="权限配置"
      [subtitle]="headerSubtitle()"
    />

    <app-page-toolbar>
      <div toolbar-filters class="role-filter">
        <span class="role-filter__label">查看角色</span>
        <nz-select
          [ngModel]="selectedRoleId()"
          (ngModelChange)="handleRoleChange($event)"
          [ngModelOptions]="{ standalone: true }"
          [nzLoading]="rolesLoading()"
          nzPlaceHolder="选择角色"
          style="width: 240px"
        >
          @for (role of roles(); track role.id) {
            <nz-option
              [nzLabel]="role.name + (role.isBuiltin ? ' · 内置' : '')"
              [nzValue]="role.id"
            />
          }
        </nz-select>
      </div>

      <div toolbar-actions class="toolbar-actions">
        <button
          nz-button
          [disabled]="!selectedRoleId() || detailLoading() || !hasSelectionSnapshot()"
          (click)="restoreSnapshot()"
        >
          <nz-icon nzType="undo" />
          恢复默认
        </button>

        <button
          nz-button
          nzType="primary"
          [nzLoading]="saving()"
          [disabled]="!canSave()"
          (click)="savePermissions()"
        >
          <nz-icon nzType="save" />
          保存配置
        </button>
      </div>
    </app-page-toolbar>

    @if (loading()) {
      <app-loading-state text="正在加载权限配置…" />
    } @else if (roles().length === 0) {
      <app-empty-state
        title="暂无角色数据"
        description="请先在角色管理中创建或初始化系统角色"
        icon="key"
      />
    } @else {
      <section class="permissions-page">
        <app-permission-matrix-card
          [role]="detail()"
          [permissions]="matrixPermissions()"
          [checkedPermissionIds]="checkedPermissionIds()"
          [loading]="detailLoading()"
          (toggle)="togglePermission($event.permissionId, $event.column)"
        />
      </section>
    }
  `,
  styles: [`
    .role-filter {
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }

    .role-filter__label {
      font-size: 13px;
      color: var(--text-muted);
      white-space: nowrap;
    }

    .toolbar-actions {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .permissions-page {
      min-width: 0;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionsPageComponent {
  private readonly api = inject(SystemRbacApiService);
  private readonly message = inject(NzMessageService);

  readonly roles = signal<SystemRoleWithCounts[]>([]);
  readonly permissions = signal<SystemPermissionEntity[]>([]);
  readonly selectedRoleId = signal('');
  readonly detail = signal<SystemRoleDetail | null>(null);
  readonly checkedPermissionIds = signal<Set<string>>(createStringSet());
  readonly loadedPermissionSnapshot = signal<Set<string> | null>(null);
  readonly rolesLoading = signal(false);
  readonly detailLoading = signal(false);
  readonly permissionsLoading = signal(false);
  readonly saving = signal(false);
  readonly matrixPermissions = computed(() => {
    const activePermissions = this.permissions();
    const rolePermissions = this.detail()?.permissions ?? [];
    const merged = new Map(activePermissions.map((item) => [item.id, item]));
    for (const permission of rolePermissions) {
      if (!merged.has(permission.id)) {
        merged.set(permission.id, permission);
      }
    }
    return Array.from(merged.values());
  });

  readonly loading = computed(() => this.rolesLoading() || this.permissionsLoading());
  readonly headerSubtitle = computed(() => {
    const role = this.detail();
    if (!role) {
      return '按角色集中查看和维护系统权限，当前仅映射已有权限码。';
    }
    return `按角色集中查看和维护系统权限，当前角色：${role.name}`;
  });
  readonly hasSelectionSnapshot = computed(() => this.loadedPermissionSnapshot() !== null);
  readonly canSave = computed(() => {
    const role = this.detail();
    return !!role && !role.isBuiltin && !this.detailLoading() && this.hasChanges();
  });

  constructor() {
    this.loadRoles();
    this.loadPermissions();
  }

  loadRoles(): void {
    this.rolesLoading.set(true);
    this.api.listRoles().subscribe({
      next: (items) => {
        this.roles.set(items);
        this.rolesLoading.set(false);
        if (!this.selectedRoleId() && items.length > 0) {
          this.handleRoleChange(items[0].id);
        }
      },
      error: () => {
        this.rolesLoading.set(false);
        this.message.error('加载角色列表失败');
      }
    });
  }

  loadPermissions(): void {
    this.permissionsLoading.set(true);
    this.api.listPermissions({ status: 'active' }).subscribe({
      next: (items) => {
        this.permissions.set(items);
        this.permissionsLoading.set(false);
      },
      error: () => {
        this.permissionsLoading.set(false);
        this.message.error('加载权限目录失败');
      }
    });
  }

  handleRoleChange(roleId: string): void {
    this.selectedRoleId.set(roleId);
    this.loadRoleDetail(roleId);
  }

  loadRoleDetail(roleId: string): void {
    this.detailLoading.set(true);
    this.detail.set(null);
    this.checkedPermissionIds.set(createStringSet());
    this.loadedPermissionSnapshot.set(null);
    this.api.getRoleDetail(roleId).subscribe({
      next: (detail) => {
        const permissionIds = getRolePermissionIdSet(detail);
        this.detail.set(detail);
        this.checkedPermissionIds.set(permissionIds);
        this.loadedPermissionSnapshot.set(createStringSet(permissionIds));
        this.detailLoading.set(false);
      },
      error: () => {
        this.detailLoading.set(false);
        this.message.error('加载角色权限失败');
      }
    });
  }

  restoreSnapshot(): void {
    const snapshot = this.loadedPermissionSnapshot();
    if (snapshot) {
      this.checkedPermissionIds.set(createStringSet(snapshot));
    }
  }

  togglePermission(permissionId: string, column: PermissionMatrixColumn): void {
    const role = this.detail();
    if (!role || role.isBuiltin || column !== 'manage') {
      return;
    }
    this.checkedPermissionIds.update((current) => toggleStringSetValue(current, permissionId));
  }

  savePermissions(): void {
    const role = this.detail();
    if (!role || role.isBuiltin || !this.hasChanges()) {
      return;
    }
    this.saving.set(true);
    this.api.setRolePermissions(role.id, { permissionIds: Array.from(this.checkedPermissionIds()) }).subscribe({
      next: () => {
        this.message.success('权限配置已保存');
        this.saving.set(false);
        this.loadRoleDetail(role.id);
      },
      error: () => {
        this.saving.set(false);
        this.message.error('保存权限配置失败');
      }
    });
  }

  private hasChanges(): boolean {
    const snapshot = this.loadedPermissionSnapshot();
    if (!snapshot) {
      return false;
    }
    return !areStringSetsEqual(snapshot, this.checkedPermissionIds());
  }
}
