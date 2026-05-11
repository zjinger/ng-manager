import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { ConfigJsonEditorComponent } from './config-json-editor.component';

@Component({
  selector: 'app-config-json-summary',
  standalone: true,
  imports: [CommonModule, NzButtonModule, ConfigJsonEditorComponent],
  template: `
    <div class="json-summary">
      <div class="summary-head">
        <span class="meta">{{ summaryTitle }}</span>
        <button nz-button nzType="link" nzSize="small" (click)="expanded = !expanded">
          {{ expanded ? '收起 JSON 编辑' : '展开 JSON 编辑' }}
        </button>
      </div>

      @if (!expanded) {
        <div class="summary-list">
          @if (isObject(value)) {
            @for (entry of objectEntries(value); track entry.key; let i = $index) {
              @if (i < 5) {
                <div class="summary-item">
                  <code class="k">{{ entry.key }}</code>
                  <span class="v">{{ toInlineText(entry.value) }}</span>
                </div>
              }
            }
          } @else if (isArray(value)) {
            @for (item of value; track $index; let i = $index) {
              @if (i < 5) {
                <div class="summary-item">
                  <code class="k">[{{ i }}]</code>
                  <span class="v">{{ toInlineText(item) }}</span>
                </div>
              }
            }
          } @else {
            <div class="summary-item">
              <span class="v">{{ toInlineText(value) }}</span>
            </div>
          }
          @if (itemCount > 5) {
            <div class="more">...</div>
          }
        </div>
      } @else {
        <app-config-json-editor
          [value]="value"
          [readonly]="readonly"
          (valueChange)="valueChange.emit($event)"
        ></app-config-json-editor>
      }
    </div>
  `,
  styles: [`
    .json-summary {
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      overflow: hidden;
    }
    .summary-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: #fafafa;
      border-bottom: 1px solid #e5e5e5;
    }
    .meta {
      font-size: 12px;
      opacity: 0.75;
    }
    .summary-list {
      padding: 10px;
    }
    .summary-item {
      display: flex;
      gap: 10px;
      align-items: baseline;
      margin-bottom: 6px;
      line-height: 1.5;
    }
    .summary-item:last-child {
      margin-bottom: 0;
    }
    .k {
      min-width: 120px;
      font-family: Consolas, Menlo, Monaco, 'Courier New', monospace;
      color: #1677ff;
    }
    .v {
      opacity: 0.8;
      word-break: break-word;
    }
    .more {
      opacity: 0.6;
    }
  `],
})
export class ConfigJsonSummaryComponent {
  @Input() value: unknown;
  @Input() readonly = false;
  @Output() valueChange = new EventEmitter<unknown>();

  expanded = false;

  get itemCount(): number {
    if (Array.isArray(this.value)) {
      return this.value.length;
    }
    if (this.isObject(this.value)) {
      return Object.keys(this.value).length;
    }
    return 1;
  }

  get summaryTitle(): string {
    if (Array.isArray(this.value)) {
      return `Array · ${this.value.length} 项`;
    }
    if (this.isObject(this.value)) {
      return `Object · ${Object.keys(this.value).length} 项`;
    }
    return 'Value';
  }

  isObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  isArray(value: unknown): value is unknown[] {
    return Array.isArray(value);
  }

  objectEntries(value: Record<string, unknown>): Array<{ key: string; value: unknown }> {
    return Object.entries(value).map(([key, itemValue]) => ({ key, value: itemValue }));
  }

  toInlineText(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'undefined') {
      return '无';
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
}

