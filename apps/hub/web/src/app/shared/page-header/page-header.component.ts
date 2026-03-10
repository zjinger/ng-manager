import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  standalone: true,
  template: `
    <div class="page-header">
      <div class="header-main">
        <h1 class="title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="subtitle">{{ subtitle() }}</p>
        }
      </div>

      <div class="header-actions">
        <ng-content select="[page-header-actions]"></ng-content>
      </div>
    </div>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .header-main {
      min-width: 0;
    }

    .title {
      margin: 0;
      font-size: 28px;
      line-height: 1.2;
      font-weight: 700;
      color: #111827;
    }

    .subtitle {
      margin: 6px 0 0;
      font-size: 14px;
      color: #6b7280;
    }

    .header-actions {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }

    @media (max-width: 768px) {
      .page-header {
        align-items: stretch;
        flex-direction: column;
      }

      .title {
        font-size: 24px;
      }

      .header-actions {
        margin-left: 0;
      }
    }
  `
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
