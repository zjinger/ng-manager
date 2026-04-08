import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent } from '@shared/ui';
import type { IssueEntity, IssueParticipantEntity } from '../../models/issue.model';

@Component({
  selector: 'app-issue-create-branch-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, DialogShellComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="680"
      [title]="'创建协作分支'"
      [subtitle]="issue() ? issue()!.title : '为协作人拆分处理分支。'"
      [icon]="'share-alt'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body class="dialog-body">
        <label class="dialog-field">
          <span class="dialog-field__label">协作人</span>
          <nz-select
            nzShowSearch
            nzPlaceHolder="选择要负责该分支的协作人"
            [ngModel]="selectedOwnerUserId()"
            (ngModelChange)="selectedOwnerUserId.set($event)"
          >
            @for (participant of participants(); track participant.id) {
              <nz-option [nzLabel]="participant.userName" [nzValue]="participant.userId"></nz-option>
            }
          </nz-select>
        </label>

        <label class="dialog-field">
          <span class="dialog-field__label">分支标题</span>
          <input
            nz-input
            maxlength="80"
            [ngModel]="title()"
            (ngModelChange)="title.set(($event ?? '').toString())"
            placeholder="例如：排查前端渲染"
          />
        </label>
      </div>

      <ng-container dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" [disabled]="disabledSubmit()" [nzLoading]="busy()" (click)="confirmSubmit()">
          创建分支
        </button>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .dialog-body {
        display: grid;
        gap: 16px;
      }
      .dialog-field {
        display: grid;
        gap: 8px;
      }
      .dialog-field__label {
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 600;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueCreateBranchDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly issue = input<IssueEntity | null>(null);
  readonly participants = input<IssueParticipantEntity[]>([]);
  readonly cancel = output<void>();
  readonly confirm = output<{ ownerUserId: string; title: string }>();

  readonly selectedOwnerUserId = signal<string | null>(null);
  readonly title = signal('');
  readonly disabledSubmit = computed(() => !this.selectedOwnerUserId()?.trim() || !this.title().trim());

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.selectedOwnerUserId.set(this.participants()[0]?.userId ?? null);
      this.title.set('');
    });
  }

  confirmSubmit(): void {
    const ownerUserId = this.selectedOwnerUserId()?.trim();
    const title = this.title().trim();
    if (!ownerUserId || !title) {
      return;
    }
    this.confirm.emit({ ownerUserId, title });
  }
}
