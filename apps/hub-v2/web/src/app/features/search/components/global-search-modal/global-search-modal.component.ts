import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  computed,
  effect,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzSpinModule } from 'ng-zorro-antd/spin';

import type { SearchItem } from '../../models/search.model';
import type { SearchFilterType } from '../../store/global-search.store';
import { GlobalSearchStore } from '../../store/global-search.store';

type HighlightSegment = {
  text: string;
  matched: boolean;
};

@Component({
  selector: 'app-global-search-modal',
  standalone: true,
  imports: [FormsModule, NzIconModule, NzSpinModule],
  templateUrl: './global-search-modal.component.html',
  styleUrl: './global-search-modal.component.less',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GlobalSearchModalComponent {
  readonly store = inject(GlobalSearchStore);
  readonly keywordTokens = computed(() => this.tokenizeKeyword(this.store.keyword()));

  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

  constructor() {
    effect(() => {
      if (!this.store.open()) {
        return;
      }
      setTimeout(() => {
        this.searchInput?.nativeElement.focus();
        this.searchInput?.nativeElement.select();
      }, 0);
    });
  }

  close(): void {
    this.store.closePanel();
  }

  onKeywordChange(value: string): void {
    this.store.setKeyword(value);
  }

  onTypeChange(type: SearchFilterType): void {
    this.store.setActiveType(type);
  }

  onInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.store.moveActive(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.store.moveActive(-1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.store.openCurrentItem();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  openItem(item: SearchItem): void {
    this.store.openItem(item);
  }

  isActiveItem(item: SearchItem): boolean {
    const active = this.store.activeItem();
    return Boolean(active && active.type === item.type && active.id === item.id);
  }

  getHighlightSegments(text: string): HighlightSegment[] {
    if (!text) {
      return [{ text: '', matched: false }];
    }

    const tokens = this.keywordTokens();
    if (tokens.length === 0) {
      return [{ text, matched: false }];
    }

    const pattern = tokens.map((token) => this.escapeRegExp(token)).join('|');
    if (!pattern) {
      return [{ text, matched: false }];
    }

    const matcher = new RegExp(`(${pattern})`, 'ig');
    const parts = text.split(matcher).filter((part) => part.length > 0);
    if (parts.length === 0) {
      return [{ text, matched: false }];
    }

    const tokenSet = new Set(tokens.map((token) => token.toLowerCase()));
    return parts.map((part) => ({
      text: part,
      matched: tokenSet.has(part.toLowerCase()),
    }));
  }

  formatType(type: SearchItem['type']): string {
    if (type === 'issue') {
      return '测试单';
    }
    if (type === 'rd') {
      return '研发项';
    }
    if (type === 'document') {
      return '文档';
    }
    return '发布';
  }

  formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    const mm = `${date.getMonth() + 1}`.padStart(2, '0');
    const dd = `${date.getDate()}`.padStart(2, '0');
    const hh = `${date.getHours()}`.padStart(2, '0');
    const mi = `${date.getMinutes()}`.padStart(2, '0');
    return `${mm}-${dd} ${hh}:${mi}`;
  }

  private tokenizeKeyword(keyword: string): string[] {
    const normalized = keyword.trim();
    if (!normalized) {
      return [];
    }
    const chunks = normalized
      .split(/\s+/)
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0)
      .sort((a, b) => b.length - a.length);

    return [...new Set(chunks)];
  }

  private escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
