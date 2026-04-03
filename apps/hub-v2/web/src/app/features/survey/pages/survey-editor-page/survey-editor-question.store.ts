import { computed, signal } from '@angular/core';

import type { SurveyQuestionType } from '../../models/survey.model';
import {
  cloneQuestionDraft,
  createOptionDraft,
  createQuestionDraft,
  DEFAULT_TEMPLATES,
  QUESTION_TYPES,
  type EditorOptionDraft,
  type EditorQuestionDraft,
  type SurveyTemplate,
} from './survey-editor.utils';

interface EditorQuestionDraftSnapshot {
  questions: EditorQuestionDraft[];
  activeQuestionId: string;
}

export class SurveyEditorQuestionStore {
  private readonly _questions = signal<EditorQuestionDraft[]>([]);
  private readonly _activeQuestionId = signal('');
  private readonly _templateKeyword = signal('');

  readonly questions = this._questions.asReadonly();
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

  readonly activeQuestion = computed(() => {
    const activeId = this.activeQuestionId();
    return this.questions().find((item) => item.id === activeId) ?? null;
  });

  setTemplateKeyword(keyword: string): void {
    this._templateKeyword.set(keyword);
  }

  resetForNewSurvey(): void {
    const initialQuestion = createQuestionDraft('text');
    this._questions.set([initialQuestion]);
    this._activeQuestionId.set(initialQuestion.id);
    this._templateKeyword.set('');
  }

  setQuestions(questions: EditorQuestionDraft[]): void {
    this._questions.set(questions);
    this._activeQuestionId.set(questions[0]?.id || '');
  }

  findTemplateById(templateId: string): SurveyTemplate | null {
    return this.templates.find((item) => item.id === templateId) ?? null;
  }

  applyTemplateQuestions(templateQuestions: EditorQuestionDraft[]): EditorQuestionDraft[] {
    const copiedQuestions = templateQuestions.map((question) => cloneQuestionDraft(question));
    this._questions.set(copiedQuestions);
    this._activeQuestionId.set(copiedQuestions[0]?.id || '');
    return copiedQuestions;
  }

  addQuestion(type: SurveyQuestionType, insertAfterId?: string): void {
    const newQuestion = createQuestionDraft(type);
    const current = this.questions();
    if (!insertAfterId) {
      this._questions.set([...current, newQuestion]);
    } else {
      const index = current.findIndex((item) => item.id === insertAfterId);
      if (index < 0) {
        this._questions.set([...current, newQuestion]);
      } else {
        this._questions.set([...current.slice(0, index + 1), newQuestion, ...current.slice(index + 1)]);
      }
    }
    this._activeQuestionId.set(newQuestion.id);
  }

  removeQuestion(questionId: string): void {
    const next = this.questions().filter((item) => item.id !== questionId);
    this._questions.set(next.length > 0 ? next : [createQuestionDraft('text')]);
    this.ensureActiveQuestion();
  }

  duplicateQuestion(questionId: string): void {
    const current = this.questions();
    const index = current.findIndex((item) => item.id === questionId);
    if (index < 0) {
      return;
    }
    const copy = cloneQuestionDraft(current[index]);
    this._questions.set([...current.slice(0, index + 1), copy, ...current.slice(index + 1)]);
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
    this._questions.set(list);
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
    this._questions.set(
      this.questions().map((item) => {
        if (item.id !== questionId) {
          return item;
        }
        const index = item.options.length;
        return {
          ...item,
          options: [...item.options, createOptionDraft(`选项${index + 1}`, index)],
        };
      })
    );
  }

  patchOption(event: { questionId: string; optionId: string; patch: Partial<EditorOptionDraft> }): void {
    this._questions.set(
      this.questions().map((question) => {
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
      })
    );
  }

  removeOption(event: { questionId: string; optionId: string }): void {
    this._questions.set(
      this.questions().map((question) => {
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
      })
    );
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
      questions: this.questions(),
      activeQuestionId: this.activeQuestionId(),
    };
  }

  applyDraft(draft: EditorQuestionDraftSnapshot): void {
    this._questions.set(draft.questions);
    this._activeQuestionId.set(draft.activeQuestionId);
    this.ensureActiveQuestion();
  }

  private updateQuestion(questionId: string, patch: Partial<EditorQuestionDraft>): void {
    this._questions.set(
      this.questions().map((item) => {
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
      })
    );
  }

  private ensureActiveQuestion(): void {
    const activeId = this.activeQuestionId();
    const list = this.questions();
    if (list.some((item) => item.id === activeId)) {
      return;
    }
    this._activeQuestionId.set(list[0]?.id || '');
  }

  private getDefaultRangeByType(type: SurveyQuestionType): { minValue: number; maxValue: number } {
    if (type === 'scale') {
      return { minValue: 1, maxValue: 10 };
    }
    return { minValue: 1, maxValue: 5 };
  }
}
