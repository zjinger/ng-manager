import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { PageToolbarComponent } from '../../../../shared/ui/page-toolbar/page-toolbar.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { FilterBarComponent } from '../../../../shared/ui/filter-bar/filter-bar.component';
import { ListStateComponent } from '../../../../shared/ui/list-state/list-state.component';
import type { UserEntity } from '../../../users/models/user.model';
import { UserApiService } from '../../../users/services/user-api.service';
import { ProjectMembersDialogComponent } from '../../dialogs/project-members-dialog/project-members-dialog.component';
import { ProjectCreateDialogComponent } from '../../dialogs/project-create-dialog/project-create-dialog.component';
import { ProjectListTableComponent } from '../../components/project-list-table/project-list-table.component';
import type { ProjectMemberEntity, ProjectSummary } from '../../models/project.model';
import { ProjectApiService } from '../../services/project-api.service';
import { ProjectListStore } from '../../store/project-list.store';

@Component({
  selector: 'app-project-list-page',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzSelectModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    FilterBarComponent,
    ListStateComponent,
    ProjectListTableComponent,
    ProjectCreateDialogComponent,
    ProjectMembersDialogComponent,
  ],
  providers: [ProjectListStore],
  template: `
    <app-page-header title="项目管理" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <button toolbar-primary nz-button nzType="primary" class="toolbar__create" (click)="dialogOpen.set(true)">新建项目</button>

      <app-filter-bar toolbar-filters class="toolbar__filters">
        <nz-select class="toolbar__status" [ngModel]="status()" (ngModelChange)="status.set($event)">
          <nz-option nzLabel="全部状态" nzValue=""></nz-option>
          <nz-option nzLabel="活跃" nzValue="active"></nz-option>
          <nz-option nzLabel="停用" nzValue="inactive"></nz-option>
        </nz-select>

        <button nz-button class="toolbar__filter-btn" (click)="applyFilters()">筛选</button>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        class="toolbar__search"
        placeholder="搜索项目名称或 Key"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="applyFilters()"
      />
    </app-page-toolbar>

    <app-list-state
      [loading]="store.loading()"
      [empty]="store.items().length === 0"
      loadingText="正在加载项目列表…"
      emptyTitle="当前还没有项目"
      emptyDescription="先创建一批测试项目。"
    >
      <app-project-list-table [items]="store.items()" (manageMembers)="openMembersDialog($event)" />
    </app-list-state>

    <app-project-create-dialog
      [open]="dialogOpen()"
      [busy]="store.busy()"
      (cancel)="dialogOpen.set(false)"
      (create)="createProject($event)"
    />

    <app-project-members-dialog
      [open]="membersDialogOpen()"
      [project]="selectedProject()"
      [members]="members()"
      [users]="users()"
      [loading]="membersLoading()"
      [busy]="membersBusy()"
      (cancel)="closeMembersDialog()"
      (add)="addMember($event)"
      (remove)="removeMember($event)"
    />
  `,
  styles: [
    `
      .toolbar__filters {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
      .toolbar__search {
        min-width: min(320px, 100%);
        flex: 1 1 320px;
      }
      @media (max-width: 768px) {
        .toolbar__create,
        .toolbar__status,
        .toolbar__filter-btn {
          width: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectListPageComponent {
  readonly store = inject(ProjectListStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly userApi = inject(UserApiService);

  readonly keyword = signal('');
  readonly status = signal<'active' | 'inactive' | ''>('');
  readonly dialogOpen = signal(false);
  readonly membersDialogOpen = signal(false);
  readonly selectedProject = signal<ProjectSummary | null>(null);
  readonly members = signal<ProjectMemberEntity[]>([]);
  readonly users = signal<UserEntity[]>([]);
  readonly membersLoading = signal(false);
  readonly membersBusy = signal(false);
  readonly subtitle = computed(() => `当前共 ${this.store.total()} 个项目`);

  constructor() {
    this.store.initialize();
  }

  applyFilters(): void {
    this.store.updateQuery({
      keyword: this.keyword().trim(),
      status: this.status(),
    });
  }

  createProject(input: Parameters<ProjectListStore['create']>[0]): void {
    this.store.create(input, () => this.dialogOpen.set(false));
  }

  openMembersDialog(project: ProjectSummary): void {
    this.selectedProject.set(project);
    this.membersDialogOpen.set(true);
    this.loadMembers(project.id);
    if (this.users().length === 0) {
      this.userApi.list({ page: 1, pageSize: 200 }).subscribe({
        next: (result) => this.users.set(result.items),
      });
    }
  }

  closeMembersDialog(): void {
    this.membersDialogOpen.set(false);
    this.selectedProject.set(null);
    this.members.set([]);
  }

  addMember(input: { userId: string; roleCode?: string; isOwner?: boolean }): void {
    const project = this.selectedProject();
    if (!project) {
      return;
    }
    this.membersBusy.set(true);
    this.projectApi.addMember(project.id, input).subscribe({
      next: () => {
        this.membersBusy.set(false);
        this.loadMembers(project.id);
      },
      error: () => {
        this.membersBusy.set(false);
      },
    });
  }

  removeMember(member: ProjectMemberEntity): void {
    const project = this.selectedProject();
    if (!project) {
      return;
    }
    this.membersBusy.set(true);
    this.projectApi.removeMember(project.id, member.id).subscribe({
      next: () => {
        this.membersBusy.set(false);
        this.loadMembers(project.id);
      },
      error: () => {
        this.membersBusy.set(false);
      },
    });
  }

  private loadMembers(projectId: string): void {
    this.membersLoading.set(true);
    this.projectApi.listMembers(projectId).subscribe({
      next: (items) => {
        this.members.set(items);
        this.membersLoading.set(false);
      },
      error: () => {
        this.membersLoading.set(false);
      },
    });
  }
}
