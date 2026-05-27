import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PanelCardComponent, StatusBadgeComponent } from '@shared/ui';
import type { ProjectSummary } from '../../../projects/models/project.model';
import {
  RD_TASK_SHEET_BUSINESS_TYPE_LABELS,
  RD_TASK_SHEET_RESULT_LABELS,
  RD_TASK_SHEET_URGENCY_LABELS,
  type RdTaskSheetBusinessType,
  type RdTaskSheetDetail,
  type RdTaskSheetResult,
  type RdTaskSheetUrgency,
} from '../../models/rd-task-sheet.model';

type PropItem = { label: string; value: string; badgeStatus?: string };
type PropSection = { title: string; items: PropItem[] };

@Component({
  selector: 'app-rd-task-sheet-props-panel',
  standalone: true,
  imports: [PanelCardComponent, StatusBadgeComponent],
  template: `
    @if (detail(); as current) {
      <div class="props-stack">
        @for (section of propSections(current); track section.title) {
          <app-panel-card [title]="section.title">
            <dl class="props">
              @for (item of section.items; track item.label) {
                <div>
                  <dt>{{ item.label }}</dt>
                  <dd>
                    @if (item.badgeStatus) {
                      <app-status-badge [status]="item.badgeStatus" [label]="item.value || '-'" />
                    } @else {
                      {{ item.value || '-' }}
                    }
                  </dd>
                </div>
              }
            </dl>
          </app-panel-card>
        }
      </div>
    }
  `,
  styles: [
    `
      .props-stack {
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
        align-items: start;
      }
      .props {
        margin: 0;
        display: grid;
        grid-template-columns: 1fr;
      }
      .props div {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 14px;
        min-width: 0;
        padding: 12px 16px;
        border-top: 1px solid var(--border-color-soft);
      }
      dt {
        flex: 0 0 auto;
        color: var(--text-muted);
        font-size: 13px;
        line-height: 1.5;
        white-space: nowrap;
      }
      dd {
        min-width: 0;
        margin: 0;
        color: var(--text-primary);
        font-weight: 600;
        line-height: 1.5;
        text-align: right;
        overflow-wrap: anywhere;
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

  propSections(detail: RdTaskSheetDetail): PropSection[] {
    const receiverText = [detail.receiverName, detail.receiverPhone].filter(Boolean).join('，');
    return [
      {
        title: '基础信息',
        items: [
          { label: '任务日期', value: detail.issueDate || '-' },
          { label: '业务类型', value: this.businessTypeLabel(detail.businessType), badgeStatus: detail.businessType },
          { label: '紧急程度', value: this.urgencyLabel(detail.urgency), badgeStatus: detail.urgency },
          { label: '发起部门', value: detail.issuerDepartment || '-' },
          { label: '发起人', value: detail.issuerName || '-' },
          { label: '接收部门', value: detail.receiverDepartment || '-' },
          { label: '接收人', value: receiverText || '-' },
          { label: '制单人', value: detail.preparedByName || detail.creatorName || '-' },
          { label: '处理人', value: detail.processorName || '-' },
        ],
      },
      {
        title: '客户与项目',
        items: [
          { label: '客户单位', value: detail.customerCompany || '-' },
          { label: '客户联系人', value: detail.customerContact || '-' },
          { label: '客户联系方式', value: detail.customerPhone || '-' },
          { label: '项目名称', value: detail.projectName || '-' },
          { label: '项目联系人', value: detail.projectContact || '-' },
          { label: '相关系统', value: detail.relatedSystem || this.projectName(detail.projectId) || '-' },
        ],
      },
      {
        title: '时效要求',
        items: [
          { label: '期望解决时间', value: detail.expectedResolvedAt || '-' },
          { label: '处理结果', value: detail.result ? this.resultLabel(detail.result) : '-' },
          { label: '解决时间', value: detail.resolvedAt || '-' },
        ],
      },
      // {
      //   title: '流转时间',
      //   items: [
      //     { label: '下发时间', value: this.formatDateTime(detail.issuedAt) },
      //     { label: '分派时间', value: this.formatDateTime(detail.assignedAt) },
      //     { label: '开始处理', value: this.formatDateTime(detail.processingStartedAt) },
      //     { label: '回复时间', value: this.formatDateTime(detail.repliedAt) },
      //     { label: '关闭时间', value: this.formatDateTime(detail.closedAt) },
      //   ],
      // },
    ];
  }

  projectName(projectId: string | null): string {
    return projectId ? this.projectLookup().get(projectId) ?? projectId : '';
  }

  resultLabel(result: RdTaskSheetResult): string {
    return RD_TASK_SHEET_RESULT_LABELS[result] ?? result;
  }

  urgencyLabel(urgency: RdTaskSheetUrgency): string {
    return RD_TASK_SHEET_URGENCY_LABELS[urgency] ?? urgency;
  }

  businessTypeLabel(type: RdTaskSheetBusinessType): string {
    return RD_TASK_SHEET_BUSINESS_TYPE_LABELS[type] ?? type;
  }

  formatDateTime(value: string | null): string {
    if (!value) {
      return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    const hour = `${date.getHours()}`.padStart(2, '0');
    const minute = `${date.getMinutes()}`.padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  }
}
