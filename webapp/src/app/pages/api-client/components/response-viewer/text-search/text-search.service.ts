import { Injectable } from '@angular/core';

// 搜索选项
export interface SearchOptions {
  term: string;
  regex: boolean;
  wholeWord: boolean;
  caseSensitive: boolean;
}

// 匹配位置
export interface MatchPosition {
  start: number;
  end: number;
}

// TODO: 优化数据结构，TextSegment不再依赖DOM节点
// 文本片段
export interface TextSegment {
  node: Text;
  start: number; // 在完整文本中的起始位置
  end: number; // 在完整文本中的结束位置
}

// 文本索引
export interface TextIndex {
  text: string; // 完整文本内容
  segments: TextSegment[]; // 文本片段映射
}

export interface SegmentMatch {
  globalMatchIndex: number;
  localMatch: MatchPosition;
}

@Injectable()
export class TextSearchService {
  /**
   * 根据搜索选项构建正则表达式
   */
  buildRegex(options: SearchOptions): RegExp | null {
    const { term, regex, wholeWord, caseSensitive } = options;

    if (!term) {
      return null;
    }

    try {
      if (regex) {
        // 使用正则表达式模式
        const flags = caseSensitive ? 'g' : 'gi';
        return new RegExp(term, flags);
      } else {
        // 普通文本搜索，需要转义特殊字符
        const escapedTerm = this.escapeRegex(term);
        let pattern = escapedTerm;

        if (wholeWord) {
          pattern = `\\b${pattern}\\b`;
        }

        const flags = caseSensitive ? 'g' : 'gi';
        return new RegExp(pattern, flags);
      }
    } catch (e) {
      // 正则表达式无效
      return null;
    }
  }

  /**
   * 转义正则表达式特殊字符
   */
  private escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 在文本中查找所有匹配位置
   */
  findMatchPositions(text: string, regex: RegExp): MatchPosition[] {
    const positions: MatchPosition[] = [];
    let match: RegExpExecArray | null;

    // 重置正则表达式的 lastIndex
    regex.lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      positions.push({
        start: match.index,
        end: match.index + match[0].length,
      });

      // 防止无限循环（当匹配空字符串时）
      if (match[0].length === 0) {
        regex.lastIndex++;
      }
    }

    return positions;
  }

  /**
   * 验证正则表达式是否有效
   */
  validateRegex(pattern: string, flags: string = 'g'): boolean {
    try {
      new RegExp(pattern, flags);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 构建文本索引
   */
  buildTextIndex(container: HTMLElement): TextIndex {
    const segments: TextSegment[] = [];
    let fullText = '';

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => this.acceptNode(node),
    });

    while (walker.nextNode()) {
      const textNode = walker.currentNode as Text;
      const text = textNode.textContent ?? '';
      const start = fullText.length;

      segments.push({
        node: textNode,
        start,
        end: start + text.length,
      });

      fullText += text;
    }

    return { text: fullText, segments };
  }

  /**
   * 判断是否接受文本节点
   */
  private acceptNode(node: Node): number {
    const parent = node.parentElement;

    // 跳过脚本和样式元素
    if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
      return NodeFilter.FILTER_REJECT;
    }

    // 跳过已高亮的元素
    if (parent && parent.classList.contains('search-highlight')) {
      return NodeFilter.FILTER_REJECT;
    }

    // 跳过空文本节点
    if (!node.textContent?.trim()) {
      return NodeFilter.FILTER_REJECT;
    }

    return NodeFilter.FILTER_ACCEPT;
  }

  /**
   * 在文本索引中搜索
   */
  searchInIndex(index: TextIndex, regex: RegExp): MatchPosition[] {
    return this.findMatchPositions(index.text, regex);
  }

  /**
   * 根据匹配位置找到对应的 segments
   */
  findAffectedSegments(
    index: TextIndex,
    matches: MatchPosition[],
  ): Map<TextSegment, SegmentMatch[]> {
    const result = new Map<TextSegment, SegmentMatch[]>();

    matches.forEach((match, globalMatchIndex) => {
      // 找到所有与该匹配有交集的 segments
      const affectedSegments = index.segments.filter(
        (s) => match.start < s.end && match.end > s.start,
      );

      for (const segment of affectedSegments) {
        // 计算匹配在该 segment 中的局部位置
        const localStart = Math.max(0, match.start - segment.start);
        const localEnd = Math.min(segment.end - segment.start, match.end - segment.start);

        // 只有当局部位置有效时才添加
        if (localStart < localEnd) {
          // const localMatch: MatchPosition = {
          //   start: localStart,
          //   end: localEnd,
          // };

          // if (!result.has(segment)) {
          //   result.set(segment, []);
          // }
          // result.get(segment)!.push(localMatch);
          const localMatch: MatchPosition = {
            start: localStart,
            end: localEnd,
          };

          if (!result.has(segment)) {
            result.set(segment, []);
          }

          result.get(segment)!.push({
            globalMatchIndex,
            localMatch,
          });
        }
      }
    });

    return result;
  }
}
