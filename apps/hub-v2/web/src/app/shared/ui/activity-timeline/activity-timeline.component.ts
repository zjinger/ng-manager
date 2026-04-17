import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { PanelCardComponent } from '../panel-card';

export interface ActivityTimelineItem {
  id: string;
  icon?: string | null;
  actor?: string | null;
  action: string;
  actionSegments?: Array<{ text: string; mention?: boolean }>;
  time?: string | null;
}

@Component({
  selector: 'app-activity-timeline',
  standalone: true,
  imports: [NzIconModule, PanelCardComponent],
  template: `
    <app-panel-card [title]="title()">
      @if (items().length === 0) {
        <div class="panel__empty">{{ emptyText() }}</div>
      } @else {
        <div
          class="timeline"
          [class.timeline--scrollable]="bodyMaxHeight() !== null"
          [style.max-height.px]="bodyMaxHeight() ?? null"
        >
          @for (item of items(); track item.id) {
            <div class="timeline-log">
              @if (item.icon) {
                <span nz-icon [nzType]="item.icon!" class="timeline-log__icon"></span>
              }
              @if (item.actor) {
                <span class="timeline-log__user">{{ item.actor }}</span>
              }
              <span class="timeline-log__action">
                @if (item.actionSegments?.length) {
                  @for (segment of item.actionSegments!; track $index) {
                    @if (segment.mention) {
                      <span class="timeline-log__mention">{{ segment.text }}</span>
                    } @else {
                      <span>{{ segment.text }}</span>
                    }
                  }
                } @else {
                  {{ item.action }}
                }
              </span>
              @if (item.time) {
                <span class="timeline-log__time">{{ item.time }}</span>
              }
            </div>
          }
        </div>
      }
    </app-panel-card>
  `,
  styles: [
    `
      .timeline {
        display: grid;
      }
      .timeline--scrollable {
        overflow: auto;
      }

      .timeline-log {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 14px 20px;
        border-top: 1px solid var(--border-color-soft);
        font-size: 13px;
      }
      .timeline-log__icon,
      .timeline-log__user,
      .timeline-log__time{
        flex: 0 0 auto;
      }
      .timeline-log__icon {
        color: var(--primary-500);
        font-size: 13px;
      }

      .timeline-log__user {
        font-weight: 600;
        color: var(--text-primary);
      }

      .timeline-log__action {
        color: var(--text-secondary);
      }
      .timeline-log__mention {
        color: var(--primary-700);
        font-weight: 600;
      }

      .timeline-log__time {
        margin-left: auto;
        font-size: 12px;
        color: var(--text-muted);
      }

      @media (max-width: 768px) {
        .timeline-log {
          flex-wrap: wrap;
        }

        .timeline-log__time {
          width: 100%;
          margin-left: 21px;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityTimelineComponent {
  readonly title = input('活动记录');
  readonly emptyText = input('暂无操作记录');
  readonly items = input<ActivityTimelineItem[]>([]);
  readonly bodyMaxHeight = input<number | null>(null);
}
