import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { firstValueFrom } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { HubDateTimePipe } from '../../shared/pipes/date-time.pipe';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTooltipDirective } from 'ng-zorro-antd/tooltip';

type UserStatus = 'active' | 'inactive';
type UserTitleCode = 'product' | 'ui' | 'frontend_dev' | 'backend_dev' | 'qa' | 'ops' | 'other';

interface UserItem {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  mobile: string | null;
  titleCode: UserTitleCode | null;
  status: UserStatus;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UserListResult {
  items: UserItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface UserTitleOption {
  label: string;
  value: UserTitleCode;
}

@Component({
  selector: 'app-users-page',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzFormModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    PageHeaderComponent,
    HubDateTimePipe,
    NzIconModule,
    NzTooltipDirective
  ],
  template: `
    <section class="page">
      <app-page-header title="用户管理" subtitle="维护系统用户与状态">
        <button page-header-actions nz-button nzType="primary" (click)="createUser()">
          <nz-icon nzType="plus" nzTheme="outline"></nz-icon> 新增用户
        </button>
      </app-page-header>

      <nz-card nzTitle="筛选条件" class="section">
        <form nz-form [formGroup]="filters" class="filter-grid">
          <nz-form-item>
            <nz-form-label>状态</nz-form-label>
            <nz-form-control>
              <nz-select formControlName="status" nzAllowClear>
                <nz-option nzValue="active" nzLabel="启用"></nz-option>
                <nz-option nzValue="inactive" nzLabel="禁用"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
          <nz-form-item>
            <nz-form-label>关键词</nz-form-label>
            <nz-form-control>
              <input nz-input formControlName="keyword" placeholder="用户名/显示名/邮箱/手机号" />
            </nz-form-control>
          </nz-form-item>
        </form>
      </nz-card>

      @if (listError()) {
        <nz-alert class="section" nzType="error" [nzMessage]="listError()!" nzShowIcon></nz-alert>
      }

      <nz-card nzTitle="用户列表" class="section">
        <div class="table-head">
          <span>共 {{ total() }} 条</span>
          <button nz-button nzType="default" (click)="reload()" [disabled]="listLoading()">刷新</button>
        </div>
        <nz-table [nzData]="users()" [nzFrontPagination]="false" [nzLoading]="listLoading()">
          <thead>
            <tr>
              <th>用户名</th>
              <th>显示名</th>
              <th>岗位</th>
              <th>状态</th>
              <th>邮箱</th>
              <th>手机号</th>
              <th>更新时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            @for (item of users(); track item.id) {
              <tr>
                <td>{{ item.username }}</td>
                <td>{{ item.displayName || item.username }}</td>
                <td>{{ titleLabel(item.titleCode) }}</td>
                <td><nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag></td>
                <td>{{ item.email || '-' }}</td>
                <td>{{ item.mobile || '-' }}</td>
                <td>{{ item.updatedAt | hubDateTime }}</td>
                <td>
                  <a nz-button nzType="link" (click)="editUser(item)" nz-tooltip="编辑用户">
                    <nz-icon nzType="edit" nzTheme="outline"></nz-icon>
                  </a>
                  <a nz-button nzType="link" (click)="openResetPassword(item)" nz-tooltip="重置密码">
                    <nz-icon nzType="key" nzTheme="outline"></nz-icon>
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>

      <nz-modal
        [nzTitle]="editingId() ? '编辑用户' : '新增用户'"
        [(nzVisible)]="visible"
        [nzMaskClosable]="false"
        [nzWidth]="720"
        [nzFooter]="null"
        (nzOnCancel)="visible.set(false)"
      >
        <ng-container *nzModalContent>
          @if (formError()) {
            <nz-alert nzType="error" [nzMessage]="formError()!" nzShowIcon></nz-alert>
          }

          <form nz-form [formGroup]="form" nzLayout="vertical" class="form">
            <div class="grid-2">
              <nz-form-item>
                <nz-form-label nzRequired>用户名</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="username" placeholder="用户登录时使用，只能包含字母和数字" />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label>显示名</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="displayName" placeholder="可选，空则显示用户名" />
                </nz-form-control>
              </nz-form-item>
            </div>

            <div class="grid-2">
              <nz-form-item>
                <nz-form-label>岗位</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="titleCode" nzAllowClear nzPlaceHolder="请选择岗位">
                    @for (opt of titleOptions(); track opt.value) {
                      <nz-option [nzValue]="opt.value" [nzLabel]="opt.label"></nz-option>
                    }
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label>状态</nz-form-label>
                <nz-form-control>
                  <nz-select formControlName="status">
                    <nz-option nzValue="active" nzLabel="启用"></nz-option>
                    <nz-option nzValue="inactive" nzLabel="禁用"></nz-option>
                  </nz-select>
                </nz-form-control>
              </nz-form-item>
            </div>

            <div class="grid-2">
              <nz-form-item>
                <nz-form-label>邮箱</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="email" />
                </nz-form-control>
              </nz-form-item>
              <nz-form-item>
                <nz-form-label>手机号</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="mobile" />
                </nz-form-control>
              </nz-form-item>
            </div>

            <nz-form-item>
              <nz-form-label>备注</nz-form-label>
              <nz-form-control>
                <textarea nz-input rows="3" formControlName="remark"></textarea>
              </nz-form-control>
            </nz-form-item>

            <button nz-button nzType="primary" (click)="saveUser()" [disabled]="form.invalid || saving()">
              保存
            </button>
          </form>
        </ng-container>
      </nz-modal>

      <nz-modal
        nzTitle="重置密码"
        [(nzVisible)]="resetVisible"
        [nzMaskClosable]="false"
        [nzFooter]="null"
        (nzOnCancel)="resetVisible.set(false)"
      >
        <ng-container *nzModalContent>
          @if (resetError()) {
            <nz-alert nzType="error" [nzMessage]="resetError()!" nzShowIcon></nz-alert>
          }

          <form nz-form nzLayout="vertical" [formGroup]="resetForm" class="form">
            <nz-form-item>
              <nz-form-label>用户</nz-form-label>
              <nz-form-control>
                <input nz-input [value]="resetTargetName()" disabled />
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label nzRequired>新密码</nz-form-label>
              <nz-form-control>
                <input nz-input type="password" formControlName="newPassword" placeholder="至少8位" />
              </nz-form-control>
            </nz-form-item>

            <button nz-button nzType="primary" (click)="submitResetPassword()" [disabled]="resetting() || resetForm.invalid">
              确认重置
            </button>
          </form>
        </ng-container>
      </nz-modal>
    </section>
  `,
  styles: [
    PAGE_SHELL_STYLES,
    `
      .filter-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
      .table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .form { display: grid; gap: 4px; }
      .grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    `
  ]
})
export class UsersPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);

  protected readonly users = signal<UserItem[]>([]);
  protected readonly total = signal(0);
  protected readonly listLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly visible = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly titleOptions = signal<UserTitleOption[]>([]);

  protected readonly resetVisible = signal(false);
  protected readonly resetting = signal(false);
  protected readonly resetError = signal<string | null>(null);
  protected readonly resetTargetId = signal<string | null>(null);
  protected readonly resetTargetName = signal('');

  protected readonly filters = this.fb.nonNullable.group({
    status: [''],
    keyword: ['']
  });

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    displayName: [''],
    titleCode: [null as UserTitleCode | null],
    email: ['', [Validators.email]],
    mobile: ['', [Validators.pattern(/^\+?\d{7,15}$/)]],
    status: ['active' as UserStatus, [Validators.required]],
    remark: ['']
  });

  protected readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(8)]]
  });

  public constructor() {
    this.filters.valueChanges.subscribe(() => {
      void this.loadUsers();
    });

    void Promise.all([this.loadTitleOptions(), this.loadUsers()]);
  }

  protected async reload(): Promise<void> {
    await this.loadUsers();
  }

  protected createUser(): void {
    this.editingId.set(null);
    this.formError.set(null);
    this.form.reset({
      username: '',
      displayName: '',
      titleCode: null,
      email: '',
      mobile: '',
      status: 'active',
      remark: ''
    });
    this.visible.set(true);
  }

  protected editUser(item: UserItem): void {
    this.editingId.set(item.id);
    this.formError.set(null);
    this.form.reset({
      username: item.username,
      displayName: item.displayName || '',
      titleCode: item.titleCode,
      email: item.email || '',
      mobile: item.mobile || '',
      status: item.status,
      remark: item.remark || ''
    });
    this.visible.set(true);
  }

  protected openResetPassword(item: UserItem): void {
    this.resetError.set(null);
    this.resetTargetId.set(item.id);
    this.resetTargetName.set(item.displayName || item.username);
    this.resetForm.reset({ newPassword: '' });
    this.resetVisible.set(true);
  }

  protected async submitResetPassword(): Promise<void> {
    if (this.resetForm.invalid || !this.resetTargetId()) {
      this.resetForm.markAllAsTouched();
      return;
    }

    this.resetting.set(true);
    this.resetError.set(null);

    try {
      const value = this.resetForm.getRawValue();
      await firstValueFrom(this.api.post<{ ok: boolean }, { newPassword: string; mustChangePassword: boolean }>(
        `/api/admin/users/${this.resetTargetId()!}/password`,
        { newPassword: value.newPassword, mustChangePassword: true }
      ));
      this.resetVisible.set(false);
    } catch (error) {
      this.resetError.set(this.getErrorMessage(error, '重置密码失败'));
    } finally {
      this.resetting.set(false);
    }
  }

  protected async saveUser(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.saving.set(true);
    this.formError.set(null);

    try {
      const value = this.form.getRawValue();
      const payload = {
        username: value.username.trim(),
        displayName: value.displayName.trim() || null,
        titleCode: value.titleCode,
        email: value.email.trim() || null,
        mobile: value.mobile.trim() || null,
        status: value.status,
        remark: value.remark.trim() || null
      };

      if (this.editingId()) {
        await firstValueFrom(this.api.put<UserItem, typeof payload>(`/api/admin/users/${this.editingId()!}`, payload));
      } else {
        const createPayload: {
          username: string;
          displayName?: string;
          titleCode?: UserTitleCode;
          email?: string;
          mobile?: string;
          remark?: string;
        } = {
          username: payload.username
        };

        if (payload.displayName) createPayload.displayName = payload.displayName;
        if (payload.titleCode) createPayload.titleCode = payload.titleCode;
        if (payload.email) createPayload.email = payload.email;
        if (payload.mobile) createPayload.mobile = payload.mobile;
        if (payload.remark) createPayload.remark = payload.remark;

        await firstValueFrom(this.api.post<UserItem, typeof createPayload>('/api/admin/users', createPayload));
      }

      this.visible.set(false);
      await this.loadUsers();
    } catch (error) {
      this.formError.set(this.getErrorMessage(error, '保存用户失败'));
    } finally {
      this.saving.set(false);
    }
  }

  protected statusColor(status: UserStatus): string {
    return status === 'active' ? 'green' : 'orange';
  }

  protected statusLabel(status: UserStatus): string {
    return status === 'active' ? '启用' : '禁用';
  }

  protected titleLabel(titleCode: UserTitleCode | null): string {
    if (!titleCode) return '-';
    const hit = this.titleOptions().find((item) => item.value === titleCode);
    return hit?.label ?? titleCode;
  }

  private async loadTitleOptions(): Promise<void> {
    try {
      const result = await firstValueFrom(this.api.get<{ items: UserTitleOption[] }>('/api/admin/users/titles'));
      this.titleOptions.set(result.items);
    } catch {
      this.titleOptions.set([]);
    }
  }

  private async loadUsers(): Promise<void> {
    this.listLoading.set(true);
    this.listError.set(null);

    try {
      const filter = this.filters.getRawValue();
      const params: Record<string, string | number> = { page: 1, pageSize: 100 };
      if (filter.status) params['status'] = filter.status;
      if (filter.keyword.trim()) params['keyword'] = filter.keyword.trim();

      const result = await firstValueFrom(this.api.get<UserListResult>('/api/admin/users', { params }));
      this.users.set(result.items);
      this.total.set(result.total);
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '加载用户列表失败'));
    } finally {
      this.listLoading.set(false);
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HubApiError) return `${fallback}: ${error.message}`;
    if (error instanceof Error) return `${fallback}: ${error.message}`;
    return fallback;
  }
}



