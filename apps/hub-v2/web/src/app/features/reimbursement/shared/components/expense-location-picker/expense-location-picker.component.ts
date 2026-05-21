import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  Renderer2,
  signal,
  viewChild,
} from '@angular/core';

import { CommonModule, DOCUMENT } from '@angular/common';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

import { CdkConnectedOverlay, CdkOverlayOrigin } from '@angular/cdk/overlay';

import { NzInputModule } from 'ng-zorro-antd/input';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTabsModule } from 'ng-zorro-antd/tabs';

export interface Area {
  city: string;
}

@Component({
  selector: 'app-expense-location-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    NzInputModule,
    NzIconModule,
    NzButtonModule,
    NzTabsModule,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ExpenseLocationPickerComponent),
      multi: true,
    },
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,

  template: `
    <div
      class="sl-travel-range-picker ant-picker ant-picker-range"
      cdkOverlayOrigin
      #origin="cdkOverlayOrigin"
      #picker
    >
      <!-- 左输入框 -->
      <div class="ant-picker-input" [style.width.px]="leftInputWidth()">
        <input
          nz-input
          autocomplete="off"
          [placeholder]="leftPlaceholder()"
          [ngModel]="fromLocation()"
          (ngModelChange)="onFromChange($event)"
          (focus)="onFocus('left')"
          (click)="open()"
          [disabled]="disabled()"
        />
      </div>

      <div class="ant-picker-range-separator">
        <span nz-icon nzType="swap-right"></span>
      </div>

      <!-- 右输入框 -->
      <div class="ant-picker-input" [style.width.px]="rightInputWidth()">
        <input
          nz-input
          autocomplete="off"
          [placeholder]="rightPlaceholder()"
          [ngModel]="toLocation()"
          (ngModelChange)="onToChange($event)"
          (focus)="onFocus('right')"
          (click)="open()"
          [disabled]="disabled()"
        />
      </div>

      @if (showClear()) {
      <span class="ant-picker-clear" (click)="clear($event)">
        <span nz-icon nzType="close-circle" nzTheme="fill"></span>
      </span>
      }

      <div class="ant-picker-suffix">
        <span nz-icon nzType="down"></span>
      </div>
    </div>

    <ng-template
      cdkConnectedOverlay
      [cdkConnectedOverlayOrigin]="origin"
      [cdkConnectedOverlayOpen]="openState()"
      [cdkConnectedOverlayWidth]="triggerWidth()"
      [cdkConnectedOverlayHasBackdrop]="true"
      [cdkConnectedOverlayBackdropClass]="'cdk-overlay-transparent-backdrop'"
      (backdropClick)="close()"
      (detach)="close()"
    >
      <div class="sl-dropdown">
        <nz-tabset>
          <nz-tab nzTitle="常用地点">
            <div class="content">
              @for (item of commonPlaces(); track item.city) {
              <a class="item" (click)="selectPlace(item.city)">
                {{ item.city }}
              </a>
              }
            </div>
          </nz-tab>

          <nz-tab nzTitle="其他城市">
            <div class="content">
              @for (item of otherPlaces(); track item.city) {
              <a class="item" (click)="selectPlace(item.city)">
                {{ item.city }}
              </a>
              }
            </div>
          </nz-tab>
        </nz-tabset>

        <div class="footer">
          <button
            nz-button
            nzType="primary"
            nzSize="small"
            [disabled]="okDisabled()"
            (click)="confirm()"
          >
            确定
          </button>
        </div>
      </div>
    </ng-template>
  `,

  styles: [
    `
      :host {
        display: flex;
        width: 100%;
        min-width: 0;
      }

      .sl-travel-range-picker {
        width: 100%;
        min-width: 0;
        display: flex;
        align-items: center;
        position: relative;
        background: var(--bg-container, #ffffff);
        border: 1px solid var(--border-color, #d9d9d9);
        border-radius: 6px;
        transition: all 0.2s;

        &:hover {
          border-color: var(--primary-500, #6366f1);
        }
      }

      .sl-dropdown {
        background: var(--bg-container, #ffffff);
        border-radius: 8px;
        box-shadow: 0 2px 8px var(--shadow-color, rgba(0, 0, 0, 0.15));
        padding: 12px;
        border: 1px solid var(--border-color, #e5e7eb);
      }

      .content {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .item {
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        color: var(--text-primary, #1e293b);
        text-decoration: none;

        &:hover {
          background: var(--primary-600, #4f46e5);
          color: white;
        }
      }

      .footer {
        display: flex;
        justify-content: flex-end;
        margin-top: 12px;
      }

      .ant-picker-clear {
        margin-left: 4px;
        cursor: pointer;
        color: var(--text-placeholder, #bfbfbf);

        &:hover {
          color: var(--error-color, #f5222d);
        }
      }

      .ant-picker-suffix {
        color: var(--text-placeholder, #bfbfbf);
      }

      .ant-picker-range-separator {
        color: var(--text-placeholder, #bfbfbf);
        padding: 0 4px;
      }

      .ant-picker-input {
        flex: 1 1 0;
        min-width: 0;
      }

      input {
        cursor: pointer;
        background: transparent !important;
      }

      ::ng-deep .ant-tabs {
        .ant-tabs-nav {
          margin-bottom: 12px;

          &::before {
            border-bottom-color: var(--border-color, #f0f0f0);
          }
        }

        .ant-tabs-tab {
          color: var(--text-secondary, #64748b);

          &:hover {
            color: var(--primary-600, #4f46e5);
          }

          &.ant-tabs-tab-active {
            .ant-tabs-tab-btn {
              color: var(--primary-600, #4f46e5);
            }
          }
        }

        .ant-tabs-ink-bar {
          background: var(--primary-600, #4f46e5);
        }
      }

      /* ========== 暗色主题适配 ========== */
      :host-context(html[data-theme='dark']) {
        .sl-travel-range-picker {
          background: var(--bg-container-dark, #1e293b);
          border-color: var(--border-color-dark, #475569);

          input {
            color: var(--text-primary-dark, #e2e8f0);

            &::placeholder {
              color: var(--text-placeholder-dark, #64748b);
            }
          }

          &:hover {
            border-color: var(--primary-400, #818cf8);
          }
        }

        .sl-dropdown {
          background: var(--bg-container-dark, #1e293b);
          border-color: var(--border-color-dark, #334155);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .item {
          color: var(--text-primary-dark, #e2e8f0);
          background: var(--bg-secondary-dark, #334155);

          &:hover {
            background: var(--primary-600, #4f46e5);
            color: white;
          }
        }

        .ant-picker-clear {
          color: var(--text-placeholder-dark, #64748b);

          &:hover {
            color: var(--error-color-dark, #f87171);
          }
        }

        .ant-picker-suffix,
        .ant-picker-range-separator {
          color: var(--text-placeholder-dark, #64748b);
        }

        ::ng-deep .ant-tabs {
          .ant-tabs-nav {
            &::before {
              border-bottom-color: var(--border-color-dark, #334155);
            }
          }

          .ant-tabs-tab {
            color: var(--text-secondary-dark, #94a3b8);

            &:hover {
              color: var(--primary-400, #818cf8);
            }

            &.ant-tabs-tab-active {
              .ant-tabs-tab-btn {
                color: var(--primary-400, #818cf8);
              }
            }
          }

          .ant-tabs-ink-bar {
            background: var(--primary-400, #818cf8);
          }
        }

        button[nz-button] {
          &.ant-btn-primary {
            background: var(--primary-600, #4f46e5);
            border-color: var(--primary-600, #4f46e5);

            &:hover {
              background: var(--primary-500, #6366f1);
              border-color: var(--primary-500, #6366f1);
            }

            &[disabled] {
              background: var(--bg-secondary-dark, #334155);
              border-color: var(--border-color-dark, #475569);
              color: var(--text-placeholder-dark, #64748b);
            }
          }
        }
      }
    `,
  ],
})
export class ExpenseLocationPickerComponent implements ControlValueAccessor {
  private document = inject(DOCUMENT);
  private renderer = inject(Renderer2);

