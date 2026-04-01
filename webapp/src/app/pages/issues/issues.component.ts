import { Component, inject, signal } from '@angular/core';
import { PageLayoutComponent } from '@app/shared';
import { IssueListStore } from './store/issue-list.store';
import { NzInputModule } from 'ng-zorro-antd/input';
import {
  ISSUE_STATUS_FILTER_OPTIONS,
  ISSUE_STATUS_LABELS,
} from '@app/shared/constants/status-options';
import { PRIORITY_LABELS, PRIORITY_OPTIONS } from '@app/shared/constants/priority-options';
import { createCommentInput, IssueEntity, IssueStatus } from './models/issue.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { IssuesListTableComponent } from './issues-list-table/issues-list-table.component';
import { IssueDetailStore } from './store/issue-detail.store';
import { IssueDetailComponent } from './issue-detail/issue-detail.component';

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
    IssueDetailComponent,
  ],
  templateUrl: './issues.component.html',
  styleUrl: './issues.component.less',
  providers: [IssueListStore, IssueDetailStore],
})
export class IssuesComponent {
  private readonly issueListStore = inject(IssueListStore);
  private readonly issueDetailStore = inject(IssueDetailStore);

  // 视图模式
  protected readonly viewType = signal<viewType>('list');
  protected readonly loading = this.issueListStore.loading;
  protected readonly issues = this.issueListStore.items;
  protected readonly total = this.issueListStore.total;
  protected readonly query = this.issueListStore.query;

  protected readonly selectedIssue = this.issueDetailStore.issue;
  protected readonly IssueComments = this.issueDetailStore.comments;
  protected readonly IssueAttachments = this.issueDetailStore.attachments;
  protected readonly IssueParticipants = this.issueDetailStore.participants;

  protected readonly open = signal(false);

  protected readonly currentPriority = signal<IssueStatus | ''>('');

  constructor() {
    this.issueListStore.initialize();
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

  selectIssue(issue: IssueEntity) {
    this.issueDetailStore.load(issue.id);
    this.open.set(true);
  }

  closeIssueDetail() {
    this.open.set(false);
  }

  // 提交评论
  commentSubmit(comment: createCommentInput) {
    this.issueDetailStore.postComment(comment);
  }

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
