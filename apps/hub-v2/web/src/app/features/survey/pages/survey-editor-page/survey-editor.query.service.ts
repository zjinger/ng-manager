import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NzMessageService } from 'ng-zorro-antd/message';

import { SurveyApiService } from '../../services/survey-api.service';
import { SurveyEditorStore } from './survey-editor.store';

@Injectable({ providedIn: 'root' })
export class SurveyEditorQueryService {
  private readonly router = inject(Router);
  private readonly api = inject(SurveyApiService);
  private readonly message = inject(NzMessageService);

  loadBySurveyId(store: SurveyEditorStore, surveyId: string): void {
    if (!surveyId) {
      store.resetForNewSurvey();
      return;
    }

    store.setLoading(true);
    this.api.getById(surveyId).subscribe({
      next: (entity) => {
        store.applyEntity(entity);
      },
      error: (err: { error?: { message?: string } }) => {
        store.setLoading(false);
        this.message.error(err?.error?.message || '加载问卷失败');
        void this.router.navigateByUrl('/surveys');
      },
    });
  }
}
