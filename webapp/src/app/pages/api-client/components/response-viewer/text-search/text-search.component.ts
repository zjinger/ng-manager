import {
  Component,
  ElementRef,
  ViewChild,
  computed,
  signal,
  input,
  output,
  OnDestroy,
  effect,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import {
  TextSearchService,
  SearchOptions,
  MatchPosition,
  TextIndex,
  TextSegment,
} from './text-search.service';

@Component({
  selector: 'app-text-search',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzTooltipModule,
  ],
  templateUrl: `./text-search.component.html`,
  styleUrls: ['./text-search.component.less'],
  providers: [TextSearchService],
})
export class TextSearchComponent implements OnDestroy {
  private searchService = inject(TextSearchService);

  @ViewChild('searchInput') searchInputRef!: ElementRef<HTMLInputElement>;

  // 输入：要搜索的容器元素
  searchContainer = input<HTMLElement | null>(null);

  // 输出：搜索状态变化
  searchStateChange = output<{ term: string; totalMatches: number; currentIndex: number }>();

  // 搜索选项
  searchOptions = signal<SearchOptions>({
    term: '',
    regex: false,
    wholeWord: false,
    caseSensitive: false,
  });

  // 搜索状态
  matches = signal<HTMLElement[]>([]);
  currentIndex = signal(0);
  totalMatches = signal(0);

  // 文本索引
  private textIndex = signal<TextIndex | null>(null);

  // 全局匹配位置
  private globalMatches = signal<MatchPosition[]>([]);

  // 全局匹配到对应 span 的映射
  private matchToSpans = signal<Map<number, HTMLElement[]>>(new Map());

  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const container = this.searchContainer();

      if (container) {
        queueMicrotask(() => {
          // 等待 DOM 更新后再执行搜索
          this.performSearch();
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.clearHighlights();
  }

  onTermChange(term: string): void {
    this.updateSearchOption({ term });
    this.onSearchChange();
  }

  /** 切换是否区分大小写 */
  toggleCaseSensitive(): void {
    this.updateSearchOption({ caseSensitive: !this.searchOptions().caseSensitive });
    this.onSearchChange();
  }

  /** 切换是否匹配整个单词 */
  toggleWholeWord(): void {
    this.updateSearchOption({ wholeWord: !this.searchOptions().wholeWord });
    this.onSearchChange();
  }

  /** 切换是否使用正则表达式 */
  toggleRegex(): void {
    this.updateSearchOption({ regex: !this.searchOptions().regex });
    this.onSearchChange();
  }

  /** 搜索内容变化，防抖执行搜索 */
  onSearchChange(): void {
    // 防抖处理
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.performSearch();
    }, 300);
  }

  /** 执行搜索 */
  private performSearch(): void {
    const container = this.searchContainer();
    const term = this.searchOptions().term;

    if (!container || !term) {
      this.clearHighlights();
      return;
    }

    // 清除旧高亮
    this.clearHighlights();

    // 构建文本索引
    const index = this.searchService.buildTextIndex(container);
    this.textIndex.set(index);

    // 执行搜索并高亮
    const { allSpans, matchToSpansMap } = this.highlightMatches(index);

    this.matches.set(allSpans);
    this.matchToSpans.set(matchToSpansMap);
    this.currentIndex.set(0);

    // 滚动到第一个匹配项
    if (allSpans.length > 0) {
      const firstMatchSpans = matchToSpansMap.get(0) ?? [];
      firstMatchSpans.forEach((span) => span.classList.add('current'));
      this.scrollToMatch(firstMatchSpans[0]);
    }

    // 发出状态变化
    this.emitStateChange();
  }

