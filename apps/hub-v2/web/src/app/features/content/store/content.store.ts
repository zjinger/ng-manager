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

@Injectable()
export class ContentStore {
  private readonly api = inject(ContentApiService);
  private readonly projectContext = inject(ProjectContextStore);

  private readonly tabState = signal<ContentTab>('announcements');
  private readonly queryState = signal<ContentQuery>({ ...DEFAULT_QUERY });
  private readonly loadingState = signal(false);
  private readonly busyState = signal(false);
  private readonly resultState = signal<
    PageResult<AnnouncementEntity | DocumentEntity | ReleaseEntity> | null
  >(null);

  readonly activeTab = computed(() => this.tabState());
  readonly query = computed(() => this.queryState());
  readonly loading = computed(() => this.loadingState());
  readonly busy = computed(() => this.busyState());
  readonly result = computed(() => this.resultState());
  readonly items = computed(
    () =>
      (this.resultState()?.items ??
        []) as Array<AnnouncementEntity | DocumentEntity | ReleaseEntity>,
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

  load(): void {
    this.loadingState.set(true);

    const query = this.queryState();
    const handleNext = (
      result: PageResult<AnnouncementEntity | DocumentEntity | ReleaseEntity>,
    ) => {
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

  createAnnouncement(input: CreateAnnouncementInput, done?: () => void): void {
    this.busyState.set(true);
    this.api.createAnnouncement(input).subscribe({
      next: () => {
        this.busyState.set(false);
        done?.();
        this.setTab('announcements');
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  createDocument(input: CreateDocumentInput, done?: () => void): void {
    this.busyState.set(true);
    this.api.createDocument(input).subscribe({
      next: () => {
        this.busyState.set(false);
        done?.();
        this.setTab('documents');
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  createRelease(input: CreateReleaseInput, done?: () => void): void {
    this.busyState.set(true);
    this.api.createRelease(input).subscribe({
      next: () => {
        this.busyState.set(false);
        done?.();
        this.setTab('releases');
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  updateAnnouncement(announcementId: string, input: UpdateAnnouncementInput, done?: () => void): void {
    this.busyState.set(true);
    this.api.updateAnnouncement(announcementId, input).subscribe({
      next: () => {
        this.busyState.set(false);
        done?.();
        this.load();
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  publishAnnouncement(announcementId: string): void {
    this.busyState.set(true);
    this.api.publishAnnouncement(announcementId).subscribe({
      next: () => {
        this.busyState.set(false);
        this.load();
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  updateDocument(documentId: string, input: UpdateDocumentInput, done?: () => void): void {
    this.busyState.set(true);
    this.api.updateDocument(documentId, input).subscribe({
      next: () => {
        this.busyState.set(false);
        done?.();
        this.load();
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  publishDocument(documentId: string): void {
    this.busyState.set(true);
    this.api.publishDocument(documentId).subscribe({
      next: () => {
        this.busyState.set(false);
        this.load();
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  updateRelease(releaseId: string, input: UpdateReleaseInput, done?: () => void): void {
    this.busyState.set(true);
    this.api.updateRelease(releaseId, input).subscribe({
      next: () => {
        this.busyState.set(false);
        done?.();
        this.load();
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }

  publishRelease(releaseId: string): void {
    this.busyState.set(true);
    this.api.publishRelease(releaseId).subscribe({
      next: () => {
        this.busyState.set(false);
        this.load();
      },
      error: () => {
        this.busyState.set(false);
      },
    });
  }
}
