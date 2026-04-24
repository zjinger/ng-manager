import { findBlockEnd, stripCommentsPreserveOffsets } from '../utils/nginx-module-utils';
import type { NginxLocation } from '../types/nginx.types';
import { ServerGeneratorService } from './server-generator.service';

/**
 * Server Location 解析服务
 * 负责从 Server 配置块的文本内容中提取 Location 块的信息，并将其转换为 NginxLocation 数据结构
 * 由于 Nginx 配置的灵活性，Location 块的格式可能会有多种变体，例如不同的路径表达方式、可选的参数等
 * 该服务需要能够正确地处理这些变体，并且在解析过程中保持对原始配置文本的忠实，以便在必要时能够进行准确的修改或重构
 * 主要功能包括：
 * - 从 Server 配置块中识别和提取 Location 块
 * - 解析 Location 块的路径、proxy_pass、root、index、try_files 等常见指令
 * - 将解析结果封装为 NginxLocation 对象，供其他服务使用
 * - 在解析过程中忽略注释和不相关的内容，以提高解析的准确性
 */
export class ServerLocationParserService {
  constructor(private readonly generator: ServerGeneratorService) {}

  parseLocations(content: string): NginxLocation[] {
    const locations: NginxLocation[] = [];
    const sanitizedContent = stripCommentsPreserveOffsets(content);
    const locationRegex = /\blocation\b/g;
    let match: RegExpExecArray | null = null;

    while ((match = locationRegex.exec(sanitizedContent)) !== null) {
      if (this.getBraceDepthAt(sanitizedContent, match.index) !== 0) {
        continue;
      }

      let cursor = match.index + match[0].length;
      while (cursor < sanitizedContent.length && /\s/.test(sanitizedContent[cursor])) {
        cursor += 1;
      }
      const headerStart = cursor;
      while (cursor < sanitizedContent.length && sanitizedContent[cursor] !== '{') {
        cursor += 1;
      }
      if (cursor >= sanitizedContent.length) {
        continue;
      }
      const locationPath = this.extractLocationPath(sanitizedContent.slice(headerStart, cursor));
      if (!locationPath) {
        locationRegex.lastIndex = cursor + 1;
        continue;
      }

      const blockEnd = findBlockEnd(sanitizedContent, cursor);
      if (blockEnd < 0) {
        continue;
      }
      const blockContent = content.slice(cursor + 1, blockEnd);
      locationRegex.lastIndex = blockEnd + 1;
      let proxyPass: string | undefined;
      let root: string | undefined;
      let index: string[] | undefined;
      let tryFiles: string[] | undefined;
      const extraLines: string[] = [];

      const lines = blockContent.split(/\r?\n/);
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
          continue;
        }

        const proxyMatch = line.match(/^proxy_pass\s+([^;]+);$/i);
        if (proxyMatch) {
          proxyPass = this.generator.stripOptionalQuotes(proxyMatch[1]?.trim());
          continue;
        }

        const rootMatch = line.match(/^root\s+([^;]+);$/i);
        if (rootMatch) {
          root = this.generator.stripOptionalQuotes(rootMatch[1]?.trim());
          continue;
        }

        const indexMatch = line.match(/^index\s+([^;]+);$/i);
        if (indexMatch) {
          index = indexMatch[1]
            ?.trim()
            .split(/\s+/)
            .map(item => item.trim())
            .filter(Boolean);
          continue;
        }

        const tryFilesMatch = line.match(/^try_files\s+([^;]+);$/i);
        if (tryFilesMatch) {
          tryFiles = tryFilesMatch[1]
            ?.trim()
            .split(/\s+/)
            .map(item => item.trim())
            .filter(Boolean);
          continue;
        }

        if (this.generator.isDefaultProxySetHeaderLine(line)) {
          continue;
        }

        extraLines.push(line);
      }

      locations.push({
        path: locationPath,
        proxyPass,
        root,
        index,
        tryFiles,
        rawConfig: extraLines.length ? extraLines.join('\n') : undefined,
      });
    }

    return locations;
  }

  private extractLocationPath(rawHeader: string): string | null {
    const tokens = String(rawHeader || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!tokens.length) {
      return null;
    }
    if (tokens.length >= 2 && ['=', '~', '~*', '^~'].includes(tokens[0])) {
      return tokens[1];
    }
    return tokens[0];
  }

  private getBraceDepthAt(content: string, endExclusive: number): number {
    let depth = 0;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escaped = false;

    for (let i = 0; i < endExclusive; i += 1) {
      const ch = content[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (!inDoubleQuote && ch === '\'') {
        inSingleQuote = !inSingleQuote;
        continue;
      }
      if (!inSingleQuote && ch === '"') {
        inDoubleQuote = !inDoubleQuote;
        continue;
      }
      if (inSingleQuote || inDoubleQuote) {
        continue;
      }
      if (ch === '{') {
        depth += 1;
      } else if (ch === '}' && depth > 0) {
        depth -= 1;
      }
    }
    return depth;
  }
}

