import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-data-table',
  standalone: true,
  template: `
    <div class="data-table-shell" [class.data-table-shell--flat]="flat()">
      <ng-content select="[table-head]"></ng-content>
      <ng-content select="[table-body]"></ng-content>
    </div>
  `,
  styles: [
    `
      .data-table-shell {
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)), var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        box-shadow: var(--shadow-sm);
        overflow: hidden;
      }

      .data-table-shell--flat {
        border: none;
        box-shadow: none;
      }

      :host-context(html[data-theme='dark']) .data-table-shell {
        box-shadow: 0 22px 48px rgba(15, 23, 42, 0.34);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTableComponent {
  readonly flat = input(false);
}
