import { computed, signal } from '@angular/core';

import type { SurveyQuestionType } from '../../models/survey.model';
import {
  cloneQuestionDraft,
  createId,
  createOptionDraft,
  createQuestionDraft,
  DEFAULT_TEMPLATES,
  QUESTION_TYPES,
  type EditorOptionDraft,
  type EditorQuestionDraft,
  type SurveyTemplate,
} from './survey-editor.utils';

interface EditorQuestionDraftSnapshot {
  pages: EditorPageDraft[];
  activePageId: string;
  activeQuestionId: string;
}

export interface EditorPageDraft {
  id: string;
  customTitle: string;
  questions: EditorQuestionDraft[];
}

export interface EditorPageSeed {
  customTitle?: string;
  questions: EditorQuestionDraft[];
}

export class SurveyEditorQuestionStore {
  private readonly _pages = signal<EditorPageDraft[]>([]);
  private readonly _activePageId = signal('');
  private readonly _activeQuestionId = signal('');
  private readonly _templateKeyword = signal('');

  readonly pages = this._pages.asReadonly();
  readonly activePageId = this._activePageId.asReadonly();
  readonly activeQuestionId = this._activeQuestionId.asReadonly();
  readonly templateKeyword = this._templateKeyword.asReadonly();

  readonly questionTypes = QUESTION_TYPES;
  readonly templates = DEFAULT_TEMPLATES;

  readonly filteredTemplates = computed(() => {
    const keyword = this.templateKeyword().trim();
    if (!keyword) {
      return this.templates;
    }
    return this.templates.filter((item) => item.name.includes(keyword) || item.desc.includes(keyword));
  });

  readonly activePage = computed(() => {
    const pageId = this.activePageId();
    return this.pages().find((item) => item.id === pageId) ?? null;
  });

  readonly questions = computed(() => this.activePage()?.questions ?? []);
  readonly allQuestions = computed(() => this.pages().flatMap((page) => page.questions));

  readonly activeQuestion = computed(() => {
    const activeId = this.activeQuestionId();
    return this.questions().find((item) => item.id === activeId) ?? null;
  });

  setTemplateKeyword(keyword: string): void {
    this._templateKeyword.set(keyword);
  }

  resetForNewSurvey(): void {
    const initialQuestion = createQuestionDraft('text');
    const initialPage = this.createPageDraft([initialQuestion], '');
    this._pages.set([initialPage]);
    this._activePageId.set(initialPage.id);
    this._activeQuestionId.set(initialQuestion.id);
    this._templateKeyword.set('');
  }

  setQuestions(questions: EditorQuestionDraft[]): void {
    this.setPages([{ questions }]);
  }

  setPages(pages: EditorPageSeed[]): void {
    const normalizedPages = pages.length > 0 ? pages : [{ questions: [] }];
    const pageDrafts = normalizedPages.map((page) => this.createPageDraft(page.questions, page.customTitle ?? ''));
    this._pages.set(pageDrafts);
    this._activePageId.set(pageDrafts[0]?.id || '');
    this._activeQuestionId.set(pageDrafts[0]?.questions[0]?.id || '');
  }

  findTemplateById(templateId: string): SurveyTemplate | null {
    return this.templates.find((item) => item.id === templateId) ?? null;
  }

  applyTemplateQuestions(templateQuestions: EditorQuestionDraft[]): EditorQuestionDraft[] {
    const copiedQuestions = templateQuestions.map((question) => cloneQuestionDraft(question));
    const page = this.createPageDraft(copiedQuestions, '');
    this._pages.set([page]);
    this._activePageId.set(page.id);
    this._activeQuestionId.set(copiedQuestions[0]?.id || '');
    return copiedQuestions;
  }

  addPage(): void {
    const nextPage = this.createPageDraft([], '');
    this._pages.set([...this.pages(), nextPage]);
    this._activePageId.set(nextPage.id);
    this._activeQuestionId.set('');
  }

  removePage(pageId: string): void {
    const pages = this.pages();
    if (pages.length <= 1) {
      return;
    }
    const index = pages.findIndex((item) => item.id === pageId);
    if (index < 0) {
      return;
    }

    const removedPage = pages[index];
    const targetIndex = index > 0 ? index - 1 : 1;
    const targetPage = pages[targetIndex];
    const targetPageWithMergedQuestions: EditorPageDraft = {
      ...targetPage,
      questions: [...targetPage.questions, ...removedPage.questions],
    };

    const nextPages = pages
      .filter((item) => item.id !== pageId)
      .map((item) => (item.id === targetPageWithMergedQuestions.id ? targetPageWithMergedQuestions : item));

    this._pages.set(nextPages);

    if (this.activePageId() === pageId) {
      this._activePageId.set(targetPageWithMergedQuestions.id);
    }
    this.ensureActivePage();
    this.ensureActiveQuestion();
  }

