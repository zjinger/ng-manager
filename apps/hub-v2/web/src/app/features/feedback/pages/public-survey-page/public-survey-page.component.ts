import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzRateModule } from 'ng-zorro-antd/rate';
import { NzSelectModule } from 'ng-zorro-antd/select';

import type { ApiSuccessResponse } from '@core/http';

type SurveyRole = 'developer' | 'tester' | 'pm' | 'ops' | 'other';
type SurveyUsageFrequency = 'daily' | 'weekly' | 'monthly' | 'first_time';
type SurveyFocusModule = 'dashboard' | 'issues' | 'rd' | 'content' | 'report' | 'other';

type SurveySubmitPayload = {
  nickname?: string;
  role: SurveyRole;
  usageFrequency: SurveyUsageFrequency;
  satisfaction: number;
  focusModules: SurveyFocusModule[];
  highlights?: string;
  improvement: string;
  contact?: string;
};

@Component({
  selector: 'app-public-survey-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, NzButtonModule, NzFormModule, NzInputModule, NzRateModule, NzSelectModule],
  template: `
    <main class="survey-page">
      <section class="survey-card">
        <header class="survey-header">
          <h1>Hub v2 体验问卷</h1>
          <p>欢迎匿名填写。你的反馈会直接进入 Hub v2 的反馈中心，帮助我们持续改进。</p>
        </header>

        @if (submitted()) {
          <section class="survey-success">
            <h2>提交成功</h2>
            <p>感谢你的时间，我们会认真处理这份问卷反馈。</p>
            <div class="survey-success__actions">
              <button nz-button nzType="primary" (click)="restart()">再填一份</button>
              <a nz-button routerLink="/login">返回登录页</a>
            </div>
          </section>
        } @else {
          <form nz-form [formGroup]="form" class="survey-form" (ngSubmit)="submit()">
            <nz-form-item>
              <nz-form-label [nzSpan]="24">你的称呼（选填）</nz-form-label>
              <nz-form-control [nzSpan]="24">
                <input nz-input formControlName="nickname" maxlength="40" placeholder="例如：小王 / 匿名用户" />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label [nzSpan]="24">你的角色</nz-form-label>
              <nz-form-control [nzSpan]="24">
                <nz-select formControlName="role">
                  <nz-option nzValue="developer" nzLabel="研发 / 工程师"></nz-option>
                  <nz-option nzValue="tester" nzLabel="测试 / 质量"></nz-option>
                  <nz-option nzValue="pm" nzLabel="产品 / 项目"></nz-option>
                  <nz-option nzValue="ops" nzLabel="运维 / 支持"></nz-option>
                  <nz-option nzValue="other" nzLabel="其他"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label [nzSpan]="24">使用频率</nz-form-label>
              <nz-form-control [nzSpan]="24">
                <nz-select formControlName="usageFrequency">
                  <nz-option nzValue="daily" nzLabel="每天"></nz-option>
                  <nz-option nzValue="weekly" nzLabel="每周"></nz-option>
                  <nz-option nzValue="monthly" nzLabel="每月"></nz-option>
                  <nz-option nzValue="first_time" nzLabel="首次使用"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label [nzSpan]="24">整体满意度</nz-form-label>
              <nz-form-control [nzSpan]="24">
                <div class="survey-rate">
                  <nz-rate formControlName="satisfaction"></nz-rate>
                  <span>{{ form.controls.satisfaction.value }} / 5</span>
                </div>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label [nzSpan]="24">你最常用的模块（最多 3 项）</nz-form-label>
              <nz-form-control [nzSpan]="24" [nzErrorTip]="'请至少选择 1 项'">
                <nz-select formControlName="focusModules" nzMode="multiple" [nzMaxMultipleCount]="3" [nzMaxTagCount]="3" nzPlaceHolder="请选择模块">
                  <nz-option nzValue="dashboard" nzLabel="Dashboard"></nz-option>
                  <nz-option nzValue="issues" nzLabel="测试跟踪"></nz-option>
                  <nz-option nzValue="rd" nzLabel="研发管理"></nz-option>
                  <nz-option nzValue="content" nzLabel="内容中心"></nz-option>
                  <nz-option nzValue="report" nzLabel="积木报表"></nz-option>
                  <nz-option nzValue="other" nzLabel="其他"></nz-option>
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label [nzSpan]="24">你觉得目前做得好的地方（选填）</nz-form-label>
              <nz-form-control [nzSpan]="24">
                <textarea
                  nz-input
                  formControlName="highlights"
                  rows="4"
                  maxlength="1000"
                  placeholder="例如：某个流程更顺畅，页面响应更快等"
                ></textarea>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label [nzSpan]="24">你最希望我们优先改进什么</nz-form-label>
              <nz-form-control [nzSpan]="24" [nzErrorTip]="'请填写改进建议'">
                <textarea
                  nz-input
                  formControlName="improvement"
                  rows="5"
                  maxlength="1500"
                  placeholder="请尽量具体，例如场景、当前问题、期望效果"
                ></textarea>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label [nzSpan]="24">联系方式（选填）</nz-form-label>
              <nz-form-control [nzSpan]="24">
                <input nz-input formControlName="contact" maxlength="120" placeholder="邮箱 / 企业微信 / 手机号" />
              </nz-form-control>
            </nz-form-item>

            @if (submitError()) {
              <div class="survey-error">{{ submitError() }}</div>
            }

            <div class="survey-actions">
              <button nz-button type="button" (click)="reset()">清空</button>
              <button nz-button nzType="primary" [nzLoading]="submitting()">提交问卷</button>
            </div>
          </form>
        }
      </section>
    </main>
  `,
  styles: [
    `
      .survey-page {
        min-height: 100vh;
        padding: 24px 12px;
        background:
          radial-gradient(circle at 15% -5%, rgba(56, 189, 248, 0.15), transparent 32%),
          radial-gradient(circle at 85% 5%, rgba(37, 99, 235, 0.14), transparent 35%),
          var(--bg-page);
      }
      .survey-card {
        max-width: 760px;
        margin: 0 auto;
        border: 1px solid var(--border-color-soft);
        border-radius: 16px;
        background: var(--surface-primary);
        box-shadow: var(--shadow-sm);
        padding: 20px;
      }
      .survey-header h1 {
        margin: 0;
        font-size: 28px;
        line-height: 1.3;
        color: var(--text-heading);
      }
      .survey-header p {
        margin: 8px 0 0;
        color: var(--text-muted);
      }
      .survey-form {
        margin-top: 20px;
      }
      .survey-rate {
        display: inline-flex;
        align-items: center;
        gap: 12px;
        color: var(--text-secondary);
        font-weight: 600;
      }
      .survey-actions {
        margin-top: 6px;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .survey-error {
        margin: 2px 0 8px;
        color: var(--color-error);
      }
      .survey-success {
        margin-top: 20px;
        border: 1px solid rgba(34, 197, 94, 0.25);
        background: rgba(34, 197, 94, 0.08);
        border-radius: 12px;
        padding: 18px;
      }
      .survey-success h2 {
        margin: 0;
        color: var(--text-heading);
      }
      .survey-success p {
        margin: 8px 0 0;
        color: var(--text-secondary);
      }
      .survey-success__actions {
        margin-top: 14px;
        display: flex;
        gap: 10px;
      }
      @media (max-width: 768px) {
        .survey-page {
          padding: 10px;
        }
        .survey-card {
          border-radius: 12px;
          padding: 14px;
        }
        .survey-header h1 {
          font-size: 24px;
        }
        .survey-success__actions,
        .survey-actions {
          flex-direction: column;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicSurveyPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly submitting = signal(false);
  readonly submitted = signal(false);
  readonly submitError = signal('');

  readonly form = this.fb.nonNullable.group({
    nickname: ['', [Validators.maxLength(40)]],
    role: this.fb.nonNullable.control<SurveyRole>('developer'),
    usageFrequency: this.fb.nonNullable.control<SurveyUsageFrequency>('weekly'),
    satisfaction: this.fb.nonNullable.control(4, [Validators.required, Validators.min(1), Validators.max(5)]),
    focusModules: this.fb.nonNullable.control<SurveyFocusModule[]>(['issues'], [Validators.required]),
    highlights: ['', [Validators.maxLength(1000)]],
    improvement: ['', [Validators.required, Validators.maxLength(1500)]],
    contact: ['', [Validators.maxLength(120)]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const focusModules = Array.from(new Set(raw.focusModules)).slice(0, 3);
    if (focusModules.length === 0) {
      this.form.controls.focusModules.markAsTouched();
      this.form.controls.focusModules.setErrors({ required: true });
      return;
    }

    const payload: SurveySubmitPayload = {
      nickname: raw.nickname.trim() || undefined,
      role: raw.role,
      usageFrequency: raw.usageFrequency,
      satisfaction: raw.satisfaction,
      focusModules,
      highlights: raw.highlights.trim() || undefined,
      improvement: raw.improvement.trim(),
      contact: raw.contact.trim() || undefined,
    };

    this.submitting.set(true);
    this.submitError.set('');
    this.http.post<ApiSuccessResponse<unknown>>('/api/public/feedbacks/survey', payload).subscribe({
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

  reset(): void {
    this.form.reset({
      nickname: '',
      role: 'developer',
      usageFrequency: 'weekly',
      satisfaction: 4,
      focusModules: ['issues'],
      highlights: '',
      improvement: '',
      contact: '',
    });
    this.submitError.set('');
  }

  restart(): void {
    this.submitted.set(false);
    this.reset();
  }
}
