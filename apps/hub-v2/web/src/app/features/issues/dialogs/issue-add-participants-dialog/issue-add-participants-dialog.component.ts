import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { IssueEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-add-participants-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="680"
      [title]="'添加协作人'"
      [subtitle]="issue() ? issue()!.title : '选择要添加的协作成员。'"
      [icon]="'team'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <label class="dialog-field">
          <span class="dialog-field__label">协作人（可多选）</span>
          <nz-select
            nzMode="multiple"
            nzShowSearch
            nzPlaceHolder="选择项目成员（负责人不可选）"
            [ngModel]="selectedUserIds()"
            (ngModelChange)="onSelectedChange($event)"
          >
            @for (member of members(); track member.id) {
              <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
            }
          </nz-select>
        </label>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="disabledSubmit()" [nzLoading]="busy()" (click)="confirmSubmit()">
          添加协作人
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueAddParticipantsDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly cancel = output<void>();
  readonly confirm = output<{ userIds: string[] }>();

  readonly selectedUserIds = signal<string[]>([]);
  readonly disabledSubmit = computed(() => this.selectedUserIds().length === 0);

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.selectedUserIds.set([]);
    });
  }

  confirmSubmit(): void {
    const userIds = [...new Set(this.selectedUserIds().map((item) => item.trim()).filter(Boolean))];
    if (userIds.length === 0) {
      return;
    }
    this.confirm.emit({ userIds });
  }

  onSelectedChange(value: unknown): void {
    this.selectedUserIds.set(Array.isArray(value) ? (value as string[]) : []);
  }
}
