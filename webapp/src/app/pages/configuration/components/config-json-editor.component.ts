import { CommonModule } from '@angular/common';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-config-json-editor',
  standalone: true,
  imports: [CommonModule, ClipboardModule, FormsModule, NzButtonModule, NzInputModule],
  template: `
    <div class="json-editor" [class.readonly]="readonly" [class.error]="!!errorMessage">
      <div class="header">
        <div class="meta">{{ valueMeta }}</div>
        <div class="actions">
          <button type="button" nz-button nzType="default" nzSize="small" (click)="formatJson()" [disabled]="readonly">格式化</button>
          <button type="button" nz-button nzType="default" nzSize="small" (click)="copyText()">复制</button>
          <button type="button" nz-button nzType="default" nzSize="small" (click)="toggleExpanded()">
            {{ expanded ? '收起' : '展开' }}
          </button>
        </div>
      </div>
      <textarea
        #jsonTextarea
        nz-input
        [readOnly]="readonly"
        wrap="off"
        spellcheck="false"
        [ngStyle]="{ minHeight: minHeight + 'px', height: currentHeight + 'px', maxHeight: currentHeight + 'px' }"
        [ngModel]="jsonText"
        (ngModelChange)="onTextChange($event)"
      ></textarea>
      @if (errorMessage) {
        <div class="error-tip">
          <div>{{ errorMessage }}</div>
          @if (exampleText) {
            <pre>合法示例：{{ exampleText }}</pre>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .json-editor {
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
    }
    .json-editor.readonly {
      background: #f5f5f5;
    }
    .json-editor.error {
      border-color: #ff4d4f;
    }
    .header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      padding: 8px 10px;
      background: #fafafa;
      border-bottom: 1px solid #e5e5e5;
    }
    .meta {
      font-size: 12px;
      opacity: 0.75;
    }
    .actions {
      display: flex;
      gap: 6px;
    }
    textarea[nz-input] {
      display: block;
      width: 100%;
      border: 0;
      border-radius: 0;
      resize: none;
      overflow: auto;
      padding: 10px;
      line-height: 1.6;
      white-space: pre;
      overflow-wrap: normal;
      font-family: Consolas, Menlo, Monaco, 'Courier New', monospace;
      background: transparent;
    }
    .error-tip {
      padding: 6px 10px;
      font-size: 12px;
      color: #ff4d4f;
      border-top: 1px solid #ffe5e5;
      background: #fff2f0;
    }
    .error-tip pre {
      margin: 4px 0 0;
      white-space: pre-wrap;
      color: #8c1d18;
      font-family: Consolas, Menlo, Monaco, 'Courier New', monospace;
    }
  `],
})
export class ConfigJsonEditorComponent implements OnChanges {
  private readonly clipboard = inject(Clipboard);
  private readonly message = inject(NzMessageService);
  @Input() value: unknown;
  @Input() readonly = false;
  @Input() minHeight = 120;
  @Input() maxHeight = 280;
  @Input() expandedHeight = 560;
  @Input() expectedJsonType?: string;
  @Input() jsonExample?: unknown;
  @Output() valueChange = new EventEmitter<unknown>();
  @ViewChild('jsonTextarea') private jsonTextarea?: ElementRef<HTMLTextAreaElement>;

  jsonText = '';
  errorMessage = '';
  expanded = false;

  ngOnChanges(changes: SimpleChanges): void {
    if ('value' in changes) {
      this.jsonText = this.stringifyValue(this.value);
      this.errorMessage = '';
    }
  }

  get currentHeight(): number {
    const lineHeight = 22;
    const verticalPadding = 26;
    const contentHeight = this.lineCount(this.jsonText) * lineHeight + verticalPadding;
    if (this.expanded) {
      return Math.min(this.expandedHeight, Math.max(this.minHeight, contentHeight + 48));
    }
    return Math.min(this.maxHeight, Math.max(this.minHeight, contentHeight));
  }

  get valueMeta(): string {
    if (Array.isArray(this.value)) {
      return `JSON Array · ${this.value.length} 项`;
    }
    if (this.value !== null && typeof this.value === 'object') {
      return `JSON Object · ${Object.keys(this.value as Record<string, unknown>).length} 项`;
    }
    return 'JSON Value';
  }