  setActivePage(pageId: string): void {
    if (!this.pages().some((item) => item.id === pageId)) {
      return;
    }
    this._activePageId.set(pageId);
    this.ensureActiveQuestion();
  }

  setPageCustomTitle(pageId: string, customTitle: string): void {
    const normalized = customTitle.trim().slice(0, 40);
    this._pages.set(
      this.pages().map((page) => {
        if (page.id !== pageId) {
          return page;
        }
        return {
          ...page,
          customTitle: normalized,
        };
      })
    );
  }

  moveQuestionToPage(questionId: string, targetPageId: string): void {
    const pages = this.pages();
    const fromPage = pages.find((page) => page.questions.some((question) => question.id === questionId));
    const toPage = pages.find((page) => page.id === targetPageId);
    if (!fromPage || !toPage || fromPage.id === toPage.id) {
      return;
    }

    const question = fromPage.questions.find((item) => item.id === questionId);
    if (!question) {
      return;
    }

    this._pages.set(
      pages.map((page) => {
        if (page.id === fromPage.id) {
          return {
            ...page,
            questions: page.questions.filter((item) => item.id !== questionId),
          };
        }
        if (page.id === toPage.id) {
          return {
            ...page,
            questions: [...page.questions, question],
          };
        }
        return page;
      })
    );

    this._activePageId.set(toPage.id);
    this._activeQuestionId.set(question.id);
    this.ensureActiveQuestion();
  }

  addQuestion(type: SurveyQuestionType, insertAfterId?: string): void {
    const newQuestion = createQuestionDraft(type);
    this.updateActivePageQuestions((current) => {
      if (!insertAfterId) {
        return [...current, newQuestion];
      }
      const index = current.findIndex((item) => item.id === insertAfterId);
      if (index < 0) {
        return [...current, newQuestion];
      }
      return [...current.slice(0, index + 1), newQuestion, ...current.slice(index + 1)];
    });
    this._activeQuestionId.set(newQuestion.id);
  }

  removeQuestion(questionId: string): void {
    this.updateActivePageQuestions((current) => current.filter((item) => item.id !== questionId));
    this.ensureActiveQuestion();
  }

  duplicateQuestion(questionId: string): void {
    const current = this.questions();
    const index = current.findIndex((item) => item.id === questionId);
    if (index < 0) {
      return;
    }
    const copy = cloneQuestionDraft(current[index]);
    this.updateActivePageQuestions((list) => [...list.slice(0, index + 1), copy, ...list.slice(index + 1)]);
    this._activeQuestionId.set(copy.id);
  }

