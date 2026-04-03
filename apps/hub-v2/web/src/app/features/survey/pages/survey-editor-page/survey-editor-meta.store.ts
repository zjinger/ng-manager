import { computed, signal } from '@angular/core';

import type { SurveyStatus } from '../../models/survey.model';

export interface EditorMetaDraft {
  title: string;
  description: string;
  slug: string;
  isPublic: boolean;
  startAt: string;
  endAt: string;
}

interface ApplyMetaInput extends EditorMetaDraft {
  surveyId: string;
  status: SurveyStatus;
  isNew: boolean;
}

export class SurveyEditorMetaStore {
  private readonly _loading = signal(true);
  private readonly _saving = signal(false);
  private readonly _previewVisible = signal(false);
  private readonly _isNew = signal(true);
  private readonly _surveyId = signal('');
  private readonly _status = signal<SurveyStatus>('draft');

  private readonly _title = signal('未命名问卷');
  private readonly _description = signal('');
  private readonly _slug = signal('');
  private readonly _isPublic = signal(true);
  private readonly _startAt = signal('');
  private readonly _endAt = signal('');

  readonly loading = this._loading.asReadonly();
  readonly saving = this._saving.asReadonly();
  readonly previewVisible = this._previewVisible.asReadonly();
  readonly isNew = this._isNew.asReadonly();
  readonly surveyId = this._surveyId.asReadonly();
  readonly status = this._status.asReadonly();

  readonly title = this._title.asReadonly();
  readonly description = this._description.asReadonly();
  readonly slug = this._slug.asReadonly();
  readonly isPublic = this._isPublic.asReadonly();
  readonly startAt = this._startAt.asReadonly();
  readonly endAt = this._endAt.asReadonly();

  readonly publicLink = computed(() => {
    const slug = this.slug().trim();
    if (!slug) {
      return '';
    }
    return `${window.location.origin}/public/surveys/${encodeURIComponent(slug)}`;
  });

  readonly statusText = computed(() => this.statusLabel(this.status()));

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  setSaving(saving: boolean): void {
    this._saving.set(saving);
  }

  setStatus(status: SurveyStatus): void {
    this._status.set(status);
  }

  setTitle(title: string): void {
    this._title.set(title);
  }

  setDescription(description: string): void {
    this._description.set(description);
  }

  setSlug(slug: string): void {
    this._slug.set(slug);
  }

  setIsPublic(isPublic: boolean): void {
    this._isPublic.set(isPublic);
  }

  setStartAt(startAt: string): void {
    this._startAt.set(startAt);
  }

  setEndAt(endAt: string): void {
    this._endAt.set(endAt);
  }

  openPreview(): void {
    this._previewVisible.set(true);
  }

  closePreview(): void {
    this._previewVisible.set(false);
  }

  resetForNewSurvey(): void {
    this._loading.set(false);
    this._saving.set(false);
    this._previewVisible.set(false);
    this._isNew.set(true);
    this._surveyId.set('');
    this._status.set('draft');
    this._title.set('未命名问卷');
    this._description.set('');
    this._slug.set('');
    this._isPublic.set(true);
    this._startAt.set('');
    this._endAt.set('');
  }

  applyMeta(input: ApplyMetaInput): void {
    this._loading.set(false);
    this._saving.set(false);
    this._isNew.set(input.isNew);
    this._surveyId.set(input.surveyId);
    this._status.set(input.status);
    this._title.set(input.title);
    this._description.set(input.description);
    this._slug.set(input.slug);
    this._isPublic.set(input.isPublic);
    this._startAt.set(input.startAt);
    this._endAt.set(input.endAt);
  }

  getDraft(): EditorMetaDraft {
    return {
      title: this.title(),
      description: this.description(),
      slug: this.slug(),
      isPublic: this.isPublic(),
      startAt: this.startAt(),
      endAt: this.endAt(),
    };
  }

  applyDraft(draft: EditorMetaDraft): void {
    this._title.set(draft.title);
    this._description.set(draft.description);
    this._slug.set(draft.slug);
    this._isPublic.set(draft.isPublic);
    this._startAt.set(draft.startAt);
    this._endAt.set(draft.endAt);
  }

  statusLabel(status: SurveyStatus): string {
    if (status === 'published') {
      return '已发布';
    }
    if (status === 'archived') {
      return '已归档';
    }
    return '草稿';
  }
}