  get exampleText(): string {
    return this.stringifyExample(this.jsonExample);
  }

  onTextChange(value: string): void {
    this.jsonText = value ?? '';
    this.errorMessage = '';
    if (this.readonly) {
      return;
    }
    try {
      const parsed = this.jsonText ? JSON.parse(this.jsonText) : undefined;
      const validationError = this.validateParsedValue(parsed);
      if (validationError) {
        this.errorMessage = validationError;
        return;
      }
      this.valueChange.emit(parsed);
    } catch {
      this.errorMessage = 'JSON 格式错误，请修正后再保存';
    }
  }

  formatJson(): void {
    if (this.readonly) {
      return;
    }
    try {
      const parsed = this.jsonText ? JSON.parse(this.jsonText) : undefined;
      const validationError = this.validateParsedValue(parsed);
      if (validationError) {
        this.errorMessage = validationError;
        this.message.error(validationError);
        return;
      }
      this.jsonText = this.stringifyValue(parsed);
      this.errorMessage = '';
      this.valueChange.emit(parsed);
      queueMicrotask(() => {
        const textarea = this.jsonTextarea?.nativeElement;
        if (!textarea) return;
        textarea.scrollTop = 0;
        textarea.scrollLeft = 0;
      });
      this.message.success('JSON 已格式化');
    } catch {
      this.errorMessage = 'JSON 格式错误，请修正后再保存';
      this.message.error('JSON 格式错误，无法格式化');
    }
  }

  toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  copyText(): void {
    const ok = this.clipboard.copy(this.jsonText ?? '');
    if (ok) {
      this.message.success('已复制');
      return;
    }
    this.message.error('复制失败，请手动复制');
  }

  private stringifyValue(value: unknown): string {
    if (typeof value === 'undefined') {
      return '';
    }
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private lineCount(value: string): number {
    if (!value) {
      return 1;
    }
    return value.split(/\r?\n/).length;
  }

  private validateParsedValue(value: unknown): string {
    if (!this.expectedJsonType) {
      return '';
    }
    if (this.expectedJsonType === 'string[]') {
      if (!Array.isArray(value)) {
        return '此字段必须是字符串数组';
      }
      if (!value.every((item) => typeof item === 'string')) {
        return '此字段数组中的每一项都必须是字符串';
      }
      return '';
    }
    if (this.expectedJsonType === 'object') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return '此字段必须是 JSON 对象';
      }
      return '';
    }
    if (this.expectedJsonType === 'stringRecord') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return '此字段必须是键值对象';
      }
      if (!Object.values(value as Record<string, unknown>).every((item) => typeof item === 'string')) {
        return '此字段对象的每个值都必须是字符串';
      }
      return '';
    }
    if (this.expectedJsonType === 'stringArrayRecord') {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return '此字段必须是键值对象';
      }
      const values = Object.values(value as Record<string, unknown>);
      if (!values.every((item) => Array.isArray(item) && item.every((nested) => typeof nested === 'string'))) {
        return '此字段对象的每个值都必须是字符串数组';
      }
      return '';
    }
    if (this.expectedJsonType === 'reference[]') {
      if (!Array.isArray(value)) {
        return '此字段必须是引用对象数组';
      }
      if (!value.every((item) => typeof item === 'object' && item !== null && !Array.isArray(item) && typeof (item as Record<string, unknown>)['path'] === 'string')) {
        return '此字段数组中的每一项都必须包含字符串 path';
      }
      return '';
    }
    if (this.expectedJsonType === 'fileReplacement[]') {
      if (!Array.isArray(value)) {
        return '此字段必须是文件替换对象数组';
      }
      if (!value.every((item) => {
        if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
        const record = item as Record<string, unknown>;
        return typeof record['replace'] === 'string' && typeof record['with'] === 'string';
      })) {
        return '此字段数组中的每一项都必须包含字符串 replace 和 with';
      }
      return '';
    }
    return '';
  }

  private stringifyExample(example: unknown): string {
    if (typeof example === 'undefined') {
      return '';
    }
    if (typeof example === 'string') {
      return example;
    }
    try {
      return JSON.stringify(example, null, 2);
    } catch {
      return String(example);
    }
  }
}

