import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import type { InsightGroup } from '../task-analysis.types';
import { NzIconModule } from 'ng-zorro-antd/icon';

@Component({
  selector: 'app-task-analysis-insights',
  standalone: true,
  imports: [CommonModule, NzIconModule],
  template: `
    @if (insightGroups.length > 0) {
      <div class="section">
        <div class="section-title">
          <nz-icon nzType="bulb" />
          <span>构建提示</span>
        </div>
        <div class="insight-groups">
          @for (group of insightGroups; track group.category) {
          <div class="insight-group" [class]="'category-' + group.category">
            <div class="insight-group-title">
              <span>{{ group.label }}</span>
              <em>{{ group.items.length }}</em>
            </div>
            <div class="insight-list">
              @for (insight of group.items; track insight.code + ':' + insight.message) {
              <div class="insight" [class.warning]="insight.level === 'warning'" [class.info]="insight.level === 'info'">
                <div class="insight-icon">
                  @if (insight.level === 'warning') {
                    <nz-icon nzType="exclamation-circle" style="color: #fa8c16" />
                  } @else {
                    <nz-icon nzType="info-circle" style="color: #1677ff" />
                  }
                </div>
                <div class="insight-body">
                  <span>{{ insight.message }}</span>
                </div>
              </div>
              }
            </div>
          </div>
          }
        </div>
      </div>
    }
  `,
  styleUrls: ['./task-analysis-insights.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskAnalysisInsightsComponent {
  @Input() insightGroups: InsightGroup[] = [];
}
