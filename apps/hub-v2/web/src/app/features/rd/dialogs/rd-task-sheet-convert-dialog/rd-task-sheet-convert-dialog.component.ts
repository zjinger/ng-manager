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
import type {
  ConvertRdTaskSheetToIssueInput,
  ConvertRdTaskSheetToRdItemInput,
  RdTaskSheetDetail,
} from '../../models/rd-task-sheet.model';

export type RdTaskSheetConvertKind = 'rd' | 'issue';

export type RdTaskSheetConvertSubmit =
  | { kind: 'rd'; value: ConvertRdTaskSheetToRdItemInput }
  | { kind: 'issue'; value: ConvertRdTaskSheetToIssueInput };

type ConvertDraft = {
  projectId: string | null;
  title: string;
  memberIds: string[];
  assigneeId: string | null;
};

const DEFAULT_DRAFT: ConvertDraft = {
  projectId: null,
  title: '',
  memberIds: [],
  assigneeId: null,
};

@Component({
  selector: 'app-rd-task-sheet-convert-dialog',
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
      [title]="kind() === 'rd' ? '转研发项' : '转测试单'"
      [subtitle]="'基于当前任务单预填信息，确认后创建目标单据。'"
      [icon]="kind() === 'rd' ? 'rocket' : 'bug'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-task-sheet-convert-form" nz-form nzLayout="vertical" (ngSubmit)="submitForm()">
          <nz-form-item>
            <nz-form-label nzRequired>关联项目</nz-form-label>
            <nz-form-control>
              <nz-select
                nzShowSearch
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
            <nz-form-label nzRequired>标题</nz-form-label>
            <nz-form-control>
              <input nz-input [ngModel]="draft().title" name="title" maxlength="120" (ngModelChange)="updateField('title', $event)" />
            </nz-form-control>
          </nz-form-item>

          @if (kind() === 'rd') {
            <nz-form-item>
              <nz-form-label nzRequired>研发成员</nz-form-label>
              <nz-form-control>
                <nz-select
                  nzMode="multiple"
                  nzShowSearch
                  nzPlaceHolder="选择成员"
                  [ngModel]="draft().memberIds"
                  name="memberIds"
                  (ngModelChange)="updateField('memberIds', $event)"
                >
                  @for (user of users(); track user.id) {
                    <nz-option [nzLabel]="userName(user)" [nzValue]="user.id"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          } @else {
            <nz-form-item>
              <nz-form-label>负责人</nz-form-label>
              <nz-form-control>
                <nz-select
                  nzShowSearch
                  nzAllowClear
                  nzPlaceHolder="选择负责人"
                  [ngModel]="draft().assigneeId"
                  name="assigneeId"
                  (ngModelChange)="updateField('assigneeId', $event)"
                >
                  @for (user of users(); track user.id) {
                    <nz-option [nzLabel]="userName(user)" [nzValue]="user.id"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>
          }
        </form>
      </div>

      <app-form-actions dialog-footer>
        <button nz-button type="button" (click)="cancel.emit()">取消</button>
        <button nz-button nzType="primary" form="rd-task-sheet-convert-form" [disabled]="!isValid()" [nzLoading]="busy()">
          <nz-icon nzType="check" />
          确认创建
        </button>
      </app-form-actions>
    </app-dialog-shell>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetConvertDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly kind = input<RdTaskSheetConvertKind>('rd');
  readonly detail = input<RdTaskSheetDetail | null>(null);
  readonly projects = input<ProjectSummary[]>([]);
  readonly users = input<UserEntity[]>([]);
  readonly cancel = output<void>();
  readonly confirm = output<RdTaskSheetConvertSubmit>();

  readonly draft = signal<ConvertDraft>({ ...DEFAULT_DRAFT });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      this.resetDraft();
    });
  }

  updateField<K extends keyof ConvertDraft>(key: K, value: ConvertDraft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  isValid(): boolean {
    const draft = this.draft();
    if (!draft.projectId || !draft.title.trim()) {
      return false;
    }
    return this.kind() === 'issue' || draft.memberIds.length > 0;
  }

  submitForm(): void {
    if (!this.isValid()) {
      return;
    }
    const draft = this.draft();
    const current = this.detail();
    if (this.kind() === 'rd') {
      this.confirm.emit({
        kind: 'rd',
        value: {
          projectId: draft.projectId,
          title: draft.title.trim(),
          memberIds: draft.memberIds,
          planEndAt: current?.expectedResolvedAt,
        },
      });
      return;
    }
    this.confirm.emit({
      kind: 'issue',
      value: {
        projectId: draft.projectId,
        title: draft.title.trim(),
        assigneeId: draft.assigneeId,
        type: 'bug',
      },
    });
  }

  userName(user: UserEntity): string {
    return user.displayName || user.username;
  }

  private resetDraft(): void {
    const detail = this.detail();
    const fallbackUserId = detail?.processorUserId || detail?.receiverUserId || null;
    this.draft.set({
      projectId: detail?.projectId ?? null,
      title: detail?.title ?? '',
      memberIds: fallbackUserId ? [fallbackUserId] : [],
      assigneeId: fallbackUserId,
    });
  }
}
