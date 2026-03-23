import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '../../../../shared/ui/dialog/dialog-shell.component';
import type { CreateUserInput, UpdateUserInput, UserEntity, UserStatus } from '../../models/user.model';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';

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
  imports: [FormsModule, NzButtonModule, NzFormModule, NzGridModule, NzIconModule, NzInputModule, NzSelectModule, DialogShellComponent],
  templateUrl: './user-form-dialog.component.html',
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
