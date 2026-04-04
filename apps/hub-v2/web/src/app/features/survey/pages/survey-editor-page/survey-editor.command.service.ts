import { inject, Injectable } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';

import type { SurveyStatus } from '../../models/survey.model';
import { SurveyApiService } from '../../services/survey-api.service';
import { buildPayloadFromEditorDraft } from './survey-editor.mapper';
import { SurveyEditorStore } from './survey-editor.store';

@Injectable({ providedIn: 'root' })
export class SurveyEditorCommandService {
  private readonly router = inject(Router);
  private readonly api = inject(SurveyApiService);
  private readonly message = inject(NzMessageService);
  private readonly clipboard = inject(Clipboard);

  save(store: SurveyEditorStore): void {
    if (store.saving()) {
      return;
    }

    const payloadResult = buildPayloadFromEditorDraft({
      title: store.title(),
      description: store.description(),
      slug: store.slug(),
      isPublic: store.isPublic(),
      startAt: store.startAt(),
      endAt: store.endAt(),
      pages: store.pages().map((page) => ({
        customTitle: page.customTitle,
        questions: page.questions,
      })),
      questions: store.allQuestions(),
    });

    if (!payloadResult.ok) {
      if (payloadResult.error === 'missing_title') {
        this.message.warning('请填写问卷标题');
      } else if (payloadResult.error === 'empty_questions') {
        this.message.warning('至少保留一题');
      } else {
        this.message.warning('开始时间不能晚于结束时间');
      }
      return;
    }

    store.setSaving(true);
    const creating = store.isNew();
    const request$ = creating ? this.api.create(payloadResult.payload) : this.api.update(store.surveyId(), payloadResult.payload);

    request$.subscribe({
      next: (entity) => {
        store.setSaving(false);
        store.applyEntity(entity);
        this.message.success('问卷已保存');
        if (creating) {
          void this.router.navigateByUrl(`/surveys/${entity.id}`, { replaceUrl: true });
        }
      },
      error: (err: { error?: { message?: string } }) => {
        store.setSaving(false);
        this.message.error(err?.error?.message || '保存失败');
      },
    });
  }

  changeStatus(store: SurveyEditorStore, status: SurveyStatus): void {
    if (store.saving()) {
      return;
    }
    if (store.isNew()) {
      this.message.warning('请先保存问卷');
      return;
    }

    const request$ =
      status === 'published'
        ? this.api.publish(store.surveyId())
        : status === 'archived'
          ? this.api.archive(store.surveyId())
          : this.api.draft(store.surveyId());

    store.setSaving(true);
    request$.subscribe({
      next: (entity) => {
        store.setSaving(false);
        store.setStatus(entity.status);
        this.message.success('状态已更新');
      },
      error: (err: { error?: { message?: string } }) => {
        store.setSaving(false);
        this.message.error(err?.error?.message || '状态更新失败');
      },
    });
  }

  copyPublicLink(store: SurveyEditorStore): void {
    const link = store.publicLink();
    if (!link) {
      this.message.warning('请先设置 slug 并保存');
      return;
    }

    const ok = this.clipboard.copy(link);
    if (ok) {
      this.message.success('公开链接已复制');
    } else {
      this.message.error('复制失败，请手动复制');
    }
  }

  viewSubmissions(store: SurveyEditorStore): void {
    if (store.isNew()) {
      this.message.warning('请先保存问卷');
      return;
    }
    void this.router.navigateByUrl(`/surveys/${store.surveyId()}/submissions`);
  }

  backToList(): void {
    void this.router.navigateByUrl('/surveys');
  }
}
