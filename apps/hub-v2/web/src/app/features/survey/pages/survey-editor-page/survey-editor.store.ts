import { signal } from '@angular/core';

import type { SurveyEntity, SurveyQuestionType, SurveyStatus } from '../../models/survey.model';
import { mapEntityToEditorDraft } from './survey-editor.mapper';
import { SurveyEditorMetaStore, type EditorMetaDraft } from './survey-editor-meta.store';
import { SurveyEditorQuestionStore, type EditorPageDraft, type EditorPageSeed } from './survey-editor-question.store';
import { SnapshotHistory } from './survey-editor.snapshot-history';
import { createQuestionDraft, type EditorOptionDraft, type EditorQuestionDraft } from './survey-editor.utils';

interface EditorSnapshot {
  meta: EditorMetaDraft;
  question: {
    pages: EditorPageDraft[];
    activePageId: string;
    activeQuestionId: string;
  };
}

export class SurveyEditorStore {
  readonly meta = new SurveyEditorMetaStore();
  readonly question = new SurveyEditorQuestionStore();

  readonly loading = this.meta.loading;
  readonly saving = this.meta.saving;
  readonly previewVisible = this.meta.previewVisible;
  readonly isNew = this.meta.isNew;
  readonly surveyId = this.meta.surveyId;
  readonly status = this.meta.status;

  readonly title = this.meta.title;
  readonly description = this.meta.description;
  readonly slug = this.meta.slug;
  readonly isPublic = this.meta.isPublic;
  readonly startAt = this.meta.startAt;
  readonly endAt = this.meta.endAt;

  readonly questions = this.question.questions;
  readonly allQuestions = this.question.allQuestions;
  readonly pages = this.question.pages;
  readonly activePageId = this.question.activePageId;
  readonly activeQuestionId = this.question.activeQuestionId;
  readonly templateKeyword = this.question.templateKeyword;

  readonly canUndo = signal(false);
  readonly canRedo = signal(false);

  readonly questionTypes = this.question.questionTypes;
  readonly templates = this.question.templates;
  readonly filteredTemplates = this.question.filteredTemplates;
  readonly activeQuestion = this.question.activeQuestion;

  readonly publicLink = this.meta.publicLink;
  readonly statusText = this.meta.statusText;

  private readonly history = new SnapshotHistory<EditorSnapshot>();

  setLoading(loading: boolean): void {
    this.meta.setLoading(loading);
  }

  setSaving(saving: boolean): void {
    this.meta.setSaving(saving);
  }

  openPreview(): void {
    this.meta.openPreview();
  }

  closePreview(): void {
    this.meta.closePreview();
  }

  resetForNewSurvey(): void {
    this.meta.resetForNewSurvey();
    this.question.resetForNewSurvey();
    this.resetHistory();
  }

  applyEntity(entity: SurveyEntity): void {
    const mapped = mapEntityToEditorDraft(entity);
    const pages: EditorPageSeed[] =
      mapped.pages.length > 0 ? mapped.pages : [{ customTitle: '', questions: [createQuestionDraft('text')] }];

    this.meta.applyMeta({
      ...mapped,
      surveyId: entity.id,
      status: entity.status,
      isNew: false,
    });
    this.question.setPages(pages);
    this.resetHistory();
  }

  applyTemplate(templateId: string): void {
    const template = this.question.findTemplateById(templateId);
    if (!template) {
      return;
    }

    this.question.applyTemplateQuestions(template.questions);
    if (this.meta.isNew()) {
      this.meta.setTitle(template.name === '空白问卷' ? '未命名问卷' : template.name);
      this.meta.setDescription('');
    }
    this.recordHistory();
  }

  addPage(): void {
    this.question.addPage();
    this.recordHistory();
  }

  removePage(pageId: string): void {
    this.question.removePage(pageId);
    this.recordHistory();
  }

  setActivePage(pageId: string): void {
    this.question.setActivePage(pageId);
  }

