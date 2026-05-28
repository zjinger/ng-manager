import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { NzButtonModule } from 'ng-zorro-antd/button';

import { StatCardComponent } from '@shared/ui';
import type { ProjectFeatureProgressSummary } from '../../models/project.model';

@Component({
  selector: 'app-project-feature-progress-stats',
  standalone: true,
  imports: [NzButtonModule, StatCardComponent],
  template: `
    <section class="feature-progress-stats">
      <div class="feature-progress-stats__overall">
        <app-stat-card
          label="整体完成率"
          [value]="progressValue()"
          [hint]="progressHint()"
          icon="bar-chart"
          tone="blue"
        />
        @if (canManage()) {
          <button nz-button nzSize="small" type="button" class="feature-progress-stats__overall-action" (click)="editOverall.emit()">
            调整
          </button>
        }
      </div>
      <app-stat-card
        label="功能点总数"
        [value]="summary().totalCount"
        hint="已纳入台账"
        icon="unordered-list"
        tone="purple"
      />
      <app-stat-card
        label="已完成"
        [value]="summary().completedCount"
        hint="进度为 100%"
        icon="check-circle"
        tone="green"
      />
      <app-stat-card
        label="进行中"
        [value]="summary().inProgressCount"
        hint="进度 1%-99%"
        icon="sync"
        tone="orange"
      />
      <app-stat-card
        label="未开始"
        [value]="summary().notStartedCount"
        hint="进度为 0%"
        icon="clock-circle"
        tone="cyan"
      />
    </section>
  `,
  styles: [
    `
      .feature-progress-stats {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }

      .feature-progress-stats__overall {
        position: relative;
      }

      .feature-progress-stats__overall-action {
        position: absolute;
        right: 14px;
        bottom: 14px;
      }

      @media (max-width: 1400px) {
        .feature-progress-stats {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 900px) {
        .feature-progress-stats {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .feature-progress-stats {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectFeatureProgressStatsComponent {
  readonly summary = input.required<ProjectFeatureProgressSummary>();
  readonly canManage = input(false);

  readonly editOverall = output<void>();

  progressValue(): string {
    return `${this.summary().displayProgress}%`;
  }

  progressHint(): string {
    const summary = this.summary();
    if (summary.overrideProgress !== null) {
      return `手动进度，自动计算 ${summary.computedProgress}%`;
    }
    return '按模块与子模块进度计算';
  }
}
