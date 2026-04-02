import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import type { AuthUser } from '@core/auth';
import { PanelCardComponent } from '@shared/ui';
import type { UpdateProfileInput } from '../../models/profile.model';

interface ProfileBasicDraft {
  nickname: string;
  email: string;
  mobile: string;
  remark: string;
}

const MOBILE_PATTERN = /^1\d{10}$/;
const DEFAULT_DRAFT: ProfileBasicDraft = {
  nickname: '',
  email: '',
  mobile: '',
  remark: '',
};

@Component({
  selector: 'app-profile-basic-form',
  standalone: true,
  imports: [FormsModule, NzIconModule, NzButtonModule, NzFormModule, NzGridModule, NzInputModule, NzPopconfirmModule, PanelCardComponent],
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
                  <input nz-input [ngModel]="draft().nickname" name="nickname" (ngModelChange)="updateField('nickname', $event)" />
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="24">
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzFor="email">邮箱</nz-form-label>
                <nz-form-control>
                  <input nz-input [ngModel]="draft().email" name="email" (ngModelChange)="updateField('email', $event)" />
                </nz-form-control>
              </nz-form-item>
            </div>
            <div nz-col nzSpan="12">
              <nz-form-item>
                <nz-form-label nzFor="mobile">手机号</nz-form-label>
                <nz-form-control>
                  <input nz-input [ngModel]="draft().mobile" name="mobile" (ngModelChange)="updateField('mobile', $event)" />
                  @if (mobileInvalid()) {
                    <span class="profile-error">请检查手机号是否正确，必须为 11 位数字</span>
                  }
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>

          <div nz-row nzGutter="24">
            <div nz-col nzSpan="24">
              <nz-form-item>
                <nz-form-label nzFor="bio">个人简介</nz-form-label>
                <nz-form-control>
                  <textarea nz-input rows="4" [ngModel]="draft().remark" name="bio" (ngModelChange)="updateField('remark', $event)"></textarea>
                </nz-form-control>
              </nz-form-item>
            </div>
          </div>
        </form>
      </div>
      <div panel-footer class="profile-footer">
        <div class="profile-footer__meta"></div>
        <div class="profile-footer__actions">
          <button
            nz-button
            [disabled]="!canReset()"
            nz-popconfirm
            nzPopconfirmTitle="确认重置已编辑内容？"
            nzPopconfirmPlacement="topRight"
            (nzOnConfirm)="resetDraft()"
          >
            重置
          </button>
          <button
            nz-button
            nzType="primary"
            [disabled]="!canSubmit()"
            [nzLoading]="busy()"
            nz-popconfirm
            nzPopconfirmTitle="确认保存基本信息修改？"
            nzPopconfirmPlacement="topRight"
            (nzOnConfirm)="submit()"
          >
            <nz-icon nzType="save" nzTheme="outline" />
            保存修改
          </button>
        </div>
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .profile-form {
        padding: 24px;
      }

      .profile-hint {
        color: var(--text-muted);
        font-size: 12px;
      }

      .profile-error {
        display: inline-block;
        margin-top: 6px;
        font-size: 12px;
        color: var(--color-danger);
      }

      .profile-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .profile-footer__actions {
        display: inline-flex;
        align-items: center;
        gap: 10px;
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
  readonly busy = input(false);
  readonly submittedVersion = input(0);
  readonly save = output<UpdateProfileInput>();

  readonly draft = signal<ProfileBasicDraft>({ ...DEFAULT_DRAFT });

  readonly mobileInvalid = computed(() => {
    const value = this.draft().mobile.trim();
    return value.length > 0 && !MOBILE_PATTERN.test(value);
  });

  readonly dirty = computed(() => {
    const user = this.user();
    if (!user) {
      return false;
    }
    const draft = this.draft();
    return (
      draft.nickname.trim() !== (user.nickname ?? '') ||
      draft.email.trim() !== (user.email ?? '') ||
      draft.mobile.trim() !== (user.mobile ?? '') ||
      draft.remark.trim() !== (user.remark ?? '')
    );
  });

  constructor() {
    effect(() => {
      const user = this.user();
      this.submittedVersion();
      if (!user) {
        this.draft.set({ ...DEFAULT_DRAFT });
        return;
      }
      this.draft.set({
        nickname: user.nickname ?? '',
        email: user.email ?? '',
        mobile: user.mobile ?? '',
        remark: user.remark ?? '',
      });
    });
  }

  updateField<K extends keyof ProfileBasicDraft>(key: K, value: ProfileBasicDraft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  canSubmit(): boolean {
    return !this.busy() && this.dirty() && !this.mobileInvalid() && this.draft().nickname.trim().length > 0;
  }

  canReset(): boolean {
    return !this.busy() && this.dirty();
  }

  submit(): void {
    if (!this.canSubmit()) {
      return;
    }

    const payload: UpdateProfileInput = {
      nickname: this.draft().nickname.trim(),
      email: this.draft().email.trim() || null,
      mobile: this.draft().mobile.trim() || null,
      remark: this.draft().remark.trim() || null,
    };
    this.save.emit(payload);
  }

  resetDraft(): void {
    const user = this.user();
    if (!user) {
      this.draft.set({ ...DEFAULT_DRAFT });
      return;
    }
    this.draft.set({
      nickname: user.nickname ?? '',
      email: user.email ?? '',
      mobile: user.mobile ?? '',
      remark: user.remark ?? '',
    });
  }
}
