import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';

import type { SurveyTemplate } from '../pages/survey-editor-page/survey-editor.utils';

@Component({
  selector: 'app-survey-editor-left-panel',
  standalone: true,
  imports: [FormsModule, NzInputModule],
  template: `
    <aside class="left-panel">
      <div class="panel-title">模板库</div>
      <input
        nz-input
        [ngModel]="templateKeyword"
        (ngModelChange)="templateKeywordChange.emit($event)"
        placeholder="搜索模板"
      />
      <div class="template-list">
        @for (template of templates; track template.id) {
          <button class="template-item" type="button" (click)="applyTemplate.emit(template.id)">
            <div class="template-item__name">{{ template.name }}</div>
            <div class="template-item__desc">{{ template.desc }}</div>
          </button>
        }
      </div>
    </aside>
  `,
  styles: [
    `
      .left-panel {
        background: #f7f9fc;
        padding: 12px;
        overflow-y: auto;
        border-right: 1px solid #dde3ef;
      }
      .panel-title {
        margin: 0 0 8px;
        font-size: 11px;
        color: var(--text-muted);
        letter-spacing: 0.4px;
        text-transform: uppercase;
        font-weight: 700;
      }
      .template-list {
        display: grid;
        gap: 4px;
        margin: 10px 0 0;
      }
      .template-item {
        border: 1px solid #dce3ef;
        background: #fff;
        border-radius: 8px;
        padding: 9px 10px;
        text-align: left;
        cursor: pointer;
      }
      .template-item:hover {
        border-color: rgba(99, 102, 241, 0.35);
        background: #eef2ff;
      }
      .template-item__name {
        font-size: 13px;
        font-weight: 600;
      }
      .template-item__desc {
        margin-top: 2px;
        font-size: 11px;
        color: var(--text-muted);
      }
      @media (max-width: 1180px) {
        .left-panel {
          border-right: 0;
          border-top: 1px solid var(--border-color-soft);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveyEditorLeftPanelComponent {
  @Input() templateKeyword = '';
  @Input() templates: SurveyTemplate[] = [];

  @Output() templateKeywordChange = new EventEmitter<string>();
  @Output() applyTemplate = new EventEmitter<string>();
}
