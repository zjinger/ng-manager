import { Injectable, computed, signal } from '@angular/core';

import type { ReportBlock } from '../../report/models/report.model';
import type { PublicReportBoardResult, PublicReportPreviewResult, PublicReportProjectItem } from '../models/public-report.model';

@Injectable()
export class PublicReportStore {
  readonly share = signal('');
  readonly query = signal('');
  readonly projects = signal<PublicReportProjectItem[]>([]);
  readonly selectedProjectId = signal<string>('');

  readonly loadingProjects = signal(false);
  readonly loadingPreview = signal(false);
  readonly loadingBoard = signal(false);
  readonly preview = signal<PublicReportPreviewResult | null>(null);
  readonly board = signal<PublicReportBoardResult | null>(null);

  readonly previewBlocks = computed(() => {
    const current = this.preview();
    if (!current) {
      return [] as ReportBlock[];
    }
    const blocks = (current.blocks || []).filter((item): item is ReportBlock => !!item);
    if (blocks.length > 0) {
      return blocks;
    }
    return current.block ? [current.block] : [];
  });

  readonly boardBlocks = computed(() => {
    const current = this.board();
    if (!current) {
      return [];
    }
    return current.items || [];
  });
}
