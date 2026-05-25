import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { PanelCardComponent } from '@shared/ui';
import type { StageOverview } from '../models/delivery-overview.model';

@Component({
  selector: 'app-delivery-overview-stages-panel',
  standalone: true,
  imports: [PanelCardComponent],
  template: `
    <app-panel-card title="研发项阶段分布" [count]="totalCount()">
      <div class="stage-grid">
        @for (stage of stages(); track stage.id) {
          <div class="stage-card">
            <div class="stage-card__top">
              <span>{{ stage.name }}</span>
              <strong>{{ stage.count }}</strong>
            </div>
            <div class="mini-progress">
              <span [style.width.%]="stage.averageProgress"></span>
            </div>
            <div class="stage-card__foot">
              平均进度 {{ stage.averageProgress }}%
              @if (stage.blockedCount > 0) {
                · {{ stage.blockedCount }} 项阻塞
              }
            </div>
          </div>
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .stage-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
        padding: 18px;
      }
      .stage-card {
        min-width: 0;
        padding: 14px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius-sm);
        background: var(--bg-subtle);
      }
      .stage-card__top {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      .stage-card__top span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .stage-card__top strong {
        color: var(--text-heading);
        font-size: 20px;
      }
      .mini-progress {
        height: 7px;
        border-radius: 999px;
        background: var(--border-color);
        overflow: hidden;
      }
      .mini-progress span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, var(--primary-600), #0ea5e9);
      }
      .stage-card__foot {
        margin-top: 9px;
        color: var(--text-disabled);
        font-size: 12px;
      }
      @media (max-width: 900px) {
        .stage-grid {
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        }
      }
      @media (max-width: 560px) {
        .stage-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewStagesPanelComponent {
  readonly stages = input.required<StageOverview[]>();
  readonly totalCount = input.required<number>();
}
