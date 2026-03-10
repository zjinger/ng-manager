import { Component, inject, signal } from '@angular/core';
import { PageLayoutComponent } from '@app/shared';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { AboutFeedbackService, FeedbackCategory } from './about-feedback.service';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-feedback.component',
  imports: [
    CommonModule,
    FormsModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
    PageLayoutComponent
  ],
  template: `
  <app-page-layout [title]="'用户反馈'">
     <div class="feedback-block">
          <h3>用户反馈</h3>
          <form nz-form nzLayout="vertical" (ngSubmit)="submitFeedback()">
            <nz-form-item>
              <nz-form-label nzRequired>反馈类型</nz-form-label>
              <nz-form-control>
                <nz-select [(ngModel)]="category" name="category" [disabled]="submitting()">
                  @for (option of categoryOptions; track option.value) {
                    <nz-option [nzLabel]="option.label" [nzValue]="option.value"></nz-option>
                  }
                </nz-select>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>标题</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  name="title"
                  [(ngModel)]="title"
                  [maxlength]="120"
                  [disabled]="submitting()"
                  placeholder="请简要描述你的问题或建议"
                />
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label nzRequired>内容</nz-form-label>
              <nz-form-control >
                <textarea
                  nz-input
                  name="content"
                  [(ngModel)]="content"
                  [maxlength]="5000"
                  [disabled]="submitting()"
                  rows="5"
                  placeholder="请补充详细信息，便于我们定位问题"
                ></textarea>
              </nz-form-control>
            </nz-form-item>

            <nz-form-item>
              <nz-form-label>联系方式</nz-form-label>
              <nz-form-control>
                <input
                  nz-input
                  name="contact"
                  [(ngModel)]="contact"
                  [maxlength]="120"
                  [disabled]="submitting()"
                  placeholder="邮箱、IM 或其他联系方式（选填）"
                />
              </nz-form-control>
            </nz-form-item>

            <button nz-button nzType="primary" [nzLoading]="submitting()" [disabled]="submitting()">
              提交反馈
            </button>
          </form>

          @if (submitMessage()) {
            <p class="submit-tip" [class.error]="submitType() === 'error'">{{ submitMessage() }}</p>
          }
      </div>
  </app-page-layout>
  `,
  styles: [
    `
      .feedback-block {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #f0f0f0;
        max-width: 720px;
      }
      .submit-tip {
        margin-top: 12px;
        color: #389e0d;
      }

      .submit-tip.error {
        color: #cf1322;
      }
    `,
  ]
})
export class FeedbackComponent {
  private feedbackApi = inject(AboutFeedbackService);
  readonly version = '0.1.12';

  readonly categoryOptions: Array<{ label: string; value: FeedbackCategory }> = [
    { label: '问题反馈', value: 'bug' },
    { label: '功能建议', value: 'suggestion' },
    { label: '新功能需求', value: 'feature' },
    { label: '其他', value: 'other' },
  ];

  category: FeedbackCategory = 'suggestion';
  title = '';
  content = '';
  contact = '';

  submitting = signal(false);
  submitMessage = signal('');
  submitType = signal<'success' | 'error'>('success');

  async submitFeedback() {
    const title = this.title.trim();
    const content = this.content.trim();
    const contact = this.contact.trim();

    if (!title) {
      this.submitType.set('error');
      this.submitMessage.set('标题不能为空');
      return;
    }
    if (!content) {
      this.submitType.set('error');
      this.submitMessage.set('内容不能为空');
      return;
    }

    this.submitting.set(true);
    this.submitMessage.set('');

    try {
      await firstValueFrom(
        this.feedbackApi.submit({
          projectKey: 'prj_kmf73us77x0r1z4b3g76soc5', // ng-manager 项目
          category: this.category,
          title,
          content,
          contact: contact || undefined,
          clientName: 'ng-manager-webapp',
          clientVersion: '0.1.12',
          osInfo: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
        })
      );

      this.submitType.set('success');
      this.submitMessage.set('反馈提交成功，感谢你的建议。');
      this.title = '';
      this.content = '';
      this.contact = '';
      this.category = 'suggestion';
    } catch (error: any) {
      this.submitType.set('error');
      this.submitMessage.set(error?.message || '提交失败，请稍后再试。');
    } finally {
      this.submitting.set(false);
    }
  }
}
