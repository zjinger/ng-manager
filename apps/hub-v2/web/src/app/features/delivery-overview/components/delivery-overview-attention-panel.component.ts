import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PanelCardComponent } from '@shared/ui';
import type { AttentionItem } from '../models/delivery-overview.model';

@Component({
  selector: 'app-delivery-overview-attention-panel',
  standalone: true,
  imports: [PanelCardComponent, RouterLink],
  template: `
    <app-panel-card title="需关注" [count]="count()">
      <div class="attention-list">
        @if (items().length === 0) {
          <div class="empty-panel">暂无阻塞或延期事项。</div>
        } @else {
          @for (attention of items(); track attention.title) {
            <div class="attention-card" [attr.data-tone]="attention.tone">
              <div class="attention-card__top">
                <strong>{{ attention.title }}</strong>
                <span>{{ attention.status }}</span>
              </div>
              <p>{{ attention.description }}</p>
              <div class="attention-card__meta">
                <span>负责人：{{ attention.owner }}</span>
                <span>{{ attention.target }}</span>
              </div>
              @if (attention.routerLink) {
                <a [routerLink]="attention.routerLink">查看研发项</a>
              }
            </div>
          }
        }
      </div>
    </app-panel-card>
  `,
  styles: [
    `
      .attention-list {
        display: grid;
        gap: 14px;
        padding: 16px;
      }
      .attention-card {
        display: grid;
        gap: 10px;
        padding: 14px;
        border: 1px solid var(--border-color-soft);
        border-radius: var(--border-radius-sm);
        background: var(--bg-subtle);
      }
      .attention-card__top,
      .attention-card__meta {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        align-items: flex-start;
      }
      .attention-card__top span {
        flex: 0 0 auto;
        border-radius: 999px;
        padding: 2px 8px;
        background: var(--bg-container);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
      }
      .attention-card[data-tone='red'] .attention-card__top span {
        color: var(--color-danger);
      }
      .attention-card[data-tone='orange'] .attention-card__top span {
        color: var(--color-warning);
      }
      p {
        margin: 0;
        color: var(--text-muted);
        line-height: 1.55;
      }
      .attention-card__meta {
        color: var(--text-disabled);
        font-size: 12px;
      }
      a {
        color: var(--primary-600);
        font-weight: 600;
      }
      .empty-panel {
        padding: 28px 16px;
        color: var(--text-disabled);
        text-align: center;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewAttentionPanelComponent {
  readonly items = input.required<AttentionItem[]>();
  readonly count = input.required<number>();
}
