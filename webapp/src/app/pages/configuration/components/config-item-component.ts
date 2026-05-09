import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSwitchModule } from 'ng-zorro-antd/switch';
import { ConfigField } from '../models';

@Component({
  selector: 'app-config-item-component',
  imports: [CommonModule, FormsModule, NzSwitchModule, NzInputModule, NzSelectModule],
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
            <textarea
              nz-input
              rows="4"
              [disabled]="isReadonly()"
              [ngModel]="toJsonText(value)"
              (ngModelChange)="emitJson($event)"
            ></textarea>
          }
          @case ('multi-text') {
            <textarea
              nz-input
              rows="4"
              [disabled]="isReadonly()"
              [ngModel]="toMultilineText(value)"
              (ngModelChange)="emitMultiText($event)"
            ></textarea>
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
        input[nz-input], nz-select, textarea[nz-input] { width: 100%; }
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

  emitJson(v: string) {
    if (this.isReadonly()) return;
    try {
      this.valueChange.emit(v ? JSON.parse(v) : undefined);
    } catch {
      // ignore invalid json input until user fixes it
    }
  }

  emitMultiText(v: string) {
    if (this.isReadonly()) return;
    const lines = (v ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    this.valueChange.emit(lines);
  }

  toJsonText(v: unknown): string {
    if (v === undefined) return '';
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }

  toMultilineText(v: unknown): string {
    return Array.isArray(v) ? v.join('\n') : (v ?? '').toString();
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
