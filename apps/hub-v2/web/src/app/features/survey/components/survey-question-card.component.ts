import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { SurveyQuestionType } from '../models/survey.model';
import type { EditorOptionDraft, EditorQuestionDraft, QuestionTypeOption } from '../pages/survey-editor-page/survey-editor.utils';

@Component({
  selector: 'app-survey-question-card',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzIconModule, NzInputModule, NzRateModule, NzSelectModule],
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

      <button nz-button nzType="dashed" class="add-next" type="button" (click)="addBelow.emit(question.id); $event.stopPropagation()">
        <span nz-icon nzType="plus"></span>
        在下方新增题目
      </button>
    </article>
  `,
  styles: [
    `
      .card {
        border: 1px solid #dbe2ef;
        border-radius: 12px;
        background: #fff;
        box-shadow: 0 1px 2px rgba(30, 41, 59, 0.05);
      }
      .question-card {
        padding: 18px 20px 14px 26px;
        border-color: #e2e8f0;
      }
      .question-card--active {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.08), 0 4px 8px rgba(30, 41, 59, 0.08);
      }
      .question-card__head {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: flex-start;
        gap: 12px;
      }
      .question-card__num {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #6366f1;
        color: #fff;
        display: grid;
        place-items: center;
        font-size: 12px;
        font-weight: 700;
        margin-top: 1px;
      }
      .question-card__title {
        width: 100%;
        border: 0;
        outline: none;
        font-size: 14px;
        font-weight: 600;
        color: #1f2a44;
        padding: 0;
      }
      .question-card__title::placeholder {
        color: #91a2bf;
      }
      .question-card__type {
        display: inline-block;
        margin-top: 6px;
        width: 112px;
      }
      :host ::ng-deep .question-card__type .ant-select-selector {
        border: 0;
        background: #eef2ff;
        border-radius: 14px;
        color: #4f46e5;
        font-weight: 500;
        height: 24px !important;
        padding: 0 10px !important;
      }
      :host ::ng-deep .question-card__type.ant-select-single .ant-select-selection-item {
        line-height: 24px;
      }
      :host ::ng-deep .question-card__type .ant-select-arrow {
        color: #6366f1;
      }
      .question-card__ops {
        display: flex;
        gap: 2px;
        justify-content: flex-end;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      .question-card:hover .question-card__ops,
      .question-card--active .question-card__ops {
        opacity: 1;
      }
      .question-card__ops button {
        color: #64748b;
      }
      .question-card__body {
        margin-top: 10px;
        display: grid;
        gap: 10px;
        padding-left: 36px;
      }
      .option-list {
        display: grid;
        gap: 6px;
      }
      .option-item {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 8px;
        align-items: center;
        border-radius: 6px;
        padding: 4px 6px;
      }
      .option-item:hover {
        background: #f8fafc;
      }
      .option-item__mark {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 1.5px solid #cbd5e1;
      }
      .option-item__mark--checkbox {
        border-radius: 4px;
      }
      .option-item__input {
        border: 0;
        background: transparent;
        padding-left: 0;
      }
      .option-item__input:focus {
        box-shadow: none;
      }
      .add-option {
        width: fit-content;
        color: #4f46e5;
        font-size: 13px;
        padding: 0;
        height: auto;
      }
      .rating-preview {
        display: inline-flex;
        align-items: center;
      }
      :host ::ng-deep .rating-preview .ant-rate {
        color: #e2e8f0;
        font-size: 28px;
      }
      :host ::ng-deep .rating-preview .ant-rate-star-first,
      :host ::ng-deep .rating-preview .ant-rate-star-second {
        color: #e2e8f0;
      }
      .scale-preview {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .scale-item {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 1px solid #cdd6e6;
        color: #64748b;
        font-size: 14px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .preview-input {
        border: 1px dashed #dbe2ef;
        background: #f8fafc;
      }
      .preview-input--textarea {
        resize: none;
        min-height: 60px;
      }
      .question-card__foot {
        margin-top: 12px;
        padding-top: 10px;
        border-top: 1px solid #edf1f7;
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        padding-left: 36px;
      }
      .foot-tag {
        border: 0;
        border-radius: 999px;
        padding: 2px 10px;
        font-size: 12px;
        line-height: 20px;
        background: #fef2f2;
        color: #ef4444;
        cursor: pointer;
      }
      .foot-tag--off {
        opacity: 0.45;
      }
      .foot-tag--muted {
        background: #eff6ff;
        color: #3b82f6;
      }
      .foot-tag--success {
        background: #ecfdf5;
        color: #10b981;
      }
      .foot-tag--required {
        font-weight: 500;
      }
      .question-card__foot label > span {
        font-size: 12px;
        color: var(--text-muted);
      }
      .add-next {
        margin-top: 10px;
        margin-left: 36px;
        height: 30px;
        border-radius: 8px;
        padding: 0 12px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyQuestionCardComponent {
  @Input({ required: true }) question!: EditorQuestionDraft;
  @Input() index = 0;
  @Input() active = false;
  @Input() questionTypes: QuestionTypeOption[] = [];

  @Output() activate = new EventEmitter<string>();
  @Output() patch = new EventEmitter<{ id: string; patch: Partial<EditorQuestionDraft> }>();
  @Output() typeChange = new EventEmitter<{ id: string; type: SurveyQuestionType }>();
  @Output() move = new EventEmitter<{ id: string; offset: -1 | 1 }>();
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
