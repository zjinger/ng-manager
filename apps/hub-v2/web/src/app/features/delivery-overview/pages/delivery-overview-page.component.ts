import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ProjectContextStore } from '@core/state';
import { ListStateComponent } from '@shared/ui';
import { DeliveryOverviewAttentionPanelComponent } from '../components/delivery-overview-attention-panel.component';
import { DeliveryOverviewHeroComponent } from '../components/delivery-overview-hero.component';
import { DeliveryOverviewKeyItemsPanelComponent } from '../components/delivery-overview-key-items-panel.component';
import { DeliveryOverviewLinksPanelComponent } from '../components/delivery-overview-links-panel.component';
import { DeliveryOverviewMetricsPanelComponent } from '../components/delivery-overview-metrics-panel.component';
import { DeliveryOverviewSnapshotPanelComponent } from '../components/delivery-overview-snapshot-panel.component';
import { DeliveryOverviewStagesPanelComponent } from '../components/delivery-overview-stages-panel.component';
import { DeliveryOverviewSummaryPanelComponent } from '../components/delivery-overview-summary-panel.component';
import type {
  AttentionItem,
  DeliveryOverviewVm,
  KeyRdItem,
  MetricItem,
  OverviewTone,
  StageOverview,
  SummaryBlock,
} from '../models/delivery-overview.model';
import { IssueApiService } from '../../issues/services/issue-api.service';
import type { RdItemEntity, RdStageEntity } from '../../rd/models/rd.model';
import { RdApiService } from '../../rd/services/rd-api.service';

const PAGE_SIZE = 100;
const MAX_RD_ITEMS = 1000;
const UNFINISHED_ISSUE_STATUS = ['open', 'in_progress', 'pending_update', 'resolved', 'verified', 'reopened'];

