import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzStepsModule } from 'ng-zorro-antd/steps';

import type { SurveyEntity, SurveyQuestionEntity } from '../../models/survey.model';
import { SurveyApiService } from '../../services/survey-api.service';

interface PublicSurveyPage {
  index: number;
  title: string;
  questions: SurveyQuestionEntity[];
}

@Component({
  selector: 'app-public-survey-form-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzInputModule,
    NzRateModule,
    NzSelectModule,
    NzSpinModule,
    NzStepsModule,
  ],
  template: `
    <main class="public-survey">
      <section class="public-survey__card">
        @if (loading()) {
          <div class="public-survey__state">
            <nz-spin nzSimple></nz-spin>
            <span>正在加载问卷…</span>
          </div>
        } @else if (error()) {
          <div class="public-survey__state">
            <h2>问卷不可访问</h2>
            <p>{{ error() }}</p>
            <a nz-button routerLink="/login">返回登录页</a>
          </div>
        } @else if (submitted()) {
          <div class="public-survey__state">
            <h2>提交成功</h2>
            <p>感谢你的反馈。</p>
            <button nz-button nzType="primary" (click)="fillAgain()">再填一份</button>
          </div>
        } @else if (survey(); as currentSurvey) {
          <header class="public-survey__header">
            <h1>{{ currentSurvey.title }}</h1>
            <p>{{ currentSurvey.description || '请根据实际体验填写以下问题。' }}</p>
          </header>

          @if (pages().length > 1) {
            <section class="public-survey__steps-wrap">
              <nz-steps nzSize="small" [nzCurrent]="currentPageIndex()" class="public-survey__steps">
                @for (page of pages(); track page.index) {
                  <nz-step [nzTitle]="page.title"></nz-step>
                }
              </nz-steps>
            </section>
          }

          <form class="public-survey__form" (ngSubmit)="submit()">
            @if (currentPage(); as page) {
              @for (question of page.questions; track question.id) {
                <section class="survey-question">
                  <h3>
                    {{ question.sort + 1 }}. {{ question.title }}
                    @if (question.required) {
                      <span class="survey-question__required">*</span>
                    }
                  </h3>

                  @if (question.type === 'text') {
                    <input
                      nz-input
                      [name]="'q_' + question.id"
                      [ngModel]="valueOf(question.id)"
                      (ngModelChange)="setAnswer(question.id, $event)"
                      [placeholder]="question.placeholder || '请输入'"
                    />
                  }

                  @if (question.type === 'textarea') {
                    <textarea
                      nz-input
                      rows="4"
                      [name]="'q_' + question.id"
                      [ngModel]="valueOf(question.id)"
                      (ngModelChange)="setAnswer(question.id, $event)"
                      [placeholder]="question.placeholder || '请输入'"
                    ></textarea>
                  }

                  @if (question.type === 'single_choice') {
                    <nz-select
                      [name]="'q_' + question.id"
                      [ngModel]="valueOf(question.id)"
                      (ngModelChange)="setAnswer(question.id, $event)"
                      nzPlaceHolder="请选择"
                    >
                      @for (option of question.options; track option.id) {
                        <nz-option [nzValue]="option.value" [nzLabel]="option.label"></nz-option>
                      }
                    </nz-select>
                  }

                  @if (question.type === 'multi_choice') {
                    <nz-select
                      nzMode="multiple"
                      [name]="'q_' + question.id"
                      [ngModel]="valueOf(question.id)"
                      (ngModelChange)="setAnswer(question.id, $event)"
                      nzPlaceHolder="请选择（可多选）"
                      [nzMaxMultipleCount]="question.maxSelect || question.options.length"
                    >
                      @for (option of question.options; track option.id) {
                        <nz-option [nzValue]="option.value" [nzLabel]="option.label"></nz-option>
                      }
                    </nz-select>
                  }

                  @if (isScaleQuestion(question)) {
                    <div class="survey-question__scale">
                      @for (score of scaleItems(question); track score) {
                        <button
                          type="button"
                          class="survey-question__scale-item"
                          [class.survey-question__scale-item--active]="valueOf(question.id) === score"
                          (click)="setAnswer(question.id, score)"
                        >
                          {{ score }}
                        </button>
                      }
                    </div>
                  }

                  @if (question.type === 'rating' && !isScaleQuestion(question)) {
                    <div class="survey-question__rating">
                      <nz-rate
                        [ngModel]="valueOf(question.id)"
                        [ngModelOptions]="{ standalone: true }"
                        (ngModelChange)="setAnswer(question.id, $event)"
                      ></nz-rate>
                      <span>{{ valueOf(question.id) || 0 }} 分</span>
                    </div>
                  }
                </section>
              }
            }

            @if (isLastPage()) {
              <section class="survey-question">
                <h3>联系方式（选填）</h3>
                <input nz-input name="contact" [(ngModel)]="contact" placeholder="邮箱 / 企业微信 / 手机号" />
              </section>
            }

            @if (submitError()) {
              <div class="public-survey__error">{{ submitError() }}</div>
            }

            <div class="public-survey__actions">
              <button nz-button type="button" (click)="resetAnswers()">清空</button>

              @if (pages().length > 1) {
                <button nz-button type="button" (click)="previousPage()" [disabled]="currentPageIndex() === 0">上一页</button>
              }

              @if (!isLastPage()) {
                <button nz-button nzType="primary" type="button" (click)="nextPage()">下一页</button>
              } @else {
                <button nz-button nzType="primary" [nzLoading]="submitting()">提交问卷</button>
              }
            </div>
          </form>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .public-survey {
        min-height: 100vh;
        padding: 16px 10px;
        background:
          radial-gradient(circle at 10% 10%, rgba(14, 165, 233, 0.14), transparent 28%),
          radial-gradient(circle at 85% -5%, rgba(37, 99, 235, 0.12), transparent 32%),
          var(--bg-page);
      }
      .public-survey__card {
        max-width: 860px;
        margin: 0 auto;
        border: 1px solid var(--border-color-soft);
        border-radius: 14px;
        background: var(--surface-primary);
        box-shadow: var(--shadow-sm);
        padding: 16px;
      }
      .public-survey__state {
        min-height: 240px;
        display: grid;
        place-items: center;
        gap: 10px;
        text-align: center;
      }
      .public-survey__state h2 {
        margin: 0;
      }
      .public-survey__state p {
        margin: 0;
        color: var(--text-muted);
      }
      .public-survey__header h1 {
        margin: 0;
      }
      .public-survey__header p {
        margin: 8px 0 0;
        color: var(--text-muted);
        white-space: pre-wrap;
      }
      .public-survey__steps-wrap {
        margin-top: 14px;
      }
      .public-survey__form {
        margin-top: 16px;
        display: grid;
        gap: 12px;
      }
      .survey-question {
        border: 1px solid var(--border-color-soft);
        border-radius: 10px;
        padding: 12px;
      }
      .survey-question h3 {
        margin: 0;
        font-size: 15px;
      }
      .survey-question__required {
        color: #ef4444;
        font-weight: 700;
        margin-left: 4px;
      }
      .survey-question nz-select {
        width: 100%;
      }
      :host ::ng-deep .survey-question .ant-select {
        width: 100%;
      }
      .survey-question p {
        margin: 8px 0 10px;
        color: var(--text-muted);
        white-space: pre-wrap;
      }
      .survey-question textarea {
        resize: none;
      }
      .survey-question__rating {
        display: inline-flex;
        align-items: center;
        gap: 10px;
      }
      .survey-question__scale {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .survey-question__scale-item {
        width: 34px;
        height: 34px;
        border-radius: 50%;
        border: 1px solid #cbd5e1;
        background: #fff;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .survey-question__scale-item:hover,
      .survey-question__scale-item--active {
        border-color: #6366f1;
        color: #4f46e5;
        background: #eef2ff;
      }
      .public-survey__error {
        color: var(--color-error);
      }
      .public-survey__actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      @media (max-width: 768px) {
        .public-survey__actions {
          flex-direction: column;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicSurveyFormPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly surveyApi = inject(SurveyApiService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly error = signal('');
  readonly submitError = signal('');
  readonly survey = signal<SurveyEntity | null>(null);
  readonly currentPageIndex = signal(0);

  readonly pages = computed<PublicSurveyPage[]>(() => {
    const currentSurvey = this.survey();
    if (!currentSurvey) {
      return [];
    }

    const grouped = new Map<number, SurveyQuestionEntity[]>();
    for (const question of currentSurvey.questions.slice().sort((a, b) => a.sort - b.sort)) {
      const pageIndex = this.parsePageIndex(question.key);
      const list = grouped.get(pageIndex) ?? [];
      list.push(question);
      grouped.set(pageIndex, list);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, questions], index) => ({
        index,
        title: this.resolvePageTitle(questions, index),
        questions,
      }));
  });

  readonly currentPage = computed<PublicSurveyPage | null>(() => this.pages()[this.currentPageIndex()] ?? null);

  contact = '';
  private answers: Record<string, unknown> = {};

  constructor() {
    this.route.paramMap.subscribe((params) => {
      const slug = (params.get('slug') || '').trim();
      if (!slug) {
        this.loading.set(false);
        this.error.set('问卷标识缺失。');
        return;
      }
      this.fetchSurvey(slug);
    });
  }

  private fetchSurvey(slug: string): void {
    this.loading.set(true);
    this.error.set('');
    this.submitted.set(false);
    this.submitError.set('');
    this.contact = '';
    this.answers = {};
    this.currentPageIndex.set(0);

    this.surveyApi.getPublicBySlug(slug).subscribe({
      next: (survey) => {
        this.loading.set(false);
        this.survey.set(survey);
        this.currentPageIndex.set(0);
        this.initializeAnswers(survey.questions);
      },
      error: (err: { error?: { message?: string } }) => {
        this.loading.set(false);
        this.survey.set(null);
        this.error.set(err?.error?.message || '问卷不存在或已下线。');
      },
    });
  }

  valueOf(questionId: string): unknown {
    return this.answers[questionId];
  }

  setAnswer(questionId: string, value: unknown): void {
    this.answers = {
      ...this.answers,
      [questionId]: value,
    };
  }

  previousPage(): void {
    if (this.currentPageIndex() <= 0) {
      return;
    }
    this.submitError.set('');
    this.currentPageIndex.update((index) => Math.max(0, index - 1));
  }

  nextPage(): void {
    const page = this.currentPage();
    if (!page) {
      return;
    }

    const pageValidationError = this.validateRequiredQuestions(page.questions);
    if (pageValidationError) {
      this.submitError.set(pageValidationError);
      return;
    }

    this.submitError.set('');
    this.currentPageIndex.update((index) => Math.min(this.pages().length - 1, index + 1));
  }

  isLastPage(): boolean {
    const pageCount = this.pages().length;
    if (pageCount <= 1) {
      return true;
    }
    return this.currentPageIndex() >= pageCount - 1;
  }

  submit(): void {
    const currentSurvey = this.survey();
    if (!currentSurvey) {
      return;
    }

    const validationError = this.validateRequiredQuestions(currentSurvey.questions);
    if (validationError) {
      this.submitError.set(validationError);
      return;
    }

    const answers = currentSurvey.questions
      .map((question) => ({
        questionId: question.id,
        value: this.answers[question.id],
      }))
      .filter((item) => this.hasAnswer(item.value));

    this.submitting.set(true);
    this.submitError.set('');
    this.surveyApi
      .submitPublicBySlug(currentSurvey.slug, {
        contact: this.contact.trim() || undefined,
        answers,
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.submitted.set(true);
        },
        error: (err: { error?: { message?: string } }) => {
          this.submitting.set(false);
          this.submitError.set(err?.error?.message || '提交失败，请稍后重试。');
        },
      });
  }

  resetAnswers(): void {
    const currentSurvey = this.survey();
    if (!currentSurvey) {
      return;
    }
    this.contact = '';
    this.submitError.set('');
    this.currentPageIndex.set(0);
    this.initializeAnswers(currentSurvey.questions);
  }

  fillAgain(): void {
    this.submitted.set(false);
    this.resetAnswers();
  }

  private validateRequiredQuestions(questions: SurveyQuestionEntity[]): string | null {
    for (const question of questions) {
      const value = this.answers[question.id];
      if (question.required && !this.hasAnswer(value)) {
        return `请填写必填题：${question.title}`;
      }
    }
    return null;
  }

  private hasAnswer(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  private initializeAnswers(questions: SurveyQuestionEntity[]): void {
    const next: Record<string, unknown> = {};
    for (const question of questions) {
      if (question.type === 'multi_choice') {
        next[question.id] = [];
      } else if (question.type === 'rating' || question.type === 'scale') {
        next[question.id] = question.required ? question.minValue ?? 1 : null;
      } else {
        next[question.id] = '';
      }
    }
    this.answers = next;
  }

  private parsePageIndex(key: string): number {
    const normalized = (key || '').trim();
    const match = /^p(\d+)_q\d+$/i.exec(normalized);
    if (!match) {
      return 0;
    }
    const parsed = Number(match[1]);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return 0;
    }
    return parsed - 1;
  }

  private resolvePageTitle(questions: SurveyQuestionEntity[], index: number): string {
    const customTitle = questions.map((question) => (question.pageTitle || '').trim()).find((title) => title.length > 0);
    return customTitle || `第 ${index + 1} 页`;
  }

  isScaleQuestion(question: SurveyQuestionEntity): boolean {
    if (question.type === 'scale') {
      return true;
    }
    if (question.type !== 'rating') {
      return false;
    }
    return (question.maxValue ?? 5) > 5;
  }

  scaleItems(question: SurveyQuestionEntity): number[] {
    const min = Math.max(1, question.minValue ?? 1);
    const max = Math.max(min, question.maxValue ?? 10);
    const safeMax = Math.min(10, max);
    return Array.from({ length: safeMax - min + 1 }, (_, idx) => min + idx);
  }
}
