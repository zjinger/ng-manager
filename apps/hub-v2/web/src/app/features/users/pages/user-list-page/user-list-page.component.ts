import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '@core/auth';
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
import type { UserEntity } from '../../models/user.model';
import { UserStore } from '../../store/user.store';

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
      @if (canCreate()) {
        <button toolbar-primary nz-button nzType="primary" class="toolbar__create" (click)="openCreate()">
          <nz-icon nzType="user-add" nzTheme="outline" />
          新建用户
        </button>
      }

      <app-filter-bar toolbar-filters class="toolbar__filters">
        <nz-select class="toolbar__status" [ngModel]="status()" (ngModelChange)="status.set($event)">
          <nz-option nzLabel="全部状态" nzValue=""></nz-option>
          <nz-option nzLabel="活跃" nzValue="active"></nz-option>
          <nz-option nzLabel="停用" nzValue="inactive"></nz-option>
        </nz-select>

        <nz-select class="toolbar__status" nzAllowClear nzPlaceHolder="全部部门" [ngModel]="departmentId()" (ngModelChange)="departmentId.set($event || '')">
          <nz-option nzLabel="全部部门" nzValue=""></nz-option>
          @for (department of departments(); track department.id) {
            <nz-option [nzLabel]="department.name" [nzValue]="department.id"></nz-option>
          }
        </nz-select>

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

    <app-list-state [loading]="store.loading()" [empty]="store.items().length === 0" loadingText="正在加载用户列表…" emptyTitle="当前没有用户数据">
      <app-user-list-table
        [items]="store.items()"
        [canEdit]="canCreate()"
        (view)="openDetail($event)"
        (edit)="openEdit($event)"
        (resetPassword)="resetPassword($event)"
      />
    </app-list-state>

    <app-user-create-dialog
      [open]="createDialogOpen()"
      [busy]="store.busy()"
      [departments]="departments()"
      (cancel)="closeCreateDialog()"
      (create)="createUser($event)"
    />

    @if (editingUser(); as user) {
      <app-user-edit-dialog
        [open]="editDialogOpen()"
        [busy]="store.busy()"
        [user]="user"
        [departments]="departments()"
        (cancel)="closeEditDialog()"
        (update)="updateUser($event)"
        (resetPassword)="resetEditingUserPassword()"
      />
    }

    <app-user-detail-dialog
      [open]="detailDialogOpen()"
      [userId]="detailUserId()"
      [departments]="departments()"
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
  private readonly organizationApi = inject(OrganizationApiService);

  readonly keyword = signal('');
  readonly status = signal<'active' | 'inactive' | ''>('');
  readonly departmentId = signal('');
  readonly departments = signal<DepartmentEntity[]>([]);
  readonly createDialogOpen = signal(false);
  readonly editDialogOpen = signal(false);
  readonly editingUser = signal<UserEntity | null>(null);
  readonly detailDialogOpen = signal(false);
  readonly detailUserId = signal('');
  readonly subtitle = computed(() => `当前共 ${this.store.total()} 个用户`);
  readonly canCreate = computed(() => this.authStore.currentUser()?.role === 'admin');

  constructor() {
    this.store.initialize();
    this.organizationApi.listDepartments({ status: 'active' }).subscribe({
      next: (items) => this.departments.set(items),
      error: () => this.departments.set([]),
    });
  }

  applyFilters(): void {
    this.store.updateQuery({
      keyword: this.keyword().trim(),
      status: this.status(),
      departmentId: this.departmentId(),
    });
  }

  openCreate(): void {
    this.editingUser.set(null);
    this.createDialogOpen.set(true);
  }

  openEdit(user: UserEntity): void {
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
    this.store.create(input, () => this.closeCreateDialog());
  }

  updateUser(input: Parameters<UserStore['update']>[1]): void {
    const user = this.editingUser();
    if (!user) {
      return;
    }
    this.store.update(user.id, input, () => this.closeEditDialog());
  }

  resetPassword(user: UserEntity): void {
    this.store.resetPassword(user.id);
  }

  resetEditingUserPassword(): void {
    const user = this.editingUser();
    if (!user) {
      return;
    }
    this.store.resetPassword(user.id);
  }

  closeDetail(): void {
    this.detailDialogOpen.set(false);
    this.detailUserId.set('');
  }

  reloadList(): void {
    this.store.load();
  }
}
