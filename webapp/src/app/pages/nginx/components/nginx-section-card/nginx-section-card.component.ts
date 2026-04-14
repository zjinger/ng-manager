import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-nginx-section-card',
  standalone: true,
  template: `
    <section class="card" [class.card-blue]="accent === 'blue'" [class.card-green]="accent === 'green'" [class.card-orange]="accent === 'orange'">
      @if (showHeader) {
        <div class="card-header">
          <div class="card-header-left">
            <span class="card-title">{{ title }}</span>
            @if (subtitle) {
              <span class="card-subtitle">{{ subtitle }}</span>
            }
          </div>
          <div class="card-actions">
            <ng-content select="[nginxCardActions]"></ng-content>
          </div>
        </div>
      }

      <div class="card-body" [class.no-padding]="noBodyPadding">
        <ng-content></ng-content>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }

    .card {
      background: var(--bg-white);
      border: 1px solid var(--border);
      border-left-width: 3px;
      border-radius: 8px;
      box-shadow: var(--shadow-card);
      margin-bottom: 14px;
      overflow: hidden;
      border-left-color: transparent;
    }

    .card.card-blue {
      border-left-color: var(--blue);
    }

    .card.card-green {
      border-left-color: var(--green);
    }

    .card.card-orange {
      border-left-color: var(--orange);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px 12px 20px;
      border-bottom: 1px solid var(--border-light);
      gap: 10px;
    }

    .card-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }

    .card-title {
      font-size: var(--nginx-font-size-base, 14px);
      font-weight: 700;
      color: var(--text-1);
    }

    .card-subtitle {
      font-size: var(--nginx-font-size-sm, 12px);
      color: var(--text-3);
    }

    .card-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .card-body {
      padding: 14px 18px;

      &.no-padding {
        padding: 0;
      }
    }

    @media (max-width: 768px) {
      .card-header {
        flex-direction: column;
        align-items: flex-start;
      }

      .card-actions {
        width: 100%;
      }
    }
  `,
})
export class NginxSectionCardComponent {
  @Input() accent: 'blue' | 'green' | 'orange' = 'blue';
  @Input() showHeader = false;
  @Input() title = '';
  @Input() subtitle = '';
  @Input() noBodyPadding = false;
}

