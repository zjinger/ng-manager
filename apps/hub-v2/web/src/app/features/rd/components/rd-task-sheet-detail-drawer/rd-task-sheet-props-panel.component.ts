import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PanelCardComponent } from '@shared/ui';
import type { ProjectSummary } from '../../../projects/models/project.model';
import { RD_TASK_SHEET_RESULT_LABELS, type RdTaskSheetDetail, type RdTaskSheetResult } from '../../models/rd-task-sheet.model';

type PropItem = { label: string; value: string };

@Component({
  selector: 'app-rd-task-sheet-props-panel',
  standalone: true,
  imports: [PanelCardComponent],
  template: `
    @if (detail(); as current) {
      <app-panel-card title="任务单信息">
        <div class="props-grid">
          @for (row of propRows(current); track $index) {
            <div class="prop-row" [class.prop-row--five]="row.length === 5" [class.prop-row--four]="row.length === 4">
              @for (item of row; track item.label) {
                <div class="prop-item">
                  <span>{{ item.label }}</span>
                  <strong>{{ item.value || '-' }}</strong>
                </div>
              }
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
      }
      .prop-row {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .prop-row--four {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      .prop-row--five {
        grid-template-columns: repeat(5, minmax(0, 1fr));
      }
      .prop-item {
        display: grid;
        gap: 4px;
        padding: 12px 16px;
        border-top: 1px solid var(--border-color-soft);
        border-right: 1px solid var(--border-color-soft);
      }
      .prop-row:first-child .prop-item {
        border-top: 0;
      }
      .prop-item:last-child {
        border-right: 0;
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
      @media (max-width: 900px) {
        .prop-row,
        .prop-row--four,
        .prop-row--five {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .prop-item:nth-child(odd) {
          border-right: 1px solid var(--border-color-soft);
        }
        .prop-item:nth-child(even),
        .prop-item:last-child {
          border-right: 0;
        }
        .prop-row:first-child .prop-item:nth-child(n + 3) {
          border-top: 1px solid var(--border-color-soft);
        }
      }
      @media (max-width: 560px) {
        .prop-row,
        .prop-row--four,
        .prop-row--five {
          grid-template-columns: 1fr;
        }
        .prop-item,
        .prop-item:nth-child(odd),
        .prop-item:nth-child(even) {
          border-right: 0;
          border-top: 1px solid var(--border-color-soft);
        }
        .prop-row:first-child .prop-item:first-child {
          border-top: 0;
        }
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

  propRows(detail: RdTaskSheetDetail): PropItem[][] {
    const receiverText = [detail.receiverName, detail.receiverPhone].filter(Boolean).join('，');
    const firstRow: PropItem[] = [
      { label: '发起部门', value: detail.issuerDepartment || '-' },
      { label: '发起人', value: detail.issuerName || '-' },
      { label: '接收部门', value: detail.receiverDepartment || '-' },
      { label: '接收人', value: receiverText || '-' },
    ];
    return [
      firstRow,
      [
        { label: '客户单位', value: detail.customerCompany || '-' },
        { label: '客户联系人', value: detail.customerContact || '-' },
        { label: '客户联系方式', value: detail.customerPhone || '-' },
      ],
      [
        { label: '项目名称', value: detail.projectName || '-' },
        { label: '项目联系人', value: detail.projectContact || '-' },
        { label: '相关系统', value: detail.relatedSystem || this.projectName(detail.projectId) || '-' },
      ],
      [
        { label: '期望解决时间', value: detail.expectedResolvedAt || '-' },
        { label: '处理结果', value: detail.result ? this.resultLabel(detail.result) : '-' },
        { label: '解决时间', value: detail.resolvedAt || '-' },
      ],
    ];
  }

  projectName(projectId: string | null): string {
    return projectId ? this.projectLookup().get(projectId) ?? projectId : '';
  }

  resultLabel(result: RdTaskSheetResult): string {
    return RD_TASK_SHEET_RESULT_LABELS[result] ?? result;
  }
}
