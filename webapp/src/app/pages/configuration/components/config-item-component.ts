import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ConfigField } from '../models';
import { ConfigJsonEditorComponent } from './config-json-editor.component';
import { ConfigJsonSummaryComponent } from './config-json-summary.component';
import { ConfigRawEditorComponent } from './config-raw-editor.component';

@Component({
  selector: 'app-config-item-component',
  imports: [
    CommonModule,
    FormsModule,
    NzSwitchModule,
    NzInputModule,
    NzSelectModule,
    ConfigJsonEditorComponent,
    ConfigJsonSummaryComponent,
    ConfigRawEditorComponent,
  ],
  template: `
    <div class="config-item" [class.readonly]="isReadonly()" [class.large-control]="isLargeControl()">
      <div class="meta">
        <div class="label">{{ item.label }}</div>
        @if (isLargeControl()) {
          <div class="path" [title]="item.path">{{ item.path }}</div>
        }
        @if(defaultValue() !== undefined){
          <div class="default-value">默认值: <code>{{ toInlineText(defaultValue()) }}</code></div>
        }
        @if(item.description){
          <div class="desc">{{ item.description }}</div>
        }
      </div>
      <div class="control">
        @switch (item.type) {
          @case ('text') {
            <input nz-input [disabled]="isReadonly()" [ngModel]="value" (ngModelChange)="emit($event)" />
          }
          @case ('path') {
            <input nz-input [disabled]="isReadonly()" [ngModel]="value" (ngModelChange)="emit($event)" />
          }
          @case ('number') {
            <input nz-input type="number" [disabled]="isReadonly()" [ngModel]="value" (ngModelChange)="emitNumber($event)" />
          }
          @case ('boolean') {
            <nz-switch [nzDisabled]="isReadonly()" [ngModel]="!!value" (ngModelChange)="emit($event)"></nz-switch>
          }
          @case ('select') {
            <nz-select [ngModel]="value" [nzDisabled]="isReadonly()" (ngModelChange)="emit($event)">
              @for (opt of options; track opt.value) {
                <nz-option [nzValue]="opt.value" [nzLabel]="opt.label"></nz-option>
              }
            </nz-select>
          }
          @case ('json') {
            @if (shouldUseSummary(value, item)) {
              <app-config-json-summary
                [value]="value"
                [readonly]="isReadonly()"
                (valueChange)="emit($event)"
              ></app-config-json-summary>
            } @else {
              <app-config-json-editor
                [value]="value"
                [readonly]="isReadonly()"
                (valueChange)="emit($event)"
              ></app-config-json-editor>
            }
          }
          @case ('multi-text') {
            @if (typeof value === 'string' || value === undefined || value === null) {
              <app-config-raw-editor
                [value]="toMultilineText(value)"
                [readonly]="isReadonly()"
                [backendEntries]="backendEntries()"
                (valueChange)="emitRawText($event)"
              ></app-config-raw-editor>
            } @else if (shouldUseSummary(value, item)) {
              <app-config-json-summary
                [value]="value"
                [readonly]="isReadonly()"
                (valueChange)="emit($event)"
              ></app-config-json-summary>
            } @else {
              <app-config-json-editor
                [value]="value"
                [readonly]="isReadonly()"
                (valueChange)="emit($event)"
              ></app-config-json-editor>
            }
          }
          @default {
            <pre>{{ toPrettyText(value) }}</pre>
          }
        }
        @if (!isLargeControl()) {
          <div class="path" [title]="item.path">{{ item.path }}</div>
        }
      </div>
    </div>
  `,
  styles: [
    `
    .config-item {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 10px 16px;
      border-bottom: 1px solid var(--app-border-color);
      transition: background .18s ease;
    }
    .config-item:hover {
      background: #fafafa;
    }
    .config-item:last-child {
      border-bottom: 0;
    }
    .config-item.readonly {
      background: #fafafa;
    }
    .config-item.large-control {
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
    }
    .meta {
      flex: 0 0 200px;
      min-width: 0;
      padding-top: 4px;
    }
    .large-control .meta {
      flex: none;
      width: 100%;
      display: grid;
      grid-template-columns: minmax(120px, auto) minmax(0, 1fr);
      column-gap: 12px;
      row-gap: 2px;
      align-items: baseline;
      padding-top: 0;
    }
    .label {
      font-size: 13px;
      line-height: 1.4;
      font-weight: 500;
      opacity: 0.75;
    }
    .path {
      margin-top: 2px;
      font-size: 11px;
      line-height: 1.4;
      color: var(--app-text-secondary);
      font-family: Consolas, Menlo, Monaco, 'Courier New', monospace;
      word-break: break-all;
      opacity: 0;
      transition: opacity .18s ease;
    }
    .large-control .path {
      margin-top: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      word-break: normal;
      text-align: right;
    }
    .config-item:hover .path,
    .config-item:focus-within .path {
      opacity: 1;
    }
    .default-value,
    .desc {
      font-size: 11px;
      line-height: 1.4;
      margin-top: 3px;
      opacity: 0.6;
    }
    .large-control .default-value,
    .large-control .desc {
      grid-column: 1 / -1;
      margin-top: 0;
    }
    code {
      font-family: Consolas, Menlo, Monaco, 'Courier New', monospace;
      word-break: break-word;
    }
    .control {
      flex: 1 1 auto;
      min-width: 260px;
    }
    .large-control .control {
      width: 100%;
      min-width: 0;
    }
    .control input[nz-input],
    .control nz-select,
    .control textarea[nz-input],
    .control app-config-json-editor,
    .control app-config-json-summary,
    .control app-config-raw-editor {
      width: 100%;
      display: block;
    }
    .control pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
    }
    @media (max-width: 780px) {
      .config-item {
        flex-direction: column;
      }
      .meta {
        flex-basis: auto;
        width: 100%;
      }
      .large-control .meta {
        display: block;
      }
      .large-control .path {
        margin-top: 2px;
        text-align: left;
      }
      .control {
        width: 100%;
        min-width: 0;
      }
    }
    `
  ],
})
export class ConfigItemComponent {
  @Input() item!: ConfigField;
  @Input() value: unknown;
  @Input() viewModel: unknown;
  @Input() options: Array<{ label: string; value: string | number | boolean }> = [];
  @Output() valueChange = new EventEmitter<unknown>();

