import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzTypographyModule } from 'ng-zorro-antd/typography';
import { ConfigPatch, ConfigSchema } from '../models';
import { buildConfigDiffItems, ConfigDiffItem } from '../utils';

@Component({
  selector: 'app-config-preview-modal',
  standalone: true,
  imports: [CommonModule, NzTypographyModule],
  template: `
    <div class="preview-content">
      @if (isTextMode()) {
        <div class="text-summary">
          <div>文本变更摘要</div>
          <div>修改前行数：{{ lineCount(before) }}</div>
          <div>修改后行数：{{ lineCount(after) }}</div>
          <div>内容是否变化：{{ hasTextChanged() ? '是' : '否' }}</div>
        </div>
      }

      @if (diffItems.length > 0) {
        @for (item of diffItems; track $index) {
          <div class="patch-item">
            <div class="patch-head">
              <div class="patch-title">变更 {{ $index + 1 }}{{ item.groupTitle ? ' / ' + item.groupTitle : '' }}</div>
              <div class="patch-op">{{ item.op }}</div>
            </div>
            <div class="patch-label">{{ item.label }}</div>
            <div class="patch-path">{{ item.path || '(root)' }}</div>
            <div class="value-block">
              <div class="value-title">旧值</div>
              <pre class="patch-value">{{ formatDiffValue(item.before) }}</pre>
            </div>
            <div class="value-block">
              <div class="value-title">新值</div>
              <pre class="patch-value">{{ formatDiffValue(item.after) }}</pre>
            </div>
          </div>
        }
      } @else {
        <div class="empty">当前没有可展示的字段级变更。</div>
      }

      @if (before !== undefined || after !== undefined) {
        <details class="advanced-section">
          <summary>高级：查看完整 before / after</summary>
          <div class="preview-section">
            <div class="preview-label">Before</div>
            <pre class="preview-block">{{ formatValue(before) }}</pre>
          </div>
          <div class="preview-section">
            <div class="preview-label">After</div>
            <pre class="preview-block">{{ formatValue(after) }}</pre>
          </div>
        </details>
      }
    </div>
  `,
  styles: [`
    .preview-content {
      max-height: 60vh;
      overflow: auto;
      padding-right: 4px;
    }
    .text-summary {
      margin-bottom: 12px;
      padding: 10px 12px;
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      line-height: 1.8;
    }
    .patch-item {
      padding: 12px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    .patch-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 6px;
    }
    .patch-title {
      font-weight: 600;
    }
    .patch-label {
      font-weight: 500;
      margin-bottom: 4px;
    }
    .patch-op {
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      background: #e6f4ff;
      color: #0958d9;
      padding: 0 8px;
      border-radius: 10px;
      line-height: 20px;
    }
    .patch-path {
      opacity: 0.75;
      margin-bottom: 8px;
      word-break: break-all;
      font-family: Consolas, Menlo, monospace;
      font-size: 12px;
    }
    .value-block {
      margin-bottom: 8px;
    }
    .value-title {
      font-weight: 500;
      margin-bottom: 4px;
    }
    .patch-value {
      margin: 0;
      padding: 8px 10px;
      background: #fafafa;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .advanced-section {
      margin-top: 14px;
    }
    .advanced-section summary {
      cursor: pointer;
      font-weight: 500;
      margin-bottom: 8px;
    }
    .preview-section {
      margin-bottom: 12px;
      border: 1px solid #f0f0f0;
      border-radius: 4px;
      overflow: hidden;
    }
    .preview-label {
      padding: 8px 10px;
      font-weight: 600;
      background: #fafafa;
      border-bottom: 1px solid #f0f0f0;
    }
    .preview-block {
      margin: 0;
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .empty {
      padding: 10px 0;
      opacity: 0.75;
    }
  `]
})
export class ConfigPreviewModalComponent {
  @Input() patches: ConfigPatch[] = [];
  @Input() before: unknown;
  @Input() after: unknown;
  @Input() schema?: ConfigSchema;
  diffItems: ConfigDiffItem[] = [];
  private readonly modalData = inject<{
    patches?: ConfigPatch[];
    before?: unknown;
    after?: unknown;
    schema?: ConfigSchema;
  } | null>(NZ_MODAL_DATA, { optional: true });

  constructor() {
    if (this.modalData?.patches) {
      this.patches = this.modalData.patches;
    }
    if (this.modalData && "before" in this.modalData) {
      this.before = this.modalData.before;
    }
    if (this.modalData && "after" in this.modalData) {
      this.after = this.modalData.after;
    }
    if (this.modalData?.schema) {
      this.schema = this.modalData.schema;
    }
    this.diffItems = buildConfigDiffItems({
      before: this.before,
      after: this.after,
      patches: this.patches,
      schema: this.schema,
    });
  }

  isTextMode(): boolean {
    return typeof this.before === 'string' || typeof this.after === 'string';
  }

  lineCount(value: unknown): number {
    if (typeof value !== 'string' || value.length === 0) {
      return 0;
    }
    return value.split('\n').length;
  }

  hasTextChanged(): boolean {
    return this.before !== this.after;
  }

  formatDiffValue(value: unknown): string {
    if (typeof value === 'undefined') {
      return '无';
    }
    if (value === null) {
      return 'null';
    }
    return this.formatValue(value);
  }

  formatValue(v: unknown): string {
    if (typeof v === 'string') {
      return v;
    }
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
}
