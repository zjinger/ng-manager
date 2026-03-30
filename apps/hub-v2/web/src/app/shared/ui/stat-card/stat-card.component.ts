import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [NzIconModule],
  template: `
    <div class="stat-card">
      <div class="stat-card__header">
        <span class="stat-card__label">{{ label() }}</span>
        <span class="stat-card__icon" [attr.data-tone]="tone()">
          <span nz-icon [nzType]="icon()"></span>
        </span>
      </div>
      <div class="stat-card__value">{{ value() }}</div>
      @if (hint()) {
        <div class="stat-card__hint">{{ hint() }}</div>
      }
    </div>
  `,
  styles: [
    `
      .stat-card {
        padding: 20px;
        border-radius: var(--border-radius);
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        box-shadow: var(--shadow-sm);
        transition: var(--transition-base);
        position: relative;
        overflow: hidden;
      }
      .stat-card::after {
        content: '';
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), transparent 36%);
        opacity: 0;
        transition: var(--transition-base);
      }
      .stat-card:hover {
        box-shadow: var(--shadow-md);
        transform: translateY(-1px);
      }
      .stat-card:hover::after {
        opacity: 1;
      }
      .stat-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 14px;
      }
      .stat-card__label {
        color: var(--text-muted);
        font-size: 13px;
        font-weight: 500;
      }
      .stat-card__icon {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: var(--border-radius);
        font-size: 16px;
      }
      .stat-card__icon[data-tone='blue'] {
        background: var(--color-info-light);
        color: var(--color-info);
      }
      .stat-card__icon[data-tone='purple'] {
        background: rgba(139, 92, 246, 0.14);
        color: #8b5cf6;
      }
      .stat-card__icon[data-tone='green'] {
        background: var(--color-success-light);
        color: var(--color-success);
      }
      .stat-card__icon[data-tone='orange'] {
        background: var(--color-warning-light);
        color: var(--color-warning);
      }
      .stat-card__icon[data-tone='cyan'] {
        background: rgba(6, 182, 212, 0.14);
        color: #0891b2;
      }
      .stat-card__value {
        font-size: 30px;
        font-weight: 700;
        color: var(--text-heading);
        line-height: 1;
      }
      .stat-card__hint {
        margin-top: 8px;
        color: var(--text-disabled);
        font-size: 12px;
      }
      :host-context(html[data-theme='dark']) .stat-card {
        background:
          linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent 35%),
          var(--bg-container);
        border-color: rgba(148, 163, 184, 0.14);
      }
      :host-context(html[data-theme='dark']) .stat-card__icon[data-tone='blue'] {
        background: rgba(59, 130, 246, 0.18);
      }
      :host-context(html[data-theme='dark']) .stat-card__icon[data-tone='purple'] {
        background: rgba(139, 92, 246, 0.18);
      }
      :host-context(html[data-theme='dark']) .stat-card__icon[data-tone='green'] {
        background: rgba(16, 185, 129, 0.18);
      }
      :host-context(html[data-theme='dark']) .stat-card__icon[data-tone='orange'] {
        background: rgba(245, 158, 11, 0.18);
      }
      :host-context(html[data-theme='dark']) .stat-card__icon[data-tone='cyan'] {
        background: rgba(6, 182, 212, 0.2);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>('');
  readonly icon = input<string>('bar-chart');
  readonly tone = input<'blue' | 'purple' | 'green' | 'orange' | 'cyan'>('blue');
}
