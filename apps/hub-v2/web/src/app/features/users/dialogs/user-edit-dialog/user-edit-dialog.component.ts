import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzInputModule } from 'ng-zorro-antd/input';

import { DialogShellComponent, TabsComponent } from '@shared/ui';
import { UserBasicFormComponent } from '../../components/user-basic-form';
import { UserStatusSectionComponent } from '../../components/user-status-section';
import { UserPermissionsTabComponent, type PermissionOverrides } from '../../components/user-permissions-tab';
import type { DepartmentEntity } from '../../../organization/models/organization.model';
import { USER_TITLE_OPTIONS, type UpdateUserInput, type UserEntity } from '../../models/user.model';
import { DEFAULT_USER_DRAFT, type EditTab, type UserDraft } from '../../models/user-form.types';

@Component({
  selector: 'app-user-edit-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzFormModule,
    NzInputModule,
    DialogShellComponent,
    TabsComponent,
    UserBasicFormComponent,
    UserStatusSectionComponent,
    UserPermissionsTabComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="760"
      title="编辑用户"
      [showAvatar]="true"
      [avatarPreviewUrl]="user().avatarUrl"
      [displayName]="draft().displayName || draft().username || '未命名用户'"
      [description]="(user().displayName || user().username) + ' · ' + user().username"
      (cancel)="cancel.emit()"
    >
      <div dialog-body class="user-edit-dialog">
        <app-tabs
          [tabs]="editTabs"
          [activeId]="activeTab()"
          (tabChange)="activeTab.set($any($event))"
        />

        @switch (activeTab()) {
          @case ('basic') {
            <app-user-basic-form
              [draft]="draft()"
              [departments]="departments()"
              [titleOptions]="titleOptions"
              [usernameEditable]="false"
              [usernameInvalid]="false"
              [showSecondaryDepartments]="true"
              (fieldChange)="updateField($event.field, $event.value)"
            />

            <app-user-status-section
              [draft]="draft()"
              [showStatusSelect]="true"
              (fieldChange)="updateField($event.field, $event.value)"
            />
          }

          @case ('security') {
            <section class="user-form-section">
              <div class="user-form-section__title">
                <nz-icon nzType="lock" nzTheme="outline" />
                密码管理
              </div>
              <nz-form-item>
                <nz-form-label nzFor="generatedPassword">重置密码</nz-form-label>
                <nz-form-control>
                  <div class="security-password-row">
                    <input nz-input [ngModel]="generatedPassword()" name="generatedPassword" disabled />
                    <button nz-button type="button" (click)="regeneratePassword()">
                      <nz-icon nzType="reload" nzTheme="outline" />
                      重新生成
                    </button>
                    <button nz-button nzType="primary" type="button" (click)="resetPassword.emit()">
                      <nz-icon nzType="key" nzTheme="outline" />
                      重置密码
                    </button>
                  </div>
                  <span class="user-form-hint">当前会调用现有重置密码接口，首次登录强制修改等安全策略仍待后端补充。</span>
                </nz-form-control>
              </nz-form-item>
            </section>

            <section class="user-form-section">
              <div class="user-form-section__title">
                <nz-icon nzType="safety-certificate" nzTheme="outline" />
                安全策略
              </div>
              <div class="status-card-list">
                <div class="status-card">
                  <div class="status-card__info">
                    <strong>双因素认证（2FA）</strong>
                    <span>需要服务端补充用户级 2FA 配置、密钥与校验能力。</span>
                  </div>
                  <span class="placeholder-card__tag">待接入</span>
                </div>
                <div class="status-card">
                  <div class="status-card__info">
                    <strong>允许远程登录</strong>
                    <span>需要服务端补充登录来源限制和 IP 策略。</span>
                  </div>
                  <span class="placeholder-card__tag">待接入</span>
                </div>
                <div class="status-card">
                  <div class="status-card__info">
                    <strong>强制下次修改密码</strong>
                    <span>需要服务端补充 must-change-password 状态字段。</span>
                  </div>
                  <span class="placeholder-card__tag">待接入</span>
                </div>
              </div>
            </section>
          }

          @case ('permissions') {
            <app-user-permissions-tab
              [selectedRole]="selectedRole()"
              [overrides]="permissionOverrides()"
              (roleChange)="selectedRole.set($event)"
              (overridesChange)="permissionOverrides.set($event)"
            />
          }

          @case ('history') {
            <section class="user-form-section">
              <div class="user-form-section__title">
                <nz-icon nzType="history" nzTheme="outline" />
                最近记录
              </div>
              <div class="timeline">
                @for (item of timeline(); track item.title + item.meta) {
                  <div class="timeline-item">
                    <div class="timeline-item__icon">
                      <nz-icon [nzType]="item.icon" nzTheme="outline" />
                    </div>
                    <div class="timeline-item__content">
                      <strong>{{ item.title }}</strong>
                      <span class="timeline-item__meta">{{ item.meta }}</span>
                    </div>
                  </div>
                }
              </div>
            </section>
          }
        }
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button
          nz-button
          nzType="primary"
          [nzLoading]="busy()"
          [disabled]="!canSubmit()"
          (click)="submitForm()"
          type="button"
        >
          <nz-icon nzType="check" nzTheme="outline"></nz-icon>
          保存修改
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: `
    .user-edit-dialog {
      display: grid;
      gap: 20px;
    }

    .user-form-section {
      display: flex;
      flex-direction: column;
    }

    .user-form-section + .user-form-section {
      padding-top: 20px;
      border-top: 1px solid var(--border-color-soft);
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

    .user-form-hint {
      display: inline-block;
      margin-top: 6px;
      font-size: 12px;
      color: var(--text-muted);
    }

    .security-password-row {
      display: flex;
      gap: 8px;
    }

    .security-password-row input {
      flex: 1;
      font-family: 'SFMono-Regular', Consolas, monospace;
    }

    .status-card-list {
      display: grid;
      gap: 10px;
    }

    .status-card,
    .placeholder-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 14px 16px;
      border: 1px solid var(--border-color);
      border-radius: 10px;
      background: var(--bg-subtle);
    }

    .status-card__info,
    .placeholder-card__info {
      display: grid;
      gap: 4px;
      min-width: 0;
    }

    .status-card__info strong,
    .placeholder-card__info strong {
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 600;
    }

    .status-card__info span,
    .placeholder-card__info span {
      color: var(--text-muted);
      font-size: 12px;
    }

    .placeholder-card__tag {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 0 10px;
      border-radius: 999px;
      background: var(--bg-container);
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 600;
    }

    .timeline {
      display: grid;
    }

    .timeline-item {
      display: grid;
      grid-template-columns: 38px minmax(0, 1fr);
      gap: 12px;
      padding: 14px 0;
      border-top: 1px solid var(--border-color-soft);
    }

    .timeline-item:first-child {
      border-top: 0;
      padding-top: 0;
    }

    .timeline-item__icon {
      width: 38px;
      height: 38px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: var(--bg-subtle);
      color: var(--color-primary);
    }

    .timeline-item__content {
      display: grid;
      gap: 4px;
    }

    .timeline-item__content strong {
      color: var(--text-primary);
      font-size: 14px;
    }

    .timeline-item__meta {
      color: var(--text-muted);
      font-size: 12px;
    }

    @media (max-width: 720px) {
      .security-password-row {
        flex-direction: column;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserEditDialogComponent {
  private readonly message = inject(NzMessageService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly user = input.required<UserEntity>();
  readonly departments = input<DepartmentEntity[]>([]);
  readonly update = output<UpdateUserInput>();
  readonly resetPassword = output<void>();
  readonly cancel = output<void>();

  readonly activeTab = signal<EditTab>('basic');
  readonly draft = signal<UserDraft>({ ...DEFAULT_USER_DRAFT });
  readonly generatedPassword = signal('Hub@2026#New');
  readonly titleOptions = USER_TITLE_OPTIONS;

  readonly selectedRole = signal<string>('member');
  readonly permissionOverrides = signal<PermissionOverrides>({
    allowExport: true,
    allowDelete: false,
    allowApiAccess: true,
    viewAuditLog: false,
  });

  readonly editTabs: { id: EditTab; label: string; icon?: string }[] = [
    { id: 'basic', label: '基本信息', icon: 'user' },
    { id: 'security', label: '安全设置', icon: 'safety-certificate' },
    { id: 'permissions', label: '权限配置', icon: 'key' },
    { id: 'history', label: '操作记录', icon: 'history' },
  ];

  readonly canSubmit = computed(() => {
    return !!this.draft().displayName.trim();
  });

  readonly timeline = computed(() => {
    const currentUser = this.user();
    if (!currentUser) {
      return [];
    }
    return [
      {
        icon: 'user',
        title: `创建用户档案：${currentUser.displayName || currentUser.username}`,
        meta: `创建于 ${this.shortDateTime(currentUser.createdAt)}`,
      },
      {
        icon: 'edit',
        title: '最近一次资料更新',
        meta: `更新时间 ${this.shortDateTime(currentUser.updatedAt)}`,
      },
      {
        icon: 'history',
        title: '登录与安全审计待接入',
        meta: '需要后端补充登录日志、设备、IP 与安全事件',
      },
    ];
  });

  constructor() {
    effect(() => {
      const user = this.user();
      if (!this.open()) {
        return;
      }
      this.activeTab.set('basic');
      this.generatedPassword.set('Hub@2026#New');
      this.draft.set(
        user
          ? {
              username: user.username,
              displayName: user.displayName || '',
              email: user.email || '',
              mobile: user.mobile || '',
              titleCode: user.titleCode || '',
              remark: user.remark || '',
              status: user.status,
              loginEnabled: user.loginEnabled,
              primaryDepartmentId: user.departments.find((item) => item.relationType === 'primary')?.departmentId || '',
              secondaryDepartmentIds: user.departments
                .filter((item) => item.relationType === 'secondary')
                .map((item) => item.departmentId),
            }
          : { ...DEFAULT_USER_DRAFT }
      );
    });
  }

  updateField(field: keyof UserDraft, value: any): void {
    this.draft.update((draft) => ({ ...draft, [field]: value }));
  }

  submitForm(): void {
    const draft = this.draft();
    if (!this.canSubmit()) {
      return;
    }

    const departments = [
      ...(draft.primaryDepartmentId
        ? [{ departmentId: draft.primaryDepartmentId, relationType: 'primary' as const }]
        : []),
      ...draft.secondaryDepartmentIds
        .filter((departmentId) => departmentId && departmentId !== draft.primaryDepartmentId)
        .map((departmentId) => ({ departmentId, relationType: 'secondary' as const })),
    ];

    this.update.emit({
      displayName: draft.displayName.trim() || null,
      email: draft.email.trim() || null,
      mobile: draft.mobile.trim() || null,
      titleCode: draft.titleCode || null,
      remark: draft.remark.trim() || null,
      status: draft.status,
      loginEnabled: draft.loginEnabled,
      departments,
    });
  }

  regeneratePassword(): void {
    this.generatedPassword.set(`Hub@${1000 + Math.floor(Math.random() * 9000)}#New`);
  }

  private shortDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  }
}
