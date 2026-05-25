import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DialogShellComponent, ListStateComponent } from '@shared/ui';
import type { DepartmentEntity } from '../../../organization/models/organization.model';
import { UserStatusTagComponent } from '../../components/user-status-tag/user-status-tag.component';
import { UserEditDialogComponent } from '../user-edit-dialog';
import type { UserEntity } from '../../models/user.model';
import { UserApiService } from '../../services/user-api.service';
import { UserRbacApiService } from '../../services/user-rbac-api.service';
import { UserRoleSyncService } from '../../services/user-role-sync.service';
import type { UserSystemRoleEntity } from '../../../admin/models/system-rbac.model';

@Component({
  selector: 'app-user-detail-dialog',
  standalone: true,
  imports: [
    DatePipe,
    NzButtonModule,
    NzIconModule,
    DialogShellComponent,
    ListStateComponent,
    UserStatusTagComponent,
    UserEditDialogComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open() && !editOpen()"
      [width]="780"
      title="用户详情"
      icon="user"
      (cancel)="close()"
    >
      <div dialog-body>
        <app-list-state
          [loading]="loading()"
          [empty]="!loading() && !user()"
          loadingText="正在加载用户详情…"
          emptyTitle="未找到该用户"
        >
          @if (user(); as currentUser) {
            <section class="user-detail">
              <div class="user-hero">
                <div class="user-hero__avatar">
                  @if (currentUser.avatarUrl) {
                    <img [src]="currentUser.avatarUrl" [alt]="currentUser.displayName || currentUser.username" />
                  } @else {
                    {{ avatarText(currentUser) }}
                  }
                </div>
                <div class="user-hero__main">
                  <h3>{{ currentUser.displayName || currentUser.username }}</h3>
                  <p>{{ currentUser.email || '未设置邮箱' }} · {{ currentUser.username }}</p>
                  <div class="user-hero__tags">
                    <app-user-status-tag [status]="currentUser.status" />
                    @if (!readonly()) {
                      <span class="hero-pill" [class.hero-pill--muted]="!currentUser.loginEnabled">
                        {{ currentUser.loginEnabled ? '可登录后台' : '后台已关闭' }}
                      </span>
                    }
                    @for (role of roleAssignments(); track role.id) {
                      <span class="hero-pill hero-pill--role">{{ role.roleName }}</span>
                    }
                  </div>
                </div>
                @if (!readonly()) {
                  <div class="user-hero__actions">
                    <button nz-button (click)="startEdit()">
                      <nz-icon nzType="edit" nzTheme="outline" />
                      编辑
                    </button>
                  </div>
                }
              </div>

              <div class="user-detail__grid">
                @if (!readonly()) {
                  <div class="detail-field">
                    <span>部门</span>
                    <strong>{{ primaryDepartmentLabel(currentUser) }}</strong>
                  </div>
                  <div class="detail-field">
                    <span>职位</span>
                    <strong>{{ titleLabel(currentUser.organizationTitleCode, currentUser.organizationTitleName) }}</strong>
                  </div>
                  <div class="detail-field">
                    <span>项目职能</span>
                    <strong>{{ titleLabel(currentUser.defaultProjectTitleCode, currentUser.defaultProjectTitleName) }}</strong>
                  </div>
                }
                <div class="detail-field">
                  <span>手机号</span>
                  <strong>{{ currentUser.mobile || '未设置' }}</strong>
                </div>
                @if (!readonly()) {
                  <div class="detail-field">
                    <span>直属上级</span>
                    <strong>{{ currentUser.managerUser?.displayName || currentUser.managerUser?.username || '未设置' }}</strong>
                  </div>
                }
                <div class="detail-field">
                  <span>创建时间</span>
                  <strong>{{ currentUser.createdAt | date: 'yyyy-MM-dd HH:mm:ss' }}</strong>
                </div>
                @if (!readonly()) {
                  <div class="detail-field">
                    <span>最后登录</span>
                    <strong [class.detail-field__placeholder]="!currentUser.lastLoginAt">
                      {{ currentUser.lastLoginAt ? (currentUser.lastLoginAt | date: 'yyyy-MM-dd HH:mm:ss') : '从未登录' }}
                    </strong>
                  </div>
                }
                <!-- <div class="detail-field">
                  <span>登录次数</span>
                  <strong class="detail-field__placeholder">待接入</strong>
                </div> -->
              </div>
            </section>
          }
        </app-list-state>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="close()">关闭</button>
      </ng-container>
    </app-dialog-shell>

    @if (!readonly()) {
      @if (user(); as currentUser) {
        <app-user-edit-dialog
          [open]="editOpen()"
          [busy]="busy()"
          [user]="currentUser"
          [departments]="departments()"
          [userOptions]="userOptions()"
          [titleOptions]="titleOptions()"
          [projectTitleOptions]="projectTitleOptions()"
          (cancel)="closeEdit()"
          (update)="updateUser($event)"
          (roleSync)="pendingRoleIds.set($event)"
          (resetPassword)="resetPassword()"
        />
      }
    }
  `,
  styles: [
    `
      .user-detail {
        display: grid;
        gap: 24px;
      }

      .user-hero {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 20px;
        align-items: center;
        padding-bottom: 20px;
        border-bottom: 1px solid var(--border-color-soft);
      }

      .user-hero__avatar {
        width: 64px;
        height: 64px;
        display: grid;
        place-items: center;
        overflow: hidden;
        border-radius: 16px;
        background: var(--gradient-user-avatar);
        color: var(--text-inverse);
        font-size: 24px;
        font-weight: 700;
      }

      .user-hero__avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .user-hero__main {
        min-width: 0;
      }

      .user-hero__main h3 {
        margin: 0;
        color: var(--text-heading);
        font-size: 20px;
        font-weight: 700;
      }

      .user-hero__main p {
        margin: 4px 0 0;
        color: var(--text-muted);
        font-size: 13px;
      }

      .user-hero__tags,
      .user-hero__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .user-hero__tags {
        margin-top: 10px;
      }

      .hero-pill {
        display: inline-flex;
        align-items: center;
        min-height: 28px;
        padding: 0 12px;
        border-radius: 999px;
        background: var(--color-info-light);
        color: var(--color-info);
        font-size: 12px;
        font-weight: 600;
      }

      .hero-pill--muted {
        background: var(--bg-subtle);
        color: var(--text-muted);
      }

      .user-detail__grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 20px;
      }

      .detail-field {
        display: grid;
        gap: 6px;
      }

      .detail-field span {
        color: var(--text-muted);
        font-size: 12px;
      }

      .detail-field strong {
        color: var(--text-primary);
        font-size: 14px;
        font-weight: 600;
      }

      .detail-field__placeholder {
        color: var(--text-muted);
        font-weight: 500;
      }

      @media (max-width: 760px) {
        .user-hero {
          grid-template-columns: 1fr;
        }

        .user-detail__grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDetailDialogComponent {
  private readonly userApi = inject(UserApiService);
  private readonly message = inject(NzMessageService);
  private readonly userRbacApi = inject(UserRbacApiService);
  private readonly roleSync = inject(UserRoleSyncService);

  readonly open = input(false);
  readonly userId = input('');
  readonly departments = input<DepartmentEntity[]>([]);
  readonly userOptions = input<UserEntity[]>([]);
  readonly titleLabelMap = input<Record<string, string>>({});
  readonly titleOptions = input<Array<{ label: string; value: string }>>([]);
  readonly projectTitleOptions = input<Array<{ label: string; value: string }>>([]);
  readonly readonly = input(false);
  readonly updated = output<UserEntity>();
  readonly closed = output<void>();

  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly editOpen = signal(false);
  readonly user = signal<UserEntity | null>(null);
  readonly pendingRoleIds = signal<string[]>([]);
  readonly roleAssignments = signal<UserSystemRoleEntity[]>([]);

  constructor() {
    effect(() => {
      const open = this.open();
      const userId = this.userId();
      if (!open || !userId) {
        if (!open) {
          this.editOpen.set(false);
          this.roleAssignments.set([]);
        }
        return;
      }
      this.loadUser(userId);
      if (this.readonly()) {
        this.roleAssignments.set([]);
      } else {
        this.loadRoles(userId);
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  startEdit(): void {
    if (this.readonly()) {
      return;
    }
    this.pendingRoleIds.set([]);
    this.editOpen.set(true);
  }

  closeEdit(): void {
    this.editOpen.set(false);
    this.pendingRoleIds.set([]);
  }

  updateUser(input: Parameters<UserApiService['update']>[1]): void {
    if (this.readonly()) {
      return;
    }
    const currentUser = this.user();
    if (!currentUser) {
      return;
    }
    this.busy.set(true);
    this.userApi.update(currentUser.id, input).subscribe({
      next: (updated) => {
        this.roleSync.syncUserRoles(updated.id, this.pendingRoleIds()).subscribe({
          next: () => {
            this.user.set(updated);
            this.busy.set(false);
            this.editOpen.set(false);
            this.pendingRoleIds.set([]);
            this.loadRoles(updated.id);
            this.updated.emit(updated);
            this.message.success('用户资料已更新');
          },
          error: () => {
            this.user.set(updated);
            this.busy.set(false);
            this.updated.emit(updated);
          },
        });
      },
      error: () => {
        this.busy.set(false);
        this.message.error('更新用户失败');
      },
    });
  }

  resetPassword(): void {
    if (this.readonly()) {
      return;
    }
    const currentUser = this.user();
    if (!currentUser) {
      return;
    }
    this.busy.set(true);
    this.userApi.resetPassword(currentUser.id).subscribe({
      next: (result) => {
        this.busy.set(false);
        this.message.success(`已重置 ${result.username} 的密码：${result.temporaryPassword}`);
      },
      error: () => {
        this.busy.set(false);
        this.message.error('重置密码失败');
      },
    });
  }

  avatarText(user: UserEntity): string {
    return (user.displayName || user.username).trim().slice(0, 1).toUpperCase();
  }

  titleLabel(titleCode: string | null, titleName?: string | null): string {
    if (!titleCode) {
      return '未设置';
    }
    return this.titleLabelMap()[titleCode] ?? titleName ?? titleCode;
  }

  primaryDepartmentLabel(user: UserEntity): string {
    return user.primaryDepartment?.departmentName ?? user.departments[0]?.departmentName ?? '未设置';
  }

  private loadUser(userId: string): void {
    this.loading.set(true);
    this.userApi.getById(userId).subscribe({
      next: (user) => {
        this.user.set(user);
        this.loading.set(false);
      },
      error: () => {
        this.user.set(null);
        this.loading.set(false);
        this.message.error('加载用户详情失败');
      },
    });
  }

  private loadRoles(userId: string): void {
    this.userRbacApi.listUserSystemRoles(userId).subscribe({
      next: (items) => this.roleAssignments.set(items),
      error: () => this.roleAssignments.set([]),
    });
  }
}
