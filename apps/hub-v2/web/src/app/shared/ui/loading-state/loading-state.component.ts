import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  template: `
    <section class="state-card state-card--loading">
      <span class="state-card__spinner" aria-hidden="true"></span>
      <div class="state-card__title">{{ text() }}</div>
    </section>
  `,
  styles: [
    `
      .state-card {
        display: grid;
        place-items: center;
        gap: 12px;
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

      .state-card__spinner {
        width: 22px;
        height: 22px;
        border: 2px solid color-mix(in srgb, var(--primary-500) 20%, transparent);
        border-top-color: var(--primary-500);
        border-radius: 50%;
        animation: loading-spin 0.9s linear infinite;
      }

      .state-card__title {
        color: var(--text-secondary);
        font-size: 14px;
        font-weight: 600;
      }

      :host-context(html[data-theme='dark']) .state-card {
        border-color: rgba(148, 163, 184, 0.14);
        box-shadow: var(--shadow-md);
      }

      @keyframes loading-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingStateComponent {
  readonly text = input('正在加载…');
}