@Component({
  selector: 'app-delivery-overview-page',
  standalone: true,
  imports: [
    DeliveryOverviewAttentionPanelComponent,
    DeliveryOverviewHeroComponent,
    DeliveryOverviewKeyItemsPanelComponent,
    DeliveryOverviewLinksPanelComponent,
    DeliveryOverviewMetricsPanelComponent,
    DeliveryOverviewSnapshotPanelComponent,
    DeliveryOverviewStagesPanelComponent,
    DeliveryOverviewSummaryPanelComponent,
    ListStateComponent,
  ],
  template: `
    <section class="delivery-page">
      <app-delivery-overview-hero
        [projectCode]="projectCode()"
        [projectTitle]="projectTitle()"
        [reportPeriod]="reportPeriod()"
      />

      @if (!projectContext.currentProjectId()) {
        <app-list-state
          [empty]="true"
          emptyTitle="请先选择项目"
          emptyDescription="选择项目后再查看对应的研发项实施总览。"
        />
      } @else {
        <app-list-state [loading]="loading()" [empty]="false" loadingText="正在汇总项目实施进度…">
          @if (error()) {
            <section class="state-card state-card--error">
              <h2>实施总览加载失败</h2>
              <p>{{ error() }}</p>
              <button type="button" class="action-btn action-btn--primary" (click)="reload()">重新加载</button>
            </section>
          } @else {
            @if (vm(); as data) {
              @if (data.truncated) {
                <div class="notice">
                  当前项目共有 {{ data.totalRdCount }} 个研发项，本页展示前 {{ data.sampledRdCount }} 条的统计结果。
                </div>
              }

              <div class="overview-section">
                <app-delivery-overview-metrics-panel [vm]="data" />
              </div>

              <section class="content-grid overview-section">
                <div class="main-stack">
                  <app-delivery-overview-stages-panel
                    [stages]="data.stages"
                    [totalCount]="data.totalRdCount"
                  />
                  <app-delivery-overview-key-items-panel [items]="data.keyItems" />
                  <app-delivery-overview-summary-panel [summaries]="data.summaries" />
                </div>

                <aside class="side-stack">
                  <app-delivery-overview-attention-panel
                    [items]="data.attentions"
                    [count]="data.attentionCount"
                  />
                  <app-delivery-overview-snapshot-panel [vm]="data" />
                  <app-delivery-overview-links-panel />
                </aside>
              </section>
            }
          }
        </app-list-state>
      }
    </section>
  `,
  styles: [
    `
      .delivery-page {
        display: grid;
        gap: 20px;
      }
      .overview-section {
        display: block;
      }
      .overview-section + .overview-section {
        margin-top: 20px;
      }
      .content-grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 360px;
        gap: 20px;
        align-items: start;
      }
      .main-stack,
      .side-stack {
        display: grid;
        gap: 20px;
        min-width: 0;
      }
      .notice {
        padding: 10px 12px;
        border: 1px solid var(--color-warning-light);
        border-radius: var(--border-radius-sm);
        background: rgba(245, 158, 11, 0.12);
        color: var(--color-warning);
        font-size: 13px;
      }
      .state-card {
        padding: 24px;
        background: var(--bg-container);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-sm);
      }
      .state-card--error {
        border-color: var(--color-danger-light);
      }
      .state-card h2 {
        margin: 0;
        color: var(--text-heading);
      }
      .state-card p {
        margin: 8px 0 16px;
        color: var(--text-muted);
        line-height: 1.6;
      }
      .action-btn {
        height: 36px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius-sm);
        background: var(--bg-container);
        color: var(--text-secondary);
        padding: 0 12px;
        font-weight: 600;
        cursor: pointer;
      }
      .action-btn--primary {
        background: var(--primary-600);
        border-color: var(--primary-600);
        color: #fff;
      }
      @media (max-width: 1600px) {
        .content-grid {
          grid-template-columns: 1fr;
        }
        .side-stack {
          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        }
      }
      @media (max-width: 900px) {
        .side-stack {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryOverviewPageComponent {
  readonly projectContext = inject(ProjectContextStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly issueApi = inject(IssueApiService);
  private readonly rdApi = inject(RdApiService);

  readonly error = signal('');
  readonly loading = signal(false);
  readonly rdItems = signal<RdItemEntity[]>([]);
  readonly rdStages = signal<RdStageEntity[]>([]);
  readonly totalRdCount = signal(0);
  readonly truncated = signal(false);
  readonly unfinishedIssueCount = signal(0);

  private loadToken = 0;

  readonly projectCode = computed(() => {
    const project = this.projectContext.currentProject();
    return project?.displayCode || project?.projectNo || project?.projectKey || '未选择项目';
  });
  readonly projectTitle = computed(() => this.projectContext.currentProject()?.name ?? '当前项目');
  readonly reportPeriod = computed(() => this.formatReportPeriod(new Date()));
  readonly vm = computed<DeliveryOverviewVm | null>(() => {
    if (!this.projectContext.currentProjectId() || this.loading() || this.error()) return null;
    return this.buildVm(this.rdItems(), this.rdStages(), this.unfinishedIssueCount(), this.totalRdCount(), this.truncated());
  });

  constructor() {
    effect(() => this.loadForProject(this.projectContext.currentProjectId()));
    this.destroyRef.onDestroy(() => {
      this.loadToken++;
    });
  }

  reload(): void {
    this.loadForProject(this.projectContext.currentProjectId());
  }

  private async loadForProject(projectId: string | null): Promise<void> {
    const token = ++this.loadToken;
    this.resetState();
    if (!projectId) return;

    this.loading.set(true);
    try {
      const [stages, rdResult, issueCount] = await Promise.all([
        firstValueFrom(this.rdApi.listStages(projectId)),
        this.loadAllRdItems(projectId, token),
        this.loadUnfinishedIssueCount(projectId),
      ]);
      if (token !== this.loadToken) return;
      this.rdStages.set(stages);
      this.rdItems.set(rdResult.items);
      this.totalRdCount.set(rdResult.total);
      this.truncated.set(rdResult.truncated);
      this.unfinishedIssueCount.set(issueCount);
      this.loading.set(false);
    } catch (error) {
      if (token !== this.loadToken) return;
      this.loading.set(false);
      this.error.set(error instanceof Error ? error.message : '请稍后重试或返回 RD 页面查看明细。');
    }
  }

  private resetState(): void {
    this.error.set('');
    this.loading.set(false);
    this.rdItems.set([]);
    this.rdStages.set([]);
    this.totalRdCount.set(0);
    this.truncated.set(false);
    this.unfinishedIssueCount.set(0);
  }

  private async loadAllRdItems(
    projectId: string,
    token: number,
  ): Promise<{ items: RdItemEntity[]; total: number; truncated: boolean }> {
    const items: RdItemEntity[] = [];
    let page = 1;
    let total = 0;

    while (items.length < MAX_RD_ITEMS) {
      if (token !== this.loadToken) return { items, total, truncated: false };
      const result = await firstValueFrom(this.rdApi.listItems({ projectId, page, pageSize: PAGE_SIZE }));
      total = result.total;
      items.push(...result.items);
      if (items.length >= total || result.items.length === 0) break;
      page += 1;
    }

    return { items: items.slice(0, MAX_RD_ITEMS), total, truncated: total > MAX_RD_ITEMS };
  }

  private async loadUnfinishedIssueCount(projectId: string): Promise<number> {
    try {
      const result = await firstValueFrom(
        this.issueApi.list({
          projectId,
          page: 1,
          pageSize: 1,
          status: UNFINISHED_ISSUE_STATUS,
          sortBy: 'updatedAt',
          sortOrder: 'desc',
        }),
      );
      return result.total;
    } catch {
      return 0;
    }
  }

  private buildVm(
    items: RdItemEntity[],
    stages: RdStageEntity[],
    unfinishedIssueCount: number,
    totalRdCount: number,
    truncated: boolean,
  ): DeliveryOverviewVm {
    const activeItems = items.filter((item) => item.status !== 'closed');
    const completedCount = items.filter((item) => this.isCompleted(item)).length;
    const inProgressCount = items.filter((item) => this.isInProgress(item)).length;
    const attentionRows = items.filter((item) => this.needsAttention(item));
    const progress = activeItems.length
      ? Math.round(activeItems.reduce((sum, item) => sum + this.normalizeProgress(item.progress), 0) / activeItems.length)
      : 0;

    return {
      progress,
      metrics: this.buildMetrics(totalRdCount, items.length, completedCount, inProgressCount, attentionRows.length, unfinishedIssueCount, truncated),
      stages: this.buildStages(items, stages),
      keyItems: this.buildKeyItems(items, stages),
      attentions: this.buildAttentionItems(attentionRows),
      summaries: this.buildSummaries(items, attentionRows, unfinishedIssueCount, progress),
      completedCount,
      inProgressCount,
      attentionCount: attentionRows.length,
      unfinishedIssueCount,
      truncated,
      totalRdCount,
      sampledRdCount: items.length,
      headline: this.buildHeadline(progress, attentionRows.length),
      headlineDetail: this.buildHeadlineDetail(items, completedCount, inProgressCount, attentionRows.length),
      nextStep: this.buildNextStep(attentionRows, inProgressCount),
    };
  }

  private buildMetrics(
    total: number,
    sampled: number,
    completed: number,
    inProgress: number,
    attention: number,
    unfinishedIssues: number,
    truncated: boolean,
  ): MetricItem[] {
    return [
      { label: '本期研发项', value: total, hint: `当前展示 ${sampled} 项${truncated ? '，仅展示部分数据' : ''}`, icon: 'unordered-list', tone: 'blue' },
      { label: '已完成', value: completed, hint: '包含已完成、已关闭和 100% 进度', icon: 'check-circle', tone: 'green' },
      { label: '进行中', value: inProgress, hint: '开发、待确认或部分完成项', icon: 'sync', tone: 'blue' },
      { label: '需关注', value: attention, hint: '阻塞、延期或存在阻塞原因', icon: 'warning', tone: attention > 0 ? 'red' : 'green' },
      { label: '未关闭测试单', value: unfinishedIssues, hint: '用于判断测试风险', icon: 'bug', tone: unfinishedIssues > 0 ? 'orange' : 'green' },
    ];
  }

  private buildStages(items: RdItemEntity[], stages: RdStageEntity[]): StageOverview[] {
    const stageMap = new Map(stages.map((stage) => [stage.id, stage]));
    const grouped = new Map<string, RdItemEntity[]>();
    for (const item of items) {
      const key = item.stageId && stageMap.has(item.stageId) ? item.stageId : 'unassigned';
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }

    const result = stages
      .filter((stage) => stage.enabled)
      .sort((a, b) => a.sort - b.sort)
      .map((stage) => this.stageOverview(stage.id, stage.name, grouped.get(stage.id) ?? []));
    const unassigned = grouped.get('unassigned') ?? [];
    if (unassigned.length > 0 || result.length === 0) result.push(this.stageOverview('unassigned', '未分阶段', unassigned));
    return result;
  }

  private stageOverview(id: string, name: string, items: RdItemEntity[]): StageOverview {
    const averageProgress = items.length
      ? Math.round(items.reduce((sum, item) => sum + this.normalizeProgress(item.progress), 0) / items.length)
      : 0;
    return {
      id,
      name,
      count: items.length,
      averageProgress,
      blockedCount: items.filter((item) => item.status === 'blocked' || !!item.blockerReason?.trim()).length,
    };
  }

  private buildKeyItems(items: RdItemEntity[], stages: RdStageEntity[]): KeyRdItem[] {
    const stageMap = new Map(stages.map((stage) => [stage.id, stage.name]));
    return [...items]
      .sort((left, right) => this.keyItemRank(right) - this.keyItemRank(left))
      .slice(0, 8)
      .map((item) => {
        const late = this.isLate(item);
        const blocked = item.status === 'blocked' || !!item.blockerReason?.trim();
        const healthTone: OverviewTone = blocked ? 'red' : late ? 'orange' : this.isCompleted(item) ? 'green' : 'blue';
        return {
          item,
          stageName: item.stageId ? (stageMap.get(item.stageId) ?? '未分阶段') : '未分阶段',
          healthLabel: blocked ? '阻塞' : late ? '延期' : this.isCompleted(item) ? '已完成' : '按计划',
          healthTone,
          reportNote: this.reportNote(item, late, blocked),
          late,
        };
      });
  }

  private buildAttentionItems(items: RdItemEntity[]): AttentionItem[] {
    return items
      .sort((left, right) => this.keyItemRank(right) - this.keyItemRank(left))
      .slice(0, 4)
      .map((item) => {
        const blocked = item.status === 'blocked' || !!item.blockerReason?.trim();
        return {
          title: item.title,
          tone: blocked ? 'red' : 'orange',
          status: blocked ? '阻塞' : '延期',
          description: item.blockerReason?.trim() || (blocked ? '当前被阻塞，需要确认处理时间。' : '已超过计划完成时间，仍未完成。'),
          owner: item.assigneeName || item.creatorName || '未指定',
          target: item.planEndAt ? `目标 ${this.formatDate(item.planEndAt)}` : '暂无计划完成时间',
          routerLink: ['/rd', item.id],
        };
      });
  }

  private buildSummaries(
    items: RdItemEntity[],
    attentionRows: RdItemEntity[],
    unfinishedIssueCount: number,
    progress: number,
  ): SummaryBlock[] {
    const completed = items.filter((item) => this.isCompleted(item));
    const inProgress = items.filter((item) => this.isInProgress(item));
    const blocked = attentionRows.filter((item) => item.status === 'blocked' || !!item.blockerReason?.trim());
    const nextItems = [...inProgress]
      .sort((left, right) => this.normalizeProgress(right.progress) - this.normalizeProgress(left.progress))
      .slice(0, 3)
      .map((item) => item.title);

    return [
      {
        title: '本周进展',
        icon: 'check-circle',
        tone: 'green',
        content: completed.length > 0 ? `本周已完成 ${completed.length} 个研发项，当前整体进度 ${progress}%。` : `当前整体进度 ${progress}%，暂无已完成研发项。`,
        meta: '来自研发项完成状态',
      },
      {
        title: '下周计划',
        icon: 'rise',
        tone: 'blue',
        content: nextItems.length > 0 ? `优先推进 ${nextItems.join('、')}，推动关键研发项进入验证或验收。` : '暂无明确的下一阶段研发项计划。',
        meta: '来自进行中研发项',
      },
      {
        title: '风险事项',
        icon: 'warning',
        tone: attentionRows.length > 0 ? 'orange' : 'green',
        content: attentionRows.length > 0 ? `当前 ${attentionRows.length} 个研发项需关注，其中 ${blocked.length} 个存在阻塞；未关闭测试单 ${unfinishedIssueCount} 条。` : `当前暂无阻塞或延期研发项；未关闭测试单 ${unfinishedIssueCount} 条。`,
        meta: '包含研发项和测试单情况',
      },
      {
        title: '需协调事项',
        icon: 'team',
        tone: blocked.length > 0 ? 'red' : 'gray',
        content: blocked.length > 0 ? `请确认 ${blocked.slice(0, 2).map((item) => item.title).join('、')} 的阻塞处理时间。` : '暂无需要协调的阻塞事项。',
        meta: '聚焦待协调事项',
      },
    ];
  }

  private normalizeProgress(progress: number | null | undefined): number {
    const value = Number(progress ?? 0);
    return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : 0;
  }

  private isCompleted(item: RdItemEntity): boolean {
    return item.status === 'accepted' || item.status === 'closed' || this.normalizeProgress(item.progress) >= 100;
  }

  private isInProgress(item: RdItemEntity): boolean {
    if (this.isCompleted(item)) return false;
    const progress = this.normalizeProgress(item.progress);
    return item.status === 'doing' || item.status === 'done' || (progress > 0 && progress < 100);
  }

  private needsAttention(item: RdItemEntity): boolean {
    return item.status === 'blocked' || !!item.blockerReason?.trim() || this.isLate(item);
  }

  private isLate(item: RdItemEntity): boolean {
    if (!item.planEndAt || this.isCompleted(item)) return false;
    const date = new Date(item.planEndAt);
    if (Number.isNaN(date.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date.getTime() < today.getTime();
  }

  private keyItemRank(item: RdItemEntity): number {
    const blocked = item.status === 'blocked' || !!item.blockerReason?.trim() ? 10000 : 0;
    const late = this.isLate(item) ? 8000 : 0;
    const active = this.isInProgress(item) ? 1000 : 0;
    return blocked + late + active + this.normalizeProgress(item.progress);
  }

  private reportNote(item: RdItemEntity, late: boolean, blocked: boolean): string {
    if (blocked) return item.blockerReason?.trim() || '当前被阻塞，需要确认处理时间。';
    if (late) return '计划完成时间已过，需确认延期影响。';
    if (this.isCompleted(item)) return '已完成，可作为本周进展。';
    if (item.status === 'done') return '研发已完成，等待验收确认。';
    return '按当前研发进度推进。';
  }

  private buildHeadline(progress: number, attentionCount: number): string {
    if (attentionCount > 0) return '研发整体推进中，存在需关注事项';
    if (progress >= 80) return '研发整体进度良好，可进入交付收口';
    if (progress === 0) return '暂无研发推进数据';
    return '研发整体按计划推进';
  }

  private buildHeadlineDetail(items: RdItemEntity[], completed: number, inProgress: number, attentionCount: number): string {
    if (items.length === 0) return '当前项目下还没有研发项数据，建议先在 RD 页面建立研发项后再查看汇报视角。';
    return `当前统计 ${items.length} 个研发项，${completed} 个已完成，${inProgress} 个仍在推进，${attentionCount} 个需要关注。`;
  }

  private buildNextStep(attentionRows: RdItemEntity[], inProgressCount: number): string {
    if (attentionRows.length > 0) return `优先处理 ${attentionRows[0].title} 的阻塞或延期风险`;
    if (inProgressCount > 0) return '推进进行中研发项进入测试验证和验收确认';
    return '补充研发项计划或确认当前项目已完成交付';
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private formatReportPeriod(date: Date): string {
    const day = date.getDay() || 7;
    const start = new Date(date);
    start.setDate(date.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${this.formatMonthDay(start)} 至 ${this.formatMonthDay(end)}`;
  }

  private formatMonthDay(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
