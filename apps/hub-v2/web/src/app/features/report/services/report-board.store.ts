import { computed, effect, inject, Injectable, signal } from '@angular/core';

import { AuthStore } from '@core/auth';
import type { ReportBlock, ReportBoardItem } from '../models/report.model';

const REPORT_BOARD_STORAGE_PREFIX = 'hub-v2:report-board:v2';

type LegacyReportBoardItem = Omit<ReportBoardItem, 'blocks'> & {
  blocks?: ReportBlock[];
  block?: ReportBlock;
};

@Injectable({ providedIn: 'root' })
export class ReportBoardStore {
  private readonly authStore = inject(AuthStore);

  private readonly boardItemsState = signal<ReportBoardItem[]>([]);
  private readonly failedTemplateIdsState = signal<string[]>([]);
  private readonly hydratedStorageKeyState = signal<string | null>(null);

  private readonly storageKey = computed(() => {
    const user = this.authStore.currentUser();
    const actor = (user?.userId || user?.id || 'anonymous').trim() || 'anonymous';
    return `${REPORT_BOARD_STORAGE_PREFIX}:${actor}`;
  });

  readonly boardItems = computed(() => this.boardItemsState());
  readonly failedTemplateIds = computed(() => this.failedTemplateIdsState());

  constructor() {
    effect(
      () => {
        const key = this.storageKey();
        this.boardItemsState.set(this.readBoardItems(key));
        this.failedTemplateIdsState.set([]);
        this.hydratedStorageKeyState.set(key);
      },
      { allowSignalWrites: true },
    );

    effect(() => {
      const key = this.storageKey();
      if (this.hydratedStorageKeyState() !== key) {
        return;
      }
      this.writeBoardItems(key, this.boardItemsState());
    });
  }

  upsertBoardItem(next: ReportBoardItem): void {
    const normalizedNext = this.normalizeBoardItem(next);
    this.boardItemsState.update((items) => {
      const index = items.findIndex((item) => item.id === normalizedNext.id);
      if (index < 0) {
        return [normalizedNext, ...items];
      }
      const updated = [...items];
      updated[index] = normalizedNext;
      return updated;
    });
  }

  clearBoard(): void {
    this.boardItemsState.set([]);
  }

  removeBoardItem(id: string): void {
    this.boardItemsState.update((items) => items.filter((item) => item.id !== id));
  }

  toggleBoardItemLayout(id: string): void {
    this.boardItemsState.update((items) =>
      items.map((item) =>
        item.id === id ? { ...item, layoutSize: item.layoutSize === 'compact' ? 'wide' : 'compact' } : item,
      ),
    );
  }

  moveBoardItem(sourceId: string, targetId: string): void {
    if (!sourceId || !targetId || sourceId === targetId) {
      return;
    }
    this.boardItemsState.update((items) => {
      const sourceIndex = items.findIndex((item) => item.id === sourceId);
      const targetIndex = items.findIndex((item) => item.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) {
        return items;
      }

      const next = [...items];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  setFailedTemplateIds(ids: string[]): void {
    const uniqueIds = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    this.failedTemplateIdsState.set(uniqueIds);
  }

  removeFailedTemplateId(id: string): void {
    this.failedTemplateIdsState.update((items) => items.filter((item) => item !== id));
  }

  private readBoardItems(key: string): ReportBoardItem[] {
    if (typeof localStorage === 'undefined') {
      return [];
    }
    const raw = localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.filter((item) => this.isBoardItem(item)).map((item) => this.normalizeBoardItem(item));
    } catch {
      return [];
    }
  }

  private writeBoardItems(key: string, items: ReportBoardItem[]): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(key, JSON.stringify(items));
  }

  private isBoardItem(value: unknown): value is LegacyReportBoardItem {
    if (!value || typeof value !== 'object') {
      return false;
    }
    const item = value as Partial<LegacyReportBoardItem>;
    const hasBlocks = Array.isArray(item.blocks) && item.blocks.some((block) => !!block && typeof block === 'object');
    const hasLegacyBlock = !!item.block && typeof item.block === 'object' && typeof item.block.type === 'string';
    return (
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.naturalQuery === 'string' &&
      typeof item.sql === 'string' &&
      Array.isArray(item.params) &&
      (hasBlocks || hasLegacyBlock)
    );
  }

  private normalizeBoardItem(next: ReportBoardItem | LegacyReportBoardItem): ReportBoardItem {
    const legacy = next as LegacyReportBoardItem;
    const sourceBlocks = Array.isArray(legacy.blocks) ? legacy.blocks : legacy.block ? [legacy.block] : [];
    const normalizedBlocks = sourceBlocks
      .filter((block): block is ReportBlock => !!block && typeof block === 'object')
      .map((block, index) => ({
        ...block,
        description: block.description || (index === 0 ? next.naturalQuery : undefined),
      }));
    const blocks: ReportBlock[] =
      normalizedBlocks.length > 0 ? normalizedBlocks : [{ type: 'empty' as const, title: next.title }];
    const layoutSize =
      next.layoutSize === 'compact' || next.layoutSize === 'wide' ? next.layoutSize : this.defaultLayoutSize(blocks);
    return {
      ...next,
      blocks,
      layoutSize,
    };
  }

  private defaultLayoutSize(blocks: ReportBlock[]): 'compact' | 'wide' {
    if (blocks.length === 1 && blocks[0].type === 'distribution_chart') {
      return 'compact';
    }
    return 'wide';
  }
}
