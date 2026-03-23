import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';

import type { ProjectMemberEntity } from '../../../../features/projects/models/project.model';
import { ProjectApiService } from '../../../../features/projects/services/project-api.service';
import { ProjectContextStore } from '../../../../core/state/project-context.store';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { ListStateComponent } from '../../../../shared/ui/list-state/list-state.component';
import { IssueDetailDrawerComponent } from '../../components/issue-detail-drawer/issue-detail-drawer.component';
import { IssueFilterBarComponent, type IssueListViewMode } from '../../components/issue-filter-bar/issue-filter-bar.component';
import { IssueListTableComponent } from '../../components/issue-list-table/issue-list-table.component';
import { IssueCreateDialogComponent } from '../../dialogs/issue-create-dialog/issue-create-dialog.component';
import type { IssueEntity } from '../../models/issue.model';
import { IssueListStore } from '../../store/issue-list.store';

@Component({
  selector: 'app-issue-list-page',
  standalone: true,
  imports: [
    PageHeaderComponent,
    ListStateComponent,
    IssueDetailDrawerComponent,
    IssueFilterBarComponent,
    IssueListTableComponent,
    IssueCreateDialogComponent,
  ],
  providers: [IssueListStore],
  template: `
    <app-page-header title="Issues" [subtitle]="subtitle()" />

    <app-issue-filter-bar
      [query]="store.query()"
      [viewMode]="viewMode()"
      (submit)="store.updateQuery($event)"
      (create)="createOpen.set(true)"
      (viewModeChange)="viewMode.set($event)"
    />

    <app-list-state
      [loading]="store.loading()"
      [empty]="store.items().length === 0"
      loadingText="正在加载 Issue 列表…"
      emptyTitle="当前筛选条件下没有 Issue"
    >
      <app-issue-list-table
        [items]="store.items()"
        [viewMode]="viewMode()"
        [activeIssueId]="selectedIssueId()"
        (open)="openDetail($event)"
      />
    </app-list-state>

    <app-issue-create-dialog
      [open]="createOpen()"
      [busy]="store.loading()"
      [members]="members()"
      (cancel)="createOpen.set(false)"
      (create)="createIssue($event)"
    />

    <app-issue-detail-drawer
      [open]="!!selectedIssueId()"
      [issueId]="selectedIssueId()"
      [issue]="selectedIssue()"
      (close)="closeDetail()"
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IssueListPageComponent {
  readonly store = inject(IssueListStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly projectContext = inject(ProjectContextStore);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly createOpen = signal(false);
  readonly viewMode = signal<IssueListViewMode>('list');
  readonly detailQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('detail'))), {
    initialValue: this.route.snapshot.queryParamMap.get('detail'),
  });
  readonly selectedIssueId = computed(() => this.detailQuery());
  readonly selectedIssue = computed<IssueEntity | null>(() => {
    const issueId = this.selectedIssueId();
    if (!issueId) {
      return null;
    }
    return this.store.items().find((item) => item.id === issueId) ?? null;
  });
  readonly subtitle = computed(() => {
    const projectName = this.projectContext.currentProject()?.name ?? '当前项目';
    const total = this.store.result()?.total ?? 0;
    return `${projectName} · 共 ${total} 个问题`;
  });

  constructor() {
    this.store.initialize();

    effect(() => {
      const projectId = this.projectContext.currentProjectId();
      if (!projectId) {
        this.members.set([]);
        return;
      }
      this.projectApi.listMembers(projectId).subscribe({
        next: (members) => this.members.set(members),
        error: () => this.members.set([]),
      });
    });
  }

  createIssue(input: Parameters<IssueListStore['create']>[0]): void {
    this.store.create(input);
    this.createOpen.set(false);
  }

  openDetail(issueId: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: issueId },
      queryParamsHandling: 'merge',
    });
  }

  closeDetail(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { detail: null },
      queryParamsHandling: 'merge',
    });
  }
}
