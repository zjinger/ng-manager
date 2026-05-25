import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PanelCardComponent } from '@shared/ui';
import type { ProjectSummary } from '../../../projects/models/project.model';
import { RD_TASK_SHEET_RESULT_LABELS, type RdTaskSheetDetail, type RdTaskSheetResult } from '../../models/rd-task-sheet.model';

@Component({
  selector: 'app-rd-task-sheet-props-panel',
  standalone: true,
  imports: [PanelCardComponent],
  template: `
    @if (detail(); as current) {
      <app-panel-card title="任务单信息">
        <div class="props-grid">
          @for (item of propItems(current); track item.label) {
            <div class="prop-item">
              <span>{{ item.label }}</span>
              <strong>{{ item.value || '-' }}</strong>
            </div>
          }
        </div>
      </app-panel-card>
    }
  `,
  styles: [
    `
      .props-grid {
        display: grid;
        grid-template-columns: 1fr;
      }
      .prop-item {
        display: grid;
        gap: 4px;
        padding: 12px 16px;
        border-top: 1px solid var(--border-color-soft);
      }
      .prop-item:first-child {
        border-top: 0;
      }
      .prop-item span {
        color: var(--text-muted);
        font-size: 12px;
      }
      .prop-item strong {
        color: var(--text-primary);
        font-size: 13px;
        font-weight: 500;
        line-height: 1.5;
        word-break: break-word;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RdTaskSheetPropsPanelComponent {
  readonly detail = input<RdTaskSheetDetail | null>(null);
  readonly projects = input<ProjectSummary[]>([]);

  readonly projectLookup = computed(() => {
    const lookup = new Map<string, string>();
    for (const project of this.projects()) {
      lookup.set(project.id, project.name);
    }
    return lookup;
  });

  propItems(detail: RdTaskSheetDetail): Array<{ label: string; value: string }> {
    return [
      { label: '关联项目', value: this.projectName(detail.projectId) || '未关联项目' },
      { label: '发起部门', value: detail.issuerDepartment || '-' },
      { label: '发起人', value: detail.issuerName || '-' },
      { label: '接收部门', value: detail.receiverDepartment || '-' },
      { label: '接收人', value: detail.receiverName || '-' },
      { label: '接收人联系电话', value: detail.receiverPhone || '-' },
      { label: '处理人', value: detail.processorName || '-' },
      { label: '客户单位', value: detail.customerCompany || '-' },
      { label: '客户联系人', value: detail.customerContact || '-' },
      { label: '客户联系方式', value: detail.customerPhone || '-' },
      { label: '项目名称', value: detail.projectName || '-' },
      { label: '项目联系人', value: detail.projectContact || '-' },
      { label: '相关系统', value: detail.relatedSystem || '-' },
      { label: '期望解决时间', value: detail.expectedResolvedAt || '-' },
      { label: '解决时间', value: detail.resolvedAt || '-' },
      { label: '处理结果', value: detail.result ? this.resultLabel(detail.result) : '-' },
    ];
  }

  projectName(projectId: string | null): string {
    return projectId ? this.projectLookup().get(projectId) ?? projectId : '';
  }

  resultLabel(result: RdTaskSheetResult): string {
    return RD_TASK_SHEET_RESULT_LABELS[result] ?? result;
  }
}
