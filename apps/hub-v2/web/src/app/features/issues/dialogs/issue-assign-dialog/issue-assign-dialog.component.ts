import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { IssueEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-assign-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="620"
      [title]="dialogTitle()"
      [subtitle]="issue() ? issue()!.title : '选择新的负责人。'"
      [icon]="'swap'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <label class="assign-field dialog-field">
          <span class="assign-field__label dialog-field__label">负责人</span>
          <nz-select
            nzShowSearch
            nzPlaceHolder="选择项目成员"
            [ngModel]="assigneeId()"
            (ngModelChange)="assigneeId.set($event || '')"
          >
            @for (member of members(); track member.id) {
              <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
            }
          </nz-select>
        </label>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="!assigneeId()" [nzLoading]="busy()" (click)="confirmAssign()">
          {{ confirmText() }}
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueAssignDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly actionLabel = input('重新指派');
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly confirm = output<{ assigneeId: string }>();
  readonly cancel = output<void>();

  readonly assigneeId = signal('');

  constructor() {
    effect(() => {
      if (this.open()) {
        this.assigneeId.set(this.issue()?.assigneeId ?? '');
      }
    });
  }

  dialogTitle(): string {
    const label = this.actionLabel();
    if (label === '指派') {
      return '指派负责人';
    }
    if (label === '转派') {
      return '转派负责人';
    }
    return '重新指派负责人';
  }

  confirmText(): string {
    const label = this.actionLabel();
    if (label === '指派') {
      return '确认指派';
    }
    if (label === '转派') {
      return '确认转派';
    }
    return '确认重新指派';
  }

  confirmAssign(): void {
    if (!this.assigneeId()) {
      return;
    }
    this.confirm.emit({ assigneeId: this.assigneeId() });
  }
}