  picker = viewChild<ElementRef<HTMLDivElement>>('picker');

  // =========================
  // inputs
  // =========================

  commonPlaces = input<Area[]>([]);
  otherPlaces = input<Area[]>([]);

  leftPlaceholder = input('出发地');
  rightPlaceholder = input('目的地');

  leftInputWidth = input(60);
  rightInputWidth = input(120);

  triggerWidth = input<number | string>('100%');

  // =========================
  // 双向绑定支持
  // =========================

  // fromLocation 双向绑定
  readonly fromLocation = model<string | null>(null);
  // toLocation 双向绑定
  readonly toLocation = model<string | null>(null);

  // 位置变化输出
  readonly locationChange = output<{ from: string | null; to: string | null }>();

  // =========================
  // state
  // =========================

  openState = signal(false);

  activeInput = signal<'left' | 'right'>('left');

  disabled = signal(false);

  // =========================
  // computed
  // =========================

  okDisabled = computed(() => {
    return !this.fromLocation() || !this.toLocation();
  });

  showClear = computed(() => {
    return !!this.fromLocation() && !!this.toLocation();
  });

  // =========================
  // ControlValueAccessor (保留兼容性)
  // =========================

  private onChange = (value: string[]) => {};
  private onTouched = () => {};

  writeValue(value: string[] | string | null): void {
    if (!value) {
      this.fromLocation.set(null);
      this.toLocation.set(null);
      return;
    }

    if (typeof value === 'string') {
      const [start, end] = value.split('-');
      this.fromLocation.set(start?.trim() || null);
      this.toLocation.set(end?.trim() || null);
    }

    if (Array.isArray(value)) {
      this.fromLocation.set(value[0] || null);
      this.toLocation.set(value[1] || null);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // =========================
  // methods
  // =========================

  open() {
    if (this.disabled()) return;
    this.openState.set(true);
  }

  close() {
    this.openState.set(false);
  }

  onFocus(type: 'left' | 'right') {
    this.activeInput.set(type);
    this.onTouched();
  }

  onFromChange(value: string | null): void {
    this.fromLocation.set(value);
    this.emitValue();
  }

  onToChange(value: string | null): void {
    this.toLocation.set(value);
    this.emitValue();
  }

  selectPlace(city: string) {
    // 支持 "北京-上海" 格式的快捷输入
    if (city.includes('-')) {
      const [start, end] = city.split('-');
      this.fromLocation.set(start.trim());
      this.toLocation.set(end.trim());
    } else {
      if (this.activeInput() === 'left') {
        this.fromLocation.set(city);
      } else {
        this.toLocation.set(city);
      }
    }

    this.emitValue();
  }

  confirm() {
    this.emitValue();
    this.locationChange.emit({ from: this.fromLocation(), to: this.toLocation() });
    this.close();
  }

  clear(event: MouseEvent) {
    event.stopPropagation();
    this.fromLocation.set(null);
    this.toLocation.set(null);
    this.emitValue();
  }

  private emitValue() {
    // 触发 ControlValueAccessor 的 onChange（兼容旧用法）
    this.onChange([this.fromLocation() || '', this.toLocation() || '']);
    // 触发双向绑定更新
    this.locationChange.emit({ from: this.fromLocation(), to: this.toLocation() });
  }
}
