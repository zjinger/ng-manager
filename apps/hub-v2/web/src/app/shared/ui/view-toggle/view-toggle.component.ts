import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

export type ViewToggleOption<T extends string = string> = {
  value: T;
  icon: string;
  ariaLabel: string;
};

@Component({
  selector: 'app-view-toggle',
  standalone: true,
  imports: [NzIconModule],
  template: `
    <div class="view-toggle">
      @for (item of options(); track item.value) {
        <button
          type="button"
          class="view-toggle__btn"
          [class.is-active]="value() === item.value"
          [attr.aria-label]="item.ariaLabel"
          (click)="valueChange.emit(item.value)"
        >
          <span nz-icon [nzType]="item.icon"></span>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .view-toggle {
        display: inline-flex;
        padding: 2px;
        border-radius: var(--border-radius);
        background: var(--bg-subtle);
        border: 1px solid var(--border-color-soft);
      }

      .view-toggle__btn {
        width: 34px;
        height: 34px;
        border: 0;
        border-radius: 6px;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        transition: var(--transition-base);
      }

      .view-toggle__btn.is-active {
        background: var(--bg-container);
        color: var(--text-primary);
        box-shadow: 0 10px 18px rgba(15, 23, 42, 0.08);
      }

      :host-context(html[data-theme='dark']) .view-toggle {
        border-color: rgba(148, 163, 184, 0.12);
      }

      :host-context(html[data-theme='dark']) .view-toggle__btn.is-active {
        box-shadow: 0 12px 24px rgba(15, 23, 42, 0.28);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ViewToggleComponent<T extends string = string> {
  readonly options = input<ViewToggleOption<T>[]>([]);
  readonly value = input.required<T>();
  readonly valueChange = output<T>();
}
