import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzDrawerModule } from 'ng-zorro-antd/drawer';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';

import type { AttentionItem, MetricItem, StageOverview, SummaryBlock } from '../models/delivery-overview.model';
import { DeliveryOverviewExportService } from '../services/delivery-overview-export.service';
import {
  DeliveryWeeklyReportApiService,
  type DeliveryWeeklyReportEntity,
} from '../services/delivery-weekly-report-api.service';

@Component({
  selector: 'app-delivery-overview-history-drawer',
  imports: [NzButtonModule, NzDrawerModule, NzIconModule, NzPaginationModule, NzPopconfirmModule],
  template: `
    <nz-drawer
      [nzVisible]="open()"
      [nzClosable]="false"
      [nzMaskClosable]="true"
      [nzMask]="false"
      [nzWidth]="900"
      [nzWrapClassName]="'delivery-history-drawer'"
      [nzBodyStyle]="drawerBodyStyle"
      [nzTitle]="drawerTitleTpl"
      (nzOnClose)="close.emit()"
    >
      <ng-template #drawerTitleTpl>
        <div class="detail-drawer__title">
          <div class="detail-drawer__title-main">
            <span class="detail-drawer__subtitle">周报</span>
            <strong>历史周报</strong>
          </div>
          <div class="detail-drawer__actions">
            <button type="button" class="detail-drawer__icon-btn" title="刷新" (click)="reload()" [disabled]="loading()">
              <span nz-icon [nzType]="loading() ? 'loading' : 'reload'"></span>
            </button>
            <button type="button" class="detail-drawer__close" title="关闭" (click)="close.emit()">
              <span nz-icon nzType="close"></span>
            </button>
          </div>
        </div>
      </ng-template>

      <ng-container *nzDrawerContent>
        @if (!projectId()) {
          <div class="empty-state">请先选择项目。</div>
        } @else if (loading()) {
          <div class="empty-state">正在加载历史周报…</div>
        } @else if (items().length === 0) {
          <div class="empty-state">暂无历史周报。</div>
        } @else {
          <div class="history-table-wrap">
            <table class="history-table">
              <thead>
                <tr>
                  <th>周报</th>
                  <th class="col-period">周期</th>
                  <th class="col-owner">生成人</th>
                  <th class="col-created">生成时间</th>
                  <th class="col-actions">操作</th>
                </tr>
              </thead>
              <tbody>
                @for (item of items(); track item.id) {
                  <tr>
                    <td>
                      <strong>{{ item.title }}</strong>
                      <span>{{ summaryPreview(item) }}</span>
                    </td>
                    <td class="nowrap">{{ item.periodStart }} 至 {{ item.periodEnd }}</td>
                    <td class="col-owner">{{ item.createdByName || item.createdById }}</td>
                    <td class="nowrap">{{ formatDateTime(item.createdAt) }}</td>
                    <td class="col-actions">
                      <div class="row-actions">
                        <button
                          nz-button
                          nzType="text"
                          nzSize="small"
                          class="row-action-btn"
                          type="button"
                          title="导出图片"
                          nz-popconfirm
                          nzPopconfirmTitle="确认导出这份历史周报图片？"
                          nzPopconfirmOkText="导出"
                          nzPopconfirmCancelText="取消"
                          nzPopconfirmPlacement="left"
                          [disabled]="isExporting(item.id)"
                          (nzOnConfirm)="exportReportImage(item)"
                        >
                          <span nz-icon [nzType]="exportingImageId() === item.id ? 'loading' : 'picture'"></span>
                        </button>
                        <button
                          nz-button
                          nzType="text"
                          nzSize="small"
                          class="row-action-btn"
                          type="button"
                          title="导出 PDF"
                          nz-popconfirm
                          nzPopconfirmTitle="确认导出这份历史周报 PDF？"
                          nzPopconfirmOkText="导出"
                          nzPopconfirmCancelText="取消"
                          nzPopconfirmPlacement="left"
                          [disabled]="isExporting(item.id)"
                          (nzOnConfirm)="exportReportPdf(item)"
                        >
                          <span nz-icon [nzType]="exportingPdfId() === item.id ? 'loading' : 'file-pdf'"></span>
                        </button>
                        <button
                          nz-button
                          nzType="text"
                          nzSize="small"
                          class="row-action-btn row-action-btn--danger"
                          type="button"
                          title="删除"
                          nz-popconfirm
                          nzPopconfirmTitle="确认删除这份历史周报？删除后不可恢复。"
                          nzPopconfirmOkText="删除"
                          nzPopconfirmCancelText="取消"
                          nzPopconfirmPlacement="left"
                          [disabled]="!canDelete() || deletingId() === item.id"
                          (nzOnConfirm)="deleteReport(item)"
                        >
                          <span nz-icon [nzType]="deletingId() === item.id ? 'loading' : 'delete'"></span>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="pager">
            <nz-pagination
              [nzTotal]="total()"
              [nzPageIndex]="page()"
              [nzPageSize]="pageSize()"
              [nzPageSizeOptions]="[10, 20, 50, 100]"
              [nzShowSizeChanger]="true"
              [nzShowTotal]="totalTpl"
              (nzPageIndexChange)="onPageIndexChange($event)"
              (nzPageSizeChange)="onPageSizeChange($event)"
            ></nz-pagination>
            <ng-template #totalTpl let-total>共 {{ total }} 条</ng-template>
          </div>
        }
      </ng-container>
    </nz-drawer>
  `,
  styles: [
    `
      .detail-drawer__title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .detail-drawer__title-main {
        display: flex;
        flex-direction: row;
        gap: 4px;
        align-items: center;
      }
      .detail-drawer__title-main strong {
        color: var(--text-primary);
        font-size: 18px;
        line-height: 1.2;
      }
      .detail-drawer__subtitle {
        color: var(--text-muted);
        font-size: 12px;
        line-height: 1.4;
        background: var(--gray-100);
        padding: 3px 8px;
        border-radius: 4px;
        white-space: nowrap;
      }
      .detail-drawer__actions {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .detail-drawer__icon-btn,
      .detail-drawer__close {
        width: 36px;
        height: 36px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        border-radius: 999px;
        transition: var(--transition-base);
      }
      .detail-drawer__icon-btn:hover,
      .detail-drawer__close:hover {
        background: var(--bg-subtle);
        color: var(--text-primary);
      }
      .detail-drawer__icon-btn:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .empty-state {
        padding: 56px 16px;
        text-align: center;
        color: var(--text-muted);
      }
      .history-table-wrap {
        overflow-x: auto;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        background: var(--bg-container);
      }
      .history-table {
        width: 100%;
        min-width: 760px;
        border-collapse: separate;
        border-spacing: 0;
        table-layout: fixed;
      }
      th,
      td {
        padding: 12px 14px;
        border-bottom: 1px solid var(--border-color-soft);
        text-align: left;
        vertical-align: middle;
        font-size: 13px;
      }
      th {
        background: var(--bg-subtle);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }
      tbody tr:last-child td {
        border-bottom: 0;
      }
      td strong {
        display: block;
        color: var(--text-heading);
        line-height: 1.4;
      }
      td span {
        display: block;
        margin-top: 4px;
        color: var(--text-muted);
        line-height: 1.5;
      }
      .col-period {
        width: 190px;
      }
      .col-owner {
        width: 84px;
      }
      .col-created {
        width: 150px;
      }
      .col-actions {
        width: 116px;
        text-align: center;
      }
      .nowrap {
        white-space: nowrap;
      }
      .row-actions {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .row-action-btn {
        width: 30px;
        height: 30px;
        padding: 0;
      }
      .row-action-btn--danger {
        color: var(--danger-color, #ef4444);
      }
      .pager {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        padding: 16px 0 4px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewHistoryDrawerComponent {
  readonly open = input(false);
  readonly projectId = input<string | null>(null);
  readonly canDelete = input(false);
  readonly refreshKey = input(0);
  readonly close = output<void>();

  private readonly api = inject(DeliveryWeeklyReportApiService);
  private readonly exportService = inject(DeliveryOverviewExportService);
  private readonly message = inject(NzMessageService);

  readonly drawerBodyStyle = { padding: '18px 20px 24px', overflow: 'auto' };
  readonly items = signal<DeliveryWeeklyReportEntity[]>([]);
  readonly loading = signal(false);
  readonly deletingId = signal<string | null>(null);
  readonly exportingImageId = signal<string | null>(null);
  readonly exportingPdfId = signal<string | null>(null);
  readonly page = signal(1);
  readonly pageSize = signal(10);
  readonly total = signal(0);
  readonly totalPages = signal(1);

  constructor() {
    effect(() => {
      const open = this.open();
      const projectId = this.projectId();
      this.refreshKey();
      if (!open || !projectId) {
        return;
      }
      untracked(() => {
        this.page.set(1);
        void this.load(projectId, 1);
      });
    });
  }

  reload(): void {
    const projectId = this.projectId();
    if (!projectId) return;
    void this.load(projectId, this.page());
  }

  onPageIndexChange(page: number): void {
    const projectId = this.projectId();
    if (!projectId || page === this.page()) return;
    this.page.set(page);
    void this.load(projectId, page);
  }

  onPageSizeChange(pageSize: number): void {
    const projectId = this.projectId();
    const nextPageSize = Number(pageSize) || this.pageSize();
    if (!projectId || nextPageSize === this.pageSize()) return;
    this.pageSize.set(nextPageSize);
    this.page.set(1);
    void this.load(projectId, 1);
  }

  async deleteReport(item: DeliveryWeeklyReportEntity): Promise<void> {
    if (!this.canDelete() || this.deletingId()) return;
    this.deletingId.set(item.id);
    try {
      await firstValueFrom(this.api.deleteSnapshot(item.id));
      this.message.success('历史周报已删除');
      const nextPage = this.items().length === 1 && this.page() > 1 ? this.page() - 1 : this.page();
      this.page.set(nextPage);
      const projectId = this.projectId();
      if (projectId) {
        await this.load(projectId, nextPage);
      }
    } catch (error) {
      this.message.error(error instanceof Error ? error.message : '删除历史周报失败');
    } finally {
      this.deletingId.set(null);
    }
  }

  async exportReportImage(item: DeliveryWeeklyReportEntity): Promise<void> {
    if (this.isExporting(item.id)) return;
    this.exportingImageId.set(item.id);
    const { container, element } = this.createHistoryExportElement(item);
    try {
      await this.exportService.exportPng(element, this.buildExportFilename(item, 'png'));
    } catch (error) {
      this.message.error(error instanceof Error ? error.message : '导出历史周报图片失败');
    } finally {
      container.remove();
      this.exportingImageId.set(null);
    }
  }

  async exportReportPdf(item: DeliveryWeeklyReportEntity): Promise<void> {
    if (this.isExporting(item.id)) return;
    this.exportingPdfId.set(item.id);
    const { container, element } = this.createHistoryExportElement(item);
    try {
      await this.exportService.exportPdf(element, this.buildExportFilename(item, 'pdf'));
    } catch (error) {
      this.message.error(error instanceof Error ? error.message : '导出历史周报 PDF 失败');
    } finally {
      container.remove();
      this.exportingPdfId.set(null);
    }
  }

  isExporting(id: string): boolean {
    return this.exportingImageId() === id || this.exportingPdfId() === id;
  }

  summaryPreview(item: DeliveryWeeklyReportEntity): string {
    const first = item.summary.find((summary) => summary.content?.trim());
    return first ? `${first.title}：${first.content}` : '无摘要内容';
  }

  formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${date.getFullYear()}-${this.pad(date.getMonth() + 1)}-${this.pad(date.getDate())} ${this.pad(date.getHours())}:${this.pad(date.getMinutes())}`;
  }

  private async load(projectId: string, page: number): Promise<void> {
    if (this.loading()) return;
    this.loading.set(true);
    try {
      const result = await firstValueFrom(this.api.listSnapshots({ projectId, page, pageSize: this.pageSize() }));
      this.items.set(result.items);
      this.total.set(result.total);
      this.page.set(result.page);
      this.pageSize.set(result.pageSize);
      this.totalPages.set(Math.max(1, Math.ceil(result.total / result.pageSize)));
    } catch (error) {
      this.message.error(error instanceof Error ? error.message : '加载历史周报失败');
      this.items.set([]);
      this.total.set(0);
      this.totalPages.set(1);
    } finally {
      this.loading.set(false);
    }
  }

  private createHistoryExportElement(item: DeliveryWeeklyReportEntity): { container: HTMLElement; element: HTMLElement } {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-2000px';
    container.style.top = '0';
    container.style.width = '1440px';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '2147483647';

    const root = this.createElement('section', 'history-export');
    this.appendExportStyles(root);
    root.append(
      this.createExportHero(item),
      this.createMetricsSection(item.metrics),
      this.createSummarySection(item.summary),
      this.createStagesSection(item.stages),
      this.createKeyItemsSection(item.keyItems),
      this.createAttentionSection(item.attentions),
    );
    container.appendChild(root);
    document.body.appendChild(container);
    return { container, element: root };
  }

  private appendExportStyles(root: HTMLElement): void {
    const style = document.createElement('style');
    style.textContent = `
      .history-export {
        width: 1440px;
        box-sizing: border-box;
        display: grid;
        gap: 20px;
        padding: 24px;
        background: #f5f7fb;
        color: #0f172a;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .history-export * { box-sizing: border-box; }
      .history-export__hero,
      .history-export__panel {
        background: #ffffff;
        border: 1px solid #dbe4f0;
        border-radius: 12px;
        box-shadow: 0 16px 36px rgba(15, 23, 42, 0.05);
        overflow: hidden;
      }
      .history-export__hero { padding: 22px; }
      .history-export__meta { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; color: #64748b; font-size: 13px; margin-bottom: 8px; }
      .history-export__tag { display: inline-flex; align-items: center; min-height: 24px; padding: 0 8px; border-radius: 999px; background: #eef2ff; color: #4f46e5; font-size: 12px; font-weight: 700; }
      .history-export h1 { margin: 0; color: #0f172a; font-size: 24px; line-height: 1.25; letter-spacing: 0; }
      .history-export__hero p { margin: 8px 0 0; color: #64748b; line-height: 1.6; }
      .history-export__panel-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #dbe4f0; }
      .history-export__panel-header h2 { margin: 0; color: #0f172a; font-size: 15px; font-weight: 700; }
      .history-export__panel-count { padding: 1px 8px; border-radius: 999px; background: #f1f5f9; color: #64748b; font-size: 12px; }
      .history-export__metrics { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 14px; }
      .history-export__metric { min-height: 108px; padding: 16px; background: #ffffff; border: 1px solid #dbe4f0; border-radius: 12px; }
      .history-export__metric span { color: #64748b; font-size: 13px; font-weight: 700; }
      .history-export__metric strong { display: block; margin-top: 10px; color: #0f172a; font-size: 28px; line-height: 1.1; }
      .history-export__metric p { margin: 8px 0 0; color: #94a3b8; font-size: 12px; line-height: 1.5; }
      .history-export__summary,
      .history-export__stages,
      .history-export__attention { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; padding: 18px; }
      .history-export__summary-card,
      .history-export__stage-card,
      .history-export__attention-card { padding: 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
      .history-export__summary-card h3 { margin: 0; color: #0f172a; font-size: 14px; }
      .history-export__summary-card p { margin: 10px 0 0; color: #475569; line-height: 1.7; min-height: 54px; }
      .history-export__summary-card div { margin-top: 12px; padding-top: 10px; border-top: 1px dashed #dbe4f0; color: #94a3b8; font-size: 12px; }
      .history-export__stage-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; color: #64748b; font-size: 12px; font-weight: 700; margin-bottom: 10px; }
      .history-export__stage-top strong { color: #0f172a; font-size: 20px; }
      .history-export__bar { height: 7px; border-radius: 999px; background: #dbe4f0; overflow: hidden; }
      .history-export__bar span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #4f46e5, #0ea5e9); }
      .history-export__stage-foot { margin-top: 9px; color: #94a3b8; font-size: 12px; }
      .history-export__table-wrap { overflow: hidden; }
      .history-export table { width: 100%; border-collapse: separate; border-spacing: 0; }
      .history-export th,
      .history-export td { padding: 13px 14px; border-bottom: 1px solid #e2e8f0; text-align: left; vertical-align: middle; font-size: 13px; }
      .history-export th { background: #f1f5f9; color: #64748b; font-size: 12px; font-weight: 700; white-space: nowrap; }
      .history-export tbody tr:last-child td { border-bottom: 0; }
      .history-export__rd-no { color: #94a3b8; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12px; }
      .history-export__rd-title { margin-top: 3px; color: #0f172a; font-weight: 700; }
      .history-export__progress { display: flex; align-items: center; gap: 8px; min-width: 130px; }
      .history-export__progress .history-export__bar { flex: 1; }
      .history-export__health { display: inline-flex; min-height: 24px; align-items: center; padding: 0 8px; border-radius: 999px; background: #dcfce7; color: #16a34a; font-size: 12px; font-weight: 700; white-space: nowrap; }
      .history-export__note { display: block; max-width: 320px; color: #64748b; line-height: 1.45; }
      .history-export__attention-card strong { display: block; color: #0f172a; font-size: 14px; }
      .history-export__attention-card p { margin: 8px 0 0; color: #475569; line-height: 1.6; }
      .history-export__attention-card span { display: block; margin-top: 10px; color: #94a3b8; font-size: 12px; }
      .history-export .empty-state { padding: 32px 16px; text-align: center; color: #94a3b8; }
    `;
    root.appendChild(style);
  }

  private createExportHero(item: DeliveryWeeklyReportEntity): HTMLElement {
    const hero = this.createElement('header', 'history-export__hero');
    const meta = this.createElement('div', 'history-export__meta');
    meta.append(
      this.createTextElement('span', 'history-export__tag', item.projectKey),
      this.createTextElement('span', '', `周报周期：${item.periodStart} 至 ${item.periodEnd}`),
      this.createTextElement('span', 'history-export__tag', '历史周报'),
      this.createTextElement('span', 'history-export__tag', `生成于 ${this.formatDateTime(item.createdAt)}`),
    );
    hero.append(
      meta,
      this.createTextElement('h1', '', `${item.projectName} · 周报`),
      this.createTextElement('p', '', '本文件根据生成周报时的项目快照导出，历史内容不会随当前研发项变化。'),
    );
    return hero;
  }

  private createMetricsSection(metrics: MetricItem[]): HTMLElement {
    const wrapper = this.createElement('section', 'history-export__metrics');
    for (const metric of metrics) {
      const card = this.createElement('div', 'history-export__metric');
      card.append(
        this.createTextElement('span', '', metric.label),
        this.createTextElement('strong', '', String(metric.value)),
        this.createTextElement('p', '', metric.hint),
      );
      wrapper.appendChild(card);
    }
    return wrapper;
  }

  private createSummarySection(summaries: SummaryBlock[]): HTMLElement {
    const panel = this.createPanel('周报摘要');
    const grid = this.createElement('div', 'history-export__summary');
    for (const summary of summaries) {
      const card = this.createElement('div', 'history-export__summary-card');
      card.append(
        this.createTextElement('h3', '', summary.title),
        this.createTextElement('p', '', summary.content),
        this.createTextElement('div', '', summary.meta),
      );
      grid.appendChild(card);
    }
    panel.appendChild(grid);
    return panel;
  }

  private createStagesSection(stages: StageOverview[]): HTMLElement {
    const panel = this.createPanel('研发项阶段分布', String(stages.reduce((sum, stage) => sum + stage.count, 0)));
    const grid = this.createElement('div', 'history-export__stages');
    for (const stage of stages) {
      const card = this.createElement('div', 'history-export__stage-card');
      const top = this.createElement('div', 'history-export__stage-top');
      top.append(this.createTextElement('span', '', stage.name), this.createTextElement('strong', '', String(stage.count)));
      card.append(
        top,
        this.createProgressBar(stage.averageProgress),
        this.createTextElement('div', 'history-export__stage-foot', `平均进度 ${stage.averageProgress}%${stage.blockedCount > 0 ? ` · ${stage.blockedCount} 项阻塞` : ''}`),
      );
      grid.appendChild(card);
    }
    panel.appendChild(grid);
    return panel;
  }

  private createKeyItemsSection(items: DeliveryWeeklyReportEntity['keyItems']): HTMLElement {
    const panel = this.createPanel('关键研发项进度');
    const tableWrap = this.createElement('div', 'history-export__table-wrap');
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    for (const label of ['研发项', '阶段', '进度', '健康状态', '进展说明']) {
      headerRow.appendChild(this.createTextElement('th', '', label));
    }
    thead.appendChild(headerRow);
    const tbody = document.createElement('tbody');
    for (const item of items) {
      const row = document.createElement('tr');
      const titleCell = document.createElement('td');
      titleCell.append(
        this.createTextElement('div', 'history-export__rd-no', item.rdNo),
        this.createTextElement('div', 'history-export__rd-title', item.title),
      );
      const progressCell = document.createElement('td');
      const progress = this.createElement('div', 'history-export__progress');
      progress.append(this.createProgressBar(item.progress), this.createTextElement('strong', '', `${item.progress}%`));
      progressCell.appendChild(progress);
      const healthCell = document.createElement('td');
      healthCell.appendChild(this.createTextElement('span', 'history-export__health', item.healthLabel));
      const noteCell = document.createElement('td');
      noteCell.appendChild(this.createTextElement('span', 'history-export__note', item.reportNote));
      row.append(
        titleCell,
        this.createTextElement('td', '', item.stageName),
        progressCell,
        healthCell,
        noteCell,
      );
      tbody.appendChild(row);
    }
    table.append(thead, tbody);
    tableWrap.appendChild(table);
    panel.appendChild(tableWrap);
    return panel;
  }

  private createAttentionSection(items: AttentionItem[]): HTMLElement {
    const panel = this.createPanel('需关注', String(items.length));
    if (items.length === 0) {
      const empty = this.createTextElement('div', 'empty-state', '暂无阻塞或延期事项。');
      panel.appendChild(empty);
      return panel;
    }
    const grid = this.createElement('div', 'history-export__attention');
    for (const item of items) {
      const card = this.createElement('div', 'history-export__attention-card');
      card.append(
        this.createTextElement('strong', '', `${item.status} · ${item.title}`),
        this.createTextElement('p', '', item.description),
        this.createTextElement('span', '', `${item.owner} / ${item.target}`),
      );
      grid.appendChild(card);
    }
    panel.appendChild(grid);
    return panel;
  }

  private createPanel(title: string, count?: string): HTMLElement {
    const panel = this.createElement('section', 'history-export__panel');
    const header = this.createElement('header', 'history-export__panel-header');
    header.appendChild(this.createTextElement('h2', '', title));
    if (count) {
      header.appendChild(this.createTextElement('span', 'history-export__panel-count', count));
    }
    panel.appendChild(header);
    return panel;
  }

  private createProgressBar(progress: number): HTMLElement {
    const bar = this.createElement('div', 'history-export__bar');
    const fill = document.createElement('span');
    fill.style.width = `${Math.min(100, Math.max(0, Math.round(progress)))}%`;
    bar.appendChild(fill);
    return bar;
  }

  private createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, className: string): HTMLElementTagNameMap[K] {
    const element = document.createElement(tagName);
    if (className) {
      element.className = className;
    }
    return element;
  }

  private createTextElement<K extends keyof HTMLElementTagNameMap>(
    tagName: K,
    className: string,
    text: string,
  ): HTMLElementTagNameMap[K] {
    const element = this.createElement(tagName, className);
    element.textContent = text;
    return element;
  }

  private buildExportFilename(item: DeliveryWeeklyReportEntity, ext: 'png' | 'pdf'): string {
    return `${this.sanitizeFilename(item.projectName)}-周报-${item.periodStart}.${ext}`;
  }

  private sanitizeFilename(value: string): string {
    return value.replace(/[\\/:*?"<>|]/g, '_').trim() || '当前项目';
  }

  private pad(value: number): string {
    return String(value).padStart(2, '0');
  }
}
