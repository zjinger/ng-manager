import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { AddIssueParticipantTaskInput, IssueEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-add-participants-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, DialogShellComponent],
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
        @if (selectedMembers().length > 0) {
          <div class="task-list">
            <div class="task-list__head">
              <span class="dialog-field__label">协作任务（可选）</span>
              <span class="task-list__hint">未填写时，协作人开始协作时自行填写。</span>
            </div>
            @for (member of selectedMembers(); track member.userId) {
              <label class="task-row">
                <span class="task-row__name">{{ member.displayName }}</span>
                <input
                  nz-input
                  maxlength="80"
                  [ngModel]="taskTitle(member.userId)"
                  (ngModelChange)="setTaskTitle(member.userId, ($event ?? '').toString())"
                  placeholder="例如：补抓包定位登录异常"
                />
              </label>
            }
          </div>
        }
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="disabledSubmit()" [nzLoading]="busy()" (click)="confirmSubmit()">
          添加协作人
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .task-list {
        margin-top: 16px;
        display: grid;
        gap: 10px;
      }
      .task-list__head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }
      .task-list__hint {
        color: var(--text-muted);
        font-size: 12px;
      }
      .task-row {
        display: grid;
        grid-template-columns: minmax(96px, 132px) minmax(0, 1fr);
        align-items: center;
        gap: 10px;
      }
      .task-row__name {
        min-width: 0;
        overflow: hidden;
        color: var(--text-secondary);
        font-size: 13px;
        font-weight: 600;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (max-width: 640px) {
        .task-list__head,
        .task-row {
          align-items: stretch;
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueAddParticipantsDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly cancel = output<void>();
  readonly confirm = output<{ participants: AddIssueParticipantTaskInput[] }>();

  readonly selectedUserIds = signal<string[]>([]);
  readonly taskTitles = signal<Record<string, string>>({});
  readonly disabledSubmit = computed(() => this.selectedUserIds().length === 0);
  readonly selectedMembers = computed(() => {
    const selected = new Set(this.selectedUserIds());
    return this.members().filter((member) => selected.has(member.userId));
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.selectedUserIds.set([]);
      this.taskTitles.set({});
    });
  }

  confirmSubmit(): void {
    const userIds = [...new Set(this.selectedUserIds().map((item) => item.trim()).filter(Boolean))];
    if (userIds.length === 0) {
      return;
    }
    const taskTitles = this.taskTitles();
    this.confirm.emit({
      participants: userIds.map((userId) => ({
        userId,
        title: taskTitles[userId]?.trim() || undefined,
      })),
    });
  }

  onSelectedChange(value: unknown): void {
    const selectedUserIds = Array.isArray(value) ? (value as string[]) : [];
    const selected = new Set(selectedUserIds);
    this.selectedUserIds.set(selectedUserIds);
    this.taskTitles.update((current) => {
      const next: Record<string, string> = {};
      for (const userId of selected) {
        if (current[userId]) {
          next[userId] = current[userId];
        }
      }
      return next;
    });
  }

  taskTitle(userId: string): string {
    return this.taskTitles()[userId] ?? '';
  }

  setTaskTitle(userId: string, title: string): void {
    this.taskTitles.update((current) => ({
      ...current,
      [userId]: title,
    }));
  }
}
