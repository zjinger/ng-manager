import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthStore } from '@core/auth';
import { FilterBarComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { UserListTableComponent } from '../../components/user-list-table/user-list-table.component';
import { UserFormDialogComponent } from '../../dialogs/user-form-dialog/user-form-dialog.component';
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
    UserFormDialogComponent,
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
      <app-user-list-table [items]="store.items()" (edit)="openEdit($event)" />
    </app-list-state>

    <app-user-form-dialog
      [open]="dialogOpen()"
      [busy]="store.busy()"
      [mode]="dialogMode()"
      [user]="editingUser()"
      (cancel)="closeDialog()"
      (create)="createUser($event)"
      (update)="updateUser($event)"
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

  readonly keyword = signal('');
  readonly status = signal<'active' | 'inactive' | ''>('');
  readonly dialogOpen = signal(false);
  readonly dialogMode = signal<'create' | 'edit'>('create');
  readonly editingUser = signal<UserEntity | null>(null);
  readonly subtitle = computed(() => `当前共 ${this.store.total()} 个用户`);
  readonly canCreate = computed(() => this.authStore.currentUser()?.role === 'admin');

  constructor() {
    this.store.initialize();
  }

  applyFilters(): void {
    this.store.updateQuery({
      keyword: this.keyword().trim(),
      status: this.status(),
    });
  }

  openCreate(): void {
    this.dialogMode.set('create');
    this.editingUser.set(null);
    this.dialogOpen.set(true);
  }

  openEdit(user: UserEntity): void {
    this.dialogMode.set('edit');
    this.editingUser.set(user);
    this.dialogOpen.set(true);
  }

  closeDialog(): void {
    this.dialogOpen.set(false);
    this.editingUser.set(null);
  }

  createUser(input: Parameters<UserStore['create']>[0]): void {
    this.store.create(input, () => this.closeDialog());
  }

  updateUser(input: Parameters<UserStore['update']>[1]): void {
    const user = this.editingUser();
    if (!user) {
      return;
    }
    this.store.update(user.id, input, () => this.closeDialog());
  }
}