  setPageCustomTitle(pageId: string, customTitle: string): void {
    this.question.setPageCustomTitle(pageId, customTitle);
    this.recordHistory();
  }

  moveQuestionToPage(questionId: string, targetPageId: string): void {
    this.question.moveQuestionToPage(questionId, targetPageId);
    this.recordHistory();
  }

  addQuestion(type: SurveyQuestionType, insertAfterId?: string): void {
    this.question.addQuestion(type, insertAfterId);
    this.recordHistory();
  }

  removeQuestion(questionId: string): void {
    this.question.removeQuestion(questionId);
    this.recordHistory();
  }

  duplicateQuestion(questionId: string): void {
    this.question.duplicateQuestion(questionId);
    this.recordHistory();
  }

  moveQuestion(questionId: string, offset: -1 | 1): void {
    this.question.moveQuestion(questionId, offset);
    this.recordHistory();
  }

  setActiveQuestion(questionId: string): void {
    this.question.setActiveQuestion(questionId);
  }

  patchQuestion(event: { id: string; patch: Partial<EditorQuestionDraft> }): void {
    this.question.patchQuestion(event);
  }

  changeQuestionType(event: { id: string; type: SurveyQuestionType }): void {
    this.question.changeQuestionType(event);
    this.recordHistory();
  }

  addOption(questionId: string): void {
    this.question.addOption(questionId);
    this.recordHistory();
  }

  patchOption(event: { questionId: string; optionId: string; patch: Partial<EditorOptionDraft> }): void {
    this.question.patchOption(event);
  }

  removeOption(event: { questionId: string; optionId: string }): void {
    this.question.removeOption(event);
    this.recordHistory();
  }

  changeActiveQuestionType(type: SurveyQuestionType): void {
    this.question.changeActiveQuestionType(type);
    this.recordHistory();
  }

  setActiveMinValue(minValue: number): void {
    this.question.setActiveMinValue(minValue);
  }

  setActiveMaxValue(maxValue: number): void {
    this.question.setActiveMaxValue(maxValue);
  }

  setActiveMaxSelect(maxSelect: number | null): void {
    this.question.setActiveMaxSelect(maxSelect);
  }

  undo(): void {
    const restored = this.history.undo();
    if (!restored) {
      return;
    }
    this.meta.applyDraft(restored.meta);
    this.question.applyDraft(restored.question);
    this.syncHistoryFlags();
  }

  redo(): void {
    const restored = this.history.redo();
    if (!restored) {
      return;
    }
    this.meta.applyDraft(restored.meta);
    this.question.applyDraft(restored.question);
    this.syncHistoryFlags();
  }

  markHistory(): void {
    this.recordHistory();
  }

  setStatus(status: SurveyStatus): void {
    this.meta.setStatus(status);
  }

  setTitle(title: string): void {
    this.meta.setTitle(title);
  }

  setDescription(description: string): void {
    this.meta.setDescription(description);
  }

  setSlug(slug: string): void {
    this.meta.setSlug(slug);
  }

  setIsPublic(isPublic: boolean): void {
    this.meta.setIsPublic(isPublic);
  }

  setStartAt(startAt: string): void {
    this.meta.setStartAt(startAt);
  }

  setEndAt(endAt: string): void {
    this.meta.setEndAt(endAt);
  }

  setTemplateKeyword(keyword: string): void {
    this.question.setTemplateKeyword(keyword);
  }

  private makeSnapshot(): EditorSnapshot {
    return {
      meta: this.meta.getDraft(),
      question: this.question.getDraft(),
    };
  }

  private recordHistory(): void {
    this.history.push(this.makeSnapshot());
    this.syncHistoryFlags();
  }

  private resetHistory(): void {
    this.history.reset(this.makeSnapshot());
    this.syncHistoryFlags();
  }

  private syncHistoryFlags(): void {
    this.canUndo.set(this.history.canUndo);
    this.canRedo.set(this.history.canRedo);
  }
}
