import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { ProjectContextStore } from '../../../core/state/project-context.store';
import type { SearchEntityType, SearchItem } from '../models/search.model';
import { SearchApiService } from '../services/search-api.service';

export type SearchFilterType = 'all' | SearchEntityType;

type SearchTypeOption = {
  value: SearchFilterType;
  label: string;
};

type SearchTypeCountMap = Record<SearchFilterType, number>;

type SearchGroupedEntry = {
  index: number;
  item: SearchItem;
};

type SearchGroupedSection = {
  type: SearchEntityType;
  label: string;
  entries: SearchGroupedEntry[];
};

@Injectable({ providedIn: 'root' })
export class GlobalSearchStore {
  private readonly searchApi = inject(SearchApiService);
  private readonly router = inject(Router);
  private readonly projectContext = inject(ProjectContextStore);
  readonly typeOptions: ReadonlyArray<SearchTypeOption> = [
    { value: 'all', label: '全部' },
    { value: 'issue', label: '测试单' },
    { value: 'rd', label: '研发项' },
    { value: 'document', label: '文档' },
    { value: 'release', label: '发布' },
  ];
  private readonly typeOrder: ReadonlyArray<SearchEntityType> = ['issue', 'rd', 'document', 'release'];

  readonly open = signal(false);
  readonly keyword = signal('');
  readonly loading = signal(false);
  readonly items = signal<SearchItem[]>([]);
  readonly activeType = signal<SearchFilterType>('all');
  readonly activeIndex = signal(0);
  readonly error = signal<string | null>(null);
  readonly typeCounts = computed<SearchTypeCountMap>(() => {
    const counts: SearchTypeCountMap = {
      all: 0,
      issue: 0,
      rd: 0,
      document: 0,
      release: 0,
    };

    for (const item of this.items()) {
      counts[item.type] += 1;
      counts.all += 1;
    }
    return counts;
  });

  readonly groupedEntries = computed<SearchGroupedSection[]>(() => {
    const groupedItems: Record<SearchEntityType, SearchItem[]> = {
      issue: [],
      rd: [],
      document: [],
      release: [],
    };
    const activeType = this.activeType();

    for (const item of this.items()) {
      if (activeType !== 'all' && item.type !== activeType) {
        continue;
      }
      if (groupedItems[item.type]) {
        groupedItems[item.type].push(item);
      }
    }

    let nextIndex = 0;
    return this.typeOrder
      .filter((type) => groupedItems[type].length > 0)
      .map((type) => {
        const entries = groupedItems[type].map((item) => {
          const currentIndex = nextIndex;
          nextIndex += 1;
          return {
            index: currentIndex,
            item,
          };
        });
        return {
          type,
          label: this.getTypeLabel(type),
          entries,
        };
      });
  });

  readonly orderedItems = computed(() => this.groupedEntries().flatMap((section) => section.entries.map((entry) => entry.item)));

  readonly activeItem = computed(() => {
    const list = this.orderedItems();
    if (list.length === 0) {
      return null;
    }
    const index = Math.max(0, Math.min(this.activeIndex(), list.length - 1));
    return list[index] ?? null;
  });

  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  private currentSearchSub: Subscription | null = null;

  openPanel(seedKeyword = ''): void {
    this.open.set(true);
    if (seedKeyword.trim()) {
      this.setKeyword(seedKeyword);
    }
  }

  closePanel(): void {
    this.open.set(false);
    this.loading.set(false);
    this.error.set(null);
    this.activeType.set('all');
    this.activeIndex.set(0);
    this.clearScheduledSearch();
    this.currentSearchSub?.unsubscribe();
    this.currentSearchSub = null;
  }

  setKeyword(value: string): void {
    this.keyword.set(value);
    this.error.set(null);
    this.activeIndex.set(0);

    const normalized = value.trim();
    if (normalized.length < 2) {
      this.clearScheduledSearch();
      this.loading.set(false);
      this.items.set([]);
      return;
    }

    this.scheduleSearch(normalized);
  }

  setActiveType(type: SearchFilterType): void {
    if (this.activeType() === type) {
      return;
    }
    this.activeType.set(type);
    this.activeIndex.set(0);
    this.error.set(null);
  }

  moveActive(delta: number): void {
    const list = this.orderedItems();
    if (list.length === 0) {
      this.activeIndex.set(0);
      return;
    }
    const next = (this.activeIndex() + delta + list.length) % list.length;
    this.activeIndex.set(next);
  }

  openCurrentItem(): void {
    const item = this.activeItem();
    if (!item) {
      return;
    }
    this.openItem(item);
  }

  openItem(item: SearchItem): void {
    if (item.projectId?.trim()) {
      this.projectContext.setCurrentProjectId(item.projectId.trim());
    }
    this.closePanel();
    void this.router.navigateByUrl(item.url);
  }

  private scheduleSearch(keyword: string): void {
    this.clearScheduledSearch();
    this.searchTimer = setTimeout(() => {
      this.runSearch(keyword);
    }, 250);
  }

  private runSearch(keyword: string): void {
    const currentKeyword = this.keyword().trim();
    if (keyword !== currentKeyword || currentKeyword.length < 2) {
      return;
    }

    this.currentSearchSub?.unsubscribe();
    this.loading.set(true);

    this.currentSearchSub = this.searchApi
      .search({
        q: keyword,
        limit: 20,
      })
      .subscribe({
        next: (res) => {
          if (this.keyword().trim() !== keyword) {
            return;
          }
          this.items.set(res.items);
          this.activeIndex.set(0);
          this.error.set(null);
          this.loading.set(false);
        },
        error: () => {
          if (this.keyword().trim() !== keyword) {
            return;
          }
          this.items.set([]);
          this.error.set('搜索失败，请稍后重试');
          this.loading.set(false);
        },
      });
  }

  private clearScheduledSearch(): void {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
      this.searchTimer = null;
    }
  }

  private getTypeLabel(type: SearchEntityType): string {
    return (
      {
        issue: '测试单',
        rd: '研发项',
        document: '文档',
        release: '发布',
      }[type] || type
    );
  }
}
