import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { ConfigPatch, ConfigSchema } from '../models';
import { buildConfigDiffItems, ConfigDiffItem, buildEnvKeyValueDiffs } from '../utils';

@Component({
  selector: 'app-config-preview-modal',
  standalone: true,
  imports: [CommonModule, NzTagModule],
  template: `
    <div class="preview-content">
      <div class="preview-head">
        <!-- <div class="title">变更预览</div> -->
        <div class="subtitle">
          {{ providerTitle || '配置' }}
          @if (filePath) {
            <span>/ {{ filePath }}</span>
          }
          · 本次将修改 {{ diffItems.length }} 项配置
        </div>
      </div>

      <div class="diff-notice">保存前请确认修改路径和目标环境。</div>

      @if (diffItems.length > 0) {
        <div class="diff-list">
          @for (item of diffItems; track $index) {
            <article class="diff-card">
              <div class="diff-card-header">
                <div class="diff-card-left">
                  <span class="diff-card-num">{{ $index + 1 }}</span>
                  <span class="diff-card-field">{{ item.label }}</span>
                  @if (item.groupTitle) {
                    <span class="diff-card-group">{{ item.groupTitle }}</span>
                  }
                </div>
                <nz-tag [nzColor]="opColor(item.op)">{{ opText(item.op) }}</nz-tag>
              </div>
              <div class="diff-card-path">{{ item.path || '(root)' }}</div>
              <div class="diff-card-body" [class.complex]="isComplex(item)">
                <div class="diff-value-box">
                  <div class="diff-value-label old">旧值</div>
                  @if (isRawText(item.before, item)) {
                    <div class="diff-raw-summary">{{ rawSummary(item.before) }}</div>
                  } @else {
                    <pre class="diff-value-content old">{{ formatDiffValue(item.before) }}</pre>
                  }
                </div>
                <div class="diff-value-box">
                  <div class="diff-value-label new">新值</div>
                  @if (isRawText(item.after, item)) {
                    <div class="diff-raw-summary">{{ rawSummary(item.after) }}</div>
                  } @else {
                    <pre class="diff-value-content new">{{ formatDiffValue(item.after) }}</pre>
                  }
                </div>
              </div>
            </article>
          }
        </div>
      } @else {
        <div class="empty">当前没有可展示的字段级变更。</div>
      }

      @if (before !== undefined || after !== undefined) {
        <details class="advanced-section">
          <summary>高级：查看完整 before / after</summary>
          <div class="raw-grid">
            <section class="preview-section">
              <div class="preview-label">Before</div>
              <pre class="preview-block">{{ formatValue(before) }}</pre>
            </section>
            <section class="preview-section">
              <div class="preview-label">After</div>
              <pre class="preview-block">{{ formatValue(after) }}</pre>
            </section>
          </div>
        </details>
      }
    </div>
  `,
  styles: [`
    .preview-content {
      max-height: 68vh;
      overflow: auto;
      padding-right: 4px;
    }

    .preview-head {
      margin-bottom: 12px;
    }

    .title {
      font-size: 18px;
      font-weight: 700;
    }

    .subtitle {
      margin-top: 4px;
      color: var(--app-text-secondary);
      font-size: 12px;
      word-break: break-all;
    }

    .diff-notice {
      margin-bottom: 12px;
      padding: 10px 12px;
      border: 1px solid #e6f4ff;
      border-radius: 6px;
      background: #f0faff;
      color: #0958d9;
    }

    .diff-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .diff-card {
      border: 1px solid var(--app-border-color);
      border-radius: 8px;
      background: var(--app-component-bg);
      overflow: hidden;
    }

    .diff-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 12px;
      border-bottom: 1px solid var(--app-border-color);
    }

    .diff-card-left {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .diff-card-num {
      width: 22px;
      height: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #e6f4ff;
      color: #0958d9;
      font-size: 12px;
      font-weight: 700;
    }

    .diff-card-field {
      font-weight: 700;
    }

    .diff-card-group {
      padding: 1px 7px;
      border-radius: 10px;
      background: #fafafa;
      color: var(--app-text-secondary);
      font-size: 12px;
    }

    .diff-card-path {
      padding: 8px 12px 0;
      color: var(--app-text-secondary);
      font-family: Consolas, Menlo, Monaco, 'Courier New', monospace;
      font-size: 12px;
      word-break: break-all;
    }

    .diff-card-body {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px;
      padding: 12px;
    }

    .diff-card-body.complex {
      align-items: start;
    }

    .diff-value-label {
      margin-bottom: 6px;
      font-weight: 600;
      font-size: 12px;
    }

    .diff-value-label.old {
      color: #cf1322;
    }

    .diff-value-label.new {
      color: #389e0d;
    }

    .diff-value-content,
    .diff-raw-summary {
      min-height: 38px;
      margin: 0;
      padding: 9px 10px;
      border: 1px solid #f0f0f0;
      border-radius: 6px;
      background: #fafafa;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: Consolas, Menlo, Monaco, 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.55;
    }

    .diff-value-content.old {
      background: #fff2f0;
      border-color: #ffccc7;
    }

    .diff-value-content.new {
      background: #f6ffed;
      border-color: #b7eb8f;
    }

    .diff-raw-summary {
      font-family: inherit;
      color: var(--app-text-secondary);
    }

    .advanced-section {
      margin-top: 14px;
    }

    .advanced-section summary {
      cursor: pointer;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .raw-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 12px;
    }

    .preview-section {
      border: 1px solid var(--app-border-color);
      border-radius: 6px;
      overflow: hidden;
    }

    .preview-label {
      padding: 8px 10px;
      font-weight: 600;
      background: #fafafa;
      border-bottom: 1px solid var(--app-border-color);
    }

    .preview-block {
      max-height: 360px;
      overflow: auto;
      margin: 0;
      padding: 10px;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: Consolas, Menlo, Monaco, 'Courier New', monospace;
      font-size: 12px;
    }

    .empty {
      padding: 16px;
      color: var(--app-text-secondary);
      border: 1px dashed var(--app-border-color);
      border-radius: 6px;
    }

    @media (max-width: 780px) {
      .diff-card-body,
      .raw-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ConfigPreviewModalComponent {
  @Input() patches: ConfigPatch[] = [];
  @Input() before: unknown;
  @Input() after: unknown;
  @Input() schema?: ConfigSchema;
  @Input() providerTitle = '';
  @Input() filePath = '';

  diffItems: ConfigDiffItem[] = [];

  private readonly modalData = inject<{
    patches?: ConfigPatch[];
    before?: unknown;
    after?: unknown;
    schema?: ConfigSchema;
    providerTitle?: string;
    filePath?: string;
  } | null>(NZ_MODAL_DATA, { optional: true });

  constructor() {
    if (this.modalData?.patches) {
      this.patches = this.modalData.patches;
    }
    if (this.modalData && 'before' in this.modalData) {
      this.before = this.modalData.before;
    }
    if (this.modalData && 'after' in this.modalData) {
      this.after = this.modalData.after;
    }
    if (this.modalData?.schema) {
      this.schema = this.modalData.schema;
    }
    if (this.modalData?.providerTitle) {
      this.providerTitle = this.modalData.providerTitle;
    }
    if (this.modalData?.filePath) {
      this.filePath = this.modalData.filePath;
    }
    this.diffItems = this.buildDiffItems();
  }

  private buildDiffItems(): ConfigDiffItem[] {
    const envDiffItems = this.buildEnvRawDiffItems();
    if (envDiffItems.length > 0) {
      return envDiffItems;
    }
    return buildConfigDiffItems({
      before: this.before,
      after: this.after,
      patches: this.patches,
      schema: this.schema,
    });
  }

  private buildEnvRawDiffItems(): ConfigDiffItem[] {
    const hasRawPatch = this.patches.some((patch) => patch.path === '/raw');
    if (!hasRawPatch || typeof this.before !== 'string' || typeof this.after !== 'string') {
      return [];
    }
    const diffs = buildEnvKeyValueDiffs(this.before, this.after);
    return diffs.map((diff) => ({
      path: `/raw/${diff.key}`,
      label: diff.key,
      groupTitle: diff.sensitive ? 'Key / Value 预览 · 敏感' : 'Key / Value 预览',
      op: diff.op,
      before: diff.before,
      after: diff.after,
      valueType: 'text',
    }));
  }

  isComplex(item: ConfigDiffItem): boolean {
    return item.valueType === 'array' || item.valueType === 'object' || item.valueType === 'json';
  }

  isRawText(value: unknown, item: ConfigDiffItem): boolean {
    return item.valueType === 'text' && typeof value === 'string' && (value.includes('\n') || value.length > 160);
  }

  rawSummary(value: unknown): string {
    if (typeof value !== 'string') {
      return '无';
    }
    return `${this.lineCount(value)} 行，${value.length} 个字符`;
  }

  lineCount(value: string): number {
    if (value.length === 0) {
      return 0;
    }
    return value.split('\n').length;
  }

  opText(op: ConfigDiffItem['op']): string {
    const map: Record<ConfigDiffItem['op'], string> = {
      set: '修改',
      remove: '删除',
      append: '追加',
      merge: '合并',
    };
    return map[op] ?? op;
  }

  opColor(op: ConfigDiffItem['op']): string {
    const map: Record<ConfigDiffItem['op'], string> = {
      set: 'processing',
      remove: 'error',
      append: 'success',
      merge: 'warning',
    };
    return map[op] ?? 'default';
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

  formatValue(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}
