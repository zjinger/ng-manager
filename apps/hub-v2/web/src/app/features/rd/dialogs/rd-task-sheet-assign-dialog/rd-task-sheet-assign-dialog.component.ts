import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { DialogShellComponent, FormActionsComponent } from '@shared/ui';
import type { ProjectSummary } from '../../../projects/models/project.model';
import type { UserEntity } from '../../../users/models/user.model';
import type { AssignRdTaskSheetInput, RdTaskSheetDetail } from '../../models/rd-task-sheet.model';

type AssignDraft = {
  projectId: string | null;
  processorUserId: string | null;
  comment: string;
};

@Component({
  selector: 'app-rd-task-sheet-assign-dialog',
  standalone: true,
  imports: [
    FormsModule,
    NzFormModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzSelectModule,
    DialogShellComponent,
    FormActionsComponent,
  ],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="620"
      title="分派处理"
      subtitle="选择问题归属项目和处理人，后续可转研发项或测试单。"
      icon="user-switch"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-task-sheet-assign-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <nz-form-item>
            <nz-form-label>归属项目</nz-form-label>
            <nz-form-control>
              <nz-select
                nzShowSearch
                nzAllowClear
                nzPlaceHolder="选择项目"
                [ngModel]="draft().projectId"
                name="projectId"
                (ngModelChange)="updateField('projectId', $event)"
              >
                @for (project of projects(); track project.id) {
                  <nz-option [nzLabel]="project.name" [nzValue]="project.id"></nz-option>
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>处理人</nz-form-label>
            <nz-form-control>
              <nz-select
                nzShowSearch
                nzAllowClear
                nzPlaceHolder="选择项目负责人或成员"
                [ngModel]="draft().processorUserId"
                name="processorUserId"
                (ngModelChange)="updateField('processorUserId', $event)"
              >
                @for (user of users(); track user.id) {
                  <nz-option [nzLabel]="userName(user)" [nzValue]="user.id"></nz-option>
                }
              </nz-select>
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>分派说明</nz-form-label>
            <nz-form-control>
              <textarea
                nz-input
                rows="4"
                name="comment"
                placeholder="可填写问题归属、处理建议或转单说明"
                [ngModel]="draft().comment"
                (ngModelChange)="updateField('comment', $event)"
              ></textarea>
            </nz-form-control>
          </nz-form-item>
        </form>
      </div>

      <app-form-actions dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" form="rd-task-sheet-assign-form" [disabled]="!isValid()" [nzLoading]="busy()">
          <nz-icon nzType="check" />
          确认分派
        </button>
      </app-form-actions>
    </app-dialog-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetAssignDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly detail = input<RdTaskSheetDetail | null>(null);
  readonly projects = input<ProjectSummary[]>([]);
  readonly users = input<UserEntity[]>([]);
  readonly cancel = output<void>();
  readonly confirm = output<AssignRdTaskSheetInput>();

  readonly draft = signal<AssignDraft>({ projectId: null, processorUserId: null, comment: '' });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const detail = this.detail();
      this.draft.set({
        projectId: detail?.projectId ?? null,
        processorUserId: detail?.processorUserId ?? detail?.receiverUserId ?? null,
        comment: detail?.assignmentComment ?? '',
      });
    });
  }

  updateField<K extends keyof AssignDraft>(key: K, value: AssignDraft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  isValid(): boolean {
    const draft = this.draft();
    return Boolean(draft.projectId || draft.processorUserId);
  }

  submitForm(): void {
    if (!this.isValid()) {
      return;
    }
    const draft = this.draft();
    const processor = this.users().find((user) => user.id === draft.processorUserId);
    this.confirm.emit({
      projectId: draft.projectId,
      processorUserId: draft.processorUserId,
      processorName: processor ? this.userName(processor) : null,
      comment: draft.comment.trim() || null,
    });
  }

  userName(user: UserEntity): string {
    return user.displayName || user.username;
  }
}
