import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzSelectModule } from 'ng-zorro-antd/select';

import { ProjectContextStore } from '../../../../core/state/project-context.store';
import { FilterBarComponent } from '../../../../shared/ui/filter-bar/filter-bar.component';
import { ListStateComponent } from '../../../../shared/ui/list-state/list-state.component';
import { PageHeaderComponent } from '../../../../shared/ui/page-header/page-header.component';
import { PageToolbarComponent } from '../../../../shared/ui/page-toolbar/page-toolbar.component';
import { SearchBoxComponent } from '../../../../shared/ui/search-box/search-box.component';
import { AnnouncementListComponent } from '../../components/announcement-list/announcement-list.component';
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
import { ContentStore } from '../../store/content.store';

@Component({
  selector: 'app-content-management-page',
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
    ContentTabsComponent,
    AnnouncementListComponent,
    DocumentListComponent,
    ReleaseListComponent,
    AnnouncementCreateDialogComponent,
    DocumentCreateDialogComponent,
    ReleaseCreateDialogComponent,
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
        >
          <nz-option nzLabel="全部状态" nzValue=""></nz-option>
          <nz-option nzLabel="草稿" nzValue="draft"></nz-option>
          <nz-option nzLabel="已发布" nzValue="published"></nz-option>
          <nz-option nzLabel="已归档" nzValue="archived"></nz-option>
        </nz-select>

        <button nz-button class="toolbar-filter-btn" (click)="applyFilters()">筛选</button>

        <button nz-button nzType="primary" class="toolbar-create-btn" (click)="openCreateDialog()">
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
            (edit)="openAnnouncementEdit($event)"
            (publish)="publishAnnouncement($event)"
          />
        }
        @case ('documents') {
          <app-document-list
            [items]="documentItems()"
            (edit)="openDocumentEdit($event)"
            (publish)="publishDocument($event)"
          />
        }
        @case ('releases') {
          <app-release-list
            [items]="releaseItems()"
            (edit)="openReleaseEdit($event)"
            (publish)="publishRelease($event)"
          />
        }
      }
    </app-list-state>

    <app-announcement-create-dialog
      [open]="announcementDialogOpen()"
      [busy]="store.busy() && store.activeTab() === 'announcements'"
      [value]="editingAnnouncement()"
      (cancel)="closeAnnouncementDialog()"
      (create)="createAnnouncement($event)"
    />

    <app-document-create-dialog
      [open]="documentDialogOpen()"
      [busy]="store.busy() && store.activeTab() === 'documents'"
      [value]="editingDocument()"
      (cancel)="closeDocumentDialog()"
      (create)="createDocument($event)"
    />

    <app-release-create-dialog
      [open]="releaseDialogOpen()"
      [busy]="store.busy() && store.activeTab() === 'releases'"
      [value]="editingRelease()"
      (cancel)="closeReleaseDialog()"
      (create)="createRelease($event)"
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
      .toolbar-search {
        min-width: min(320px, 100%);
        flex: 1 1 320px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContentManagementPageComponent {
  readonly store = inject(ContentStore);
  private readonly projectContext = inject(ProjectContextStore);

  readonly keyword = signal('');
  readonly status = signal<ContentStatus>('');
  readonly announcementDialogOpen = signal(false);
  readonly documentDialogOpen = signal(false);
  readonly releaseDialogOpen = signal(false);
  readonly editingAnnouncement = signal<AnnouncementEntity | null>(null);
  readonly editingDocument = signal<DocumentEntity | null>(null);
  readonly editingRelease = signal<ReleaseEntity | null>(null);

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

  constructor() {
    this.store.initialize();

    effect(() => {
      this.store.refreshForProject(this.projectContext.currentProjectId());
    });
  }

  switchTab(tab: ContentTab): void {
    this.store.setTab(tab);
  }

  applyFilters(): void {
    this.store.updateQuery({
      keyword: this.keyword().trim(),
      status: this.status(),
    });
  }

  openCreateDialog(): void {
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

  createAnnouncement(input: CreateAnnouncementInput): void {
    const editing = this.editingAnnouncement();
    if (editing) {
      this.store.updateAnnouncement(
        editing.id,
        {
          ...input,
          projectId: this.projectContext.currentProjectId(),
        },
        () => this.closeAnnouncementDialog(),
      );
      return;
    }

    this.store.createAnnouncement(
      {
        ...input,
        projectId: this.projectContext.currentProjectId(),
      },
      () => this.closeAnnouncementDialog(),
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
        () => this.closeDocumentDialog(),
      );
      return;
    }

    this.store.createDocument(
      {
        ...input,
        projectId: this.projectContext.currentProjectId(),
      },
      () => this.closeDocumentDialog(),
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
        () => this.closeReleaseDialog(),
      );
      return;
    }

    this.store.createRelease(
      {
        ...input,
        projectId: this.projectContext.currentProjectId(),
      },
      () => this.closeReleaseDialog(),
    );
  }

  publishAnnouncement(item: AnnouncementEntity): void {
    this.store.publishAnnouncement(item.id);
  }

  publishDocument(item: DocumentEntity): void {
    this.store.publishDocument(item.id);
  }

  publishRelease(item: ReleaseEntity): void {
    this.store.publishRelease(item.id);
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
}
