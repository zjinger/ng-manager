import { Component, inject, signal } from '@angular/core';
import { PageLayoutComponent } from '@app/shared';
import { IssueListStore } from './store/issue-list.store';
import { NzInputModule } from 'ng-zorro-antd/input';
import {
  ISSUE_STATUS_FILTER_OPTIONS,
  ISSUE_STATUS_LABELS,
} from '@app/shared/constants/status-options';
import { PRIORITY_LABELS, PRIORITY_OPTIONS } from '@app/shared/constants/priority-options';
import { IssueStatus } from './models/issue.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { IssuesListTableComponent } from './issues-list-table/issues-list-table.component';

type viewType = 'list' | 'board';

@Component({
  selector: 'app-issues',
  imports: [
    PageLayoutComponent,
    FormsModule,
    NzInputModule,
    NzButtonModule,
    NzRadioModule,
    NzIconModule,
    NzPaginationModule,
    IssuesListTableComponent,
  ],
  templateUrl: './issues.component.html',
  styleUrl: './issues.component.less',
  providers: [IssueListStore],
})
export class IssuesComponent {
  private readonly issueListStore = inject(IssueListStore);

  // 视图模式
  protected readonly viewType = signal<viewType>('list');
  protected readonly loading = this.issueListStore.loading;
  protected readonly issues = this.issueListStore.items;
  protected readonly total = this.issueListStore.total;
  protected readonly query = this.issueListStore.query;

  protected readonly currentPriority = signal<IssueStatus | ''>('');

  constructor() {
    this.issueListStore.load();
  }

  onPageChange(page: number) {
    this.issueListStore.updateQuery({ page });
    this.issueListStore.load();
  }

  onPageSizeChange(size: number) {
    this.issueListStore.updateQuery({ pageSize: size });
    this.issueListStore.load();
  }

  statusOptions = ISSUE_STATUS_FILTER_OPTIONS;
  priorityOptions = PRIORITY_OPTIONS;
  

  updateStatus(status: IssueStatus) {
    this.issueListStore.updateQuery({ status });
  }

  updatePriority(priority: IssueStatus) {
    this.issueListStore.updateQuery({ priority });
  }

  updateKeyword(keyword: string) {
    this.issueListStore.updateQuery({ keyword });
  }
}
