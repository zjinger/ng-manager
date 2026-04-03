import { DatePipe } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import type { EChartsOption } from 'echarts';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzTagModule } from 'ng-zorro-antd/tag';

import { EchartsChartComponent, ListStateComponent, PageHeaderComponent, PageToolbarComponent, SearchBoxComponent } from '@shared/ui';
import type { SurveyEntity, SurveyQuestionStats, SurveySubmissionEntity, SurveySubmissionStatsResult } from '../../models/survey.model';
import { SurveyApiService } from '../../services/survey-api.service';

@Component({
  selector: 'app-survey-submissions-page',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    NzButtonModule,
    NzPaginationModule,
    NzTagModule,
    EchartsChartComponent,
    ListStateComponent,
    PageHeaderComponent,
    PageToolbarComponent,
    SearchBoxComponent,
  ],
  template: `
    <app-page-header
      title="问卷答卷"
      [subtitle]="survey() ? survey()!.title + ' · 共 ' + total() + ' 份明细（统计总数：' + (stats()?.totalSubmissions ?? 0) + '）' : '查看问卷提交结果'"
    />

    <app-page-toolbar>
      <button toolbar-primary nz-button (click)="backToList()">返回问卷列表</button>
      <button toolbar-primary nz-button nzType="primary" [nzLoading]="exporting()" [disabled]="!surveyId()" (click)="downloadCsv()">
        导出 CSV
      </button>
      <app-search-box
        toolbar-search
        placeholder="搜索联系方式 / IP / UA"
        [value]="keyword()"
        (valueChange)="keyword.set($event)"
        (submitted)="applyFilters()"
      />
    </app-page-toolbar>

    @if (statsLoading()) {
      <section class="stats-loading">正在加载统计信息…</section>
    } @else if (stats(); as summary) {
      <section class="stats-summary">
        <div class="stats-summary__headline">
          <div class="stats-card">
            <small>总提交数</small>
            <strong>{{ summary.totalSubmissions }}</strong>
          </div>
          <div class="stats-card">
            <small>题目数</small>
            <strong>{{ summary.questions.length }}</strong>
          </div>
        </div>

        <div class="stats-question-list">
          @for (question of summary.questions; track question.questionId) {
            <section class="stats-question-card">
              <header class="stats-question-card__header">
                <h3>{{ question.title }}</h3>
                <nz-tag>{{ question.answerCount }} 人作答</nz-tag>
              </header>

              @if (question.choiceStats.length > 0) {
                <app-echarts-chart [option]="choiceChartOption(question)" height="260px" />
              }

              @if (question.ratingStats; as rating) {
                <div class="stats-rating-meta">
                  <span>平均分：{{ rating.average }}</span>
                  <span>范围：{{ rating.min }} - {{ rating.max }}</span>
                </div>
                <app-echarts-chart [option]="ratingChartOption(question)" height="260px" />
              }

              @if (question.textStats; as textStats) {
                <div class="stats-text-meta">有效文本：{{ textStats.nonEmptyCount }}</div>
                @if (textStats.samples.length > 0) {
                  <ul class="stats-text-samples">
                    @for (sample of textStats.samples; track $index) {
                      <li>{{ sample }}</li>
                    }
                  </ul>
                } @else {
                  <div class="stats-text-empty">暂无文本样例</div>
                }
              }
            </section>
          }
        </div>
      </section>
    }

    <app-list-state
      [loading]="loading()"
      [empty]="items().length === 0"
      loadingText="正在加载答卷…"
      emptyTitle="暂无答卷"
      emptyDescription="发布后可通过公开链接收集答卷。"
    >
      <div class="submission-list">
        @for (item of items(); track item.id) {
          <section class="submission-card">
            <header class="submission-card__header">
              <div>
                <strong>{{ item.id }}</strong>
                <div class="submission-card__meta">
                  <span>提交时间：{{ item.submittedAt | date: 'yyyy-MM-dd HH:mm:ss' }}</span>
                  <span>联系方式：{{ item.contact || '-' }}</span>
                  <span>IP：{{ item.clientIp || '-' }}</span>
                </div>
              </div>
              <nz-tag>{{ item.answers.length }} 题已答</nz-tag>
            </header>

            <div class="submission-card__answers">
              @for (answer of item.answers; track answer.id) {
                <div class="submission-answer">
                  <div class="submission-answer__title">{{ answer.questionTitle }}</div>
                  <div class="submission-answer__value">{{ answer.answerText || answer.answerJson }}</div>
                </div>
              }
            </div>
          </section>
        }
      </div>

      @if (total() > 0) {
        <div class="submission-pagination">
          <nz-pagination
            [nzTotal]="total()"
            [nzPageIndex]="page()"
            [nzPageSize]="pageSize()"
            [nzShowQuickJumper]="true"
            [nzShowSizeChanger]="true"
            [nzPageSizeOptions]="[10, 20, 50]"
            [nzShowTotal]="totalTpl"
            (nzPageIndexChange)="onPageIndexChange($event)"
            (nzPageSizeChange)="onPageSizeChange($event)"
          ></nz-pagination>
          <ng-template #totalTpl let-total>共 {{ total }} 条</ng-template>
        </div>
      }
    </app-list-state>
  `,
  styles: [
    `
      .stats-loading {
        color: var(--text-muted);
        padding: 10px 0 14px;
      }
      .stats-summary {
        display: grid;
        gap: 12px;
        margin-bottom: 14px;
      }
      .stats-summary__headline {
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .stats-card {
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        background: var(--surface-primary);
        padding: 10px 12px;
      }
      .stats-card small {
        color: var(--text-muted);
      }
      .stats-card strong {
        display: block;
        margin-top: 4px;
        font-size: 20px;
      }
      .stats-question-list {
        display: grid;
        gap: 12px;
      }
      .stats-question-card {
        border: 1px solid var(--border-color-soft);
        border-radius: 12px;
        background: var(--surface-primary);
        padding: 12px;
      }
      .stats-question-card__header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }
      .stats-question-card__header h3 {
        margin: 0;
        font-size: 15px;
      }
      .stats-rating-meta,
      .stats-text-meta {
        margin: 6px 0;
        display: flex;
        gap: 12px;
        color: var(--text-muted);
        font-size: 13px;
      }
      .stats-text-samples {
        margin: 0;
        padding-left: 18px;
        color: var(--text-secondary);
        display: grid;
        gap: 6px;
      }
      .stats-text-empty {
        color: var(--text-muted);
      }
      .submission-list {
        display: grid;
        gap: 12px;
      }
      .submission-card {
        border: 1px solid var(--border-color-soft);
        border-radius: 12px;
        background: var(--surface-primary);
        padding: 12px;
      }
      .submission-card__header {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }
      .submission-card__meta {
        margin-top: 6px;
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        font-size: 12px;
        color: var(--text-muted);
      }
      .submission-card__answers {
        margin-top: 12px;
        border-top: 1px solid var(--border-color-soft);
        padding-top: 10px;
        display: grid;
        gap: 10px;
      }
      .submission-answer__title {
        font-weight: 600;
      }
      .submission-answer__value {
        margin-top: 4px;
        color: var(--text-secondary);
        white-space: pre-wrap;
      }
      .submission-pagination {
        display: flex;
        justify-content: flex-end;
        margin-top: 12px;
      }
      @media (max-width: 768px) {
        .stats-summary__headline {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SurveySubmissionsPageComponent {
  private readonly api = inject(SurveyApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly message = inject(NzMessageService);

  readonly surveyId = signal('');
  readonly survey = signal<SurveyEntity | null>(null);
  readonly stats = signal<SurveySubmissionStatsResult | null>(null);
  readonly statsLoading = signal(false);
  readonly exporting = signal(false);
  readonly loading = signal(false);
  readonly items = signal<SurveySubmissionEntity[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal(20);
  readonly keyword = signal('');

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const surveyId = (params.get('surveyId') || '').trim();
      this.surveyId.set(surveyId);
      this.page.set(1);
      this.loadSurvey(surveyId);
      this.loadStats();
      this.loadSubmissions();
    });
  }

  loadSurvey(surveyId: string): void {
    if (!surveyId) {
      this.survey.set(null);
      return;
    }
    this.api.getById(surveyId).subscribe({
      next: (survey) => this.survey.set(survey),
      error: () => this.survey.set(null),
    });
  }

  loadStats(): void {
    const surveyId = this.surveyId();
    if (!surveyId) {
      this.stats.set(null);
      return;
    }
    this.statsLoading.set(true);
    this.api.getSubmissionStats(surveyId).subscribe({
      next: (stats) => {
        this.statsLoading.set(false);
        this.stats.set(stats);
      },
      error: () => {
        this.statsLoading.set(false);
        this.stats.set(null);
      },
    });
  }

  loadSubmissions(): void {
    const surveyId = this.surveyId();
    if (!surveyId) {
      this.items.set([]);
      this.total.set(0);
      return;
    }
    this.loading.set(true);
    this.api
      .listSubmissions(surveyId, {
        page: this.page(),
        pageSize: this.pageSize(),
        keyword: this.keyword().trim(),
      })
      .subscribe({
        next: (result) => {
          this.loading.set(false);
          this.items.set(result.items);
          this.total.set(result.total);
        },
        error: () => {
          this.loading.set(false);
          this.items.set([]);
          this.total.set(0);
        },
      });
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadSubmissions();
  }

  onPageIndexChange(page: number): void {
    this.page.set(page);
    this.loadSubmissions();
  }

  onPageSizeChange(pageSize: number): void {
    this.page.set(1);
    this.pageSize.set(pageSize);
    this.loadSubmissions();
  }

  downloadCsv(): void {
    const surveyId = this.surveyId();
    if (!surveyId) {
      return;
    }
    this.exporting.set(true);
    this.api.exportSubmissionsCsv(surveyId).subscribe({
      next: (response) => {
        this.exporting.set(false);
        this.triggerDownload(response);
        this.message.success('CSV 导出成功');
      },
      error: () => {
        this.exporting.set(false);
        this.message.error('CSV 导出失败');
      },
    });
  }

  backToList(): void {
    void this.router.navigateByUrl('/surveys');
  }

  choiceChartOption(question: SurveyQuestionStats): EChartsOption {
    const labels = question.choiceStats.map((item) => item.label);
    const values = question.choiceStats.map((item) => item.count);
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: { interval: 0, rotate: labels.length > 5 ? 20 : 0 },
      },
      yAxis: { type: 'value', minInterval: 1 },
      series: [
        {
          type: 'bar',
          data: values,
          itemStyle: { color: '#2563eb' },
          barMaxWidth: 44,
        },
      ],
    };
  }

  ratingChartOption(question: SurveyQuestionStats): EChartsOption {
    const rating = question.ratingStats;
    if (!rating) {
      return {};
    }
    return {
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        data: rating.counts.map((item) => String(item.score)),
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
      },
      series: [
        {
          type: 'bar',
          data: rating.counts.map((item) => item.count),
          itemStyle: { color: '#0ea5e9' },
          barMaxWidth: 44,
        },
      ],
    };
  }

  private triggerDownload(response: HttpResponse<Blob>): void {
    const blob = response.body;
    if (!blob) {
      return;
    }
    const contentDisposition = response.headers.get('content-disposition');
    const fallbackName = `survey-submissions-${this.surveyId()}.csv`;
    const filename = this.resolveFilename(contentDisposition, fallbackName);

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  private resolveFilename(contentDisposition: string | null, fallback: string): string {
    if (!contentDisposition) {
      return fallback;
    }
    const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
    if (encodedMatch?.[1]) {
      try {
        return decodeURIComponent(encodedMatch[1]);
      } catch {
        return encodedMatch[1];
      }
    }
    const plainMatch = contentDisposition.match(/filename="([^"]+)"/i) || contentDisposition.match(/filename=([^;]+)/i);
    if (plainMatch?.[1]) {
      return plainMatch[1].trim();
    }
    return fallback;
  }
}
