import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import { DialogShellComponent } from '@shared/ui';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { USER_TITLE_OPTIONS, type CreateUserInput, type UpdateUserInput, type UserEntity, type UserStatus, type UserTitleCode } from '../../models/user.model';
import { DatePipe } from '@angular/common';

type UserFormMode = 'create' | 'edit';

type Draft = {
  username: string;
  displayName: string;
  email: string;
  mobile: string;
  titleCode: UserTitleCode | '';
  remark: string;
  status: UserStatus;
  loginEnabled: boolean;
};

const DEFAULT_DRAFT: Draft = {
  username: '',
  displayName: '',
  email: '',
  mobile: '',
  titleCode: '',
  remark: '',
  status: 'active',
  loginEnabled: true,
};

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzFormModule,
    NzGridModule,
    NzInputModule,
    NzSelectModule,
    NzSwitchModule,
    DialogShellComponent,
  ],
  templateUrl: './user-form-dialog.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      .project-edit-overview {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }
      .project-edit-overview__avatar {
        width: 68px;
        height: 68px;
        border-radius: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, var(--primary-500), var(--primary-700));
        color: #fff;
        font-size: 22px;
        font-weight: 700;
        overflow: hidden;
      }
      .project-edit-overview__avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .project-edit-overview__info h3 {
        margin: 0;
        color: var(--text-heading);
        font-size: 22px;
        font-weight: 700;
      }
      .project-edit-overview__info p {
        margin: 6px 0 0;
        color: var(--text-muted);
        font-size: 14px;
      }
      .project-edit-overview__divider {
        height: 1px;
        background: var(--border-color-soft);
        margin-bottom: 16px;
      }
      .user-form-error {
        display: inline-block;
        margin-top: 6px;
        color: var(--color-danger);
        font-size: 12px;
      }
    `
  ],
})
export class UserFormDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly mode = input<UserFormMode>('create');
  readonly user = input<UserEntity | null>(null);
  readonly create = output<CreateUserInput>();
  readonly update = output<UpdateUserInput>();
  readonly cancel = output<void>();

  readonly avatarPreviewUrl = signal<string | null>(null);
  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });
  readonly titleOptions = USER_TITLE_OPTIONS;
  readonly usernamePattern = /^[A-Za-z0-9]{4,24}$/;
  readonly usernameInvalid = computed(() => {
    if (this.mode() !== 'create') {
      return false;
    }
    const username = this.draft().username.trim();
    if (!username) {
      return false;
    }
    return !this.usernamePattern.test(username);
  });
  readonly canSubmit = computed(() => {
    const draft = this.draft();
    if (!draft.displayName.trim()) {
      return false;
    }
    if (this.mode() === 'create') {
      const username = draft.username.trim();
      return !!username && this.usernamePattern.test(username);
    }
    return true;
  });

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
            loginEnabled: user.loginEnabled,
          }
          : { ...DEFAULT_DRAFT }
      );
      if (user?.avatarUrl) {
        this.avatarPreviewUrl.set(user.avatarUrl);
      }
    });
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  submitForm(): void {
    const draft = this.draft();
    if (!this.canSubmit()) {
      return;
    }

    if (this.mode() === 'create') {
      this.create.emit({
        username: draft.username.trim(),
        displayName: draft.displayName.trim() || undefined,
        email: draft.email.trim() || undefined,
        mobile: draft.mobile.trim() || undefined,
        titleCode: draft.titleCode || undefined,
        remark: draft.remark.trim() || undefined,
        loginEnabled: draft.loginEnabled,
      });
      return;
    }

    this.update.emit({
      displayName: draft.displayName.trim() || null,
      email: draft.email.trim() || null,
      mobile: draft.mobile.trim() || null,
      titleCode: draft.titleCode || null,
      remark: draft.remark.trim() || null,
      status: draft.status,
      loginEnabled: draft.loginEnabled,
    });
  }
}
