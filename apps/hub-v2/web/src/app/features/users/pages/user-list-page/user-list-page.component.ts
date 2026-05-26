import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthStore } from '@core/auth';
import { hasRequiredPermissions } from '@core/auth';
import { FilterBarComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import type { DepartmentEntity } from '../../../organization/models/organization.model';
import { OrganizationApiService } from '../../../organization/services/organization-api.service';
import { UserListTableComponent } from '../../components/user-list-table/user-list-table.component';
import { UserCreateDialogComponent } from '../../dialogs/user-create-dialog';
import { UserDetailDialogComponent } from '../../dialogs/user-detail-dialog/user-detail-dialog.component';
import { UserEditDialogComponent } from '../../dialogs/user-edit-dialog';
import type { UserEditSubmitEvent } from '../../dialogs/user-edit-dialog';
import type { UserEntity } from '../../models/user.model';
import { UserRoleSyncService } from '../../services/user-role-sync.service';
import { UserTitleApiService } from '../../services/user-title-api.service';
import { UserStore } from '../../store/user.store';
import { ProjectTitleApiService } from '../../../admin/services/project-title-api.service';

@Component({
  selector: 'app-user-list-page',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzSelectModule,
    NzIconModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    FilterBarComponent,
    ListStateComponent,
    UserCreateDialogComponent,
    UserEditDialogComponent,
    UserDetailDialogComponent,
    UserListTableComponent,
  ],
  providers: [UserStore],
  template: `
    <app-page-header title="用户管理" [subtitle]="subtitle()" />

    <app-page-toolbar>
      @if (canManageUsers()) {
        <button toolbar-primary nz-button nzType="primary" class="toolbar__create" (click)="openCreate()">
          <nz-icon nzType="user-add" nzTheme="outline" />
          新建用户
        </button>
      }

      <app-filter-bar toolbar-filters class="toolbar__filters">
        <nz-select class="toolbar__status" [ngModel]="status()" (ngModelChange)="status.set($event)">
          <nz-option nzLabel="全部状态" nzValue=""></nz-option>
          <nz-option nzLabel="启用" nzValue="active"></nz-option>
          <nz-option nzLabel="停用" nzValue="inactive"></nz-option>
        </nz-select>

        @if (!isReadonly()) {
          <nz-select class="toolbar__status" nzAllowClear nzPlaceHolder="全部部门" [ngModel]="departmentId()" (ngModelChange)="departmentId.set($event || '')">
            <nz-option nzLabel="全部部门" nzValue=""></nz-option>
            @for (department of departments(); track department.id) {
              <nz-option [nzLabel]="department.name" [nzValue]="department.id"></nz-option>
            }
          </nz-select>
        }

        <button nz-button class="toolbar__filter-btn" (click)="applyFilters()">筛选</button>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        placeholder="搜索用户名或显示名"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="applyFilters()"
      />
    </app-page-toolbar>

    <app-list-state [loading]="store.loading()" [empty]="visibleUsers().length === 0" loadingText="正在加载用户列表…" emptyTitle="当前没有用户数据">
      <app-user-list-table
        [items]="visibleUsers()"
        [titleLabelMap]="titleLabelMap()"
        [canEdit]="canManageUsers()"
        [showOrganizationFields]="!isReadonly()"
        (view)="openDetail($event)"
        (edit)="openEdit($event)"
        (resetPassword)="resetPassword($event)"
      />
    </app-list-state>

    <app-user-create-dialog
      [open]="createDialogOpen()"
      [busy]="store.busy()"
      [departments]="departments()"
      [userOptions]="userOptions()"
      [titleOptions]="titleOptions()"
      [projectTitleOptions]="projectTitleOptions()"
      (cancel)="closeCreateDialog()"
      (create)="createUser($event)"
    />

    @if (editingUser(); as user) {
      <app-user-edit-dialog
        [open]="editDialogOpen()"
        [busy]="store.busy()"
        [user]="user"
        [departments]="departments()"
        [userOptions]="userOptions()"
        [titleOptions]="titleOptions()"
        [projectTitleOptions]="projectTitleOptions()"
        (cancel)="closeEditDialog()"
        (update)="updateUser($event)"
      />
    }

    <app-user-detail-dialog
      [open]="detailDialogOpen()"
      [userId]="detailUserId()"
      [departments]="departments()"
      [userOptions]="userOptions()"
      [titleLabelMap]="titleLabelMap()"
      [titleOptions]="titleOptions()"
      [projectTitleOptions]="projectTitleOptions()"
      [readonly]="isReadonly()"
      (closed)="closeDetail()"
      (updated)="reloadList()"
    />
  `,
  styles: [
    `
      .toolbar {
        display: contents;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserListPageComponent {
  readonly store = inject(UserStore);
  readonly authStore = inject(AuthStore);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly organizationApi = inject(OrganizationApiService);
  private readonly roleSync = inject(UserRoleSyncService);
  private readonly titleApi = inject(UserTitleApiService);
  private readonly projectTitleApi = inject(ProjectTitleApiService);

  readonly keyword = signal('');
  readonly status = signal<'active' | 'inactive' | ''>('');
  readonly departmentId = signal('');
  readonly departments = signal<DepartmentEntity[]>([]);
  readonly userOptions = signal<UserEntity[]>([]);
  readonly createDialogOpen = signal(false);
  readonly editDialogOpen = signal(false);
  readonly editingUser = signal<UserEntity | null>(null);
  readonly detailDialogOpen = signal(false);
  readonly detailUserId = signal('');
  readonly titleOptions = signal<Array<{ label: string; value: string }>>([]);
  readonly projectTitleOptions = signal<Array<{ label: string; value: string }>>([]);
  readonly titleLabelMap = signal<Record<string, string>>({});
  readonly visibleUsers = computed(() => {
    const items = this.store.items();
    if (!this.isReadonly()) {
      return items;
    }
    return items.filter((item) => item.username.trim().toLowerCase() !== 'admin');
  });
  readonly subtitle = computed(() => `当前共 ${this.isReadonly() ? this.visibleUsers().length : this.store.total()} 个用户`);
  readonly isReadonly = signal(this.route.snapshot.pathFromRoot.some((item) => item.data['readonly'] === true));
  readonly canManageUsers = computed(() =>
    !this.isReadonly() && hasRequiredPermissions(this.authStore.currentUser()?.permissionCodes ?? [], ['admin.users.manage'], 'any')
  );

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const keyword = params.get('keyword') ?? '';
      this.keyword.set(keyword);
      this.store.updateQuery({ keyword });
    });
    this.organizationApi.listAllDepartments({ status: 'active' }).subscribe({
      next: (items) => this.departments.set(items),
      error: () => this.departments.set([]),
    });
    this.titleApi.listAllTitles().subscribe({
      next: (items) => {
        this.titleOptions.set(items.filter((item) => item.status === 'active').map((item) => ({ label: item.name, value: item.code })));
        this.titleLabelMap.set(Object.fromEntries(items.map((item) => [item.code, item.name])));
      },
      error: () => {
        this.titleOptions.set([]);
        this.titleLabelMap.set({});
      },
    });
    this.projectTitleApi.listTitles().subscribe({
      next: (items) => {
        this.projectTitleOptions.set(items.filter((item) => item.status === 'active').map((item) => ({ label: item.name, value: item.code })));
      },
      error: () => {
        this.projectTitleOptions.set([]);
      },
    });
    this.store.loadOptions((items) => this.userOptions.set(items));
  }

  applyFilters(): void {
    this.store.updateQuery({
      keyword: this.keyword().trim(),
      status: this.status(),
      departmentId: this.departmentId(),
    });
  }

  openCreate(): void {
    if (!this.canManageUsers()) {
      return;
    }
    this.editingUser.set(null);
    this.createDialogOpen.set(true);
  }

  openEdit(user: UserEntity): void {
    if (!this.canManageUsers()) {
      return;
    }
    this.editingUser.set(user);
    this.editDialogOpen.set(true);
  }

  openDetail(user: UserEntity): void {
    this.detailUserId.set(user.id);
    this.detailDialogOpen.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogOpen.set(false);
  }

  closeEditDialog(): void {
    this.editDialogOpen.set(false);
    this.editingUser.set(null);
  }

  createUser(input: Parameters<UserStore['create']>[0]): void {
    if (!this.canManageUsers()) {
      return;
    }
    this.store.create(input, () => {
      this.closeCreateDialog();
      this.store.loadOptions((items) => this.userOptions.set(items));
    });
  }

  updateUser(event: UserEditSubmitEvent): void {
    if (!this.canManageUsers()) {
      return;
    }
    const user = this.editingUser();
    if (!user) {
      return;
    }
    const input = event.input;
    const passwordDraft = input.loginEnabled ? event.passwordDraft : null;
    this.store.update(user.id, input, () => {
      this.roleSync.syncUserRoles(user.id, event.roleIds).subscribe({
        next: () => {
          this.finishEditSave(user.id, passwordDraft);
        },
        error: () => {
          this.finishEditSave(user.id, passwordDraft);
        },
      });
    });
  }

  resetPassword(user: UserEntity): void {
    if (!this.canManageUsers()) {
      return;
    }
    this.store.resetPassword(user.id);
  }

  private finishEditSave(userId: string, passwordDraft: string | null): void {
    const finish = () => {
      this.closeEditDialog();
      this.reloadList();
      this.store.loadOptions((items) => this.userOptions.set(items));
    };

    if (!passwordDraft) {
      finish();
      return;
    }

    this.store.resetPassword(userId, { newPassword: passwordDraft }, () => {
      finish();
    });
  }

  closeDetail(): void {
    this.detailDialogOpen.set(false);
    this.detailUserId.set('');
  }

  reloadList(): void {
    this.store.load();
  }
}
