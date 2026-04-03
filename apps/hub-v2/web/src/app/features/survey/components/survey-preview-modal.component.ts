import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzRateModule } from 'ng-zorro-antd/rate';

import type { EditorOptionDraft, EditorQuestionDraft } from '../pages/survey-editor-page/survey-editor.utils';

@Component({
  selector: 'app-survey-preview-modal',
  standalone: true,
  imports: [FormsModule, NzButtonModule, NzModalModule, NzRateModule],
  template: `
    <nz-modal [nzVisible]="visible" [nzTitle]="title || '问卷预览'" [nzFooter]="null" [nzWidth]="880" (nzOnCancel)="close.emit()">
      <section class="preview">
        <header class="preview__head">
          <h2>{{ title || '未命名问卷' }}</h2>
          @if (description) {
            <p>{{ description }}</p>
          }
        </header>

        @for (question of questions; track trackByQuestion($index, question); let i = $index) {
          <article class="preview-question">
            <h3>{{ i + 1 }}. {{ question.title }} @if (question.required) {<span>*</span>}</h3>
            @if (question.type === 'text') {
              <input class="preview-input" [placeholder]="question.placeholder || '请输入'" />
            }
            @if (question.type === 'textarea') {
              <textarea class="preview-input" rows="3" [placeholder]="question.placeholder || '请输入'"></textarea>
            }
            @if (question.type === 'single_choice' || question.type === 'multi_choice') {
              <ul>
                @for (option of question.options; track trackByOption($index, option)) {
                  <li>{{ option.label }}</li>
                }
              </ul>
            }
            @if (question.type === 'rating') {
              <nz-rate [ngModel]="0" [ngModelOptions]="{ standalone: true }" nzDisabled></nz-rate>
            }
            @if (question.type === 'scale') {
              <div class="preview-scale">
                @for (score of scaleItems(question); track score) {
                  <span>{{ score }}</span>
                }
              </div>
            }
          </article>
        }

        <div class="preview__actions">
          <button nz-button (click)="close.emit()">关闭</button>
        </div>
      </section>
    </nz-modal>
  `,
  styles: [
    `
      .preview {
        display: grid;
        gap: 10px;
        max-height: 65vh;
        overflow-y: auto;
        padding-right: 6px;
      }
      .preview__head h2 {
        margin: 0;
      }
      .preview__head p {
        margin: 6px 0 0;
        color: var(--text-muted);
      }
      .preview-question {
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        padding: 10px;
      }
      .preview-question h3 {
        margin: 0;
        font-size: 14px;
      }
      .preview-question h3 span {
        color: #ef4444;
      }
      .preview-question p {
        margin: 8px 0;
        color: var(--text-muted);
      }
      .preview-question ul {
        margin: 8px 0 0;
        padding-left: 18px;
        color: var(--text-secondary);
      }
      .preview-input {
        width: 100%;
        border: 1px solid var(--border-color-soft);
        border-radius: 8px;
        padding: 8px;
      }
      .preview-question textarea {
        resize: none;
      }
      .preview-scale {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .preview-scale span {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 1px solid #cbd5e1;
        color: #64748b;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .preview__actions {
        display: flex;
        justify-content: flex-end;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyPreviewModalComponent {
  @Input() visible = false;
  @Input() title = '';
  @Input() description = '';
  @Input() questions: EditorQuestionDraft[] = [];

  @Output() close = new EventEmitter<void>();

  trackByQuestion(_: number, item: EditorQuestionDraft): string {
    return item.id;
  }

  trackByOption(_: number, item: EditorOptionDraft): string {
    return item.id;
  }

  scaleItems(question: EditorQuestionDraft): number[] {
    const min = Math.max(1, question.minValue || 1);
    const max = Math.max(min, question.maxValue || 10);
    const safeMax = Math.min(10, max);
    return Array.from({ length: safeMax - min + 1 }, (_, idx) => min + idx);
  }
}
