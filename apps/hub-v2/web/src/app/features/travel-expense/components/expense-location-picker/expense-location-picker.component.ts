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
          [ngModel]="startLabel()"
          (ngModelChange)="onInputChange($event, 'left')"
          (focus)="onFocus('left')"
          (click)="open()"
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
          [ngModel]="endLabel()"
          (ngModelChange)="onInputChange($event, 'right')"
          (focus)="onFocus('right')"
          (click)="open()"
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
        display: inline-flex;
      }

      .sl-travel-range-picker {
        width: 180px;
        display: flex;
        align-items: center;
        position: relative;
        background: var(--bg-container, #ffffff);
        border: 1px solid var(--border-color, #d9d9d9);
        border-radius: 6px;
        transition: all 0.2s;

        &:hover {
          border-color: var(--primary-color, #1677ff);
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
        /* background: var(--bg-secondary, #f8fafc); */
        /* font-size: 13px; */

        &:hover {
          background: var(--primary-color, #1677ff);
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
            color: var(--primary-color, #1677ff);
          }

          &.ant-tabs-tab-active {
            .ant-tabs-tab-btn {
              color: var(--primary-color, #1677ff);
            }
          }
        }

        .ant-tabs-ink-bar {
          background: var(--primary-color, #1677ff);
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
            border-color: var(--primary-color-dark, #4f46e5);
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
            background: var(--primary-color-dark, #4f46e5);
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

        // nz-tabset 暗色主题
        ::ng-deep .ant-tabs {
          .ant-tabs-nav {
            &::before {
              border-bottom-color: var(--border-color-dark, #334155);
            }
          }

          .ant-tabs-tab {
            color: var(--text-secondary-dark, #94a3b8);

            &:hover {
              color: var(--primary-color-dark, #60a5fa);
            }

            &.ant-tabs-tab-active {
              .ant-tabs-tab-btn {
                color: var(--primary-color-dark, #60a5fa);
              }
            }
          }

          .ant-tabs-ink-bar {
            background: var(--primary-color-dark, #60a5fa);
          }
        }

        // 按钮暗色主题
        button[nz-button] {
          &.ant-btn-primary {
            background: var(--primary-color-dark, #4f46e5);
            border-color: var(--primary-color-dark, #4f46e5);

            &:hover {
              background: var(--primary-color-dark-hover, #6366f1);
              border-color: var(--primary-color-dark-hover, #6366f1);
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
  // outputs
  // =========================

  determine = output<string[]>();

  // =========================
  // state
  // =========================

  openState = signal(false);

  activeInput = signal<'left' | 'right'>('left');

  startLabel = signal('');
  endLabel = signal('');

  disabled = signal(false);

  // =========================
  // computed
  // =========================

  okDisabled = computed(() => {
    return !this.startLabel() || !this.endLabel();
  });

  showClear = computed(() => {
    return !!this.startLabel() && !!this.endLabel();
  });

  // =========================
  // ControlValueAccessor
  // =========================

  private onChange = (value: string[]) => {};
  private onTouched = () => {};

  writeValue(value: string[] | string): void {
    if (typeof value === 'string') {
      const [start, end] = value.split('-');

      this.startLabel.set(start || '');
      this.endLabel.set(end || '');
    }

    if (Array.isArray(value)) {
      this.startLabel.set(value[0] || '');
      this.endLabel.set(value[1] || '');
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
  }

  onInputChange(value: string, type: 'left' | 'right') {
    if (type === 'left') {
      this.startLabel.set(value);
    } else {
      this.endLabel.set(value);
    }

    this.emitValue();
  }

  selectPlace(city: string) {
    if (city.includes('-')) {
      const [start, end] = city.split('-');

      this.startLabel.set(start.trim());
      this.endLabel.set(end.trim());
    } else {
      if (this.activeInput() === 'left') {
        this.startLabel.set(city);
      } else {
        this.endLabel.set(city);
      }
    }

    this.emitValue();
  }

  confirm() {
    this.emitValue();

    this.determine.emit([this.startLabel(), this.endLabel()]);

    this.close();
  }

  clear(event: MouseEvent) {
    event.stopPropagation();

    this.startLabel.set('');
    this.endLabel.set('');

    this.emitValue();
  }

  private emitValue() {
    this.onChange([this.startLabel(), this.endLabel()]);
  }
}
