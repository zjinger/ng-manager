import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '../../../../shared/ui/dialog/dialog-shell.component';
import type { CreateUserInput, UpdateUserInput, UserEntity, UserStatus } from '../../models/user.model';

type UserFormMode = 'create' | 'edit';

type Draft = {
  username: string;
  displayName: string;
  email: string;
  mobile: string;
  titleCode: string;
  remark: string;
  status: UserStatus;
};

const DEFAULT_DRAFT: Draft = {
  username: '',
  displayName: '',
  email: '',
  mobile: '',
  titleCode: '',
  remark: '',
  status: 'active',
};

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="680"
      [title]="mode() === 'create' ? '新建用户' : '编辑用户'"
      [subtitle]="mode() === 'create' ? '创建测试与协作所需的基础用户数据。' : '调整用户的展示信息和当前状态。'"
      [icon]="'user'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="user-form" class="user-form dialog-form" (ngSubmit)="submitForm()">
          <div class="user-form__grid dialog-form__grid">
            <label class="field dialog-field">
              <span class="dialog-field__label">用户名</span>
              <input
                nz-input
                [disabled]="mode() === 'edit'"
                [ngModel]="draft().username"
                name="username"
                (ngModelChange)="updateField('username', $event)"
              />
            </label>
            <label class="field dialog-field">
              <span class="dialog-field__label">显示名</span>
              <input nz-input [ngModel]="draft().displayName" name="displayName" (ngModelChange)="updateField('displayName', $event)" />
            </label>
          </div>

          <div class="user-form__grid dialog-form__grid">
            <label class="field dialog-field">
              <span class="dialog-field__label">邮箱</span>
              <input nz-input [ngModel]="draft().email" name="email" (ngModelChange)="updateField('email', $event)" />
            </label>
            <label class="field dialog-field">
              <span class="dialog-field__label">手机号</span>
              <input nz-input [ngModel]="draft().mobile" name="mobile" (ngModelChange)="updateField('mobile', $event)" />
            </label>
          </div>

          <div class="user-form__grid dialog-form__grid">
            <label class="field dialog-field">
              <span class="dialog-field__label">职能</span>
              <input nz-input [ngModel]="draft().titleCode" name="titleCode" (ngModelChange)="updateField('titleCode', $event)" />
            </label>
            <label class="field dialog-field">
              <span class="dialog-field__label">状态</span>
              <nz-select [ngModel]="draft().status" name="status" (ngModelChange)="updateField('status', $event)">
                <nz-option nzLabel="活跃" nzValue="active"></nz-option>
                <nz-option nzLabel="停用" nzValue="inactive"></nz-option>
              </nz-select>
            </label>
          </div>

          <label class="field dialog-field">
            <span class="dialog-field__label">备注</span>
            <textarea nz-input rows="4" [ngModel]="draft().remark" name="remark" (ngModelChange)="updateField('remark', $event)"></textarea>
          </label>
        </form>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [nzLoading]="busy()" [disabled]="!draft().username.trim()" type="submit" form="user-form">
          {{ mode() === 'create' ? '创建用户' : '保存修改' }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .user-form__grid {
        gap: 16px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly mode = input<UserFormMode>('create');
  readonly user = input<UserEntity | null>(null);
  readonly create = output<CreateUserInput>();
  readonly update = output<UpdateUserInput>();
  readonly cancel = output<void>();

  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });

  constructor() {
    effect(() => {
      const user = this.user();
      if (!this.open()) {
        return;
      }
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
            }
          : { ...DEFAULT_DRAFT }
      );
    });
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  submitForm(): void {
    const draft = this.draft();
    if (!draft.username.trim()) {
      return;
    }

    if (this.mode() === 'create') {
      this.create.emit({
        username: draft.username.trim(),
        displayName: draft.displayName.trim() || undefined,
        email: draft.email.trim() || undefined,
        mobile: draft.mobile.trim() || undefined,
        titleCode: draft.titleCode.trim() || undefined,
        remark: draft.remark.trim() || undefined,
      });
      return;
    }

    this.update.emit({
      displayName: draft.displayName.trim() || null,
      email: draft.email.trim() || null,
      mobile: draft.mobile.trim() || null,
      titleCode: draft.titleCode.trim() || null,
      remark: draft.remark.trim() || null,
      status: draft.status,
    });
  }
}
