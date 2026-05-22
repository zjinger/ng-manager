import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { DepartmentEntity } from '../../../organization/models/organization.model';
import type { UserDraft } from '../../models/user-form.types';
import type { UserEntity } from '../../models/user.model';

@Component({
  selector: 'app-user-basic-form',
  standalone: true,
  imports: [FormsModule, NzFormModule, NzGridModule, NzIconModule, NzInputModule, NzSelectModule],
  template: `
    <form nz-form [nzLayout]="'vertical'">
      <section class="user-form-section">
        <div class="user-form-section__title">
          <nz-icon nzType="idcard" nzTheme="outline" />
          个人信息
        </div>

        <div class="row" nz-row [nzGutter]="16">
          <div class="col" nz-col [nzSpan]="12">
            <nz-form-item>
              <nz-form-label nzRequired nzFor="displayName">姓名</nz-form-label>
              <nz-form-control nzErrorTip="请输入用户姓名">
                <input
                  nz-input
                  required="true"
                  [ngModel]="draft().displayName"
                  name="displayName"
                  (ngModelChange)="onFieldChange('displayName', $event)"
                />
              </nz-form-control>
            </nz-form-item>
          </div>
          <div class="col" nz-col [nzSpan]="12">
            <nz-form-item>
              <nz-form-label
                nzRequired
                nzFor="username"
                nzTooltipTitle="仅支持英文和数字，长度 4-24 位"
                [nzTooltipIcon]="'question-circle'"
              >
                登录名
              </nz-form-label>
              <nz-form-control nzErrorTip="请输入登录名">
                <input
                  nz-input
                  required="true"
                  [ngModel]="draft().username"
                  name="username"
                  [maxlength]="24"
                  [disabled]="!usernameEditable()"
                  (ngModelChange)="onFieldChange('username', $event)"
                />
                @if (usernameInvalid()) {
                  <span class="user-form-error">登录名仅支持英文和数字，长度 4-24 位</span>
                }
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>

        <div class="row" nz-row [nzGutter]="16">
          <div class="col" nz-col [nzSpan]="12">
            <nz-form-item>
              <nz-form-label nzFor="email">邮箱</nz-form-label>
              <nz-form-control nzErrorTip="请输入正确的邮箱地址">
                <input
                  nz-input
                  [ngModel]="draft().email"
                  name="email"
                  (ngModelChange)="onFieldChange('email', $event)"
                  pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$"
                />
              </nz-form-control>
            </nz-form-item>
          </div>
          <div class="col" nz-col [nzSpan]="12">
            <nz-form-item>
              <nz-form-label nzFor="mobile">手机号</nz-form-label>
              <nz-form-control nzErrorTip="请输入正确的手机号">
                <input
                  nz-input
                  [ngModel]="draft().mobile"
                  name="mobile"
                  (ngModelChange)="onFieldChange('mobile', $event)"
                  pattern="^1[3-9]\\d{9}$"
                />
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>
      </section>

      <section class="user-form-section">
        <div class="user-form-section__title">
          <nz-icon nzType="bank" nzTheme="outline" />
          部门信息
        </div>

        <div class="row" nz-row [nzGutter]="16">
          <div class="col" nz-col [nzSpan]="12">
            <nz-form-item>
              <nz-form-label nzFor="primaryDepartmentId">所属部门</nz-form-label>
              <nz-form-control>
                <nz-select
                  nzAllowClear
                  nzPlaceHolder="请选择主部门"
                  [ngModel]="draft().primaryDepartmentId"
                  name="primaryDepartmentId"
                  (ngModelChange)="onFieldChange('primaryDepartmentId', $event || '')"
                >
                  @for (department of departments(); track department.id) {
                    <nz-option [nzLabel]="department.name" [nzValue]="department.id"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </div>
          <div class="col" nz-col [nzSpan]="12">
            <nz-form-item>
              <nz-form-label nzFor="organizationTitleCode">职务</nz-form-label>
              <nz-form-control>
                <nz-select
                  nzAllowClear
                  nzPlaceHolder="请选择职务"
                  [ngModel]="draft().organizationTitleCode"
                  name="organizationTitleCode"
                  (ngModelChange)="onFieldChange('organizationTitleCode', $event)"
                >
                  @for (item of titleOptionsForDisplay(); track item.value) {
                    <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>

        <div class="row" nz-row [nzGutter]="16">
          <div class="col" nz-col [nzSpan]="12">
            <nz-form-item>
              <nz-form-label nzFor="manager">直属上级</nz-form-label>
              <nz-form-control>
                <nz-select
                  nzAllowClear
                  nzPlaceHolder="请选择直属上级"
                  [ngModel]="draft().managerUserId"
                  name="managerUserId"
                  (ngModelChange)="onFieldChange('managerUserId', $event || '')"
                >
                  <nz-option nzLabel="无" nzValue=""></nz-option>
                  @for (user of managerOptions(); track user.id) {
                    <nz-option [nzLabel]="userLabel(user)" [nzValue]="user.id"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </div>
          <div class="col" nz-col [nzSpan]="12">
            <nz-form-item>
              <nz-form-label nzFor="defaultProjectTitleCode">项目职能</nz-form-label>
              <nz-form-control>
                <nz-select
                  nzAllowClear
                  nzPlaceHolder="请选择默认项目职能"
                  [ngModel]="draft().defaultProjectTitleCode"
                  name="defaultProjectTitleCode"
                  (ngModelChange)="onFieldChange('defaultProjectTitleCode', $event)"
                >
                  @for (item of projectTitleOptionsForDisplay(); track item.value) {
                    <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>
      </section>
    </form>
  `,
  styles: `
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

    .user-form-error,
    .user-form-hint {
      display: inline-block;
      margin-top: 6px;
      font-size: 12px;
    }

    .user-form-error {
      color: var(--color-danger);
    }

    .user-form-hint {
      color: var(--text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserBasicFormComponent {
  readonly draft = input.required<UserDraft>();
  readonly departments = input.required<DepartmentEntity[]>();
  readonly userOptions = input.required<UserEntity[]>();
  readonly titleOptions = input.required<Array<{ label: string; value: string }>>();
  readonly projectTitleOptions = input<Array<{ label: string; value: string }>>([]);
  readonly usernameEditable = input(true);
  readonly usernameInvalid = input(false);
  readonly fieldChange = output<{ field: keyof UserDraft; value: any }>();

  managerOptions(): UserEntity[] {
    const currentUsername = this.draft().username.trim();
    return this.userOptions().filter((user) => user.username !== currentUsername);
  }

  userLabel(user: UserEntity): string {
    return user.displayName ? `${user.displayName} - ${user.username}` : user.username;
  }

  titleOptionsForDisplay(): Array<{ label: string; value: string }> {
    const options = this.titleOptions();
    const current = this.draft().organizationTitleCode?.trim();
    if (!current) {
      return options;
    }
    if (options.some((option) => option.value === current)) {
      return options;
    }
    return [...options, { label: `${current}（已停用，仅历史）`, value: current }];
  }

  projectTitleOptionsForDisplay(): Array<{ label: string; value: string }> {
    const options = this.projectTitleOptions();
    const current = this.draft().defaultProjectTitleCode?.trim();
    if (!current) {
      return options;
    }
    if (options.some((option) => option.value === current)) {
      return options;
    }
    return [...options, { label: `${current}（已停用，仅历史）`, value: current }];
  }

  onFieldChange(field: keyof UserDraft, value: any): void {
    this.fieldChange.emit({ field, value });
  }
}
