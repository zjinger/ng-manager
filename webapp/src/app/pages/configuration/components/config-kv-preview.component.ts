import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { EnvKeyValueEntry } from '../utils';

@Component({
  selector: 'app-config-kv-preview',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (entries.length > 0) {
      <div class="kv-preview">
        <div class="kv-preview-head">
          <div>
            <div class="kv-preview-title">Key / Value 预览</div>
            <div class="kv-preview-subtitle">解析后的键值对仅用于展示</div>
          </div>
          <span>{{ entries.length }} 项</span>
        </div>
        <div class="kv-preview-body">
          @for (entry of entries; track trackEntry($index, entry)) {
            <div class="kv-row">
              <div class="kv-key" [title]="entry.key">{{ entry.key }}</div>
              <div class="kv-value">
                <code [title]="entry.value">{{ entry.value }}</code>
                @if (entry.valueType) {
                  <span class="meta-tag">{{ entry.valueType }}</span>
                }
                @if (entry.line) {
                  <span class="meta-tag">L{{ entry.line }}</span>
                }
                @if (entry.sensitive) {
                  <span class="sensitive-tag">敏感</span>
                }
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .kv-preview {
      border-top: 1px solid #e5e5e5;
      background: #fff;
    }
    .kv-preview-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 10px;
      color: var(--app-text-secondary);
      background: #fafafa;
      border-bottom: 1px solid #e5e5e5;
      font-size: 12px;
    }
    .kv-preview-title {
      color: var(--app-text-primary);
      font-size: 13px;
      font-weight: 500;
      line-height: 1.4;
    }
    .kv-preview-subtitle {
      margin-top: 2px;
      line-height: 1.3;
    }
    .kv-preview-body {
      display: flex;
      flex-direction: column;
    }
    .kv-row {
      display: grid;
      grid-template-columns: minmax(140px, 220px) minmax(0, 1fr);
      gap: 12px;
      align-items: center;
      padding: 7px 10px;
      border-bottom: 1px solid #f0f0f0;
    }
    .kv-row:last-child {
      border-bottom: 0;
    }
    .kv-key {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--app-text-primary);
      font-size: 13px;
      font-weight: 500;
    }
    .kv-value {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .kv-value code {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 2px 8px;
      border-radius: 4px;
      background: #f8f9fa;
      color: var(--app-text-primary);
      font-family: Consolas, Menlo, Monaco, 'Courier New', monospace;
      font-size: 12px;
      line-height: 1.5;
    }
    .meta-tag,
    .sensitive-tag {
      flex: 0 0 auto;
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 12px;
      line-height: 1.4;
    }
    .meta-tag {
      border: 1px solid #d9d9d9;
      background: #fafafa;
      color: var(--app-text-secondary);
    }
    .sensitive-tag {
      border: 1px solid #ffccc7;
      background: #fff2f0;
      color: #cf1322;
    }
  `],
})
export class ConfigKvPreviewComponent {
  @Input() entries: EnvKeyValueEntry[] = [];

  trackEntry(index: number, entry: EnvKeyValueEntry): string {
    return `${entry.key}:${entry.line ?? index}`;
  }
}