  moveQuestion(questionId: string, offset: -1 | 1): void {
    const list = [...this.questions()];
    const index = list.findIndex((item) => item.id === questionId);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= list.length) {
      return;
    }
    const [moved] = list.splice(index, 1);
    list.splice(target, 0, moved);
    this.updateActivePageQuestions(() => list);
  }

  setActiveQuestion(questionId: string): void {
    this._activeQuestionId.set(questionId);
  }

  patchQuestion(event: { id: string; patch: Partial<EditorQuestionDraft> }): void {
    this.updateQuestion(event.id, event.patch);
  }

  changeQuestionType(event: { id: string; type: SurveyQuestionType }): void {
    const valueRange = this.getDefaultRangeByType(event.type);
    this.updateQuestion(event.id, {
      type: event.type,
      options:
        event.type === 'single_choice' || event.type === 'multi_choice'
          ? [createOptionDraft('选项1', 0), createOptionDraft('选项2', 1)]
          : [],
      maxSelect: null,
      minValue: valueRange.minValue,
      maxValue: valueRange.maxValue,
    });
  }

  addOption(questionId: string): void {
    this.mapQuestionAcrossPages((item) => {
      if (item.id !== questionId) {
        return item;
      }
      const index = item.options.length;
      return {
        ...item,
        options: [...item.options, createOptionDraft(`选项${index + 1}`, index)],
      };
    });
  }

  patchOption(event: { questionId: string; optionId: string; patch: Partial<EditorOptionDraft> }): void {
    this.mapQuestionAcrossPages((question) => {
      if (question.id !== event.questionId) {
        return question;
      }
      return {
        ...question,
        options: question.options.map((option) => {
          if (option.id !== event.optionId) {
            return option;
          }
          const nextLabel = event.patch.label !== undefined ? event.patch.label : option.label;
          const nextValue = event.patch.value !== undefined ? event.patch.value : option.value;
          return {
            ...option,
            ...event.patch,
            label: nextLabel,
            value: nextValue,
          };
        }),
      };
    });
  }

  removeOption(event: { questionId: string; optionId: string }): void {
    this.mapQuestionAcrossPages((question) => {
      if (question.id !== event.questionId) {
        return question;
      }
      if (question.options.length <= 2) {
        return question;
      }
      return {
        ...question,
        options: question.options.filter((option) => option.id !== event.optionId),
      };
    });
  }

  changeActiveQuestionType(type: SurveyQuestionType): void {
    const active = this.activeQuestion();
    if (!active) {
      return;
    }
    this.changeQuestionType({ id: active.id, type });
  }

  setActiveMinValue(minValue: number): void {
    const active = this.activeQuestion();
    if (!active) {
      return;
    }
    this.updateQuestion(active.id, { minValue });
  }

  setActiveMaxValue(maxValue: number): void {
    const active = this.activeQuestion();
    if (!active) {
      return;
    }
    this.updateQuestion(active.id, { maxValue });
  }

  setActiveMaxSelect(maxSelect: number | null): void {
    const active = this.activeQuestion();
    if (!active) {
      return;
    }
    this.updateQuestion(active.id, { maxSelect });
  }

  getDraft(): EditorQuestionDraftSnapshot {
    return {
      pages: this.pages(),
      activePageId: this.activePageId(),
      activeQuestionId: this.activeQuestionId(),
    };
  }

  applyDraft(draft: EditorQuestionDraftSnapshot): void {
    this._pages.set(draft.pages);
    this._activePageId.set(draft.activePageId);
    this._activeQuestionId.set(draft.activeQuestionId);
    this.ensureActivePage();
    this.ensureActiveQuestion();
  }

  private updateQuestion(questionId: string, patch: Partial<EditorQuestionDraft>): void {
    this.mapQuestionAcrossPages((item) => {
      if (item.id !== questionId) {
        return item;
      }
      const next: EditorQuestionDraft = {
        ...item,
        ...patch,
      };
      if (next.type !== 'single_choice' && next.type !== 'multi_choice') {
        next.options = [];
        next.maxSelect = null;
      }
      if (next.type !== 'rating' && next.type !== 'scale') {
        next.minValue = 1;
        next.maxValue = 5;
      }
      return next;
    });
  }

  private mapQuestionAcrossPages(mapper: (question: EditorQuestionDraft) => EditorQuestionDraft): void {
    this._pages.set(
      this.pages().map((page) => ({
        ...page,
        questions: page.questions.map((question) => mapper(question)),
      }))
    );
  }

  private updateActivePageQuestions(updater: (questions: EditorQuestionDraft[]) => EditorQuestionDraft[]): void {
    const activePageId = this.activePageId();
    this._pages.set(
      this.pages().map((page) => {
        if (page.id !== activePageId) {
          return page;
        }
        return {
          ...page,
          questions: updater(page.questions),
        };
      })
    );
  }

  private ensureActivePage(): void {
    const activePageId = this.activePageId();
    if (this.pages().some((item) => item.id === activePageId)) {
      return;
    }
    this._activePageId.set(this.pages()[0]?.id || '');
  }

  private ensureActiveQuestion(): void {
    const activeId = this.activeQuestionId();
    const list = this.questions();
    if (list.some((item) => item.id === activeId)) {
      return;
    }
    this._activeQuestionId.set(list[0]?.id || '');
  }

  private createPageDraft(questions: EditorQuestionDraft[], customTitle: string): EditorPageDraft {
    return {
      id: createId('page'),
      customTitle: customTitle.trim().slice(0, 40),
      questions: [...questions],
    };
  }

  private getDefaultRangeByType(type: SurveyQuestionType): { minValue: number; maxValue: number } {
    if (type === 'scale') {
      return { minValue: 1, maxValue: 10 };
    }
    return { minValue: 1, maxValue: 5 };
  }
}
