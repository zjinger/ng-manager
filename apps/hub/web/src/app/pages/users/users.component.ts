import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Component, computed, inject, signal } from '@angular/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzCheckboxModule } from 'ng-zorro-antd/checkbox';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { firstValueFrom } from 'rxjs';
import { HubApiError } from '../../core/http/api-error.interceptor';
import { HubApiService } from '../../core/http/hub-api.service';
import { AdminAuthService } from '../../core/services/admin-auth.service';
import { PageHeaderComponent } from '../../shared/page-header/page-header.component';
import { HubDateTimePipe } from '../../shared/pipes/date-time.pipe';
import { PAGE_SHELL_STYLES } from '../../shared/styles/page-shell.styles';

type UserStatus = 'active' | 'inactive';
type UserTitleCode = 'product' | 'ui' | 'frontend_dev' | 'backend_dev' | 'qa' | 'ops' | 'other';
type LoginAccountStatus = 'active' | 'disabled' | null;

const USERNAME_PATTERN = /^[A-Za-z0-9]+$/;
const MOBILE_PATTERN = /^\+?\d{7,15}$/;
const PASSWORD_MIN_LENGTH = 8;

interface UserItem {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  mobile: string | null;
  titleCode: UserTitleCode | null;
  status: UserStatus;
  remark: string | null;
  loginAccountStatus: LoginAccountStatus;
  loginAccountUsername: string | null;
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

interface CreateUserPayload {
  username: string;
  displayName?: string;
  titleCode?: UserTitleCode;
  email?: string;
  mobile?: string;
  status: UserStatus;
  remark?: string;
}

interface EnableLoginAccountPayload {
  username?: string;
  password?: string;
  mustChangePassword?: boolean;
}

@Component({
  selector: 'app-users-page',
  imports: [
    ReactiveFormsModule,
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzCheckboxModule,
    NzFormModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzSelectModule,
    NzTableModule,
    NzTagModule,
    PageHeaderComponent,
    HubDateTimePipe
  ],
  template: `
    <section class="page">
      <app-page-header title="用户管理" subtitle="维护系统用户与后台账号开通状态">
        @if (canCreate()) {
          <button page-header-actions nz-button nzType="primary" (click)="createUser()">
            <nz-icon nzType="plus" nzTheme="outline"></nz-icon> 新增用户
          </button>
        }
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
              <th>职位</th>
              <th>用户状态</th>
              @if (isAdmin()) {
                <th>后台登录</th>
              }
              <th>邮箱</th>
              <th>手机号</th>
              <th>更新时间</th>
              @if (isAdmin()) {
                <th>操作</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (item of users(); track item.id) {
              <tr>
                <td>{{ item.username }}</td>
                <td>{{ item.displayName || item.username }}</td>
                <td>{{ titleLabel(item.titleCode) }}</td>
                <td><nz-tag [nzColor]="statusColor(item.status)">{{ statusLabel(item.status) }}</nz-tag></td>
                @if (isAdmin()) {
                  <td><nz-tag [nzColor]="loginStatusColor(item.loginAccountStatus)">{{ loginStatusLabel(item.loginAccountStatus) }}</nz-tag></td>
                }
                <td>{{ item.email || '-' }}</td>
                <td>{{ item.mobile || '-' }}</td>
                <td>{{ item.updatedAt | hubDateTime }}</td>
                @if (isAdmin()) {
                  <td class="row-actions">
                    <a nz-button nzType="link" (click)="editUser(item)">编辑</a>
                    @if (item.loginAccountStatus === null) {
                      <a nz-button nzType="link" (click)="openEnableLoginModal(item)" [class.action-loading]="actionLoadingId() === item.id">开通后台</a>
                    } @else if (item.loginAccountStatus === 'disabled') {
                      <a nz-button nzType="link" (click)="enableExistingLogin(item)" [class.action-loading]="actionLoadingId() === item.id">启用后台</a>
                    } @else {
                      <a nz-button nzType="link" (click)="disableLogin(item)" [class.action-loading]="actionLoadingId() === item.id">停用后台</a>
                    }
                    @if (item.loginAccountStatus !== null) {
                      <a nz-button nzType="link" (click)="openResetPassword(item)">重置密码</a>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </nz-table>
      </nz-card>

      <nz-modal
        [nzTitle]="editingId() ? '编辑用户' : '新增用户'"
        [(nzVisible)]="visible"
        [nzMaskClosable]="false"
        [nzWidth]="760"
        [nzFooter]="null"
        (nzOnCancel)="closeModal()"
      >
        <ng-container *nzModalContent>
          @if (formError()) {
            <nz-alert nzType="error" [nzMessage]="formError()!" nzShowIcon></nz-alert>
          }

          <form nz-form [formGroup]="form" nzLayout="vertical" class="user-form">
            <section class="form-section first-section">
              <div class="section-title">基本信息</div>
              <div class="section-grid">
                <nz-form-item>
                  <nz-form-label nzRequired>用户名</nz-form-label>
                  <nz-form-control>
                    <input nz-input formControlName="username" placeholder="请输入用户名" />
                    @if (controlError('username'); as error) {
                      <div class="field-error">{{ error }}</div>
                    }
                  </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                  <nz-form-label>显示名</nz-form-label>
                  <nz-form-control>
                    <input nz-input formControlName="displayName" placeholder="可选，默认显示用户名" />
                  </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                  <nz-form-label>职位</nz-form-label>
                  <nz-form-control>
                    <nz-select formControlName="titleCode" nzAllowClear nzPlaceHolder="下拉选择">
                      @for (opt of titleOptions(); track opt.value) {
                        <nz-option [nzValue]="opt.value" [nzLabel]="opt.label"></nz-option>
                      }
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                  <nz-form-label>用户状态</nz-form-label>
                  <nz-form-control>
                    <nz-select formControlName="status">
                      <nz-option nzValue="active" nzLabel="启用"></nz-option>
                      <nz-option nzValue="inactive" nzLabel="禁用"></nz-option>
                    </nz-select>
                  </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                  <nz-form-label>邮箱</nz-form-label>
                  <nz-form-control>
                    <input nz-input formControlName="email" placeholder="可选" />
                    @if (controlError('email'); as error) {
                      <div class="field-error">{{ error }}</div>
                    }
                  </nz-form-control>
                </nz-form-item>

                <nz-form-item>
                  <nz-form-label>手机号</nz-form-label>
                  <nz-form-control>
                    <input nz-input formControlName="mobile" placeholder="可选" />
                    @if (controlError('mobile'); as error) {
                      <div class="field-error">{{ error }}</div>
                    }
                  </nz-form-control>
                </nz-form-item>

                <nz-form-item class="full-span no-reserve">
                  <nz-form-label>备注</nz-form-label>
                  <nz-form-control>
                    <textarea nz-input rows="3" formControlName="remark" placeholder="补充说明"></textarea>
                  </nz-form-control>
                </nz-form-item>
              </div>
            </section>

            @if (isCreating()) {
              <section class="form-section auto-login-hint">
                <div class="section-title">后台账号</div>
                <div class="section-hint">新增用户后将自动开通后台登录，默认密码为 .env 中的 INIT_USER_DEFAULT_PASSWORD 配置值，默认角色为普通用户，且首次登录需修改密码。</div>
              </section>
            }

            <div class="form-actions">
              <button nz-button type="button" (click)="closeModal()">取消</button>
              <button nz-button nzType="primary" type="button" (click)="saveUser()" [nzLoading]="saving()">
                保存
              </button>
            </div>
          </form>
        </ng-container>
      </nz-modal>

      <nz-modal
        nzTitle="开通后台登录"
        [(nzVisible)]="loginAccountVisible"
        [nzMaskClosable]="false"
        [nzFooter]="null"
        (nzOnCancel)="closeLoginAccountModal()"
      >
        <ng-container *nzModalContent>
          @if (loginAccountError()) {
            <nz-alert nzType="error" [nzMessage]="loginAccountError()!" nzShowIcon></nz-alert>
          }

          <form nz-form nzLayout="vertical" [formGroup]="loginAccountForm" class="reset-form">
            <nz-form-item>
              <nz-form-label>用户</nz-form-label>
              <nz-form-control>
                <input nz-input [value]="loginAccountTargetName()" disabled />
              </nz-form-control>
            </nz-form-item>
            <div class="section-grid compact-grid">
              <nz-form-item>
                <nz-form-label nzRequired>登录账号</nz-form-label>
                <nz-form-control>
                  <input nz-input formControlName="username" placeholder="仅支持字母和数字" />
                  @if (loginAccountControlError('username'); as error) {
                    <div class="field-error">{{ error }}</div>
                  }
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label>后台角色</nz-form-label>
                <nz-form-control>
                  <div class="readonly-field">普通用户</div>
                </nz-form-control>
              </nz-form-item>

              <nz-form-item>
                <nz-form-label nzRequired>初始密码</nz-form-label>
                <nz-form-control>
                  <input nz-input type="password" formControlName="password" placeholder="至少 8 位" />
                  @if (loginAccountControlError('password'); as error) {
                    <div class="field-error">{{ error }}</div>
                  }
                </nz-form-control>
              </nz-form-item>
            </div>

            <label nz-checkbox formControlName="mustChangePassword" class="password-rule">
              首次登录必须修改密码
            </label>

            <div class="form-actions compact-actions">
              <button nz-button type="button" (click)="closeLoginAccountModal()">取消</button>
              <button nz-button nzType="primary" type="button" (click)="submitEnableLoginAccount()" [nzLoading]="loginAccountSaving()">
                保存
              </button>
            </div>
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

          <form nz-form nzLayout="vertical" [formGroup]="resetForm" class="reset-form">
            <nz-form-item>
              <nz-form-label>用户</nz-form-label>
              <nz-form-control>
                <input nz-input [value]="resetTargetName()" disabled />
              </nz-form-control>
            </nz-form-item>
            <nz-form-item>
              <nz-form-label nzRequired>新密码</nz-form-label>
              <nz-form-control>
                <input nz-input type="password" formControlName="newPassword" placeholder="至少 8 位" />
              </nz-form-control>
            </nz-form-item>

            <div class="form-actions compact-actions">
              <button nz-button type="button" (click)="resetVisible.set(false)">取消</button>
              <button nz-button nzType="primary" type="button" (click)="submitResetPassword()" [nzLoading]="resetting()">
                确认重置
              </button>
            </div>
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
      .row-actions { white-space: nowrap; }
      .action-loading { pointer-events: none; opacity: 0.55; }
      .user-form, .reset-form { display: flex; flex-direction: column; gap: 20px; }
      .form-section { border-top: 1px solid #f0f0f0; padding-top: 20px; }
      .first-section { border-top: none; padding-top: 0; }
      .section-title { margin-bottom: 16px; font-size: 16px; font-weight: 600; color: #1f1f1f; }
      .section-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
      .compact-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .section-grid nz-form-item { margin-bottom: 12px; }
      .section-grid nz-form-control { display: block; min-height: 58px; }
      .section-grid .no-reserve nz-form-control { min-height: auto; }
      .full-span { grid-column: 1 / -1; }
      .auto-login-hint { padding-top: 16px; }
      .section-hint {
        padding: 12px 14px;
        border: 1px dashed #d6e4ff;
        border-radius: 12px;
        background: #f7fbff;
        color: #597ef7;
      }
      .readonly-field {
        display: flex;
        align-items: center;
        min-height: 32px;
        padding: 4px 0;
        color: #595959;
      }
      .password-rule { display: inline-flex; margin-top: 4px; }
      .field-error { margin-top: 6px; color: #cf1322; font-size: 12px; line-height: 1.5; }
      .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        padding-top: 20px;
        border-top: 1px solid #f0f0f0;
      }
      .compact-actions { padding-top: 12px; }
      @media (max-width: 768px) {
        .filter-grid,
        .section-grid,
        .compact-grid { grid-template-columns: minmax(0, 1fr); }
        .form-actions { justify-content: stretch; }
        .form-actions button { flex: 1; }
      }
    `
  ]
})
export class UsersPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(HubApiService);
  private readonly auth = inject(AdminAuthService);

  protected readonly users = signal<UserItem[]>([]);
  protected readonly total = signal(0);
  protected readonly listLoading = signal(false);
  protected readonly listError = signal<string | null>(null);
  protected readonly visible = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly editingId = signal<string | null>(null);
  protected readonly isCreating = computed(() => !this.editingId());
  protected readonly isAdmin = computed(() => this.auth.profile()?.role === 'admin');
  protected readonly canCreate = computed(() => this.auth.profile()?.role === 'admin');
  protected readonly titleOptions = signal<UserTitleOption[]>([]);
  protected readonly actionLoadingId = signal<string | null>(null);

  protected readonly loginAccountVisible = signal(false);
  protected readonly loginAccountSaving = signal(false);
  protected readonly loginAccountError = signal<string | null>(null);
  protected readonly loginAccountTarget = signal<UserItem | null>(null);
  protected readonly loginAccountTargetName = computed(() => {
    const item = this.loginAccountTarget();
    return item ? (item.displayName || item.username) : '';
  });

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
    username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    displayName: [''],
    titleCode: [null as UserTitleCode | null],
    email: ['', [Validators.email]],
    mobile: ['', [Validators.pattern(MOBILE_PATTERN)]],
    status: ['active' as UserStatus, [Validators.required]],
    remark: ['']
  });

  protected readonly loginAccountForm = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.pattern(USERNAME_PATTERN)]],
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
    mustChangePassword: [true]
  });

  protected readonly resetForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]]
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
    if (!this.canCreate()) {
      return;
    }

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
    this.form.markAsPristine();
    this.form.markAsUntouched();
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
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.visible.set(true);
  }

  protected closeModal(): void {
    this.formError.set(null);
    this.visible.set(false);
  }

  protected openEnableLoginModal(item: UserItem): void {
    this.loginAccountTarget.set(item);
    this.loginAccountError.set(null);
    this.loginAccountForm.reset({
      username: item.username,
      password: '',
      mustChangePassword: true
    });
    this.loginAccountForm.markAsPristine();
    this.loginAccountForm.markAsUntouched();
    this.loginAccountVisible.set(true);
  }

  protected closeLoginAccountModal(): void {
    this.loginAccountError.set(null);
    this.loginAccountVisible.set(false);
    this.loginAccountTarget.set(null);
  }

  protected async submitEnableLoginAccount(): Promise<void> {
    const target = this.loginAccountTarget();
    if (!target) {
      return;
    }

    if (this.loginAccountForm.invalid) {
      this.loginAccountForm.markAllAsTouched();
      return;
    }

    this.loginAccountSaving.set(true);
    this.loginAccountError.set(null);

    try {
      const value = this.loginAccountForm.getRawValue();
      await firstValueFrom(this.api.post<UserItem, EnableLoginAccountPayload>(
        `/api/admin/users/${target.id}/login-account/enable`,
        {
          username: value.username.trim(),
          password: value.password,
          mustChangePassword: value.mustChangePassword
        }
      ));
      this.closeLoginAccountModal();
      await this.loadUsers();
    } catch (error) {
      this.loginAccountError.set(this.getErrorMessage(error, '开通后台登录失败'));
    } finally {
      this.loginAccountSaving.set(false);
    }
  }

  protected async enableExistingLogin(item: UserItem): Promise<void> {
    await this.runLoginAction(item.id, async () => {
      await firstValueFrom(this.api.post<UserItem, EnableLoginAccountPayload>(
        `/api/admin/users/${item.id}/login-account/enable`,
        {}
      ));
      await this.loadUsers();
    });
  }

  protected async disableLogin(item: UserItem): Promise<void> {
    await this.runLoginAction(item.id, async () => {
      await firstValueFrom(this.api.post<UserItem, Record<string, never>>(
        `/api/admin/users/${item.id}/login-account/disable`,
        {}
      ));
      await this.loadUsers();
    });
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
      this.form.markAllAsTouched();
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
        const createPayload: CreateUserPayload = {
          username: payload.username,
          status: payload.status
        };

        if (payload.displayName) createPayload.displayName = payload.displayName;
        if (payload.titleCode) createPayload.titleCode = payload.titleCode;
        if (payload.email) createPayload.email = payload.email;
        if (payload.mobile) createPayload.mobile = payload.mobile;
        if (payload.remark) createPayload.remark = payload.remark;

        await firstValueFrom(this.api.post<UserItem, CreateUserPayload>('/api/admin/users', createPayload));
      }

      this.visible.set(false);
      await this.loadUsers();
    } catch (error) {
      this.formError.set(this.getErrorMessage(error, '保存用户失败'));
    } finally {
      this.saving.set(false);
    }
  }

  protected controlError(name: 'username' | 'email' | 'mobile'): string | null {
    const control = this.form.controls[name];
    if (!control || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return '请输入用户名';
    }

    if (control.hasError('pattern')) {
      return name === 'mobile' ? '请输入有效手机号' : '仅支持字母和数字';
    }

    if (control.hasError('email')) {
      return '请输入有效邮箱';
    }

    return '输入格式有误';
  }

  protected loginAccountControlError(name: 'username' | 'password'): string | null {
    const control = this.loginAccountForm.controls[name];
    if (!control || (!control.touched && !control.dirty)) {
      return null;
    }

    if (control.hasError('required')) {
      return name === 'username' ? '请输入登录账号' : '请输入初始密码';
    }

    if (control.hasError('pattern')) {
      return '仅支持字母和数字';
    }

    if (control.hasError('minlength')) {
      return `密码至少 ${PASSWORD_MIN_LENGTH} 位`;
    }

    return '输入格式有误';
  }

  protected statusColor(status: UserStatus): string {
    return status === 'active' ? 'green' : 'orange';
  }

  protected statusLabel(status: UserStatus): string {
    return status === 'active' ? '启用' : '禁用';
  }

  protected loginStatusColor(status: LoginAccountStatus): string {
    if (status === 'active') return 'blue';
    if (status === 'disabled') return 'orange';
    return 'default';
  }

  protected loginStatusLabel(status: LoginAccountStatus): string {
    if (status === 'active') return '已启用';
    if (status === 'disabled') return '已停用';
    return '未开通';
  }

  protected titleLabel(titleCode: UserTitleCode | null): string {
    if (!titleCode) return '-';
    const hit = this.titleOptions().find((item) => item.value === titleCode);
    return hit?.label ?? titleCode;
  }

  private async runLoginAction(userId: string, runner: () => Promise<void>): Promise<void> {
    this.actionLoadingId.set(userId);
    this.listError.set(null);
    try {
      await runner();
    } catch (error) {
      this.listError.set(this.getErrorMessage(error, '更新后台登录状态失败'));
    } finally {
      this.actionLoadingId.set(null);
    }
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


