import { Component, effect, inject, signal } from '@angular/core';
import { PageLayoutComponent } from '@app/shared';
import { IssueListStore } from './store/issue-list.store';
import { NzInputModule } from 'ng-zorro-antd/input';
import {
  ISSUE_STATUS_FILTER_OPTIONS,
  ISSUE_STATUS_LABELS,
} from '@app/shared/constants/status-options';
import { PRIORITY_LABELS, PRIORITY_OPTIONS } from '@app/shared/constants/priority-options';
import {
  AddParticipantsInput,
  AssignIssueInput,
  createCommentInput,
  IssueActionType,
  IssueEntity,
  IssueListQuery,
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
import { IssueAssignDialogComponent } from './dialogs/issue-assign-dialog.component';
import { IssueAddParticipantsDialogComponent } from './dialogs/issue-add-participants-dialog.component';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { ProjectContextStore } from '@app/core/stores/project-context/project-context.store';

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
    IssueAssignDialogComponent,
    IssueAddParticipantsDialogComponent,
  ],
  templateUrl: './issues.component.html',
  styleUrl: './issues.component.less',
  providers: [IssueListStore, IssueDetailStore],
})
export class IssuesComponent {
  private readonly issueListStore = inject(IssueListStore);
  private readonly issueDetailStore = inject(IssueDetailStore);
  private readonly projectContextStore = inject(ProjectContextStore);
  protected readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly modal = inject(NzModalService);

  // 视图模式
  protected readonly viewType = signal<viewType>('list');
  protected readonly loading = this.issueListStore.loading;
  protected readonly issues = this.issueListStore.items;
  protected readonly total = this.issueListStore.total;
  protected readonly query = this.issueListStore.query;

  // 详情相关
  protected readonly selectedIssue = this.issueDetailStore.issue;
  // protected readonly IssueComments = this.issueDetailStore.comments;
  protected readonly IssueAttachments = this.issueDetailStore.attachments;
  protected readonly IssueParticipants = this.issueDetailStore.participants;
  protected readonly IssueBranches = this.issueDetailStore.branches;
  protected readonly busy = this.issueDetailStore.busy;
  protected readonly members = this.projectContextStore.currentProjectMembers;
  protected readonly currentProjectId = this.projectContextStore.currentProjectId;

  // 详情操作相关
  protected readonly IssueAssignActionLabel = this.issueDetailStore.assignActionLabel;

  // 操作弹窗开关
  protected readonly IssueCloseDialogOpen = signal(false);
  protected readonly IssueResolveDialogOpen = signal(false);
  protected readonly IssueAssignDialogOpen = signal(false);
  protected readonly IssueAddParticipantsDialogOpen = signal(false);

  protected readonly open = signal(false);

  protected readonly currentPriority = signal<IssueStatus | ''>('');

  constructor() {
    const projectId = this.projectContextStore.currentProjectId();
    this.issueListStore.initialize();
    projectId && this.projectContextStore.loadProjectMembers(projectId);

    this.route.queryParamMap.subscribe((params) => {
      const detailId = params.get('detail');

      if (detailId) {
        this.issueDetailStore.load(detailId);
        this.open.set(true);
      } else {
        this.open.set(false);
      }
    });

    // 筛选变化时
    let queryTimer: ReturnType<typeof setTimeout>;
    let prevQuery: IssueListQuery | null = null;
    effect(() => {
      const query = this.issueListStore.query();
      let timeout = 500;
      const isPaginationChange =
        prevQuery && (prevQuery.page !== query.page || prevQuery.pageSize !== query.pageSize);
      const isFilterChange =
        !prevQuery ||
        prevQuery.keyword !== query.keyword ||
        prevQuery.status !== query.status ||
        prevQuery.priority !== query.priority ||
        prevQuery.projectId !== query.projectId;

      prevQuery = { ...query };
      // 如果是变更页码或页大小，则立即加载
      if (isPaginationChange) {
        clearTimeout(queryTimer);
        this.issueListStore.load();
        return;
      }

      if (isFilterChange) {
        clearTimeout(queryTimer);
        queryTimer = setTimeout(() => {
          this.issueListStore.load();
        }, 500);
      }
    });
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
    this.openDetail(issue);
    this.issueDetailStore.load(issue.id);
    this.open.set(true);
  }

