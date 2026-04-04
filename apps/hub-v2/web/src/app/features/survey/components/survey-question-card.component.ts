import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';

import type { SurveyQuestionType } from '../models/survey.model';
import type { EditorOptionDraft, EditorQuestionDraft, QuestionTypeOption } from '../pages/survey-editor-page/survey-editor.utils';

@Component({
  selector: 'app-survey-question-card',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzDropDownModule,
    NzIconModule,
    NzInputModule,
    NzMenuModule,
    NzRateModule,
    NzSelectModule,
    NzTooltipModule,
  ],
  template: `
    <article class="question-card card" [class.question-card--active]="active" (click)="activate.emit(question.id)">
      <div class="question-card__head">
        <div class="question-card__num">{{ index + 1 }}</div>
        <div class="question-card__main">
          <input
            class="question-card__title"
            [ngModel]="question.title"
            (ngModelChange)="emitQuestionPatch({ title: $event })"
            (blur)="markHistory.emit()"
            placeholder="输入题目标题"
          />
          <nz-select
            class="question-card__type"
            nzSize="small"
            [ngModel]="question.type"
            (ngModelChange)="typeChange.emit({ id: question.id, type: $event }); markHistory.emit()"
          >
            @for (type of questionTypes; track type.value) {
              <nz-option [nzValue]="type.value" [nzLabel]="type.icon + ' ' + type.label"></nz-option>
            }
          </nz-select>
        </div>
        <div class="question-card__ops" (click)="$event.stopPropagation()">
          @if (moveTargetPages.length > 0) {
            <button
              nz-button
              nzType="text"
              nzShape="circle"
              nzSize="small"
              nz-dropdown
              [nzDropdownMenu]="moveMenu"
              nzTrigger="click"
              nz-tooltip
              nzTooltipTitle="移动到其他页面"
              title="移动到其他页面"
            >
              <span nz-icon nzType="swap"></span>
            </button>
            <nz-dropdown-menu #moveMenu="nzDropdownMenu">
              <ul nz-menu>
                @for (page of moveTargetPages; track page.id) {
                  <li nz-menu-item (click)="moveToPage.emit({ questionId: question.id, targetPageId: page.id })">{{ page.title }}</li>
                }
              </ul>
            </nz-dropdown-menu>
          }
          <button
            nz-button
            nzType="text"
            nzShape="circle"
            nzSize="small"
            nz-tooltip
            nzTooltipTitle="在下方新增题目"
            (click)="addBelow.emit(question.id)"
            title="在下方新增题目"
          >
            <span nz-icon nzType="plus"></span>
          </button>
          <button nz-button nzType="text" nzShape="circle" nzSize="small" (click)="duplicate.emit(question.id)" title="复制">
            <span nz-icon nzType="copy"></span>
          </button>
          <button nz-button nzType="text" nzShape="circle" nzSize="small" (click)="remove.emit(question.id)" title="删除">
            <span nz-icon nzType="delete"></span>
          </button>
        </div>
      </div>

      <div class="question-card__body" (click)="$event.stopPropagation()">
        @if (question.type === 'single_choice' || question.type === 'multi_choice') {
          <div class="option-list">
            @for (option of question.options; track trackByOption($index, option); let oi = $index) {
              <div class="option-item">
                <div class="option-item__mark" [class.option-item__mark--checkbox]="question.type === 'multi_choice'"></div>
                <input
                  nz-input
                  class="option-item__input"
                  [ngModel]="option.label"
                  (ngModelChange)="optionPatch.emit({ questionId: question.id, optionId: option.id, patch: { label: $event, value: $event } })"
                  (blur)="markHistory.emit()"
                  [placeholder]="'选项 ' + (oi + 1)"
                />
                <button nz-button nzType="text" nzDanger (click)="removeOption.emit({ questionId: question.id, optionId: option.id })">
                  删除
                </button>
              </div>
            }
          </div>
          <button nz-button nzType="text" class="add-option" (click)="addOption.emit(question.id)">
            <span nz-icon nzType="plus"></span>
            添加选项
          </button>
        }

        @if (question.type === 'text') {
          <input nz-input class="preview-input" disabled [placeholder]="question.placeholder || '请输入您的回答...'" />
        }

        @if (question.type === 'textarea') {
          <textarea nz-input class="preview-input preview-input--textarea" rows="3" disabled [placeholder]="question.placeholder || '请输入您的回答...'"></textarea>
        }

        @if (question.type === 'rating') {
          <div class="rating-preview">
            <nz-rate [ngModel]="0" [ngModelOptions]="{ standalone: true }" [nzCount]="5" nzDisabled></nz-rate>
          </div>
        }

        @if (question.type === 'scale') {
          <div class="scale-preview">
            @for (score of scaleItems(question); track score) {
              <span class="scale-item">{{ score }}</span>
            }
          </div>
        }
      </div>

      <div class="question-card__foot" (click)="$event.stopPropagation()">
        <button
          type="button"
          class="foot-tag foot-tag--required"
          [class.foot-tag--off]="!question.required"
          (click)="emitQuestionPatch({ required: !question.required }); markHistory.emit()"
        >
          必答
        </button>
        @if (question.type === 'single_choice' || question.type === 'multi_choice') {
          <span class="foot-tag foot-tag--muted">选项互斥</span>
        }
        @if (question.type === 'multi_choice') {
          <span class="foot-tag foot-tag--success">+ 其他</span>
        }
      </div>
    </article>
  `,
  styleUrl: './survey-question-card.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyQuestionCardComponent {
  @Input({ required: true }) question!: EditorQuestionDraft;
  @Input() index = 0;
  @Input() active = false;
  @Input() questionTypes: QuestionTypeOption[] = [];
  @Input() moveTargetPages: Array<{ id: string; title: string }> = [];

  @Output() activate = new EventEmitter<string>();
  @Output() patch = new EventEmitter<{ id: string; patch: Partial<EditorQuestionDraft> }>();
  @Output() typeChange = new EventEmitter<{ id: string; type: SurveyQuestionType }>();
  @Output() move = new EventEmitter<{ id: string; offset: -1 | 1 }>();
  @Output() moveToPage = new EventEmitter<{ questionId: string; targetPageId: string }>();
  @Output() duplicate = new EventEmitter<string>();
  @Output() remove = new EventEmitter<string>();
  @Output() addBelow = new EventEmitter<string>();
  @Output() addOption = new EventEmitter<string>();
  @Output() optionPatch = new EventEmitter<{ questionId: string; optionId: string; patch: Partial<EditorOptionDraft> }>();
  @Output() removeOption = new EventEmitter<{ questionId: string; optionId: string }>();
  @Output() markHistory = new EventEmitter<void>();

  emitQuestionPatch(patch: Partial<EditorQuestionDraft>): void {
    this.patch.emit({
      id: this.question.id,
      patch,
    });
  }

  trackByOption(_: number, option: EditorOptionDraft): string {
    return option.id;
  }

  scaleItems(question: EditorQuestionDraft): number[] {
    const min = Math.max(1, Math.floor(question.minValue || 1));
    const max = Math.max(min, Math.floor(question.maxValue || 10));
    const limitMax = Math.min(10, max);
    return Array.from({ length: limitMax - min + 1 }, (_, index) => min + index);
  }
}
