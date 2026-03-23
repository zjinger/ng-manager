import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-search-box',
  standalone: true,
  imports: [NzIconModule],
  template: `
    <label class="search-box">
      <span nz-icon nzType="search"></span>
      <input
        #box
        class="search-box__input"
        type="text"
        [placeholder]="placeholder()"
        [value]="value()"
        (input)="valueChange.emit(box.value)"
        (keyup.enter)="submitted.emit(box.value)"
      />
    </label>
  `,
  styles: [
    `
      .search-box {
        position: relative;
        display: flex;
        align-items: center;
        min-width: min(280px, 100%);
      }

      .search-box > span[nz-icon] {
        position: absolute;
        left: 12px;
        z-index: 1;
        color: var(--text-muted);
        pointer-events: none;
      }

      .search-box__input {
        width: 100%;
        height: 40px;
        padding: 0 14px 0 38px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--bg-container);
        color: var(--text-primary);
        font-size: 14px;
        outline: none;
        transition: var(--transition-base);
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);
      }

      .search-box__input::placeholder {
        color: var(--text-muted);
      }

      .search-box__input:hover {
        border-color: var(--primary-300);
      }

      .search-box__input:focus {
        border-color: var(--primary-500);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.12);
      }

      :host-context(html[data-theme='dark']) .search-box__input {
        box-shadow: 0 14px 28px rgba(15, 23, 42, 0.18);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchBoxComponent {
  readonly value = input('');
  readonly placeholder = input('搜索…');
  readonly valueChange = output<string>();
  readonly submitted = output<string>();
}
