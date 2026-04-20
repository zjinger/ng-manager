import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { map } from 'rxjs';

import { AuthStore } from '@core/auth';
import { ProjectContextStore } from '@core/state';
import { FilterBarComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';

import { NzIconModule } from 'ng-zorro-antd/icon';
import { AnnouncementListComponent } from '../../components/announcement-list/announcement-list.component';
import { ContentDetailDrawerComponent } from '../../components/content-detail-drawer/content-detail-drawer.component';
import { ContentTabsComponent } from '../../components/content-tabs/content-tabs.component';
import { DocumentListComponent } from '../../components/document-list/document-list.component';
import { ReleaseListComponent } from '../../components/release-list/release-list.component';
import { AnnouncementCreateDialogComponent } from '../../dialogs/announcement-create-dialog/announcement-create-dialog.component';
import { DocumentCreateDialogComponent } from '../../dialogs/document-create-dialog/document-create-dialog.component';
import { ReleaseCreateDialogComponent } from '../../dialogs/release-create-dialog/release-create-dialog.component';
import type {
  AnnouncementEntity,
  ContentStatus,
  ContentTab,
  CreateAnnouncementInput,
  CreateDocumentInput,
  CreateReleaseInput,
  DocumentEntity,
  ReleaseEntity,
} from '../../models/content.model';
import type { ProjectMemberEntity } from '../../../projects/models/project.model';
import { ProjectApiService } from '../../../projects/services/project-api.service';
import { ContentStore } from '../../store/content.store';

@Component({
  selector: 'app-content-management-page',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzSelectModule,
    NzIconModule,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
    FilterBarComponent,
    ListStateComponent,
    ContentTabsComponent,
    AnnouncementListComponent,
    DocumentListComponent,
    ReleaseListComponent,
    AnnouncementCreateDialogComponent,
    DocumentCreateDialogComponent,
    ReleaseCreateDialogComponent,
    ContentDetailDrawerComponent,
  ],
  providers: [ContentStore],
  template: `
    <app-page-header title="内容管理" [subtitle]="subtitle()" />

    <app-page-toolbar>
      <app-content-tabs toolbar-primary [value]="store.activeTab()" (valueChange)="switchTab($event)" />

      <app-filter-bar toolbar-filters class="content-toolbar__main">
        <nz-select
          nzPlaceHolder="全部状态"
          class="toolbar-select"
          [ngModel]="status()"
          (ngModelChange)="status.set($event)"
          style="width: 100px;"
        >
          <nz-option nzLabel="全部状态" nzValue=""></nz-option>
          <nz-option nzLabel="草稿" nzValue="draft"></nz-option>
          <nz-option nzLabel="已发布" nzValue="published"></nz-option>
          <nz-option nzLabel="已归档" nzValue="archived"></nz-option>
        </nz-select>

        <button nz-button class="toolbar-filter-btn" (click)="applyFilters()">筛选</button>

        <button
          nz-button
          nzType="primary"
          class="toolbar-create-btn"
          [disabled]="!canCreateCurrentTab()"
          (click)="openCreateDialog()"
        >
          <nz-icon nzType="plus" nzTheme="outline" />
          {{ createLabel() }}
        </button>
      </app-filter-bar>

      <app-search-box
        toolbar-search
        class="toolbar-search"
        placeholder="搜索标题、摘要、版本或说明"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="applyFilters()"
      />
    </app-page-toolbar>

    <app-list-state
      [loading]="store.loading()"
      [empty]="store.items().length === 0"
      loadingText="正在加载内容列表…"
      [emptyTitle]="emptyTitle()"
      [emptyDescription]="emptyDescription()"
    >
      @switch (store.activeTab()) {
        @case ('announcements') {
          <app-announcement-list
            [items]="announcementItems()"
            [selectedId]="selectedAnnouncementId()"
            (select)="openAnnouncementDetail($event)"
          />
        }
        @case ('documents') {
          <app-document-list
            [items]="documentItems()"
            [selectedId]="selectedDocumentId()"
            [projectKey]="projectContext.currentProjectKey() || ''"
            (select)="openDocumentDetail($event)"

          />
        }
        @case ('releases') {
          <app-release-list
            [items]="releaseItems()"
            [selectedId]="selectedReleaseId()"
            (select)="openReleaseDetail($event)"
          />
        }
      }
    </app-list-state>

    <app-announcement-create-dialog
      [open]="announcementDialogOpen()"
      [busy]="store.busy() && store.activeTab() === 'announcements'"
      [value]="editingAnnouncement()"
      [projectName]="projectContext.currentProject()?.name || ''"
      (cancel)="closeAnnouncementDialog()"
      (create)="createAnnouncement($event)"
    />

    <app-document-create-dialog
      [open]="documentDialogOpen()"
      [busy]="store.busy() && store.activeTab() === 'documents'"
      [value]="editingDocument()"
      [projectName]="projectContext.currentProject()?.name || ''"
      (cancel)="closeDocumentDialog()"
      (create)="createDocument($event)"
    />

    <app-release-create-dialog
      [open]="releaseDialogOpen()"
      [busy]="store.busy() && store.activeTab() === 'releases'"
      [value]="editingRelease()"
      [projectName]="projectContext.currentProject()?.name || ''"
      (cancel)="closeReleaseDialog()"
      (create)="createRelease($event)"
    />

    <app-content-detail-drawer
      [open]="detailDrawerOpen()"
      [tab]="detailTab()"
      [announcement]="detailAnnouncement()"
      [document]="detailDocument()"
      [release]="detailRelease()"
      [projectName]="projectContext.currentProject()?.name || ''"
      [projectKey]="projectContext.currentProjectKey() || ''"
      [canEdit]="canEditCurrentDetail()"
      [canPublish]="canPublishCurrentDetail()"
      [canArchive]="canArchiveCurrentDetail()"
      (edit)="editCurrentDetail()"
      (publish)="publishCurrentDetail()"
      (archive)="archiveCurrentDetail()"
      (close)="closeDetailDrawer(true)"
    />
  `,
  styles: [
    `
      .content-toolbar__main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }
     
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentManagementPageComponent {
  readonly store = inject(ContentStore);
  readonly projectContext = inject(ProjectContextStore);
  private readonly projectApi = inject(ProjectApiService);
  private readonly authStore = inject(AuthStore);
  private readonly modal = inject(NzModalService);
  private readonly message = inject(NzMessageService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly keyword = signal('');
  readonly status = signal<ContentStatus>('');
  readonly announcementDialogOpen = signal(false);
  readonly documentDialogOpen = signal(false);
  readonly releaseDialogOpen = signal(false);
  readonly editingAnnouncement = signal<AnnouncementEntity | null>(null);
  readonly editingDocument = signal<DocumentEntity | null>(null);
  readonly editingRelease = signal<ReleaseEntity | null>(null);
  readonly detailDrawerOpen = signal(false);
  readonly detailTab = signal<ContentTab | null>(null);
  readonly detailAnnouncement = signal<AnnouncementEntity | null>(null);
  readonly detailDocument = signal<DocumentEntity | null>(null);
  readonly detailRelease = signal<ReleaseEntity | null>(null);
  readonly projectMembers = signal<ProjectMemberEntity[]>([]);
  private readonly handledRouteDetailKey = signal<string | null>(null);
  private readonly detailQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('detail'))), {
    initialValue: this.route.snapshot.queryParamMap.get('detail'),
  });
  private readonly tabQuery = toSignal(this.route.queryParamMap.pipe(map((params) => params.get('tab'))), {
    initialValue: this.route.snapshot.queryParamMap.get('tab'),
  });

  readonly subtitle = computed(() => {
    const projectName = this.projectContext.currentProject()?.name ?? '当前项目';
    const tabLabel =
      {
        announcements: '公告',
        documents: '文档',
        releases: '发布',
      }[this.store.activeTab()] ?? '内容';
    return `${projectName} · ${tabLabel} ${this.store.total()} 条`;
  });

  readonly createLabel = computed(
    () =>
    ({
      announcements: '新建公告',
      documents: '新建文档',
      releases: '新建发布',
    }[this.store.activeTab()]),
  );

  readonly emptyTitle = computed(
    () =>
    ({
      announcements: '当前筛选条件下没有公告',
      documents: '当前筛选条件下没有文档',
      releases: '当前筛选条件下没有发布记录',
    }[this.store.activeTab()]),
  );

  readonly emptyDescription = computed(
    () =>
    ({
      announcements: '先创建一条公告或调整筛选条件。',
      documents: '先创建一篇文档或调整筛选条件。',
      releases: '先创建一条发布记录或调整筛选条件。',
    }[this.store.activeTab()]),
  );

  readonly announcementItems = computed(() => this.store.items() as AnnouncementEntity[]);
  readonly documentItems = computed(() => this.store.items() as DocumentEntity[]);
  readonly releaseItems = computed(() => this.store.items() as ReleaseEntity[]);
  readonly selectedAnnouncementId = computed(() => (this.detailTab() === 'announcements' ? this.detailAnnouncement()?.id ?? null : null));
  readonly selectedDocumentId = computed(() => (this.detailTab() === 'documents' ? this.detailDocument()?.id ?? null : null));
  readonly selectedReleaseId = computed(() => (this.detailTab() === 'releases' ? this.detailRelease()?.id ?? null : null));
  readonly currentActorIds = computed(() => {
    const user = this.authStore.currentUser();
    const ids = new Set<string>();
    const id = user?.id?.trim();
    const userId = user?.userId?.trim();
    if (id) {
      ids.add(id);
    }
    if (userId) {
      ids.add(userId);
    }
    return ids;
  });
  readonly isCurrentProjectAdmin = computed(() => {
    const actorIds = this.currentActorIds();
    if (actorIds.size === 0) {
      return false;
    }
    return this.projectMembers().some((member) => actorIds.has(member.userId) && (member.isOwner || member.roleCode === 'project_admin'));
  });
  readonly isCurrentProjectMember = computed(() => {
    const actorIds = this.currentActorIds();
    if (actorIds.size === 0) {
      return false;
    }
    return this.projectMembers().some((member) => actorIds.has(member.userId));
  });
  readonly canCreateCurrentTab = computed(() => {
    if (this.store.activeTab() === 'documents') {
      return this.isCurrentProjectMember();
    }
    return this.isCurrentProjectAdmin();
  });
  readonly canEditCurrentDetail = computed(() => this.canEditByTab(this.detailTab()));
  readonly canPublishCurrentDetail = computed(() => this.canPublishByTab(this.detailTab()));
  readonly canArchiveCurrentDetail = computed(() => this.canArchiveByTab(this.detailTab()));

  constructor() {
    this.store.initialize();

    effect(() => {
      const projectId = this.projectContext.currentProjectId();
      this.store.refreshForProject(projectId);
      this.loadProjectMembers(projectId);
      this.closeDetailDrawer(false);
    });

    effect(() => {
      const detailId = this.normalizeDetailQuery(this.detailQuery());
      if (!detailId) {
        this.handledRouteDetailKey.set(null);
        return;
      }

      const tab = this.normalizeTabQuery(this.tabQuery()) ?? this.store.activeTab();
      const routeKey = `${tab}:${detailId}`;
      if (this.handledRouteDetailKey() === routeKey) {
        return;
      }

      if (this.store.activeTab() !== tab) {
        this.store.setTab(tab);
        return;
      }

      if (this.store.loading()) {
        return;
      }

      if (this.openRouteDetail(tab, detailId)) {
        this.handledRouteDetailKey.set(routeKey);
      }
    });
  }

  switchTab(tab: ContentTab): void {
    this.store.setTab(tab);
    this.closeDetailDrawer(true);
  }

  applyFilters(): void {
    this.store.updateQuery({
      keyword: this.keyword().trim(),
      status: this.status(),
    });
  }

  openCreateDialog(): void {
    if (!this.canCreateCurrentTab()) {
      this.message.warning('当前权限不支持该操作');
      return;
    }
    switch (this.store.activeTab()) {
      case 'announcements':
        this.editingAnnouncement.set(null);
        this.announcementDialogOpen.set(true);
        break;
      case 'documents':
        this.editingDocument.set(null);
        this.documentDialogOpen.set(true);
        break;
      case 'releases':
        this.editingRelease.set(null);
        this.releaseDialogOpen.set(true);
        break;
    }
  }

  openAnnouncementEdit(item: AnnouncementEntity): void {
    this.editingAnnouncement.set(item);
    this.announcementDialogOpen.set(true);
  }

  openDocumentEdit(item: DocumentEntity): void {
    this.editingDocument.set(item);
    this.documentDialogOpen.set(true);
  }

  openReleaseEdit(item: ReleaseEntity): void {
    this.editingRelease.set(item);
    this.releaseDialogOpen.set(true);
  }

  openAnnouncementDetail(item: AnnouncementEntity): void {
    this.detailTab.set('announcements');
    this.detailAnnouncement.set(item);
    this.detailDocument.set(null);
    this.detailRelease.set(null);
    this.detailDrawerOpen.set(true);
  }

  openDocumentDetail(item: DocumentEntity): void {
    this.detailTab.set('documents');
    this.detailAnnouncement.set(null);
    this.detailDocument.set(item);
    this.detailRelease.set(null);
    this.detailDrawerOpen.set(true);
  }

  openReleaseDetail(item: ReleaseEntity): void {
    this.detailTab.set('releases');
    this.detailAnnouncement.set(null);
    this.detailDocument.set(null);
    this.detailRelease.set(item);
    this.detailDrawerOpen.set(true);
  }

  createAnnouncement(input: CreateAnnouncementInput): void {
    const editing = this.editingAnnouncement();
    if (editing) {
      this.store.updateAnnouncement(
        editing.id,
        {
          ...input,
          projectId: this.projectContext.currentProjectId(),
        },
        (entity) => {
          this.closeAnnouncementDialog();
          this.syncAnnouncementDetail(entity);
        },
      );
      return;
    }

    this.store.createAnnouncement(
      {
        ...input,
        projectId: this.projectContext.currentProjectId(),
      },
      (created) => {
        this.closeAnnouncementDialog();
        this.confirmPublishAfterCreate('announcements', created.id);
      },
    );
  }

  createDocument(input: CreateDocumentInput): void {
    const editing = this.editingDocument();
    if (editing) {
      this.store.updateDocument(
        editing.id,
        {
          ...input,
          projectId: this.projectContext.currentProjectId(),
        },
        (entity) => {
          this.closeDocumentDialog();
          this.syncDocumentDetail(entity);
        },
      );
      return;
    }

    this.store.createDocument(
      {
        ...input,
        projectId: this.projectContext.currentProjectId(),
      },
      (created) => {
        this.closeDocumentDialog();
        this.confirmPublishAfterCreate('documents', created.id);
      },
    );
  }

  createRelease(input: CreateReleaseInput): void {
    const editing = this.editingRelease();
    if (editing) {
      this.store.updateRelease(
        editing.id,
        {
          ...input,
          projectId: this.projectContext.currentProjectId(),
        },
        (entity) => {
          this.closeReleaseDialog();
          this.syncReleaseDetail(entity);
        },
      );
      return;
    }

    this.store.createRelease(
      {
        ...input,
        projectId: this.projectContext.currentProjectId(),
      },
      (created) => {
        this.closeReleaseDialog();
        this.confirmPublishAfterCreate('releases', created.id);
      },
    );
  }

  publishAnnouncement(item: AnnouncementEntity): void {
    this.store.publishAnnouncement(item.id, (entity) => this.syncAnnouncementDetail(entity));
  }

  publishDocument(item: DocumentEntity): void {
    this.store.publishDocument(item.id, (entity) => this.syncDocumentDetail(entity));
  }

  publishRelease(item: ReleaseEntity): void {
    this.store.publishRelease(item.id, (entity) => this.syncReleaseDetail(entity));
  }

  closeAnnouncementDialog(): void {
    this.announcementDialogOpen.set(false);
    this.editingAnnouncement.set(null);
  }

  closeDocumentDialog(): void {
    this.documentDialogOpen.set(false);
    this.editingDocument.set(null);
  }

  closeReleaseDialog(): void {
    this.releaseDialogOpen.set(false);
    this.editingRelease.set(null);
  }

  closeDetailDrawer(clearRouteDetailQuery = false): void {
    this.detailDrawerOpen.set(false);
    this.detailTab.set(null);
    this.detailAnnouncement.set(null);
    this.detailDocument.set(null);
    this.detailRelease.set(null);
    if (clearRouteDetailQuery && this.detailQuery()) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { detail: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  editCurrentDetail(): void {
    const tab = this.detailTab();
    if (!this.canEditByTab(tab)) {
      this.message.warning('当前权限不支持该操作');
      return;
    }
    if (tab === 'announcements') {
      const item = this.detailAnnouncement();
      if (item) {
        this.closeDetailDrawer();
        this.openAnnouncementEdit(item);
      }
      return;
    }
    if (tab === 'documents') {
      const item = this.detailDocument();
      if (item) {
        this.closeDetailDrawer();
        this.openDocumentEdit(item);
      }
      return;
    }
    if (tab === 'releases') {
      const item = this.detailRelease();
      if (item) {
        this.closeDetailDrawer();
        this.openReleaseEdit(item);
      }
    }
  }

  publishCurrentDetail(): void {
    const tab = this.detailTab();
    if (!this.canPublishByTab(tab)) {
      this.message.warning('当前权限不支持该操作');
      return;
    }
    if (tab === 'announcements') {
      const item = this.detailAnnouncement();
      if (item) {
        this.publishAnnouncement(item);
      }
      return;
    }
    if (tab === 'documents') {
      const item = this.detailDocument();
      if (item) {
        this.publishDocument(item);
      }
      return;
    }
    if (tab === 'releases') {
      const item = this.detailRelease();
      if (item) {
        this.publishRelease(item);
      }
    }
  }

  archiveCurrentDetail(): void {
    const tab = this.detailTab();
    if (!this.canArchiveByTab(tab)) {
      this.message.warning('当前权限不支持该操作');
      return;
    }
    if (tab === 'announcements') {
      const item = this.detailAnnouncement();
      if (item) {
        this.store.archiveAnnouncement(item.id, (entity) => this.syncAnnouncementDetail(entity));
      }
      return;
    }
    if (tab === 'documents') {
      const item = this.detailDocument();
      if (item) {
        this.store.archiveDocument(item.id, (entity) => this.syncDocumentDetail(entity));
      }
      return;
    }
    if (tab === 'releases') {
      const item = this.detailRelease();
      if (item) {
        this.store.archiveRelease(item.id, (entity) => this.syncReleaseDetail(entity));
      }
    }
  }

  private confirmPublishAfterCreate(
    type: 'announcements' | 'documents' | 'releases',
    entityId: string,
  ): void {
    const title =
      type === 'announcements'
        ? '公告已创建，是否立即发布？'
        : type === 'documents'
          ? '文档已创建，是否立即发布？'
          : '发布记录已创建，是否立即发布？';
    const content =
      type === 'announcements'
        ? '立即发布后，项目成员将可见该公告。'
        : type === 'documents'
          ? '立即发布后，项目成员将可见该文档。'
          : '立即发布后，项目成员将可见该版本发布信息。';

    this.modal.confirm({
      nzTitle: title,
      nzContent: content,
      nzOkText: '立即发布',
      nzCancelText: '暂不发布',
      nzOnOk: () => {
        if (type === 'announcements') {
          this.store.publishAnnouncement(entityId, (entity) => this.syncAnnouncementDetail(entity));
          return;
        }
        if (type === 'documents') {
          this.store.publishDocument(entityId, (entity) => this.syncDocumentDetail(entity));
          return;
        }
        this.store.publishRelease(entityId, (entity) => this.syncReleaseDetail(entity));
      },
    });
  }

  private syncAnnouncementDetail(entity: AnnouncementEntity): void {
    if (this.detailTab() === 'announcements' && this.detailAnnouncement()?.id === entity.id) {
      this.detailAnnouncement.set(entity);
    }
  }

  private syncDocumentDetail(entity: DocumentEntity): void {
    if (this.detailTab() === 'documents' && this.detailDocument()?.id === entity.id) {
      this.detailDocument.set(entity);
    }
  }

  private syncReleaseDetail(entity: ReleaseEntity): void {
    if (this.detailTab() === 'releases' && this.detailRelease()?.id === entity.id) {
      this.detailRelease.set(entity);
    }
  }

  private canEditByTab(tab: ContentTab | null): boolean {
    if (tab === 'announcements' || tab === 'releases') {
      return this.isCurrentProjectAdmin();
    }
    if (tab === 'documents') {
      const item = this.detailDocument();
      return !!item && this.isCurrentProjectMember() && this.isCreatedByCurrentUser(item.createdBy);
    }
    return false;
  }

  private canPublishByTab(tab: ContentTab | null): boolean {
    if (tab === 'announcements') {
      return this.isCurrentProjectAdmin() && this.detailAnnouncement()?.status !== 'published';
    }
    if (tab === 'documents') {
      const item = this.detailDocument();
      return !!item && this.isCurrentProjectMember() && this.isCreatedByCurrentUser(item.createdBy) && item.status !== 'published';
    }
    if (tab === 'releases') {
      return this.isCurrentProjectAdmin() && this.detailRelease()?.status !== 'published';
    }
    return false;
  }

  private canArchiveByTab(tab: ContentTab | null): boolean {
    if (tab === 'announcements') {
      return this.isCurrentProjectAdmin() && this.detailAnnouncement()?.status !== 'archived';
    }
    if (tab === 'documents') {
      const item = this.detailDocument();
      return !!item && this.isCurrentProjectMember() && this.isCreatedByCurrentUser(item.createdBy) && item.status !== 'archived';
    }
    if (tab === 'releases') {
      return this.isCurrentProjectAdmin() && this.detailRelease()?.status !== 'archived';
    }
    return false;
  }

  private isCreatedByCurrentUser(createdBy: string | null): boolean {
    if (!createdBy) {
      return false;
    }
    return this.currentActorIds().has(createdBy.trim());
  }

  private loadProjectMembers(projectId: string | null): void {
    if (!projectId) {
      this.projectMembers.set([]);
      return;
    }
    this.projectApi.listMembers(projectId).subscribe({
      next: (items) => this.projectMembers.set(items),
      error: () => this.projectMembers.set([]),
    });
  }

  private normalizeTabQuery(tab: string | null): ContentTab | null {
    if (tab === 'announcements' || tab === 'documents' || tab === 'releases') {
      return tab;
    }
    return null;
  }

  private normalizeDetailQuery(value: string | null): string | null {
    const normalized = value?.trim() ?? '';
    return normalized || null;
  }

  private openRouteDetail(tab: ContentTab, detailId: string): boolean {
    const item = this.store.items().find((entry) => entry.id === detailId);
    if (!item) {
      return false;
    }

    if (tab === 'announcements') {
      this.openAnnouncementDetail(item as AnnouncementEntity);
      return true;
    }
    if (tab === 'documents') {
      this.openDocumentDetail(item as DocumentEntity);
      return true;
    }
    if (tab === 'releases') {
      this.openReleaseDetail(item as ReleaseEntity);
      return true;
    }
    return false;
  }
}
