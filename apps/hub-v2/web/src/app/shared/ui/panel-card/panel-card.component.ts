import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-panel-card',
  standalone: true,
  template: `
    <section class="panel">
      <header class="panel__header">
        <div class="panel__title">
          <h3>{{ title() }}</h3>
          @if (count() !== null) {
            <span class="panel__count">{{ count() }}</span>
          }
        </div>

        <div class="panel__actions">
          <ng-content select="[panel-actions]"></ng-content>
        </div>
      </header>

      @if (empty()) {
        <div class="panel__empty">{{ emptyText() }}</div>
      } @else {
        <div class="panel__body">
          <ng-content></ng-content>
        </div>
        <div class="panel__footer">
          <ng-content select="[panel-footer]"></ng-content>
        </div>
      }
    </section>
  `,
  styles: [
    `
      .panel {
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.04), transparent 30%),
          var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
      }

      .panel__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        padding: 12px 16px;
        border-bottom: 1px solid var(--border-color);
      }

      .panel__title {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .panel__title h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 15px;
        font-weight: 600;
      }

      .panel__count {
        padding: 1px 8px;
        border-radius: 999px;
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        flex-shrink: 0;
      }

      .panel__actions {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }

      .panel__empty {
        padding: 24px 20px 28px;
        text-align: center;
        color: var(--text-muted);
      }

      .panel__body {
        display: block;
      }

      .panel__footer:empty {
        display: none;
      }

      .panel__footer {
        padding: 18px 20px;
        border-top: 1px solid var(--border-color-soft);
      }

      :host-context(html[data-theme='dark']) .panel {
        border-color: rgba(148, 163, 184, 0.14);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelCardComponent {
  readonly title = input.required<string>();
  readonly count = input<number | string | null>(null);
  readonly empty = input(false);
  readonly emptyText = input('暂无数据');
}
