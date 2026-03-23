import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { AuthUser } from '../../../../core/auth/auth.types';
import { PanelCardComponent } from '../../../../shared/ui/panel-card/panel-card.component';

@Component({
  selector: 'app-profile-basic-form',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, PanelCardComponent],
  template: `
    <app-panel-card title="基本信息">
      <form class="dialog-form">
        <div class="dialog-form__grid profile-form-grid">
          <label class="dialog-field">
            <span class="dialog-field__label">用户名</span>
            <input nz-input [ngModel]="user()?.username || ''" name="username" disabled />
            <span class="profile-hint">用户名不可修改</span>
          </label>

          <label class="dialog-field">
            <span class="dialog-field__label">昵称 <span class="profile-required">*</span></span>
            <input nz-input [ngModel]="user()?.nickname || ''" name="nickname" />
          </label>

          <label class="dialog-field">
            <span class="dialog-field__label">邮箱</span>
            <input nz-input [ngModel]="emailValue()" name="email" />
          </label>

          <label class="dialog-field">
            <span class="dialog-field__label">手机号</span>
            <input nz-input [ngModel]="phoneValue()" name="mobile" />
          </label>

          <label class="dialog-field">
            <span class="dialog-field__label">职位</span>
            <input nz-input [ngModel]="titleValue()" name="title" />
          </label>

          <label class="dialog-field">
            <span class="dialog-field__label">时区</span>
            <nz-select nzPlaceHolder="选择时区" [ngModel]="timezoneValue()" name="timezone">
              <nz-option nzLabel="Asia/Shanghai (UTC+8)" nzValue="Asia/Shanghai"></nz-option>
              <nz-option nzLabel="Asia/Tokyo (UTC+9)" nzValue="Asia/Tokyo"></nz-option>
              <nz-option nzLabel="Europe/London (UTC+0)" nzValue="Europe/London"></nz-option>
              <nz-option nzLabel="America/New_York (UTC-5)" nzValue="America/New_York"></nz-option>
            </nz-select>
          </label>
        </div>

        <label class="dialog-field">
          <span class="dialog-field__label">个人简介</span>
          <textarea nz-input rows="4" [ngModel]="bioValue()" name="bio"></textarea>
        </label>
      </form>

      <div panel-footer class="profile-footer">
        <div class="profile-footer__meta">资料编辑接口后续接入，当前先以设计稿布局展示表单结构。</div>
        <button nz-button nzType="primary" disabled>保存修改</button>
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .profile-form-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .profile-required {
        color: var(--color-danger);
      }

      .profile-hint {
        color: var(--text-muted);
        font-size: 12px;
      }

      .profile-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .profile-footer__meta {
        color: var(--text-muted);
        font-size: 13px;
        line-height: 1.7;
      }

      .profile-footer :global(.ant-btn),
      .profile-footer .ant-btn {
        min-width: 112px;
      }

      @media (max-width: 768px) {
        .profile-form-grid {
          grid-template-columns: 1fr;
        }

        .profile-footer {
          flex-direction: column;
          align-items: stretch;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileBasicFormComponent {
  readonly user = input<AuthUser | null>(null);

  readonly emailValue = computed(() => `${this.user()?.username || 'user'}@example.com`);
  readonly phoneValue = computed(() => '138****6789');
  readonly titleValue = computed(() => (this.user()?.role === 'admin' ? '系统管理员' : '项目成员'));
  readonly timezoneValue = computed(() => 'Asia/Shanghai');
  readonly bioValue = computed(
    () => `${this.user()?.nickname || this.user()?.username || '当前账号'} 负责 hub v2 的日常协作、问题流转与系统配置维护。`,
  );
}
