import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-form-actions',
  standalone: true,
  template: `
    <div class="form-actions">
      <ng-content></ng-content>
    </div>
  `,
  styles: [
    `
      .form-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 16px;
        flex-wrap: wrap;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormActionsComponent {}
