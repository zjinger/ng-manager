import { ChangeDetectionStrategy, Component, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ISSUE_PRIORITY_OPTIONS } from '../../../../shared/constants/priority-options';
import { DialogShellComponent } from '../../../../shared/ui/dialog/dialog-shell.component';
import { FormActionsComponent } from '../../../../shared/ui/form-actions/form-actions.component';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import type { CreateRdItemInput, RdItemType, RdStageEntity } from '../../models/rd.model';

type Draft = Omit<CreateRdItemInput, 'projectId'>;

const DEFAULT_DRAFT: Draft = {
  title: '',
  description: '',
  stageId: null,
  type: 'feature',
  priority: 'medium',
  assigneeId: null,
  reviewerId: null,
  planStartAt: '',
  planEndAt: '',
};

@Component({
  selector: 'app-rd-create-dialog',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzInputModule, NzSelectModule, DialogShellComponent, FormActionsComponent],
  template: `
    <app-dialog-shell
      [open]="open()"
      [width]="860"
      [title]="'新建研发项'"
      [subtitle]="'先录入标题、阶段、责任人和计划时间，后续再补更复杂的编辑能力。'"
      [icon]="'rocket'"
      (cancel)="cancel.emit()"
    >
      <div dialog-body>
        <form id="rd-create-form" class="rd-form dialog-form" (ngSubmit)="submitForm()">
          <div class="rd-form__group">
            <label class="rd-field dialog-field">
              <span class="rd-field__label dialog-field__label">标题</span>
              <input
                nz-input
                maxlength="120"
                placeholder="例如：Dashboard 暗黑主题验收收口"
                [ngModel]="draft().title"
                name="title"
                (ngModelChange)="updateField('title', $event)"
              />
            </label>
          </div>

          <div class="rd-form__group">
            <label class="rd-field dialog-field">
              <span class="rd-field__label dialog-field__label">描述</span>
              <textarea
                nz-input
                rows="6"
                placeholder="简要描述背景、目标和预期交付。"
                [ngModel]="draft().description"
                name="description"
                (ngModelChange)="updateField('description', $event)"
              ></textarea>
            </label>
          </div>

          <div class="rd-form__grid dialog-form__grid rd-form__grid--three">
            <label class="rd-field dialog-field">
              <span class="rd-field__label dialog-field__label">阶段</span>
              <nz-select
                nzAllowClear
                nzPlaceHolder="未选择"
                [ngModel]="draft().stageId"
                name="stageId"
                (ngModelChange)="updateField('stageId', $event)"
              >
                @for (item of stages(); track item.id) {
                  <nz-option [nzLabel]="item.name" [nzValue]="item.id"></nz-option>
                }
              </nz-select>
            </label>

            <label class="rd-field dialog-field">
              <span class="rd-field__label dialog-field__label">类型</span>
              <nz-select [ngModel]="draft().type" name="type" (ngModelChange)="updateType($event)">
                <nz-option nzLabel="Feature" nzValue="feature"></nz-option>
                <nz-option nzLabel="Task" nzValue="task"></nz-option>
                <nz-option nzLabel="Improvement" nzValue="improvement"></nz-option>
              </nz-select>
            </label>

            <label class="rd-field dialog-field">
              <span class="rd-field__label dialog-field__label">优先级</span>
              <nz-select [ngModel]="draft().priority" name="priority" (ngModelChange)="updateField('priority', $event)">
                @for (item of priorityOptions.slice(1); track item.value) {
                  <nz-option [nzLabel]="item.label" [nzValue]="item.value"></nz-option>
                }
              </nz-select>
            </label>
          </div>

          <div class="rd-form__grid dialog-form__grid">
            <label class="rd-field dialog-field">
              <span class="rd-field__label dialog-field__label">执行人</span>
              <nz-select
                nzAllowClear
                nzPlaceHolder="未指派"
                [ngModel]="draft().assigneeId"
                name="assigneeId"
                (ngModelChange)="updateField('assigneeId', $event)"
              >
                @for (member of members(); track member.id) {
                  <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                }
              </nz-select>
            </label>

            <label class="rd-field dialog-field">
              <span class="rd-field__label dialog-field__label">验收人</span>
              <nz-select
                nzAllowClear
                nzPlaceHolder="未指定"
                [ngModel]="draft().reviewerId"
                name="reviewerId"
                (ngModelChange)="updateField('reviewerId', $event)"
              >
                @for (member of members(); track member.id) {
                  <nz-option [nzLabel]="member.displayName" [nzValue]="member.userId"></nz-option>
                }
              </nz-select>
            </label>
          </div>

          <div class="rd-form__grid dialog-form__grid">
            <label class="rd-field dialog-field">
              <span class="rd-field__label dialog-field__label">计划开始</span>
              <input nz-input type="date" [ngModel]="draft().planStartAt" name="planStartAt" (ngModelChange)="updateField('planStartAt', $event)" />
            </label>

            <label class="rd-field dialog-field">
              <span class="rd-field__label dialog-field__label">计划结束</span>
              <input nz-input type="date" [ngModel]="draft().planEndAt" name="planEndAt" (ngModelChange)="updateField('planEndAt', $event)" />
            </label>
          </div>
        </form>
      </div>

      <ng-container dialog-footer>
        <app-form-actions>
          <button nz-button type="button" (click)="cancel.emit()">取消</button>
          <button nz-button nzType="primary" [disabled]="!draft().title.trim()" [nzLoading]="busy()" type="submit" form="rd-create-form">
            创建研发项
          </button>
        </app-form-actions>
      </ng-container>
    </app-dialog-shell>
  `,
  styles: [
    `
      .rd-form {
        gap: 18px;
      }
      .rd-form__group {
        display: grid;
      }
      .rd-form__grid--three {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      @media (max-width: 900px) {
        .rd-form__grid--three {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdCreateDialogComponent {
  readonly open = input(false);
  readonly busy = input(false);
  readonly stages = input<RdStageEntity[]>([]);
  readonly members = input<ProjectMemberEntity[]>([]);
  readonly create = output<Draft>();
  readonly cancel = output<void>();

  readonly priorityOptions = ISSUE_PRIORITY_OPTIONS;
  readonly draft = signal<Draft>({ ...DEFAULT_DRAFT });

  constructor() {
    effect(() => {
      if (this.open()) {
        this.draft.set({ ...DEFAULT_DRAFT });
      }
    });
  }

  updateField<K extends keyof Draft>(key: K, value: Draft[K]): void {
    this.draft.update((draft) => ({ ...draft, [key]: value }));
  }

  updateType(value: RdItemType): void {
    this.updateField('type', value);
  }

  submitForm(): void {
    if (!this.draft().title.trim()) {
      return;
    }
    this.create.emit({
      ...this.draft(),
      title: this.draft().title.trim(),
    });
  }
}
