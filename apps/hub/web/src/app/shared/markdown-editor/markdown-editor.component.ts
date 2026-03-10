import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';

@Component({
  selector: 'app-markdown-editor',
  imports: [CommonModule, FormsModule, NzButtonModule, NzInputModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MarkdownEditorComponent),
      multi: true
    }
  ],
  template: `
    <div class="md-editor">
      <div class="toolbar">
        <button nz-button nzType="default" nzSize="small" type="button" (click)="prefixLine('# ')">标题</button>
        <button nz-button nzType="default" nzSize="small" type="button" (click)="wrapSelection('**')">加粗</button>
        <button nz-button nzType="default" nzSize="small" type="button" (click)="wrapSelection('*')">斜体</button>
        <button nz-button nzType="default" nzSize="small" type="button" (click)="insertInlineCode()">行内代码</button>
        <button nz-button nzType="default" nzSize="small" type="button" (click)="insertLink()">链接</button>
        <button nz-button nzType="default" nzSize="small" type="button" (click)="prefixLine('- ')">列表</button>
        <button nz-button nzType="default" nzSize="small" type="button" (click)="prefixLine('> ')">引用</button>
        <span class="char-count">{{ value.length }} 字符</span>
      </div>

      <div class="panes">
        <textarea
          #editor
          nz-input
          rows="14"
          [disabled]="disabled"
          [value]="value"
          placeholder="输入 Markdown 内容..."
          (input)="handleInput($event)"
          (blur)="onTouched()"
        ></textarea>
        <article class="preview" [innerHTML]="previewHtml"></article>
      </div>
    </div>
  `,
  styles: [
    `
      .md-editor {
        border: 1px solid #f0f0f0;
        border-radius: 8px;
        overflow: hidden;
      }

      .toolbar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-bottom: 1px solid #f0f0f0;
        background: #fafafa;
      }

      .char-count {
        margin-left: auto;
        color: #8c8c8c;
        font-size: 12px;
      }

      .panes {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      textarea {
        border: 0;
        border-right: 1px solid #f0f0f0;
        border-radius: 0;
        resize: vertical;
        min-height: 280px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
          monospace;
      }

      .preview {
        padding: 12px;
        max-height: 460px;
        overflow: auto;
        background: #fff;
      }

      .preview :is(h1, h2, h3, h4, h5, h6) {
        margin: 1em 0 0.6em;
      }

      .preview :is(p, ul, ol, blockquote, pre) {
        margin: 0 0 0.75em;
      }

      .preview code {
        background: #f5f5f5;
        border-radius: 4px;
        padding: 1px 4px;
      }

      .preview pre {
        background: #1f2430;
        color: #d6deeb;
        padding: 10px;
        border-radius: 6px;
        overflow: auto;
      }

      .preview pre code {
        background: transparent;
        color: inherit;
        padding: 0;
      }

      .preview blockquote {
        margin-left: 0;
        padding-left: 10px;
        border-left: 4px solid #d9d9d9;
        color: #595959;
      }

      @media (max-width: 960px) {
        .panes {
          grid-template-columns: 1fr;
        }

        textarea {
          border-right: 0;
          border-bottom: 1px solid #f0f0f0;
        }
      }
    `
  ]
})
export class MarkdownEditorComponent implements ControlValueAccessor {
  @ViewChild('editor') private editorRef?: ElementRef<HTMLTextAreaElement>;

  protected value = '';
  protected previewHtml = '<p>预览区域</p>';
  protected disabled = false;

  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  public writeValue(value: string | null): void {
    this.value = value ?? '';
    this.previewHtml = this.renderMarkdown(this.value);
  }