  closeIssueDetail() {
    this.open.set(false);
    this.issueDetailStore.setSelectedIssue(null);
    this.router.navigate([], {
      queryParams: {},
    });
  }

  // 提交评论
  commentSubmit(comment: createCommentInput) {
    this.issueDetailStore.postComment(comment);
  }

  // 操作
  handleActions(action: IssueActionType) {
    switch (action) {
      case 'comments':
        break;
      case 'start': {
        this.startConfirm();
        break;
      }
      case 'claim': {
        this.claimConfirm();
        break;
      }
      case 'assign': {
        this.IssueAssignDialogOpen.set(true);
        break;
      }
      case 'wait-update': {
        this.waitForUpdateConfirm();
        break;
      }
      case 'resolve': {
        this.IssueResolveDialogOpen.set(true);
        break;
      }
      case 'verify':
        break;
      case 'reopen':
        break;
      case 'close': {
        this.IssueCloseDialogOpen.set(true);
        break;
      }
      case 'add_participants': {
        this.IssueAddParticipantsDialogOpen.set(true);
        break;
      }
      case 'remove_participants':
        break;
    }
  }

  openDetail(item: IssueEntity): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: item.id },
      queryParamsHandling: 'merge',
    });
  }

  private startConfirm() {
    this.modal.confirm({
      nzTitle:
        this.issueDetailStore.issue()?.status === 'pending_update'
          ? '确认继续处理该问题？'
          : '确认开始处理该问题？',
      nzContent:
        this.issueDetailStore.issue()?.status === 'pending_update'
          ? '继续处理后，状态将从“待提测”回到“处理中”。'
          : '开始处理后将进入处理流转，负责人可继续处理、转派或标记待提测。',
      nzOkText:
        this.issueDetailStore.issue()?.status === 'pending_update' ? '确认继续' : '确认开始',
      nzCancelText: '取消',
      nzOnOk: () => this.issueDetailStore.start(),
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

  private waitForUpdateConfirm() {
    this.modal.confirm({
      nzTitle: '标记为待提测？',
      nzContent: '适用于代码已提交、等待测试验证的情况，方便后续单独筛选。',
      nzOkText: '确认标记',
      nzCancelText: '取消',
      nzOnOk: () => this.issueDetailStore.waitForUpdate(),
    });
  }

  closeConfirm(reason: string) {
    // this.issueDetailStore.close
  }

  resolveConfirm(summary: string) {
    this.issueDetailStore.resolve(summary);
    this.IssueResolveDialogOpen.set(false);
  }

  assignConfirm(input: AssignIssueInput) {
    this.issueDetailStore.assign(input);
    this.IssueAssignDialogOpen.set(false);
  }

  AddParticipantsConfirm(input: AddParticipantsInput) {
    this.issueDetailStore.addParticipants(input);
    this.IssueAddParticipantsDialogOpen.set(false);
  }

  removeParticipant(participantId: string) {
    this.issueDetailStore.removeParticipant(participantId);
  }

  cancelAssignDialog() {
    this.IssueAssignDialogOpen.set(false);
  }

  cancelAddParticipantsConfirm() {
    this.IssueAddParticipantsDialogOpen.set(false);
  }

  cancelCloseDialog() {
    this.IssueCloseDialogOpen.set(false);
  }

  cancelResolveDialog() {
    this.IssueResolveDialogOpen.set(false);
  }

  updateStatus(status: IssueStatus | '') {
    this.issueListStore.updateQuery({ status });
  }

  updatePriority(priority: IssueStatus) {
    this.issueListStore.updateQuery({ priority });
  }

  updateKeyword(keyword: string) {
    this.issueListStore.updateQuery({ keyword });
  }
}
