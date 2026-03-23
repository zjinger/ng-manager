import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  template: `
    <div class="filter-bar">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .filter-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilterBarComponent {}
