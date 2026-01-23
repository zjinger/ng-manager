import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, input, Output } from '@angular/core';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { DocStateVM, DomainDocMetaVM } from '../models/config-ui.model';

@Component({
  selector: 'app-config-domain-docs',
  imports: [
    CommonModule,
    NzIconModule,
  ],
  template: `
    @if (docs().length === 0) {
      <div class="empty">
        <div class="empty-title">该分类下暂无配置文件</div>
        <div class="empty-desc">请确认项目目录中存在对应配置，或检查 catalog 的裁剪策略。</div>
      </div>
    } @else {
      <div class="docs">
        @for (d of mergedDocs(); track d.docId) {
          <div class="doc-block" [class.missing]="d.exists === false">
            <div class="doc-head">
              <div class="doc-title">
                <span class="title-text">{{ d.title }}</span>

                @if (d.dirty) {
                  <span class="badge dirty">已修改</span>
                }

                @if (d.exists === false) {
                  <span class="badge missing">缺失</span>
                }
              </div>

              <div class="doc-meta">
                <span class="meta-item">
                  <nz-icon nzType="file-text" nzTheme="outline"></nz-icon>
                  <span class="mono">{{ d.relPath || "-" }}</span>
                </span>

                <span class="meta-item">
                  <nz-icon nzType="code" nzTheme="outline"></nz-icon>
                  <span class="mono">{{ d.codec || "-" }}</span>
                </span>
              </div>

              @if (d.description) {
                <div class="doc-desc">{{ d.description }}</div>
              }
            </div>

            <div class="doc-body">
              @if (d.error) {
                <div class="error">
                  <nz-icon nzType="warning" nzTheme="outline"></nz-icon>
                  <span>{{ d.error }}</span>
                </div>
              } @else if (isJsonLike(d.codec) && d.json != null) {
                <pre class="json">{{ d.json | json }}</pre>
                <div class="hint">
                  MVP：JSON 目前只读预览；后续会根据 schema 做聚合表单编辑，并回写多个 doc。
                </div>
              } @else {
                <textarea
                  class="raw"
                  [value]="d.raw ?? ''"
                  [disabled]="d.exists === false"
                  (input)="onRawInput(d.docId, $any($event.target).value)"
                  spellcheck="false"
                ></textarea>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .empty {
        padding: 24px;
        border: 1px dashed rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.01);
      }
      .empty-title {
        font-size: 16px;
        font-weight: 600;
      }
      .empty-desc {
        margin-top: 6px;
        color: var(--app-text-secondary);
      }

      .docs {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .doc-block {
        border: 1px solid rgba(0, 0, 0, 0.06);
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
      }
      .doc-block.missing {
        opacity: 0.75;
      }

      .doc-head {
        padding: 12px 16px;
        background: rgba(0, 0, 0, 0.02);
        border-bottom: 1px solid rgba(0, 0, 0, 0.06);
      }

      .doc-title {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .title-text {
        font-size: 18px;
        font-weight: 600;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        height: 20px;
        padding: 0 8px;
        border-radius: 999px;
        font-size: 12px;
        line-height: 20px;
        user-select: none;
      }
      .badge.dirty {
        background: rgba(255, 140, 0, 0.15);
        color: rgba(255, 140, 0, 0.9);
      }
      .badge.missing {
        background: rgba(255, 77, 79, 0.12);
        color: rgba(255, 77, 79, 0.9);
      }

      .doc-meta {
        margin-top: 8px;
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        color: var(--app-text-secondary);
        font-size: 12px;
      }
      .meta-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .mono {
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
          "Courier New", monospace;
      }

      .doc-desc {
        margin-top: 8px;
        color: var(--app-text-secondary);
        font-size: 13px;
      }

      .doc-body {
        padding: 12px 16px;
      }

      .error {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 12px;
        border-radius: 10px;
        background: rgba(255, 77, 79, 0.08);
        color: rgba(255, 77, 79, 0.9);
      }

      .json {
        margin: 0;
        padding: 12px;
        border-radius: 10px;
        background: rgba(0, 0, 0, 0.03);
        overflow: auto;
        max-height: 52vh;
        white-space: pre-wrap;
        word-break: break-word;
      }
      .hint {
        margin-top: 8px;
        color: var(--app-text-secondary);
        font-size: 12px;
      }

      .raw {
        width: 100%;
        min-height: 240px;
        max-height: 60vh;
        resize: vertical;
        padding: 12px;
        border-radius: 10px;
        border: 1px solid rgba(0, 0, 0, 0.08);
        background: #fff;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono",
          "Courier New", monospace;
        font-size: 13px;
        line-height: 1.5;
        outline: none;
      }
      .raw:disabled {
        background: rgba(0, 0, 0, 0.02);
        cursor: not-allowed;
      }
    `,
  ],
})
export class ConfigDomainDocsComponent {
  /**
  * domain 下 docs 的“元信息列表”（来自 catalog）
  * - 用于顺序、标题、exists、relPath、codec
  */
  docs = input<DomainDocMetaVM[]>([]);

  /**
   * 具体 doc 的“编辑状态”（来自父组件 loadDomainDocs）
   * - baselineRaw/raw/json/dirty/error
   */
  states = input<Record<string, DocStateVM>>({});

  /**
   * raw 编辑回传
   * - 父组件负责更新 states + dirty
   */
  @Output() rawChange = new EventEmitter<{ docId: string; raw: string }>();

  mergedDocs = computed(() => {
    const docs = this.docs();
    const states = this.states();

    return docs.map((m) => {
      const s = states[m.docId];
      // 合并：catalog 提供标题/顺序，state 提供内容/dirty/error
      return {
        docId: m.docId,
        title: m.title,
        description: m.description,
        exists: m.exists,

        relPath: s?.relPath ?? m.relPath,
        codec: s?.codec ?? m.codec,

        raw: s?.raw,
        json: s?.json,
        dirty: !!s?.dirty,
        error: s?.error,
      };
    });
  });

  onRawInput(docId: string, raw: string) {
    this.rawChange.emit({ docId, raw });
  }

  isJsonLike(codec?: string) {
    // MVP：json/jsonc 都先走 JSON 预览；未来 jsonc 可能会 raw-only
    const c = (codec ?? "").toLowerCase();
    return c === "json" || c === "jsonc";
  }
}
