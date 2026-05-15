import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';

import { DialogShellComponent } from '@shared/ui';
import { UserBasicFormComponent } from '../../components/user-basic-form';
import { UserStatusSectionComponent } from '../../components/user-status-section';
import type { DepartmentEntity } from '../../../organization/models/organization.model';
import type { CreateUserInput, UserEntity } from '../../models/user.model';
import { DEFAULT_USER_DRAFT, type UserDraft } from '../../models/user-form.types';

@Component({
  selector: 'app-user-create-dialog',
  standalone: true,
  imports: [
    NzButtonModule,
    NzIconModule,
    DialogShellComponent,
    UserBasicFormComponent,
    UserStatusSectionComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="680"
      title="新建用户"
      icon="user-add"
      (cancel)="cancel.emit()"
    >
      <div dialog-body class="user-create-dialog">
        <app-user-basic-form
          [draft]="draft()"
          [departments]="departments()"
          [userOptions]="userOptions()"
          [titleOptions]="titleOptions()"
          [usernameEditable]="true"
          [usernameInvalid]="usernameInvalid()"
          (fieldChange)="updateField($event.field, $event.value)"
        />

        <app-user-status-section
          [draft]="draft()"
          [showStatusSelect]="false"
          (fieldChange)="updateField($event.field, $event.value)"
        />
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
          创建用户
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: `
    .user-create-dialog {
      display: grid;
      gap: 20px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreateDialogComponent {
  private readonly message = inject(NzMessageService);

  readonly open = input(false);
  readonly busy = input(false);
  readonly departments = input<DepartmentEntity[]>([]);
  readonly userOptions = input<UserEntity[]>([]);
  readonly titleOptions = input<Array<{ label: string; value: string }>>([]);
  readonly create = output<CreateUserInput>();
  readonly cancel = output<void>();

  readonly draft = signal<UserDraft>({ ...DEFAULT_USER_DRAFT });
  readonly usernamePattern = /^[A-Za-z0-9]{4,24}$/;

  readonly usernameInvalid = computed(() => {
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
    const username = draft.username.trim();
    return !!username && this.usernamePattern.test(username);
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.draft.set({ ...DEFAULT_USER_DRAFT });
      }
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
    ];

    this.create.emit({
      username: draft.username.trim(),
      displayName: draft.displayName.trim() || undefined,
      email: draft.email.trim() || undefined,
      mobile: draft.mobile.trim() || undefined,
      titleCode: draft.titleCode || undefined,
      remark: draft.remark.trim() || undefined,
      loginEnabled: draft.loginEnabled,
      departments,
      managerUserId: draft.managerUserId.trim() || undefined,
    });
  }
}
