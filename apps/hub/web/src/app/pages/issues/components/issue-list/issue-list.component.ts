import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NzAlertModule } from 'ng-zorro-antd/alert';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';
import { HubDateTimePipe } from '../../../../shared/pipes/date-time.pipe';
import {
  issueDisplayStatusColor,
  issueDisplayStatusLabel,
  issuePriorityColor,
  issuePriorityLabel,
  issueTypeColor,
  issueTypeLabel,
  type IssueItem
} from '../../issues.model';

@Component({
  selector: 'app-issue-list',
  imports: [
    NzAlertModule,
    NzButtonModule,
    NzCardModule,
    NzEmptyModule,
    NzPaginationModule,
    NzTableModule,
    NzTagModule,
    NzToolTipModule,
    HubDateTimePipe
  ],
  templateUrl: './issue-list.component.html',
  styleUrls: ['./issue-list.component.less']
})
export class IssueListComponent {
  @Input() items: IssueItem[] = [];
  @Input() selectedIssueId: string | null = null;
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() total = 0;
  @Input() page = 1;
  @Input() pageSize = 20;

  @Output() readonly reloadRequested = new EventEmitter<void>();
  @Output() readonly issueSelected = new EventEmitter<IssueItem>();
  @Output() readonly pageChanged = new EventEmitter<number>();

  protected readonly statusLabel = issueDisplayStatusLabel;
  protected readonly statusColor = issueDisplayStatusColor;
  protected readonly priorityLabel = issuePriorityLabel;
  protected readonly priorityColor = issuePriorityColor;
  protected readonly typeLabel = issueTypeLabel;
  protected readonly typeColor = issueTypeColor;
}