  public registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  public registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  public setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected handleInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.setValue(target.value);
  }

  protected wrapSelection(before: string, after = before, placeholder = '文本'): void {
    const textarea = this.editorRef?.nativeElement;
    if (!textarea) {
      this.setValue(`${this.value}${before}${placeholder}${after}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = this.value.slice(start, end) || placeholder;
    const next = `${this.value.slice(0, start)}${before}${selected}${after}${this.value.slice(end)}`;

    this.setValue(next);

    queueMicrotask(() => {
      textarea.focus();
      const cursor = start + before.length + selected.length + after.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }

  protected prefixLine(prefix: string): void {
    const textarea = this.editorRef?.nativeElement;
    if (!textarea) {
      this.setValue(`${this.value}\n${prefix}`);
      return;
    }

    const start = textarea.selectionStart;
    const lineStart = this.value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
    const next = `${this.value.slice(0, lineStart)}${prefix}${this.value.slice(lineStart)}`;
    const moved = start + prefix.length;

    this.setValue(next);

    queueMicrotask(() => {
      textarea.focus();
      textarea.setSelectionRange(moved, moved);
    });
  }

  protected insertInlineCode(): void {
    this.wrapSelection('`');
  }

  protected insertLink(): void {
    this.wrapSelection('[', '](https://example.com)', '链接文本');
  }

  private setValue(next: string): void {
    this.value = next;
    this.previewHtml = this.renderMarkdown(this.value);
    this.onChange(next);
  }

  private renderMarkdown(input: string): string {
    if (!input.trim()) {
      return '<p>预览区域</p>';
    }

    const codeBlocks: string[] = [];
    const withCodePlaceholders = input.replace(/```([\w-]*)\n([\s\S]*?)```/g, (_, lang: string, code: string) => {
      const codeHtml = `<pre><code class="language-${this.escapeHtml(lang)}">${this.escapeHtml(code)}</code></pre>`;
      const token = `@@CODE_BLOCK_${codeBlocks.length}@@`;
      codeBlocks.push(codeHtml);
      return token;
    });

    const escaped = this.escapeHtml(withCodePlaceholders).replace(/\r\n?/g, '\n');
    const lines = escaped.split('\n');
    const blocks: string[] = [];
    let listMode: 'ul' | 'ol' | null = null;

    const closeList = (): void => {
      if (!listMode) return;
      blocks.push(listMode === 'ul' ? '</ul>' : '</ol>');
      listMode = null;
    };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        closeList();
        continue;
      }

      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        closeList();
        const level = headingMatch[1].length;
        blocks.push(`<h${level}>${this.renderInline(headingMatch[2])}</h${level}>`);
        continue;
      }

      const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
      if (ulMatch) {
        if (listMode !== 'ul') {
          closeList();
          blocks.push('<ul>');
          listMode = 'ul';
        }
        blocks.push(`<li>${this.renderInline(ulMatch[1])}</li>`);
        continue;
      }

      const olMatch = trimmed.match(/^\d+[.)]\s+(.+)$/);
      if (olMatch) {
        if (listMode !== 'ol') {
          closeList();
          blocks.push('<ol>');
          listMode = 'ol';
        }
        blocks.push(`<li>${this.renderInline(olMatch[1])}</li>`);
        continue;
      }

      const quoteMatch = trimmed.match(/^>\s?(.*)$/);
      if (quoteMatch) {
        closeList();
        blocks.push(`<blockquote>${this.renderInline(quoteMatch[1])}</blockquote>`);
        continue;
      }

      closeList();
      blocks.push(`<p>${this.renderInline(trimmed)}</p>`);
    }
    closeList();

    let html = blocks.join('\n');
    html = html.replace(/@@CODE_BLOCK_(\d+)@@/g, (_, index: string) => codeBlocks[Number(index)] ?? '');
    return html;
  }

  private renderInline(text: string): string {
    const inlineCodes: string[] = [];
    let html = text.replace(/`([^`\n]+)`/g, (_, code: string) => {
      const token = `@@INLINE_CODE_${inlineCodes.length}@@`;
      inlineCodes.push(`<code>${code}</code>`);
      return token;
    });

    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, rawUrl: string) => {
      const href = this.sanitizeHref(rawUrl);
      return `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
    });
    html = html.replace(/(\*\*|__)(.+?)\1/g, '<strong>$2</strong>');
    html = html.replace(/(\*|_)([^*_]+?)\1/g, '<em>$2</em>');

    return html.replace(/@@INLINE_CODE_(\d+)@@/g, (_, index: string) => inlineCodes[Number(index)] ?? '');
  }

  private sanitizeHref(url: string): string {
    const normalized = url.replaceAll('&amp;', '&').trim();
    if (/^(https?:\/\/|mailto:|\/|#)/i.test(normalized)) {
      return this.escapeHtml(normalized);
    }
    return '#';
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
}

