import { CommonModule } from '@angular/common';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
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
        nz-input
        [disabled]="readonly"
        [ngStyle]="{ minHeight: minHeight + 'px', height: currentHeight + 'px', maxHeight: currentHeight + 'px' }"
        [ngModel]="jsonText"
        (ngModelChange)="onTextChange($event)"
      ></textarea>
      @if (errorMessage) {
        <div class="error-tip">{{ errorMessage }}</div>
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
  `],
})
export class ConfigJsonEditorComponent implements OnChanges {
  private readonly clipboard = inject(Clipboard);
  private readonly message = inject(NzMessageService);
  @Input() value: unknown;
  @Input() readonly = false;
  @Input() minHeight = 120;
  @Input() maxHeight = 280;
  @Output() valueChange = new EventEmitter<unknown>();

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
    return this.expanded ? 420 : this.maxHeight;
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

  onTextChange(value: string): void {
    this.jsonText = value ?? '';
    this.errorMessage = '';
    if (this.readonly) {
      return;
    }
    try {
      const parsed = this.jsonText ? JSON.parse(this.jsonText) : undefined;
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
      this.jsonText = this.stringifyValue(parsed);
      this.errorMessage = '';
      this.valueChange.emit(parsed);
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
}

