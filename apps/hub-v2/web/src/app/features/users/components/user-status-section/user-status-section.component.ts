import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import type { UserDraft } from '../../models/user-form.types';

@Component({
  selector: 'app-user-status-section',
  standalone: true,
  imports: [
    FormsModule,
    NzFormModule,
    NzGridModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
  ],
  template: `
    <section class="user-form-section">
      <div class="user-form-section__title">
        <nz-icon nzType="setting" nzTheme="outline" />
        人员状态
      </div>

      <div class="row" nz-row [nzGutter]="16">
        @if (showStatusSelect()) {
          <div class="col" nz-col [nzSpan]="12">
            <nz-form-item>
              <nz-form-label nzFor="status">人员状态</nz-form-label>
              <nz-form-control>
                <nz-select
                  [ngModel]="draft().status"
                  name="status"
                  (ngModelChange)="onFieldChange('status', $event)"
                >
                  <nz-option nzLabel="启用" nzValue="active"></nz-option>
                  <nz-option nzLabel="停用" nzValue="inactive"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          </div>
        }
        <div class="col" nz-col [nzSpan]="12">
          <nz-form-item>
            <nz-form-label nzFor="loginEnabled">可登录后台</nz-form-label>
            <nz-form-control>
              <nz-switch
                [ngModel]="draft().status === 'inactive' ? false : draft().loginEnabled"
                name="loginEnabled"
                [nzDisabled]="draft().status === 'inactive'"
                [nzCheckedChildren]="'启用'"
                [nzUnCheckedChildren]="'关闭'"
                (ngModelChange)="onFieldChange('loginEnabled', !!$event)"
              ></nz-switch>
              @if (draft().status === 'inactive') {
                <span class="user-form-hint">人员停用后后台登录会自动关闭。</span>
              }
            </nz-form-control>
          </nz-form-item>
        </div>
      </div>

      <div class="row" nz-row [nzGutter]="16">
        <div class="col" nz-col [nzSpan]="24">
          <nz-form-item>
            <nz-form-label nzFor="remark">备注</nz-form-label>
            <nz-form-control>
              <textarea
                nz-input
                rows="4"
                [ngModel]="draft().remark"
                name="remark"
                (ngModelChange)="onFieldChange('remark', $event)"
              ></textarea>
            </nz-form-control>
          </nz-form-item>
        </div>
      </div>
    </section>
  `,
  styles: `
    .user-form-section {
      display: flex;
      flex-direction: column;
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
      display: block;
      margin-top: 6px;
      color: var(--text-muted);
      font-size: 12px;
      line-height: 1.5;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserStatusSectionComponent {
  readonly draft = input.required<UserDraft>();
  readonly showStatusSelect = input(true);
  readonly fieldChange = output<{ field: keyof UserDraft; value: any }>();

  onFieldChange(field: keyof UserDraft, value: any): void {
    if (field === 'status' && value === 'inactive') {
      this.fieldChange.emit({ field, value });
      this.fieldChange.emit({ field: 'loginEnabled', value: false });
      return;
    }

    if (field === 'loginEnabled' && this.draft().status === 'inactive') {
      return;
    }

    this.fieldChange.emit({ field, value });
  }
}