  /** 高亮匹配项 */
  private highlightMatches(index: TextIndex): {
    allSpans: HTMLElement[];
    matchToSpansMap: Map<number, HTMLElement[]>;
  } {
    const allSpans: HTMLElement[] = [];
    const matchToSpansMap = new Map<number, HTMLElement[]>();
    const options = this.searchOptions();

    // 使用服务构建正则表达式
    const regex = this.searchService.buildRegex(options);
    if (!regex) {
      return { allSpans, matchToSpansMap };
    }

    // 在索引中搜索
    const globalMatches = this.searchService.searchInIndex(index, regex);
    this.globalMatches.set(globalMatches);
    this.totalMatches.set(globalMatches.length);

    // 找到受影响的 segments
    const affectedSegments = this.searchService.findAffectedSegments(index, globalMatches);

    // 高亮每个 segment
    for (const [segment, segmentMatches] of affectedSegments) {
      const highlightedMatches = this.highlightSegment(
        segment,
        segmentMatches.map((m) => m.localMatch),
      );
      allSpans.push(...highlightedMatches);
      
      for (let i = 0; i < segmentMatches.length; i++) {
        const segmentMatch = segmentMatches[i];
        const span = highlightedMatches[i];

        if (!matchToSpansMap.has(segmentMatch.globalMatchIndex)) {
          matchToSpansMap.set(segmentMatch.globalMatchIndex, []);
        }

        matchToSpansMap.get(segmentMatch.globalMatchIndex)!.push(span);
      }
    }

    return { allSpans, matchToSpansMap };
  }

  /** 高亮单个 segment */
  private highlightSegment(segment: TextSegment, matchPositions: MatchPosition[]): HTMLElement[] {
    const matches: HTMLElement[] = [];
    const text = segment.node.textContent ?? '';
    const parent = segment.node.parentNode;

    if (!parent) {
      return matches;
    }

    // 创建文档片段来替换原文本节点
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;

    for (const pos of matchPositions) {
      // 添加匹配前的文本
      if (pos.start > lastIndex) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex, pos.start)));
      }

      // 添加高亮的匹配文本
      const span = document.createElement('span');
      span.className = 'search-highlight';
      span.textContent = text.substring(pos.start, pos.end);
      fragment.appendChild(span);
      matches.push(span);

      lastIndex = pos.end;
    }

    // 添加最后剩余的文本
    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
    }

    // TODO： 使用Range API优化高亮（用一个单独的节点来包裹所有高亮元素）
    // 替换原文本节点
    parent.replaceChild(fragment, segment.node);

    return matches;
  }

  /** 清除高亮 */
  private clearHighlights(): void {
    const container = this.searchContainer();
    if (!container) return;

    const highlights = container.querySelectorAll('.search-highlight');
    highlights.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        // 将高亮元素的内容移回原位
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });
    container.normalize();

    this.matches.set([]);
    this.currentIndex.set(0);
    this.totalMatches.set(0);
    this.globalMatches.set([]);
    this.matchToSpans.set(new Map());
  }

  nextMatch(): void {
    if (this.totalMatches() === 0) return;
    const newIndex = (this.currentIndex() + 1) % this.totalMatches();
    this.navigateToMatch(newIndex);
  }

  prevMatch(): void {
    if (this.totalMatches() === 0) return;
    const newIndex = (this.currentIndex() - 1 + this.totalMatches()) % this.totalMatches();
    this.navigateToMatch(newIndex);
  }

  private navigateToMatch(index: number): void {
    // 移除当前高亮
    this.matches().forEach((el) => el.classList.remove('current'));

    // 设置新的当前匹配
    this.currentIndex.set(index);

    // 获取当前匹配对应的所有 span（可能跨多个 segment）
    const currentMatchSpans = this.matchToSpans().get(index) ?? [];
    currentMatchSpans.forEach((span) => span.classList.add('current'));

    // 滚动到第一个 span
    if (currentMatchSpans.length > 0) {
      this.scrollToMatch(currentMatchSpans[0]);
    }

    // 发出状态变化
    this.emitStateChange();
  }

  private scrollToMatch(element: HTMLElement): void {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  clearSearch(): void {
    this.updateSearchOption({ term: '', regex: false, wholeWord: false, caseSensitive: false });
    this.clearHighlights();
    this.emitStateChange();
  }

  focus(): void {
    setTimeout(() => {
      this.searchInputRef?.nativeElement?.focus();
    }, 0);
  }

  private emitStateChange(): void {
    this.searchStateChange.emit({
      ...this.searchOptions(),
      totalMatches: this.totalMatches(),
      currentIndex: this.currentIndex(),
    });
  }

  /**patch 搜索选项 */
  private updateSearchOption(patch: Partial<SearchOptions>): void {
    this.searchOptions.update((options) => ({
      ...options,
      ...patch,
    }));
  }
}
