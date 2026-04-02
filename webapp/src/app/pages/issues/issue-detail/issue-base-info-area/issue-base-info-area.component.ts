import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { ISSUE_TYPE_COLORS, ISSUE_TYPE_LABELS } from '@app/shared/constants/issue-type-options';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '@app/shared/constants/priority-options';
import { ISSUE_STATUS_COLORS, ISSUE_STATUS_LABELS } from '@app/shared/constants/status-options';
import { DetailItemCardComponent } from '@app/shared/ui/detail-item-card.component/detail-item-card.component';
import {
  IssueEntity,
  IssuePriority,
  IssueStatus,
  IssueType,
} from '@pages/issues/models/issue.model';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzDescriptionsModule } from 'ng-zorro-antd/descriptions';
import { NzTagModule } from 'ng-zorro-antd/tag';

@Component({
  selector: 'app-issue-base-info-area',
  standalone: true,
  imports: [NzCardModule, NzDescriptionsModule, NzTagModule, CommonModule, DetailItemCardComponent],
  template: `
    <app-detail-item-card [title]="'基础信息'">
      <nz-descriptions nzBordered nzSize="small" [nzColumn]="1">
        <nz-descriptions-item nzTitle="提报人">
          <b>{{ issue().reporterName }}</b>
        </nz-descriptions-item>
        <nz-descriptions-item nzTitle="负责人">
          <b>{{ issue().assigneeName || '-' }}</b>
        </nz-descriptions-item>
        <nz-descriptions-item nzTitle="验收人">
          <b>{{ issue().verifierName || '-' }}</b>
        </nz-descriptions-item>
        <nz-descriptions-item nzTitle="状态">
          <nz-tag [nzColor]="getStatusColor(issue().status)">
            {{ getStatusLabel(issue().status) }}
          </nz-tag>
        </nz-descriptions-item>
        <nz-descriptions-item nzTitle="优先级">
          <nz-tag [nzColor]="getPriorityColor(issue().priority)">
            {{ getPriorityLabel(issue().priority) }}
          </nz-tag>
        </nz-descriptions-item>
        <nz-descriptions-item nzTitle="类型">
          <nz-tag [nzColor]="getTypeColor(issue().type)">
            {{ getTypeLabel(issue().type) }}
          </nz-tag>
        </nz-descriptions-item>
        <nz-descriptions-item nzTitle="模块">
          {{ issue().moduleCode || '-' }}
        </nz-descriptions-item>
        <nz-descriptions-item nzTitle="环境">
          {{ issue().environmentCode || '-' }}
        </nz-descriptions-item>
        <nz-descriptions-item nzTitle="创建时间">
          {{ issue().createdAt | date: 'yyyy-MM-dd HH:mm:ss' }}
        </nz-descriptions-item>
      </nz-descriptions>
    </app-detail-item-card>
  `,
  styles: `
    :host ::ng-deep .ant-descriptions-item-content,
    :host ::ng-deep .ant-descriptions-item-label {
      font-size: 0.875rem;
    }
  `,
})
export class IssueBaseInfoAreaComponent {
  issue = input.required<IssueEntity>();

  getPriorityLabel(priority: IssuePriority) {
    return PRIORITY_LABELS[priority];
  }

  getPriorityColor(priority: IssuePriority) {
    return PRIORITY_COLORS[priority];
  }

  getStatusLabel(status: IssueStatus) {
    return ISSUE_STATUS_LABELS[status];
  }

  getStatusColor(status: IssueStatus) {
    return ISSUE_STATUS_COLORS[status];
  }

  getTypeLabel(type: IssueType) {
    return ISSUE_TYPE_LABELS[type];
  }

  getTypeColor(type: IssueType) {
    return ISSUE_TYPE_COLORS[type];
  }
}
