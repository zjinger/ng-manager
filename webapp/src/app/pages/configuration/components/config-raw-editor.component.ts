import { CommonModule } from '@angular/common';
import { Clipboard, ClipboardModule } from '@angular/cdk/clipboard';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { parseEnvKeyValues, EnvKeyValueEntry, normalizeEnvKeyValueEntries } from '../utils';
import { ConfigKvPreviewComponent } from './config-kv-preview.component';

@Component({
  selector: 'app-config-raw-editor',
  standalone: true,
  imports: [CommonModule, ClipboardModule, FormsModule, NzButtonModule, NzInputModule, ConfigKvPreviewComponent],
  template: `
    <div class="raw-editor" [class.readonly]="readonly">
      <div class="header">
        <div class="title">原始内容</div>
        <div class="actions">
          <button nz-button nzType="default" nzSize="small" (click)="copyText()">复制</button>
        </div>
      </div>
      <textarea
        nz-input
        [readOnly]="readonly"
        [ngModel]="textValue"
        [ngStyle]="{ minHeight: minHeight + 'px' }"
        (ngModelChange)="onTextChange($event)"
      ></textarea>
      <app-config-kv-preview [entries]="entries"></app-config-kv-preview>
    </div>
  `,
  styles: [`
    .raw-editor {
      border: 1px solid #e5e5e5;
      border-radius: 6px;
      overflow: hidden;
      background: #fff;
    }
    .raw-editor.readonly {
      background: #f5f5f5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: #fafafa;
      border-bottom: 1px solid #e5e5e5;
    }
    .title {
      font-size: 12px;
      opacity: 0.75;
    }
    textarea[nz-input] {
      display: block;
      width: 100%;
      border: 0;
      border-radius: 0;
      resize: vertical;
      overflow: auto;
      padding: 10px;
      line-height: 1.6;
      white-space: pre;
      font-family: Consolas, Menlo, Monaco, 'Courier New', monospace;
      background: transparent;
    }
  `],
})
export class ConfigRawEditorComponent implements OnChanges {
  private readonly clipboard = inject(Clipboard);
  @Input() value = '';
  @Input() readonly = false;
  @Input() minHeight = 240;
  @Input() backendEntries: unknown[] = [];
  @Output() valueChange = new EventEmitter<string>();

  textValue = '';
  entries: EnvKeyValueEntry[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if ('value' in changes || 'backendEntries' in changes) {
      this.textValue = this.value ?? '';
      this.entries = this.resolvePreviewEntries(this.textValue);
    }
  }

  onTextChange(value: string): void {
    this.textValue = value ?? '';
    this.entries = this.resolvePreviewEntries(this.textValue);
    if (this.readonly) {
      return;
    }
    this.valueChange.emit(this.textValue);
  }

  copyText(): void {
    this.clipboard.copy(this.textValue ?? '');
  }

  private resolvePreviewEntries(raw: string): EnvKeyValueEntry[] {
    const liveEntries = parseEnvKeyValues(raw);
    if (liveEntries.length > 0) {
      return liveEntries;
    }
    return normalizeEnvKeyValueEntries(this.backendEntries);
  }
}