  isReadonly(): boolean {
    return !!this.item?.readonly || this.item?.type === 'readonly' || this.item?.type === 'table';
  }

  isLargeControl(): boolean {
    return this.item?.type === 'json' || this.item?.type === 'multi-text';
  }

  emit(v: any) {
    if (this.isReadonly()) return;
    this.valueChange.emit(v);
  }

  emitNumber(v: any) {
    if (this.isReadonly()) return;
    if (v === '' || v === null || v === undefined) {
      this.valueChange.emit(undefined);
      return;
    }
    const parsed = Number(v);
    this.valueChange.emit(Number.isNaN(parsed) ? undefined : parsed);
  }

  emitRawText(v: string) {
    if (this.isReadonly()) return;
    this.valueChange.emit(v ?? '');
  }

  toMultilineText(v: unknown): string {
    return Array.isArray(v) ? v.join('\n') : (v ?? '').toString();
  }

  shouldUseSummary(value: unknown, item: ConfigField): boolean {
    const key = `${item.key ?? ''}`.toLowerCase();
    if (
      key.includes('dependencies') ||
      key.includes('devdependencies') ||
      key.includes('peerdependencies') ||
      key.includes('optionaldependencies')
    ) {
      return true;
    }
    if (Array.isArray(value)) {
      return value.length > 6;
    }
    if (value !== null && typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>).length > 8;
    }
    return false;
  }

  toPrettyText(v: unknown): string {
    if (typeof v === 'string') return v;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }

  defaultValue(): unknown {
    const metadata = (this.item?.metadata ?? {}) as { defaultValue?: unknown };
    return metadata.defaultValue;
  }

  toInlineText(v: unknown): string {
    if (typeof v === 'string') return v;
    if (typeof v === 'undefined') return '无';
    try {
      return JSON.stringify(v);
    } catch {
      return String(v);
    }
  }

  backendEntries(): unknown[] {
    if (this.item?.path !== '/raw') {
      return [];
    }
    const direct = (this.viewModel as { entries?: unknown })?.entries;
    if (Array.isArray(direct)) {
      return direct;
    }
    const files = (this.viewModel as { files?: unknown })?.files;
    if (Array.isArray(files)) {
      const firstFile = files[0] as { entries?: unknown } | undefined;
      return Array.isArray(firstFile?.entries) ? firstFile.entries : [];
    }
    return [];
  }
}
