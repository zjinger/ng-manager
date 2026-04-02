import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzToolTipModule } from 'ng-zorro-antd/tooltip';

import { PageHeaderComponent } from '@shared/ui';
import { BlockRendererComponent } from '../../components/block-renderer/block-renderer.component';
import type { AiReportPreviewResult, ReportBlock, ReportTemplate } from '../../models/report.model';
import { ReportApiService } from '../../services/report-api.service';

interface TemplateBoardItem {
  id: string;
  title: string;
  naturalQuery: string;
  sql: string;
  params: string[];
  block: ReportBlock;
}

@Component({
  selector: 'app-report-home-page',
  standalone: true,
  imports: [
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzPopconfirmModule,
    NzSelectModule,
    NzSpinModule,
    NzToolTipModule,
    PageHeaderComponent,
    BlockRendererComponent,
  ],
  template: `
    <app-page-header title="积木报表" subtitle="支持项目、成员、研发项、测试单等多维数据分析，输入自然语言即可生成。" />

    <section class="report-layout">
      <div class="report-layout__main">
        <div class="card query-card">
          <div class="query-card__label">报表需求</div>
          <textarea
            nz-input
            rows="3"
            [ngModel]="query()"
            (ngModelChange)="query.set($event)"
            placeholder="例如：最近 30 天各项目研发项完成情况，按项目对比"
          ></textarea>

          <div class="query-controls">
            <div class="query-controls__hint">时间范围和项目范围请直接写在需求里，例如：最近30天、某某项目。</div>
          </div>

          <div class="query-card__actions">
            <button nz-button nzType="primary" [disabled]="!canGenerate() || loading()" [nzLoading]="loading()" (click)="generate()">
              生成报表
            </button>
            @for (item of suggestionQueries; track item) {
              <button nz-button nzType="default" class="query-suggestion" (click)="useSuggestion(item)">
                {{ item }}
              </button>
            }
          </div>
        </div>

        @if (loading()) {
          <div class="card loading-card">
            <nz-spin nzSimple />
            <span>AI 正在生成 SQL 与积木预览...</span>
          </div>
        }

        @if (preview(); as current) {
          <div class="card preview-card">
            <div class="preview-card__header">
              <div>
                <h3>{{ current.title || 'AI 报表预览' }}</h3>
                @if (current.description) {
                  <p>{{ current.description }}</p>
                }
              </div>
              <div class="preview-card__actions">
                <input
                  nz-input
                  class="template-title-input"
                  [ngModel]="templateTitle()"
                  (ngModelChange)="templateTitle.set($event)"
                  placeholder="模板名称"
                />
                <button nz-button nzType="primary" [disabled]="!canSaveTemplate()" [nzLoading]="saving()" (click)="saveTemplate()">
                  保存为模板
                </button>
              </div>
            </div>

            <details class="sql-panel">
              <summary>查看 SQL</summary>
              <pre>{{ current.sql }}</pre>
            </details>

            <app-report-block-renderer [block]="current.block" />
          </div>
        }

        @if (boardItems().length > 0) {
          <div class="card board-card">
            <div class="board-card__header">
              <div>
                <h3>模板看板</h3>
                <p>同时展示多个模板图表，便于横向对比</p>
              </div>
              <div class="board-card__actions">
                <button nz-button nzType="default" nzSize="small" (click)="clearBoard()">
                  清空看板
                </button>
              </div>
            </div>
            <div class="board-list">
              @for (item of boardItems(); track item.id) {
                <div class="board-item" [class.board-item--compact]="isCompactBlock(item.block)">
                  <button
                    nz-button
                    nzType="text"
                    nzSize="small"
                    class="board-item__close"
                    nz-tooltip
                    nzTooltipTitle="关闭模板"
                    (click)="removeBoardItem(item.id, $event)"
                  >
                    <span nz-icon nzType="close"></span>
                  </button>
                  <app-report-block-renderer [block]="item.block" [showDescription]="true" />
                </div>
              }
            </div>
          </div>
        }
      </div>

      <aside class="report-layout__side">
        <div class="card template-card">
          <div class="template-card__header">
            <h4>我的模板</h4>
            <div class="template-card__header-actions">
              <button
                nz-button
                nzType="default"
                nzSize="small"
                [disabled]="templates().length === 0 || bulkRendering()"
                [nzLoading]="bulkRendering()"
                (click)="renderAllTemplates()"
              >
                渲染全部
              </button>
              <button nz-button nzType="text" nzSize="small" [disabled]="templatesLoading()" (click)="loadTemplates()">
                刷新
              </button>
            </div>
          </div>
          <div class="template-card__filters">
            <input
              nz-input
              nzSize="small"
              [ngModel]="templateKeyword()"
              (ngModelChange)="templateKeyword.set($event)"
              placeholder="搜索模板名"
            />
            <nz-select
              nzSize="small"
              [ngModel]="templateSort()"
              (ngModelChange)="templateSort.set($event)"
              class="template-sort-select"
            >
              <nz-option nzLabel="最近更新" nzValue="updated_desc"></nz-option>
              <nz-option nzLabel="最早更新" nzValue="updated_asc"></nz-option>
            </nz-select>
          </div>

          @if (templatesLoading()) {
            <div class="template-card__loading"><nz-spin nzSimple /></div>
          } @else if (templates().length === 0) {
            <div class="template-card__empty">还没有模板，先生成一个报表后保存。</div>
          } @else if (filteredTemplates().length === 0) {
            <div class="template-card__empty">没有匹配的模板</div>
          } @else {
            <div class="template-list">
              @for (item of filteredTemplates(); track item.id) {
                <div
                  class="template-item"
                  [class.template-item--active]="activeTemplateId() === item.id"
                  [class.template-item--disabled]="executingTemplateId() === item.id"
                  (click)="executeTemplate(item)"
                >
                  <div class="template-item__title-row">
                    @if (editingTemplateId() === item.id) {
                      <input
                        nz-input
                        nzSize="small"
                        class="template-item__rename-input"
                        [ngModel]="editingTitle()"
                        (ngModelChange)="editingTitle.set($event)"
                        (click)="stopEvent($event)"
                        (keydown.enter)="confirmRename(item.id, $event)"
                        (keydown.escape)="cancelRename($event)"
                      />
                    } @else {
                      <span class="template-item__title">{{ item.title }}</span>
                    }
                    <span class="template-item__time">{{ formatTime(item.updatedAt) }}</span>
                  </div>

                  <div class="template-item__query">{{ item.naturalQuery }}</div>

                  <div class="template-item__actions" (click)="stopEvent($event)">
                    @if (editingTemplateId() === item.id) {
                      <button
                        nz-button
                        nzType="primary"
                        nzSize="small"
                        [nzLoading]="renamingTemplateId() === item.id"
                        (click)="confirmRename(item.id)"
                      >
                        保存
                      </button>
                      <button nz-button nzType="default" nzSize="small" (click)="cancelRename()">取消</button>
                    } @else {
                      <button nz-button nzType="default" nzSize="small" (click)="startRename(item, $event)">重命名</button>
                      <button
                        nz-button
                        nzType="default"
                        nzSize="small"
                        [nzLoading]="boardExecutingTemplateId() === item.id"
                        [disabled]="boardExecutingTemplateId() === item.id"
                        (click)="renderTemplateToBoard(item, $event)"
                      >
                        加入看板
                      </button>
                      <button
                        nz-button
                        nzType="default"
                        nzDanger
                        nzSize="small"
                        nz-popconfirm
                        nzPopconfirmTitle="确认删除该模板？"
                        nzPopconfirmOkText="删除"
                        nzPopconfirmCancelText="取消"
                        (nzOnConfirm)="deleteTemplate(item)"
                        (click)="stopEvent($event)"
                      >
                        删除
                      </button>
                    }
                  </div>
                </div>
              }
            </div>
          }
        </div>
      </aside>
    </section>
  `,
  styles: [
    `
      .report-layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 16px;
      }
      .report-layout__main {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .report-layout__side {
        min-width: 0;
      }
      .card {
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 16px;
      }
      .query-card__label {
        margin-bottom: 10px;
        font-size: 13px;
        color: var(--text-muted);
      }
      .query-card textarea {
        resize: vertical;
        min-height: 92px;
      }
      .query-controls {
        margin-top: 12px;
      }
      .query-controls__hint {
        font-size: 12px;
        color: var(--text-muted);
      }
      .control-select {
        width: 100%;
      }
      .query-card__actions {
        margin-top: 12px;
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .query-suggestion {
        max-width: 100%;
      }
      .loading-card {
        min-height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        color: var(--text-muted);
      }
      .preview-card {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .board-card {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .board-card__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .board-card__header h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 18px;
      }
      .board-card__header p {
        margin: 8px 0 0;
        color: var(--text-muted);
      }
      .board-card__actions {
        display: inline-flex;
        gap: 8px;
      }
      .board-list {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px;
      }
      .board-item {
        position: relative;
        display: flex;
        flex-direction: column;
        min-width: 0;
        grid-column: 1 / -1;
      }
      .board-item--compact {
        grid-column: auto;
      }
      .board-item__close {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 2;
        width: 28px;
        height: 28px;
        padding: 0;
        border-radius: 999px;
        border: 1px solid var(--border-color-soft);
        background: color-mix(in srgb, var(--bg-container) 92%, #ffffff);
        color: var(--text-muted);
      }
      .board-item__close:hover {
        border-color: var(--border-color);
        background: var(--bg-container);
        color: var(--text-primary);
      }
      .board-item ::ng-deep .block {
        min-height: 100%;
        padding-right: 48px;
      }
      .preview-card__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .preview-card__header h3 {
        margin: 0;
        color: var(--text-primary);
        font-size: 18px;
      }
      .preview-card__header p {
        margin: 8px 0 0;
        color: var(--text-muted);
      }
      .preview-card__actions {
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .template-title-input {
        width: 220px;
      }
      .sql-panel {
        border: 1px solid var(--border-color);
        border-radius: 10px;
        background: var(--bg-subtle);
        padding: 0 12px;
      }
      .sql-panel summary {
        cursor: pointer;
        user-select: none;
        padding: 10px 0;
        color: var(--text-secondary);
        font-size: 13px;
      }
      .sql-panel pre {
        margin: 0 0 12px;
        max-height: 220px;
        overflow: auto;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--text-primary);
        font-size: 12px;
        line-height: 1.6;
      }
      .template-card {
        min-height: 360px;
      }
      .template-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .template-card__header-actions {
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .template-card__filters {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 112px;
        gap: 8px;
        margin-bottom: 10px;
      }
      .template-sort-select {
        width: 100%;
      }
      .template-card__header h4 {
        margin: 0;
        font-size: 15px;
        color: var(--text-primary);
      }
      .template-card__loading,
      .template-card__empty {
        min-height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-muted);
      }
      .template-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .template-item {
        border: 1px solid var(--border-color);
        border-radius: 10px;
        background: var(--bg-container);
        padding: 10px 12px;
        transition: border-color 0.2s ease, background-color 0.2s ease;
        cursor: pointer;
      }
      .template-item:hover {
        border-color: color-mix(in srgb, var(--primary-500) 48%, var(--border-color));
        background: color-mix(in srgb, var(--primary-500) 5%, var(--bg-container));
      }
      .template-item--active {
        border-color: color-mix(in srgb, var(--primary-500) 68%, var(--border-color));
        background: color-mix(in srgb, var(--primary-500) 8%, var(--bg-container));
      }
      .template-item--disabled {
        opacity: 0.72;
      }
      .template-item__title-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .template-item__title {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--text-primary);
        font-weight: 600;
        font-size: 13px;
      }
      .template-item__rename-input {
        width: 100%;
      }
      .template-item__time {
        flex-shrink: 0;
        color: var(--text-muted);
        font-size: 12px;
      }
      .template-item__query {
        margin-top: 6px;
        color: var(--text-secondary);
        font-size: 12px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .template-item__actions {
        margin-top: 10px;
        display: inline-flex;
        gap: 8px;
      }
      @media (max-width: 1160px) {
        .report-layout {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 780px) {
        .board-list {
          grid-template-columns: 1fr;
        }
        .template-card__filters {
          grid-template-columns: 1fr;
        }
        .preview-card__header {
          flex-direction: column;
        }
        .board-card__header {
          flex-direction: column;
        }
        .preview-card__actions {
          width: 100%;
          flex-wrap: wrap;
        }
        .template-title-input {
          width: 100%;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportHomePageComponent {
  private readonly api = inject(ReportApiService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly query = signal('');

  readonly preview = signal<AiReportPreviewResult | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly templateTitle = signal('');
  readonly templates = signal<ReportTemplate[]>([]);
  readonly templatesLoading = signal(false);
  readonly templateKeyword = signal('');
  readonly templateSort = signal<'updated_desc' | 'updated_asc'>('updated_desc');
  readonly executingTemplateId = signal<string | null>(null);
  readonly renamingTemplateId = signal<string | null>(null);
  readonly activeTemplateId = signal<string | null>(null);
  readonly editingTemplateId = signal<string | null>(null);
  readonly editingTitle = signal('');
  readonly lastNaturalQuery = signal('');
  readonly boardItems = signal<TemplateBoardItem[]>([]);
  readonly boardExecutingTemplateId = signal<string | null>(null);
  readonly bulkRendering = signal(false);

  readonly suggestionQueries: ReadonlyArray<string> = [
    '最近 30 天各项目的测试单创建与关闭趋势',
    '各项目当前成员数量对比',
    '最近 30 天各项目研发项完成情况',
    '成员维度：最近 30 天谁处理的测试单最多',
  ];

  readonly canGenerate = computed(() => this.query().trim().length >= 2);
  readonly canSaveTemplate = computed(() => {
    return (
      Boolean(this.preview()) &&
      this.templateTitle().trim().length > 0 &&
      this.lastNaturalQuery().trim().length > 0 &&
      !this.saving()
    );
  });
  readonly filteredTemplates = computed(() => {
    const keyword = this.templateKeyword().trim().toLowerCase();
    const sorted = [...this.templates()].sort((a, b) => {
      const left = Date.parse(a.updatedAt);
      const right = Date.parse(b.updatedAt);
      const leftValue = Number.isNaN(left) ? 0 : left;
      const rightValue = Number.isNaN(right) ? 0 : right;
      return this.templateSort() === 'updated_asc' ? leftValue - rightValue : rightValue - leftValue;
    });

    if (!keyword) {
      return sorted;
    }
    return sorted.filter((item) => item.title.toLowerCase().includes(keyword));
  });

  constructor() {
    this.loadTemplates();
  }

  useSuggestion(value: string): void {
    this.query.set(value);
    this.generate();
  }

  generate(): void {
    const normalized = this.query().trim();
    if (normalized.length < 2 || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.activeTemplateId.set(null);
    this.executingTemplateId.set(null);

    this.api
      .preview({ query: normalized })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.preview.set(res);
          this.lastNaturalQuery.set(normalized);
          this.templateTitle.set((res.title || normalized).trim().slice(0, 120));
        },
        error: () => {
          this.message.error('生成报表失败，请稍后重试');
        },
      });
  }

  saveTemplate(): void {
    const current = this.preview();
    const title = this.templateTitle().trim();
    const naturalQuery = this.lastNaturalQuery().trim();
    if (!current || !title || !naturalQuery || this.saving()) {
      return;
    }

    this.saving.set(true);
    this.api
      .createTemplate({
        title,
        naturalQuery,
        sql: current.sql,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: (entity) => {
          this.activeTemplateId.set(entity.id);
          this.message.success('模板已保存');
          this.loadTemplates(true);
        },
        error: () => {
          this.message.error('保存模板失败');
        },
      });
  }

  executeTemplate(template: ReportTemplate): void {
    if (this.executingTemplateId() === template.id || this.editingTemplateId() === template.id) {
      return;
    }

    this.executingTemplateId.set(template.id);
    this.api
      .executeTemplate(template.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.executingTemplateId.set(null)),
      )
      .subscribe({
        next: (res) => {
          this.preview.set({
            sql: res.sql,
            params: res.params,
            title: res.template.title,
            description: '',
            block: res.block,
          });
          this.query.set(res.template.naturalQuery);
          this.lastNaturalQuery.set(res.template.naturalQuery);
          this.templateTitle.set(res.template.title);
          this.activeTemplateId.set(res.template.id);
        },
        error: () => {
          this.message.error('执行模板失败');
        },
      });
  }

  loadTemplates(silent = false): void {
    if (!silent) {
      this.templatesLoading.set(true);
    }
    this.api
      .listTemplates()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.templatesLoading.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.templates.set(res.items || []);
        },
        error: () => {
          this.templates.set([]);
          if (!silent) {
            this.message.error('加载模板失败');
          }
        },
      });
  }

  startRename(template: ReportTemplate, event?: Event): void {
    this.stopEvent(event);
    this.editingTemplateId.set(template.id);
    this.editingTitle.set(template.title);
  }

  cancelRename(event?: Event): void {
    this.stopEvent(event);
    this.editingTemplateId.set(null);
    this.editingTitle.set('');
  }

  confirmRename(templateId: string, event?: Event): void {
    this.stopEvent(event);
    const title = this.editingTitle().trim();
    if (!title) {
      this.message.warning('模板名称不能为空');
      return;
    }
    if (this.renamingTemplateId() === templateId) {
      return;
    }

    this.renamingTemplateId.set(templateId);
    this.api
      .updateTemplateTitle(templateId, title)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.renamingTemplateId.set(null)),
      )
      .subscribe({
        next: (entity) => {
          this.templates.update((items) => items.map((item) => (item.id === entity.id ? entity : item)));
          if (this.activeTemplateId() === entity.id) {
            this.templateTitle.set(entity.title);
          }
          this.cancelRename();
          this.message.success('模板已重命名');
        },
        error: () => {
          this.message.error('模板重命名失败');
        },
      });
  }

  deleteTemplate(template: ReportTemplate, event?: Event): void {
    this.stopEvent(event);
    this.api
      .deleteTemplate(template.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.templates.update((items) => items.filter((item) => item.id !== template.id));
          this.boardItems.update((items) => items.filter((item) => item.id !== template.id));
          if (this.activeTemplateId() === template.id) {
            this.activeTemplateId.set(null);
          }
          if (this.editingTemplateId() === template.id) {
            this.cancelRename();
          }
          this.message.success('模板已删除');
        },
        error: () => {
          this.message.error('模板删除失败');
        },
      });
  }

  renderTemplateToBoard(template: ReportTemplate, event?: Event): void {
    this.stopEvent(event);
    if (this.boardExecutingTemplateId() === template.id) {
      return;
    }

    this.boardExecutingTemplateId.set(template.id);
    this.api
      .executeTemplate(template.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.boardExecutingTemplateId.set(null)),
      )
      .subscribe({
        next: (res) => {
          this.upsertBoardItem({
            id: res.template.id,
            title: res.template.title,
            naturalQuery: res.template.naturalQuery,
            sql: res.sql,
            params: res.params,
            block: res.block,
          });
          this.message.success('已加入看板');
        },
        error: () => {
          this.message.error('加入看板失败');
        },
      });
  }

  renderAllTemplates(): void {
    const templates = this.templates();
    if (templates.length === 0 || this.bulkRendering()) {
      return;
    }

    this.bulkRendering.set(true);
    let completed = 0;
    let successCount = 0;

    for (const template of templates) {
      this.api
        .executeTemplate(template.id)
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          finalize(() => {
            completed += 1;
            if (completed >= templates.length) {
              this.bulkRendering.set(false);
              if (successCount > 0) {
                this.message.success(`已渲染 ${successCount} 个模板`);
              } else {
                this.message.error('模板渲染失败');
              }
            }
          }),
        )
        .subscribe({
          next: (res) => {
            successCount += 1;
            this.upsertBoardItem({
              id: res.template.id,
              title: res.template.title,
              naturalQuery: res.template.naturalQuery,
              sql: res.sql,
              params: res.params,
              block: res.block,
            });
          },
          error: () => {
            // 单个模板失败不阻塞其它模板渲染
          },
        });
    }
  }

  clearBoard(): void {
    this.boardItems.set([]);
  }

  removeBoardItem(id: string, event?: Event): void {
    this.stopEvent(event);
    this.boardItems.update((items) => items.filter((item) => item.id !== id));
  }

  stopEvent(event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
  }

  private upsertBoardItem(next: TemplateBoardItem): void {
    const normalizedNext: TemplateBoardItem = {
      ...next,
      block: {
        ...next.block,
        title: next.title,
        description: next.naturalQuery,
      },
    };
    this.boardItems.update((items) => {
      const index = items.findIndex((item) => item.id === normalizedNext.id);
      if (index < 0) {
        return [normalizedNext, ...items];
      }
      const updated = [...items];
      updated[index] = normalizedNext;
      return updated;
    });
  }

  protected isCompactBlock(block: ReportBlock): boolean {
    return block.type === 'distribution_chart';
  }

  protected formatTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getDate()}`.padStart(2, '0');
    const hour = `${parsed.getHours()}`.padStart(2, '0');
    const minute = `${parsed.getMinutes()}`.padStart(2, '0');
    return `${month}-${day} ${hour}:${minute}`;
  }
}
