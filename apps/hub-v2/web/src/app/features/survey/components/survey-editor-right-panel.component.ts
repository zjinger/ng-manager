import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzDatePickerModule } from 'ng-zorro-antd/date-picker';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';

import type { SurveyQuestionType } from '../models/survey.model';
import type { EditorQuestionDraft, QuestionTypeOption } from '../pages/survey-editor-page/survey-editor.utils';

@Component({
  selector: 'app-survey-editor-right-panel',
  standalone: true,
  imports: [FormsModule, NzDatePickerModule, NzInputModule, NzSelectModule, NzSwitchModule],
  template: `
    <aside class="right-panel">
      <div class="panel-title">题型</div>
      <div class="type-grid">
        @for (type of questionTypes; track type.value) {
          <button type="button" class="type-item" (click)="addQuestion.emit(type.value)">
            <span class="type-item__icon">{{ type.icon }}</span>
            <span>{{ type.label }}</span>
          </button>
        }
      </div>

      <div class="panel-title">问卷设置</div>
      <label class="field">
        <span>Slug（公开地址）</span>
        <input nz-input [ngModel]="slug" (ngModelChange)="slugChange.emit($event)" (blur)="markHistory.emit()" placeholder="例如：hub-v2-feedback" />
      </label>
      <label class="field field--switch">
        <span>允许公开访问</span>
        <nz-switch [ngModel]="isPublic" (ngModelChange)="isPublicChange.emit($event); markHistory.emit()"></nz-switch>
      </label>
      <label class="field">
        <span>开始时间</span>
        <nz-date-picker
          nzShowTime
          nzFormat="yyyy-MM-dd HH:mm"
          nzPlaceHolder="开始时间"
          [ngModel]="toDate(startAt)"
          (ngModelChange)="onStartAtChange($event); markHistory.emit()"
        ></nz-date-picker>
      </label>
      <label class="field">
        <span>结束时间</span>
        <nz-date-picker
          nzShowTime
          nzFormat="yyyy-MM-dd HH:mm"
          nzPlaceHolder="结束时间"
          [ngModel]="toDate(endAt)"
          (ngModelChange)="onEndAtChange($event); markHistory.emit()"
        ></nz-date-picker>
      </label>

      <div class="panel-title">当前题目设置</div>
      @if (activeQuestion) {
        <label class="field">
          <span>题型</span>
          <nz-select [ngModel]="activeQuestion.type" (ngModelChange)="activeTypeChange.emit($event)">
            @for (type of questionTypes; track type.value) {
              <nz-option [nzValue]="type.value" [nzLabel]="type.label"></nz-option>
            }
          </nz-select>
        </label>
        @if (activeQuestion.type === 'text' || activeQuestion.type === 'textarea') {
          <label class="field">
            <span>占位提示</span>
            <input
              nz-input
              [ngModel]="activeQuestion.placeholder"
              (ngModelChange)="patchActiveQuestion({ placeholder: $event })"
              (blur)="markHistory.emit()"
              placeholder="请输入占位文本"
            />
          </label>
        }

        @if (activeQuestion.type === 'rating') {
          <div class="type-hint">评分题默认 1-5 星。</div>
        }

        @if (activeQuestion.type === 'scale') {
          <div class="type-hint">量表题默认 1-10 分。</div>
        }

        @if (activeQuestion.type === 'multi_choice') {
          <label class="field">
            <span>最多可选（留空不限制）</span>
            <input
              nz-input
              type="number"
              min="1"
              [ngModel]="activeQuestion.maxSelect"
              (ngModelChange)="maxSelectChange.emit($event ? +$event : null); markHistory.emit()"
              placeholder="留空不限制"
            />
          </label>
        }
      } @else {
        <div class="empty-tip">请选择一个题目后设置。</div>
      }
    </aside>
  `,
  styles: [
    `
      .right-panel {
        background: #f7f9fc;
        padding: 12px;
        overflow-y: auto;
        border-left: 1px solid #dde3ef;
      }
      .panel-title {
        margin: 0 0 8px;
        font-size: 11px;
        color: var(--text-muted);
        letter-spacing: 0.4px;
        text-transform: uppercase;
        font-weight: 700;
      }
      .type-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        margin-bottom: 14px;
      }
      .type-item {
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        background: #fff;
        color: var(--text-secondary);
        padding: 8px 6px;
        font-size: 12px;
        display: grid;
        justify-items: center;
        gap: 4px;
        cursor: pointer;
      }
      .type-item:hover {
        border-color: rgba(99, 102, 241, 0.45);
        color: #4f46e5;
        background: rgba(99, 102, 241, 0.07);
      }
      .type-item__icon {
        font-size: 14px;
      }
      .field {
        display: grid;
        gap: 6px;
        margin-bottom: 8px;
        padding-bottom: 8px;
        border-bottom: 1px solid #e9eef7;
      }
      :host ::ng-deep .field nz-date-picker {
        width: 100%;
      }
      .field > span {
        font-size: 11px;
        color: var(--text-muted);
      }
      .field--switch {
        grid-template-columns: 1fr auto;
        align-items: center;
      }
      .inline-fields {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-top: 4px;
      }
      .type-hint {
        margin-bottom: 10px;
        border: 1px dashed #dbe2ef;
        border-radius: 8px;
        background: #fff;
        color: #64748b;
        font-size: 12px;
        padding: 8px 10px;
      }
      .empty-tip {
        color: var(--text-muted);
        font-size: 13px;
      }
      @media (max-width: 1180px) {
        .right-panel {
          border-left: 0;
          border-top: 1px solid var(--border-color-soft);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyEditorRightPanelComponent {
  @Input() slug = '';
  @Input() isPublic = true;
  @Input() startAt = '';
  @Input() endAt = '';
  @Input() activeQuestion: EditorQuestionDraft | null = null;
  @Input() questionTypes: QuestionTypeOption[] = [];

  @Output() slugChange = new EventEmitter<string>();
  @Output() isPublicChange = new EventEmitter<boolean>();
  @Output() startAtChange = new EventEmitter<string>();
  @Output() endAtChange = new EventEmitter<string>();
  @Output() activeTypeChange = new EventEmitter<SurveyQuestionType>();
  @Output() activeQuestionPatch = new EventEmitter<{ id: string; patch: Partial<EditorQuestionDraft> }>();
  @Output() addQuestion = new EventEmitter<SurveyQuestionType>();
  @Output() minValueChange = new EventEmitter<number>();
  @Output() maxValueChange = new EventEmitter<number>();
  @Output() maxSelectChange = new EventEmitter<number | null>();
  @Output() markHistory = new EventEmitter<void>();

  onStartAtChange(value: Date | null): void {
    this.startAtChange.emit(this.toIso(value));
  }

  onEndAtChange(value: Date | null): void {
    this.endAtChange.emit(this.toIso(value));
  }

  toDate(value: string): Date | null {
    const normalized = value.trim();
    if (!normalized) {
      return null;
    }
    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  patchActiveQuestion(patch: Partial<EditorQuestionDraft>): void {
    if (!this.activeQuestion) {
      return;
    }
    this.activeQuestionPatch.emit({ id: this.activeQuestion.id, patch });
  }

  private toIso(value: Date | null): string {
    if (!value) {
      return '';
    }
    return value.toISOString();
  }
}
