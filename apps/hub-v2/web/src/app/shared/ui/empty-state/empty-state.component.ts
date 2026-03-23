import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <section class="state-card state-card--empty">
      <div class="state-card__title">{{ title() }}</div>
      @if (description()) {
        <p class="state-card__description">{{ description() }}</p>
      }
    </section>
  `,
  styles: [
    `
      .state-card {
        padding: 40px 28px;
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.01)),
          var(--bg-container);
        border: 1px dashed var(--border-color);
        border-radius: 20px;
        color: var(--text-muted);
        text-align: center;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
      }

      .state-card__title {
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 600;
      }

      .state-card__description {
        margin-top: 8px;
        color: var(--text-muted);
        font-size: 13px;
      }

      :host-context(html[data-theme='dark']) .state-card {
        border-color: rgba(148, 163, 184, 0.14);
        box-shadow: var(--shadow-md);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly description = input('');
}
