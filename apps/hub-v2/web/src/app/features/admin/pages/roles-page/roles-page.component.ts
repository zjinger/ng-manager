import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '@shared/ui/empty-state';
import { LoadingStateComponent } from '@shared/ui/loading-state';
import { PageHeaderComponent } from '@shared/ui/page-header';
import { PageToolbarComponent } from '@shared/ui/page-toolbar';
import { SearchBoxComponent } from '@shared/ui/search-box';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import type {
  CreateSystemRoleInput,
  RoleUserEntity,
  SystemPermissionEntity,
  SystemRoleDetail,
  SystemRoleWithCounts,
  UpdateSystemRoleInput,
} from '../../models/system-rbac.model';
import { SystemRbacApiService } from '../../services/system-rbac-api.service';
import { canModifySystemRole } from '../../utils/system-rbac-ui';
import { AddUsersDialogComponent } from './add-users-dialog.component';
import { RoleDetailDialogComponent } from './role-detail-dialog.component';
import { RoleFormDialogComponent } from './role-form-dialog.component';

@Component({
  selector: 'app-roles-page',
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzSelectModule,
    NzPopconfirmModule,
    NzTagModule,
    NzTooltipModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    LoadingStateComponent,
    EmptyStateComponent,
    RoleFormDialogComponent,
    RoleDetailDialogComponent,
    AddUsersDialogComponent,
  ],
  template: `
    <app-page-header title="角色管理" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" (click)="openCreateRole()">
        <nz-icon nzType="plus" /> 新建角色
      </button>

      <nz-select
        toolbar-filters
        [ngModel]="typeFilter()"
        (ngModelChange)="typeFilter.set($event)"
        [ngModelOptions]="{ standalone: true }"
        style="width: 140px"
      >
        <nz-option nzLabel="全部类型" nzValue="" />
        <nz-option nzLabel="系统内置" nzValue="builtin" />
        <nz-option nzLabel="自定义" nzValue="custom" />
      </nz-select>

      <nz-select
        toolbar-filters
        [ngModel]="statusFilter()"
        (ngModelChange)="handleStatusFilterChange($event)"
        [ngModelOptions]="{ standalone: true }"
        style="width: 140px"
      >
        <nz-option nzLabel="全部状态" nzValue="" />
        <nz-option nzLabel="启用中" nzValue="active" />
        <nz-option nzLabel="已停用" nzValue="inactive" />
      </nz-select>

      <app-search-box
        toolbar-search
        placeholder="搜索角色名称…"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="loadRoles()"
      />
    </app-page-toolbar>

    @if (loading()) {
      <app-loading-state text="正在加载角色列表…" />
    } @else if (filteredRoles().length === 0) {
      <app-empty-state
        title="暂无角色数据"
        description="点击「新建角色」创建第一个系统角色"
        icon="safety-certificate"
      />
    } @else {
      <div class="roles-grid">
        @for (role of filteredRoles(); track role.id) {
          <div class="role-card" (click)="openRoleDetail(role)">
            <div class="role-card__header">
              <div class="role-card__header-meta">
                <span
                  class="role-card__badge"
                  [class]="'role-card__badge--' + getRoleBadgeClass(role)"
                >
                  {{ role.name }}
                </span>
                @if (role.isBuiltin) {
                  <nz-tag nzColor="blue">系统内置</nz-tag>
                } @else {
                  <nz-tag nzColor="orange">自定义</nz-tag>
                }
                <nz-tag [nzColor]="role.status === 'active' ? 'green' : 'default'">
                  {{ role.status === 'active' ? '启用中' : '已停用' }}
                </nz-tag>
              </div>
            </div>
            <div class="role-card__body">
              <p class="role-card__desc">{{ role.description || '暂无描述' }}</p>
              <div class="role-card__meta">
                <span><nz-icon nzType="team" /> {{ role.userCount }} 人</span>
                <span><nz-icon nzType="key" /> {{ role.permissionCount }} 项权限</span>
                @if (!canModifyRole(role)) {
                  <span><nz-icon nzType="lock" /> 不可编辑</span>
                }
              </div>
            </div>
            @if (canModifyRole(role)) {
              <div class="role-card__actions" (click)="$event.stopPropagation()">
                <button nz-button nzSize="small" (click)="openEditRole(role)">编辑</button>
                <button nz-button nzSize="small" (click)="toggleRoleStatus(role)">
                  {{ role.status === 'active' ? '停用' : '启用' }}
                </button>
                @if (!role.isBuiltin) {
                  <nz-popconfirm
                    nzPopconfirmTitle="确定删除该角色？"
                    (nzOnConfirm)="deleteRole(role)"
                  >
                    <button nz-button nzDanger nzSize="small" nz-popconfirm>删除</button>
                  </nz-popconfirm>
                }
              </div>
            }
          </div>
        }
      </div>
    }

    <app-role-form-dialog
      [open]="formDialogOpen()"
      [busy]="formBusy()"
      [mode]="formDialogMode()"
      [role]="editingRole()"
      [roles]="roles()"
      (cancel)="closeFormDialog()"
      (create)="handleCreate($event)"
      (update)="handleUpdate($event)"
    />

    <app-role-detail-dialog
      [open]="detailDialogOpen()"
      [role]="detailRole()"
      [permissions]="allPermissions()"
      [users]="detailUsers()"
      [usersLoading]="detailUsersLoading()"
      [permissionsSaving]="permissionsSaving()"
      (cancel)="closeDetailDialog()"
      (savePermissions)="handleSavePermissions($event)"
      (addUsers)="openAddUsers()"
      (removeUser)="handleRemoveUser($event)"
    />

    <app-add-users-dialog
      [open]="addUsersDialogOpen()"
      [busy]="addUsersBusy()"
      [roleId]="detailRole()?.id || ''"
      [existingUserIds]="existingUserIds()"
      (cancel)="closeAddUsers()"
      (add)="handleAddUsers($event)"
    />
  `,
  styles: [
    `
      .roles-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
      }

      @media (max-width: 1200px) {
        .roles-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      @media (max-width: 800px) {
        .roles-grid {
          grid-template-columns: 1fr;
        }
      }

      .role-card {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 8px;
        cursor: pointer;
        transition: var(--transition);
        overflow: hidden;
      }

      .role-card:hover {
        box-shadow: var(--shadow-md);
        border-color: var(--primary-300);
      }

      .role-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        border-bottom: 1px solid var(--border-color-soft);
      }

      .role-card__header-meta {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .role-card__badge {
        font-size: 13px;
        padding: 2px 10px;
        border-radius: 4px;
        font-weight: 600;
      }

      .role-card__badge--super-admin {
        background: #fee2e2;
        color: #dc2626;
      }
      .role-card__badge--admin {
        background: #ede9fe;
        color: #7c3aed;
      }
      .role-card__badge--member {
        background: var(--bg-subtle);
        color: var(--text-secondary);
      }
      .role-card__badge--custom {
        background: var(--primary-50);
        color: var(--primary-600);
      }

      .role-card__body {
        padding: 16px 20px;
      }

      .role-card__desc {
        font-size: 13px;
        color: var(--text-muted);
        margin: 0 0 16px;
        line-height: 1.6;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .role-card__meta {
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 12px;
        color: var(--text-muted);
      }

      .role-card__meta span {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }

      .role-card__actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 0 20px 16px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RolesPageComponent {
  private readonly api = inject(SystemRbacApiService);
  private readonly message = inject(NzMessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly roles = signal<SystemRoleWithCounts[]>([]);
  readonly loading = signal(false);
  readonly keyword = signal('');
  readonly typeFilter = signal('');
  readonly statusFilter = signal('');

  readonly formDialogOpen = signal(false);
  readonly formBusy = signal(false);
  readonly formDialogMode = signal<'create' | 'edit'>('create');
  readonly editingRole = signal<SystemRoleWithCounts | null>(null);

  readonly detailDialogOpen = signal(false);
  readonly detailRole = signal<SystemRoleDetail | null>(null);
  readonly detailUsers = signal<RoleUserEntity[]>([]);
  readonly detailUsersLoading = signal(false);
  readonly allPermissions = signal<SystemPermissionEntity[]>([]);
  readonly permissionsSaving = signal(false);

  readonly addUsersDialogOpen = signal(false);
  readonly addUsersBusy = signal(false);

  readonly subtitle = computed(() => {
    const total = this.roles().length;
    const builtin = this.roles().filter((r) => r.isBuiltin).length;
    return `共 ${total} 个角色，其中 ${builtin} 个系统内置`;
  });

  readonly filteredRoles = computed(() => {
    let items = this.roles();
    const keyword = this.keyword().trim().toLowerCase();
    const type = this.typeFilter();
    if (keyword) {
      items = items.filter(
        (r) => r.name.toLowerCase().includes(keyword) || r.code.toLowerCase().includes(keyword),
      );
    }
    if (type === 'builtin') {
      items = items.filter((r) => r.isBuiltin);
    } else if (type === 'custom') {
      items = items.filter((r) => !r.isBuiltin);
    }
    return items;
  });

  readonly existingUserIds = computed(() => this.detailUsers().map((u) => u.userId));

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.keyword.set(params.get('keyword') ?? '');
      this.loadRoles();
    });
    this.loadPermissions();
  }

  loadRoles(): void {
    this.loading.set(true);
    this.api
      .listRoles({
        keyword: this.keyword().trim() || undefined,
        status: this.statusFilter() || undefined,
      })
      .subscribe({
        next: (items) => {
          this.roles.set(items);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.message.error('加载角色列表失败');
        },
      });
  }

  loadPermissions(): void {
    this.api.listPermissions().subscribe({
      next: (items) => this.allPermissions.set(items),
      error: () => {},
    });
  }

  getRoleBadgeClass(role: SystemRoleWithCounts): string {
    if (role.code === 'super_admin') return 'super-admin';
    if (role.code === 'admin') return 'admin';
    if (role.code === 'member') return 'member';
    return 'custom';
  }

  canModifyRole(role: SystemRoleWithCounts | SystemRoleDetail | null): boolean {
    return canModifySystemRole(role);
  }

  openCreateRole(): void {
    this.formDialogMode.set('create');
    this.editingRole.set(null);
    this.formDialogOpen.set(true);
  }

  openEditRole(role: SystemRoleWithCounts): void {
    this.formDialogMode.set('edit');
    this.editingRole.set(role);
    this.formDialogOpen.set(true);
  }

  closeFormDialog(): void {
    this.formDialogOpen.set(false);
    this.formBusy.set(false);
    this.editingRole.set(null);
  }

  handleStatusFilterChange(value: string): void {
    this.statusFilter.set(value);
    this.loadRoles();
  }

  handleCreate(input: CreateSystemRoleInput): void {
    this.formBusy.set(true);
    this.api.createRole(input).subscribe({
      next: () => {
        this.message.success('角色创建成功');
        this.closeFormDialog();
        this.loadRoles();
      },
      error: () => {
        this.formBusy.set(false);
        this.message.error('创建角色失败');
      },
    });
  }

  handleUpdate(input: UpdateSystemRoleInput): void {
    const role = this.editingRole();
    if (!role) return;
    this.formBusy.set(true);
    this.api.updateRole(role.id, input).subscribe({
      next: () => {
        this.message.success('角色更新成功');
        this.closeFormDialog();
        this.loadRoles();
      },
      error: () => {
        this.formBusy.set(false);
        this.message.error('更新角色失败');
      },
    });
  }

  toggleRoleStatus(role: SystemRoleWithCounts): void {
    const nextStatus = role.status === 'active' ? 'inactive' : 'active';
    this.api.updateRole(role.id, { status: nextStatus }).subscribe({
      next: () => {
        this.message.success(nextStatus === 'active' ? '角色已启用' : '角色已停用');
        this.loadRoles();
        if (this.detailRole()?.id === role.id) {
          this.api
            .getRoleDetail(role.id)
            .subscribe({ next: (detail) => this.detailRole.set(detail) });
        }
      },
      error: () => this.message.error(nextStatus === 'active' ? '启用角色失败' : '停用角色失败'),
    });
  }

  deleteRole(role: SystemRoleWithCounts): void {
    this.api.deleteRole(role.id).subscribe({
      next: () => {
        this.message.success('角色已删除');
        if (this.detailRole()?.id === role.id) {
          this.closeDetailDialog();
        }
        this.loadRoles();
      },
      error: () => this.message.error('删除角色失败'),
    });
  }

  openRoleDetail(role: SystemRoleWithCounts): void {
    this.detailRole.set(null);
    this.detailUsers.set([]);
    this.detailDialogOpen.set(true);
    this.detailUsersLoading.set(true);

    this.api.getRoleDetail(role.id).subscribe({
      next: (detail) => {
        this.detailRole.set(detail);
        this.detailUsersLoading.set(false);
      },
      error: () => {
        this.detailUsersLoading.set(false);
        this.message.error('加载角色详情失败');
      },
    });

    this.api.listRoleUsers(role.id).subscribe({
      next: (users) => this.detailUsers.set(users),
      error: () => {},
    });
  }

  closeDetailDialog(): void {
    this.detailDialogOpen.set(false);
    this.detailRole.set(null);
    this.detailUsers.set([]);
  }

  handleSavePermissions(permissionIds: string[]): void {
    const role = this.detailRole();
    if (!role) return;
    this.permissionsSaving.set(true);
    this.api.setRolePermissions(role.id, { permissionIds }).subscribe({
      next: () => {
        this.permissionsSaving.set(false);
        this.message.success('权限保存成功');
        this.loadRoles();
        this.api.getRoleDetail(role.id).subscribe({
          next: (detail) => this.detailRole.set(detail),
        });
      },
      error: () => {
        this.permissionsSaving.set(false);
        this.message.error('保存权限失败');
      },
    });
  }

  openAddUsers(): void {
    this.addUsersDialogOpen.set(true);
  }

  closeAddUsers(): void {
    this.addUsersDialogOpen.set(false);
    this.addUsersBusy.set(false);
  }

  handleAddUsers(userIds: string[]): void {
    const role = this.detailRole();
    if (!role) return;
    this.addUsersBusy.set(true);
    this.api.addRoleUsers(role.id, { userIds }).subscribe({
      next: () => {
        this.message.success(`已添加 ${userIds.length} 名用户`);
        this.closeAddUsers();
        this.api.listRoleUsers(role.id).subscribe({
          next: (users) => this.detailUsers.set(users),
        });
        this.loadRoles();
      },
      error: () => {
        this.addUsersBusy.set(false);
        this.message.error('添加用户失败');
      },
    });
  }

  handleRemoveUser(userId: string): void {
    const role = this.detailRole();
    if (!role) return;
    this.api.removeRoleUser(role.id, userId).subscribe({
      next: () => {
        this.message.success('已移除用户');
        this.detailUsers.update((users) => users.filter((u) => u.userId !== userId));
        this.loadRoles();
      },
      error: () => this.message.error('移除用户失败'),
    });
  }
}
