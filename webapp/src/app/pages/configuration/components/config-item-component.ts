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
    <div class="config-item">
      <div class="meta">
        <div class="label">{{ item.label }}</div>
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
      </div>
    </div>
  `,
  styles: [
    `
    .config-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      &:hover { background: var(--app-primary-2); }
      .meta {
        .label { font-weight: 500; opacity: 0.75; }
        .desc { font-size: 14px; margin-top: 4px; opacity: 0.55; }
      }
      .control {
        min-width: 220px;
        max-width: 640px;
        width: 60%;
        input[nz-input], nz-select, textarea[nz-input], app-config-json-editor, app-config-json-summary, app-config-raw-editor {
          width: 100%;
          display: block;
        }
        pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
      }
    }
    `
  ],
})
export class ConfigItemComponent {
  @Input() item!: ConfigField;
  @Input() value: unknown;
  @Input() options: Array<{ label: string; value: string | number | boolean }> = [];
  @Output() valueChange = new EventEmitter<unknown>();

  isReadonly(): boolean {
    return !!this.item?.readonly || this.item?.type === 'readonly' || this.item?.type === 'table';
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
    const summaryKeys = new Set([
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]);
    if (summaryKeys.has(item.key)) {
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
}
