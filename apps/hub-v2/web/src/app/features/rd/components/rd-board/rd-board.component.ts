import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NzProgressModule } from 'ng-zorro-antd/progress';

import { RD_STATUS_LABELS } from '@shared/constants';
import { PriorityBadgeComponent, StatusBadgeComponent } from '@shared/ui';
import type { RdItemEntity, RdStageEntity } from '../../models/rd.model';

@Component({
  selector: 'app-rd-board',
  standalone: true,
  imports: [NzProgressModule, PriorityBadgeComponent, StatusBadgeComponent],
  template: `
    <div class="rd-board">
      @for (stage of displayStages(); track stage.id) {
        <section class="rd-column">
          <header class="rd-column__header">
            <div>
              <h3>{{ stage.name }}</h3>
              <p>{{ itemsByStage()[stage.id]?.length ?? 0 }} 项</p>
            </div>
          </header>

          <div class="rd-column__body">
            @if ((itemsByStage()[stage.id]?.length ?? 0) === 0) {
              <div class="rd-column__empty">当前阶段暂无研发项</div>
            } @else {
              @for (item of itemsByStage()[stage.id]; track item.id) {
                <article class="rd-card" [class.is-active]="selectedItemId() === item.id" (click)="selectItem.emit(item)">
                  <div class="rd-card__meta">
                    <span class="rd-card__code">{{ item.rdNo }}</span>
                    <app-priority-badge [priority]="item.priority" />
                  </div>
                  <h4>{{ item.title }}</h4>
                  <p>{{ item.description || '暂无描述' }}</p>
                  <div class="rd-card__footer">
                    <app-status-badge [status]="item.status" [label]="statusLabel(item.status)" />
                    <span class="rd-card__assignee">{{ item.assigneeName || '未指派' }}</span>
                  </div>
                  <div class="rd-card__progress">
                    <nz-progress
                      [nzPercent]="item.progress"
                      [nzShowInfo]="true"
                      [nzStrokeWidth]="6"
                      [nzSize]="'small'"
                    ></nz-progress>
                  </div>
                </article>
              }
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: [
    `
      .rd-board {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 18px;
      }
      .rd-column {
        border: 1px solid var(--border-color);
        border-radius: 18px;
        background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)), var(--bg-container);
        box-shadow: var(--shadow-md);
        overflow: hidden;
      }
      .rd-column__header {
        padding: 18px 18px 14px;
        border-bottom: 1px solid var(--border-color-soft);
      }
      .rd-column__header h3 {
        margin: 0;
        font-size: 15px;
        color: var(--text-heading);
      }
      .rd-column__header p {
        margin: 4px 0 0;
        color: var(--text-muted);
        font-size: 12px;
      }
      .rd-column__body {
        display: grid;
        gap: 12px;
        padding: 14px;
      }
      .rd-column__empty {
        border: 1px dashed var(--border-color);
        border-radius: 14px;
        padding: 28px 16px;
        color: var(--text-muted);
        text-align: center;
        background: var(--bg-subtle);
      }
      .rd-card {
        border: 1px solid var(--border-color-soft);
        border-radius: 16px;
        padding: 14px;
        background: var(--surface-overlay);
        box-shadow: 0 16px 32px rgba(15, 23, 42, 0.08);
        cursor: pointer;
        transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
      }
      .rd-card:hover {
        border-color: var(--primary-300);
        transform: translateY(-1px);
      }
      .rd-card.is-active {
        border-color: var(--primary-500);
        box-shadow: 0 16px 32px rgba(79, 70, 229, 0.14);
      }
      .rd-card__meta,
      .rd-card__footer,
      .rd-card__progress {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        width: 100%;
        nz-progress {
          width:0;
          flex: 1;
        }
      }
      .rd-card__code {
        font-size: 12px;
        font-family: 'JetBrains Mono', monospace;
        color: var(--text-muted);
      }
      .rd-card h4 {
        margin: 12px 0 8px;
        font-size: 14px;
        color: var(--text-heading);
      }
      .rd-card p {
        margin: 0 0 14px;
        color: var(--text-muted);
        font-size: 13px;
        line-height: 1.6;
      }
      .rd-card__assignee {
        font-size: 12px;
        color: var(--text-muted);
      }
      .rd-card__progress {
        margin-top: 12px;
      }
      .rd-card__progress :where(.ant-progress-text) {
        color: var(--text-muted);
        font-size: 12px;
      }
      .rd-card__progress :where(.ant-progress-outer) {
        margin-inline-end: 0;
      }
      .rd-card__progress :where(.ant-progress-inner) {
        background: var(--bg-subtle);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdBoardComponent {
  readonly stages = input<RdStageEntity[]>([]);
  readonly items = input<RdItemEntity[]>([]);
  readonly selectedItemId = input<string | null>(null);
  readonly selectItem = output<RdItemEntity>();

  readonly displayStages = computed(() => this.stages());
  readonly itemsByStage = computed(() => {
    const map: Record<string, RdItemEntity[]> = {};
    for (const stage of this.stages()) {
      map[stage.id] = [];
    }
    for (const item of this.items()) {
      const key = item.stageId ?? '__unknown__';
      map[key] ??= [];
      map[key].push(item);
    }
    return map;
  });

  statusLabel(status: string): string {
    return RD_STATUS_LABELS[status] ?? status;
  }
}
