import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';

import type { DeliveryOverviewVm } from '../models/delivery-overview.model';

@Component({
  selector: 'app-delivery-overview-metrics-panel',
  standalone: true,
  imports: [NzIconModule],
  template: `
    <section class="overview-grid">
      <article class="headline-card">
        <div class="progress-ring" [style.--progress]="vm().progress">
          <strong>{{ vm().progress }}%</strong>
        </div>
        <div>
          <h2>研发整体进度</h2>
          <p>
            周报纳入 {{ vm().sampledRdCount }} 个研发项，{{ vm().completedCount }} 个本周完成，{{
              vm().inProgressCount
            }} 个仍在推进，{{ vm().attentionCount }} 个需要关注。
          </p>
        </div>
      </article>

      @for (metric of vm().metrics; track metric.label) {
        <article class="metric-card" [attr.data-tone]="metric.tone">
          <div class="metric-card__label">
            <span nz-icon [nzType]="metric.icon"></span>
            {{ metric.label }}
          </div>
          <strong>{{ metric.value }}</strong>
          <span>{{ metric.hint }}</span>
        </article>
      }
    </section>
  `,
  styles: [
    `
      .overview-grid {
        display: grid;
        grid-template-columns: minmax(380px, 1.35fr) repeat(5, minmax(150px, 1fr));
        gap: 16px;
      }
      .headline-card,
      .metric-card {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-sm);
      }
      .headline-card {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr);
        gap: 20px;
        align-items: center;
        padding: 20px;
        background:
          linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 233, 0.04)),
          var(--bg-container);
      }
      .progress-ring {
        --progress: 0;
        width: 112px;
        aspect-ratio: 1;
        border-radius: 50%;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at center, var(--bg-container) 58%, transparent 59%),
          conic-gradient(var(--primary-600) calc(var(--progress) * 1%), var(--border-color) 0);
      }
      .progress-ring strong {
        color: var(--text-heading);
        font-size: 24px;
      }
      h2 {
        margin: 0;
        color: var(--text-heading);
        letter-spacing: 0;
      }
      p {
        margin: 8px 0 0;
        color: var(--text-muted);
        line-height: 1.6;
      }
      .metric-card {
        padding: 18px;
        min-width: 0;
      }
      .metric-card__label {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--text-muted);
        font-size: 13px;
        font-weight: 600;
        margin-bottom: 12px;
      }
      .metric-card__label [nz-icon] {
        color: var(--primary-600);
      }
      .metric-card strong {
        display: block;
        color: var(--text-heading);
        font-size: 28px;
        line-height: 1;
      }
      .metric-card > span {
        display: block;
        margin-top: 8px;
        color: var(--text-disabled);
        font-size: 12px;
        line-height: 1.45;
      }
      .metric-card[data-tone='red'] .metric-card__label [nz-icon] {
        color: var(--color-danger);
      }
      .metric-card[data-tone='green'] .metric-card__label [nz-icon] {
        color: var(--color-success);
      }
      .metric-card[data-tone='orange'] .metric-card__label [nz-icon] {
        color: var(--color-warning);
      }
      @media (max-width: 1600px) {
        .overview-grid {
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        .headline-card {
          grid-column: 1 / -1;
        }
      }
      @media (max-width: 900px) {
        .overview-grid {
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        }
        .headline-card {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 560px) {
        .overview-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewMetricsPanelComponent {
  readonly vm = input.required<DeliveryOverviewVm>();
}
