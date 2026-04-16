import { computed, inject, Injectable, signal } from '@angular/core';

// import { ProjectContextStore } from '@core/state';
import { ProjectContextStore } from '@app/core/stores';
import { UserStore } from '@app/core/stores/user/user.store';
import type { PageResult } from '@app/core/types/page.types';
import type {
  CreateIssueInput,
  IssueEntity,
  IssueListQuery,
  IssuePriority,
  IssueStatus,
} from '../models/issue.model';
import { IssueApiService } from '../services/issue-api.service';

// const DEFAULT_QUERY: IssueListQuery = {
//   page: 1,
//   pageSize: 10,
//   keyword: '',
//   status: '',
//   priority: '',
// };
const DEFAULT_QUERY: IssueListQuery = {
  page: 1,
  pageSize: 10,
  keyword: '',
  projectId: '',
  status: ['open', 'in_progress', 'reopened'],
  types: [],
  priority: [],
  reporterIds: [],
  assigneeIds: [],
  moduleCodes: [],
  versionCodes: [],
  environmentCodes: [],
  includeAssigneeParticipants: true,
  sortBy: 'createdAt',
  sortOrder: 'desc',
};

@Injectable()
export class IssueListStore {
  private readonly issueApi = inject(IssueApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly userStore = inject(UserStore);

  private readonly queryState = signal<IssueListQuery>({ ...DEFAULT_QUERY });
  private readonly resultState = signal<PageResult<IssueEntity> | null>(null);
  private readonly loadingState = signal(false);

  readonly query = computed(() => this.queryState());
  readonly result = computed(() => this.resultState());
  readonly items = computed(() => this.resultState()?.items ?? []);
  readonly loading = computed(() => this.loadingState());
  readonly total = computed(() => this.resultState()?.total ?? 0);
  readonly page = computed(() => this.queryState().page ?? 1);
  readonly pageSize = computed(() => this.queryState().pageSize ?? 20);

  private readonly currentProjectId = this.projectContext.currentProjectId;

  initialize(): void {
    this.userStore.ensureUserLoaded();
    this.load();
  }

  refreshForProject(projectId: string | null): void {
    this.queryState.update((query) => ({
      ...query,
      projectId: this.currentProjectId() ?? '',
      page: 1,
    }));

    if (!projectId) {
      this.resultState.set({
        items: [],
        page: 1,
        pageSize: queryPageSize(this.queryState()),
        total: 0,
      });
      this.loadingState.set(false);
      return;
    }

    this.loadingState.set(true);
    this.resultState.set(null);
    this.load();
  }

  updateQuery(patch: Partial<IssueListQuery>): void {
    this.queryState.update((query) => ({
      ...query,
      ...patch,
      page: patch.page ?? query.page ?? 1,
    }));
  }

  updateQueryPriority(priority: IssuePriority | '') {
    if (priority === '') {
      this.updateQuery({ priority: [] });
      return;
    }
    if (this.query().priority.includes(priority)) {
      this.updateQuery({
        priority: this.query().priority.filter((s) => s !== priority),
      });
      return;
    }
    this.updateQuery({ priority: [...this.query().priority, priority] });
  }

  updateQueryStatus(status: IssueStatus | '') {
    if (status === '') {
      this.updateQuery({ status: [] });
      return;
    }
    if (this.query().status.includes(status)) {
      this.updateQuery({
        status: this.query().status.filter((s) => s !== status),
      });
      return;
    }
    this.updateQuery({ status: [...this.query().status, status] });
  }

  async load() {
    const currentProjectId = this.currentProjectId();
    if (!currentProjectId) return;
    const query = this.queryState();
    this.loadingState.set(true);
    try {
      const res = await this.issueApi.getIssuesList(currentProjectId, query);
      this.resultState.set(res);
      this.loadingState.set(false);
    } catch (error) {
      this.loadingState.set(false);
    }
  }

  async createIssue(issueInput: Omit<CreateIssueInput, 'projectId'>, attachmentFiles?: File[]) {
    const projectId = this.currentProjectId() ?? '';
    const title = issueInput.title.trim();
    if (!projectId || !title) {
      return;
    }
    const files = attachmentFiles ?? [];
    const assigneeId = issueInput.assigneeId ?? null;
    // 过滤参与者中重复的，且去除自己
    const participantIds = [
      ...new Set((issueInput.participantIds ?? []).map((item) => item.trim()).filter(Boolean)),
    ].filter((id) => id !== assigneeId);
    this.loadingState.set(true);

    try {
      // const created = (await this.issueApi.createIssue({
      //   ...issueInput,
      //   projectId,
      //   title,
      // } as CreateIssueInput)) as any;
      // // 添加参与人
      // const participantPromises = participantIds.map((userId) =>
      //   this.issueApi.addParticipant(created.id, userId),
      // );
      // const attachmentPromises = files.map(async (file) => {
      //   const upload = await this.issueApi.uploadFile(file, created.id);
      //   await this.issueApi.addAttachment(created.id, upload.id);
      // });
      // await Promise.all([...participantPromises, ...attachmentPromises]);
    } catch (e) {
    } finally {
      this.load();
      this.loadingState.set(false);
    }
  }
}

function queryPageSize(query: IssueListQuery): number {
  return query.pageSize && query.pageSize > 0 ? query.pageSize : 20;
}
