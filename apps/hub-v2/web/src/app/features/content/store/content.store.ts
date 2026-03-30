import { computed, inject, Injectable, signal } from '@angular/core';

import { ProjectContextStore } from '@core/state';
import type { PageResult } from '@core/types';
import type {
  AnnouncementEntity,
  ContentQuery,
  ContentTab,
  CreateAnnouncementInput,
  CreateDocumentInput,
  CreateReleaseInput,
  DocumentEntity,
  ReleaseEntity,
  UpdateAnnouncementInput,
  UpdateDocumentInput,
  UpdateReleaseInput,
} from '../models/content.model';
import { ContentApiService } from '../services/content-api.service';

const DEFAULT_QUERY: ContentQuery = {
  page: 1,
  pageSize: 20,
  keyword: '',
  status: '',
  projectId: '',
};

type ContentEntity = AnnouncementEntity | DocumentEntity | ReleaseEntity;

@Injectable()
export class ContentStore {
  private readonly api = inject(ContentApiService);
  private readonly projectContext = inject(ProjectContextStore);

  private readonly tabState = signal<ContentTab>('announcements');
  private readonly queryState = signal<ContentQuery>({ ...DEFAULT_QUERY });
  private readonly loadingState = signal(false);
  private readonly busyState = signal(false);
  private readonly resultState = signal<
    PageResult<ContentEntity> | null
  >(null);
  private lastLoadKey: string | null = null;

  readonly activeTab = computed(() => this.tabState());
  readonly query = computed(() => this.queryState());
  readonly loading = computed(() => this.loadingState());
  readonly busy = computed(() => this.busyState());
  readonly result = computed(() => this.resultState());
  readonly items = computed(
    () => (this.resultState()?.items ?? []) as ContentEntity[],
  );
  readonly total = computed(() => this.resultState()?.total ?? 0);

  initialize(): void {
    const projectId = this.projectContext.currentProjectId() ?? '';
    this.queryState.update((query) => ({ ...query, projectId }));
    this.load();
  }

  refreshForProject(projectId: string | null): void {
    this.queryState.update((query) => ({
      ...query,
      projectId: projectId ?? '',
      page: 1,
    }));
    this.load();
  }

  setTab(tab: ContentTab): void {
    if (tab === this.tabState()) {
      return;
    }
    this.tabState.set(tab);
    this.load();
  }

  updateQuery(patch: Partial<ContentQuery>): void {
    this.queryState.update((query) => ({
      ...query,
      ...patch,
      page: patch.page ?? 1,
    }));
    this.load();
  }

  load(force = false): void {
    const query = this.queryState();
    const loadKey = `${this.tabState()}::${JSON.stringify(query)}`;
    if (!force && this.lastLoadKey === loadKey) {
      return;
    }
    this.lastLoadKey = loadKey;

    this.loadingState.set(true);

    const handleNext = (result: PageResult<ContentEntity>) => {
      this.resultState.set(result);
      this.loadingState.set(false);
    };
    const handleError = () => {
      this.resultState.set({ items: [], page: 1, pageSize: query.pageSize, total: 0 });
      this.loadingState.set(false);
    };

    switch (this.tabState()) {
      case 'announcements':
        this.api.listAnnouncements(query).subscribe({
          next: handleNext,
          error: handleError,
        });
        break;
      case 'documents':
        this.api.listDocuments(query).subscribe({
          next: handleNext,
          error: handleError,
        });
        break;
      case 'releases':
        this.api.listReleases(query).subscribe({
          next: handleNext,
          error: handleError,
        });
        break;
    }
  }

  createAnnouncement(input: CreateAnnouncementInput, done?: (entity: AnnouncementEntity) => void): void {
    this.busyState.set(true);
    this.api.createAnnouncement(input).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        if (this.tabState() !== 'announcements') {
          this.tabState.set('announcements');
        }
        this.load(true);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  createDocument(input: CreateDocumentInput, done?: (entity: DocumentEntity) => void): void {
    this.busyState.set(true);
    this.api.createDocument(input).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        if (this.tabState() !== 'documents') {
          this.tabState.set('documents');
        }
        this.load(true);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  createRelease(input: CreateReleaseInput, done?: (entity: ReleaseEntity) => void): void {
    this.busyState.set(true);
    this.api.createRelease(input).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        if (this.tabState() !== 'releases') {
          this.tabState.set('releases');
        }
        this.load(true);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  updateAnnouncement(
    announcementId: string,
    input: UpdateAnnouncementInput,
    done?: (entity: AnnouncementEntity) => void
  ): void {
    this.busyState.set(true);
    this.api.updateAnnouncement(announcementId, input).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        this.patchOrRefresh('announcements', entity);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  publishAnnouncement(announcementId: string, done?: (entity: AnnouncementEntity) => void): void {
    this.busyState.set(true);
    this.api.publishAnnouncement(announcementId).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        this.patchOrRefresh('announcements', entity);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  archiveAnnouncement(announcementId: string, done?: (entity: AnnouncementEntity) => void): void {
    this.busyState.set(true);
    this.api.archiveAnnouncement(announcementId).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        this.patchOrRefresh('announcements', entity);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  updateDocument(
    documentId: string,
    input: UpdateDocumentInput,
    done?: (entity: DocumentEntity) => void
  ): void {
    this.busyState.set(true);
    this.api.updateDocument(documentId, input).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        this.patchOrRefresh('documents', entity);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  publishDocument(documentId: string, done?: (entity: DocumentEntity) => void): void {
    this.busyState.set(true);
    this.api.publishDocument(documentId).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        this.patchOrRefresh('documents', entity);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  archiveDocument(documentId: string, done?: (entity: DocumentEntity) => void): void {
    this.busyState.set(true);
    this.api.archiveDocument(documentId).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        this.patchOrRefresh('documents', entity);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  updateRelease(
    releaseId: string,
    input: UpdateReleaseInput,
    done?: (entity: ReleaseEntity) => void
  ): void {
    this.busyState.set(true);
    this.api.updateRelease(releaseId, input).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        this.patchOrRefresh('releases', entity);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  publishRelease(releaseId: string, done?: (entity: ReleaseEntity) => void): void {
    this.busyState.set(true);
    this.api.publishRelease(releaseId).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        this.patchOrRefresh('releases', entity);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  archiveRelease(releaseId: string, done?: (entity: ReleaseEntity) => void): void {
    this.busyState.set(true);
    this.api.archiveRelease(releaseId).subscribe({
      next: (entity) => {
        this.busyState.set(false);
        done?.(entity);
        this.patchOrRefresh('releases', entity);
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  private patchOrRefresh(tab: ContentTab, entity: ContentEntity): void {
    const result = this.resultState();
    if (!result) {
      this.load(true);
      return;
    }

    if (this.tabState() !== tab) {
      this.load(true);
      return;
    }

    const query = this.queryState();
    const hasComplexFilter = !!query.status?.trim() || !!query.keyword?.trim();
    if (hasComplexFilter) {
      this.load(true);
      return;
    }

    const index = result.items.findIndex((item) => item.id === entity.id);
    if (index < 0) {
      return;
    }

    const items = [...result.items];
    items[index] = entity;
    this.resultState.set({
      ...result,
      items,
    });
  }
}
