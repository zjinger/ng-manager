import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogShellComponent } from '@shared/ui';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { CreateDepartmentInput, DepartmentEntity, DepartmentStatus, UpdateDepartmentInput } from '../../models/organization.model';
import type { UserEntity } from '../../../users/models/user.model';

type DepartmentFormMode = 'create' | 'edit';

type DepartmentDraft = {
  code: string;
  name: string;
  description: string;
  parentId: string;
  managerUserId: string;
  externalFinanceCode: string;
  status: DepartmentStatus;
  sort: number;
};

const DEFAULT_DRAFT: DepartmentDraft = {
  code: '',
  name: '',
  description: '',
  parentId: '',
  managerUserId: '',
  externalFinanceCode: '',
  status: 'active',
  sort: 0,
};

@Component({
  selector: 'app-department-form-dialog',
  imports: [FormsModule, NzButtonModule, NzFormModule, NzGridModule, NzIconModule, NzInputModule, NzSelectModule, DialogShellComponent],
  templateUrl: './department-form-dialog.component.html',
  styles: [
    `
      .department-dialog-form {
        display: grid;
        gap: 18px;
      }

      .department-dialog-row {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 16px;
      }

      .department-dialog-form ::ng-deep .ant-form-item {
        margin-bottom: 0;
      }

      .department-dialog-form ::ng-deep .ant-form-item-label > label {
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 500;
      }

      .department-dialog-form input,
      .department-dialog-form textarea,
      .department-dialog-form nz-select {
        font-size: 14px;
      }

      .department-dialog-form textarea {
        min-height: 100px;
        resize: vertical;
      }

      @media (max-width: 720px) {
        .department-dialog-row {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentFormDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly mode = input<DepartmentFormMode>('create');
  readonly department = input<DepartmentEntity | null>(null);
  readonly parentId = input<string>('');
  readonly departments = input<DepartmentEntity[]>([]);
  readonly userOptions = input<UserEntity[]>([]);
  readonly create = output<CreateDepartmentInput>();
  readonly update = output<UpdateDepartmentInput>();
  readonly cancel = output<void>();

  readonly draft = signal<DepartmentDraft>({ ...DEFAULT_DRAFT });
  readonly canSubmit = computed(() => {
    const draft = this.draft();
    return !!draft.code.trim() && !!draft.name.trim();
  });
  readonly availableParentDepartments = computed(() => this.departments().filter((department) => department.id !== this.department()?.id));

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const department = this.department();
      this.draft.set(
        department
          ? {
              code: department.code,
              name: department.name,
              description: department.description || '',
              parentId: department.parentId || '',
              managerUserId: department.managerUserId || '',
              externalFinanceCode: department.externalFinanceCode || '',
              status: department.status,
              sort: department.sort,
            }
          : { ...DEFAULT_DRAFT, code: this.generateDepartmentCode(), parentId: this.parentId() }
      );
    });
  }

  updateField<K extends keyof DepartmentDraft>(key: K, value: DepartmentDraft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  submitForm(): void {
    if (!this.canSubmit()) {
      return;
    }
    const draft = this.draft();
    const input = {
      code: draft.code.trim(),
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      parentId: draft.parentId || null,
      managerUserId: draft.managerUserId.trim() || null,
      externalFinanceCode: draft.externalFinanceCode.trim() || null,
      status: draft.status,
      sort: draft.sort,
    };

    if (this.mode() === 'create') {
      this.create.emit(input);
      return;
    }
    this.update.emit(input);
  }

  private generateDepartmentCode(): string {
    return `DEPT-${Date.now().toString(36).toUpperCase()}`;
  }

  userLabel(user: UserEntity): string {
    return user.displayName ? `${user.displayName} - ${user.username}` : user.username;
  }
}
