import { Component, inject, signal } from '@angular/core';
import { PageLayoutComponent } from '@app/shared';
import { IssueListStore } from './store/issue-list.store';
import { NzInputModule } from 'ng-zorro-antd/input';
import {
  ISSUE_STATUS_FILTER_OPTIONS,
  ISSUE_STATUS_LABELS,
} from '@app/shared/constants/status-options';
import { PRIORITY_LABELS, PRIORITY_OPTIONS } from '@app/shared/constants/priority-options';
import {
  createCommentInput,
  IssueActionType,
  IssueEntity,
  IssueStatus,
} from './models/issue.model';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzRadioModule } from 'ng-zorro-antd/radio';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { IssuesListTableComponent } from './issues-list-table/issues-list-table.component';
import { IssueDetailStore } from './store/issue-detail.store';
import { IssueDetailComponent } from './issue-detail/issue-detail.component';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { IssueCloseDialogComponent } from './dialogs/issue-close-dialog.component';
import { IssueResolveDialogComponent } from './dialogs/issue-resolve-dialog.component';

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
    NzModalModule,
    IssuesListTableComponent,
    IssueDetailComponent,
    IssueCloseDialogComponent,
    IssueResolveDialogComponent,
  ],
  templateUrl: './issues.component.html',
  styleUrl: './issues.component.less',
  providers: [IssueListStore, IssueDetailStore],
})
export class IssuesComponent {
  private readonly issueListStore = inject(IssueListStore);
  private readonly issueDetailStore = inject(IssueDetailStore);
  private readonly modal = inject(NzModalService);

  // 视图模式
  protected readonly viewType = signal<viewType>('list');
  protected readonly loading = this.issueListStore.loading;
  protected readonly issues = this.issueListStore.items;
  protected readonly total = this.issueListStore.total;
  protected readonly query = this.issueListStore.query;

  // 详情相关
  protected readonly selectedIssue = this.issueDetailStore.issue;
  protected readonly IssueComments = this.issueDetailStore.comments;
  protected readonly IssueAttachments = this.issueDetailStore.attachments;
  protected readonly IssueParticipants = this.issueDetailStore.participants;
  protected readonly busy = this.issueDetailStore.busy;

  // 操作弹窗开关
  protected readonly IssueCloseDialogOpen = signal(false);
  protected readonly IssueResolveDialogOpen = signal(false);

  protected readonly open = signal(false);

  protected readonly currentPriority = signal<IssueStatus | ''>('');

  constructor() {
    this.issueListStore.initialize();
  }

  onPageChange(page: number) {
    this.issueListStore.updateQuery({ page });
  }

  onPageSizeChange(size: number) {
    this.issueListStore.updateQuery({ pageSize: size });
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

  // 操作
  handleActions(action: IssueActionType) {
    switch (action) {
      case 'comments':
      case 'start': {
        console.log('start');

        this.startConfirm();
        break;
      }
      case 'claim': {
        this.claimConfirm();
        break;
      }
      case 'assign':
      case 'resolve': {
        this.IssueResolveDialogOpen.set(true);
        break;
      }
      case 'verify':
      case 'reopen':
      case 'close': {
        this.IssueCloseDialogOpen.set(true);
        break;  
      }
      case 'add_participants':
      case 'remove_participants':
    }
  }

  private startConfirm() {
    this.modal.confirm({
      nzTitle: '确定开始处理该问题？',
      nzContent: '开始处理后，将不能改变该任务负责人。',
      nzOnOk: () => {
        this.issueDetailStore.start();
      },
    });
  }

  private claimConfirm() {
    this.modal.confirm({
      nzTitle: '确定认领该问题？',
      nzContent: '认领后你将成为负责人，可继续开始处理。（转派需前往NGM Hub V2）',
      nzOnOk: () => {
        this.issueDetailStore.claim();
      },
    });
  }

  closeConfirm(){
    // this.issueDetailStore.close
  }

  resolveConfirm(summary: string) {
    this.issueDetailStore.resolve(summary);
    this.IssueResolveDialogOpen.set(false);
  }

  cancelCloseDialog() {
    this.IssueCloseDialogOpen.set(false);
  }

  cancelResolveDialog() {
    this.IssueResolveDialogOpen.set(false);
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
