import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { PanelCardComponent } from '@shared/ui';
import { NzIconModule } from 'ng-zorro-antd/icon';
import type { AuthUser } from '../../../../core/auth/auth.types';

@Component({
  selector: 'app-profile-basic-form',
  standalone: true,
  imports: [FormsModule, NzIconModule, NzButtonModule, NzFormModule, NzGridModule, NzInputModule, NzSelectModule, PanelCardComponent],
  template: `
    <app-panel-card title="基本信息">
      <div class="profile-form">
        <form nz-form nzLayout="vertical" class="profile-form">
        <div nz-row nzGutter="24">
          <div nz-col nzSpan="12">
            <nz-form-item>
              <nz-form-label nzFor="username">用户名</nz-form-label>
              <nz-form-control>
                <input nz-input [ngModel]="user()?.username || ''" name="username" readonly="true" />
                <span class="profile-hint">用户名不可修改</span>
              </nz-form-control>
            </nz-form-item>
          </div>
          <div nz-col nzSpan="12">
            <nz-form-item>
              <nz-form-label nzRequired nzFor="nickname">昵称 </nz-form-label>
              <nz-form-control>
                <input nz-input [ngModel]="user()?.nickname || ''" name="nickname" />
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>

        <div nz-row nzGutter="24">
          <div nz-col nzSpan="12">
            <nz-form-item>
              <nz-form-label nzFor="email">邮箱</nz-form-label>
              <nz-form-control>
                <input nz-input [ngModel]="emailValue()" name="email" />
              </nz-form-control>
            </nz-form-item>
          </div>
          <div nz-col nzSpan="12">
            <nz-form-item>
              <nz-form-label nzFor="mobile">手机号</nz-form-label>
              <nz-form-control>
                <input nz-input [ngModel]="phoneValue()" name="mobile" />
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>

        <!--  <div nz-row nzGutter="24">
         <div nz-col nzSpan="12">
            <nz-form-item>
              <nz-form-label nzFor="title">职位</nz-form-label>
              <nz-form-control>
                <input nz-input [ngModel]="titleValue()" name="title" />
              </nz-form-control>
            </nz-form-item>
          </div> <div nz-col nzSpan="12">
            <nz-form-item>
              <nz-form-label nzFor="timezone">时区</nz-form-label>
              <nz-form-control>
                <nz-select nzPlaceHolder="选择时区" [ngModel]="timezoneValue()" name="timezone">
                  <nz-option nzLabel="Asia/Shanghai (UTC+8)" nzValue="Asia/Shanghai"></nz-option>
                  <nz-option nzLabel="Asia/Tokyo (UTC+9)" nzValue="Asia/Tokyo"></nz-option>
                  <nz-option nzLabel="Europe/London (UTC+0)" nzValue="Europe/London"></nz-option>
                  <nz-option nzLabel="America/New_York (UTC-5)" nzValue="America/New_York"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </div>
        </div> -->

        <div nz-row nzGutter="24">
          <div nz-col nzSpan="24">
            <nz-form-item>
              <nz-form-label nzFor="bio">个人简介</nz-form-label>
              <nz-form-control>
                <textarea nz-input rows="4" [ngModel]="bioValue()" name="bio"></textarea>
              </nz-form-control>
            </nz-form-item>
          </div>
        </div>
      </form>
      </div>
      <div panel-footer class="profile-footer">
        <div class="profile-footer__meta"></div>
        <button nz-button nzType="primary" disabled>
          <nz-icon nzType="save" nzTheme="outline" />
          保存修改
        </button>
      </div>
    </app-panel-card>
  `,
  styles: [
    `
    .profile-form{
      padding: 24px;
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
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileBasicFormComponent {
  readonly user = input<AuthUser | null>(null);

  readonly emailValue = computed(() => this.user()?.email || '');
  readonly phoneValue = computed(() => this.user()?.mobile || '');
  readonly titleValue = computed(() => (this.user()?.role === 'admin' ? '系统管理员' : '项目成员'));
  readonly timezoneValue = computed(() => 'Asia/Shanghai');
  readonly bioValue = computed(
    () => this.user()?.remark || '',
  );
}
