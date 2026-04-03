import type { SurveyCreateInput, SurveyEntity, SurveyQuestionInput, SurveyUpdateInput } from '../../models/survey.model';
import { createQuestionDraft, type EditorQuestionDraft } from './survey-editor.utils';

export interface EditorDraftState {
  title: string;
  description: string;
  slug: string;
  isPublic: boolean;
  startAt: string;
  endAt: string;
  questions: EditorQuestionDraft[];
}

export type PayloadBuildError = 'missing_title' | 'empty_questions' | 'invalid_time_range';

export type BuildPayloadResult =
  | {
      ok: true;
      payload: SurveyCreateInput | SurveyUpdateInput;
    }
  | {
      ok: false;
      error: PayloadBuildError;
    };

export function mapEntityToEditorDraft(entity: SurveyEntity): EditorDraftState {
  const questions = entity.questions
    .slice()
    .sort((a, b) => a.sort - b.sort)
    .map((question) =>
      createQuestionDraft(toEditorQuestionType(question.type, question.maxValue), {
        key: '',
        title: question.title,
        description: question.description || '',
        required: question.required,
        placeholder: question.placeholder || '',
        minValue: question.minValue ?? 1,
        maxValue: question.maxValue ?? 5,
        maxSelect: question.maxSelect,
        options: question.options.slice().sort((a, b) => a.sort - b.sort).map((option) => option.label),
      })
    );

  return {
    title: entity.title,
    description: entity.description || '',
    slug: entity.slug,
    isPublic: entity.isPublic,
    startAt: toDatetimeLocal(entity.startAt),
    endAt: toDatetimeLocal(entity.endAt),
    questions,
  };
}

export function buildPayloadFromEditorDraft(draft: EditorDraftState): BuildPayloadResult {
  const title = draft.title.trim();
  if (!title) {
    return {
      ok: false,
      error: 'missing_title',
    };
  }

  const questions = draft.questions.map((question, index) => toQuestionInput(question, index));
  if (questions.length === 0) {
    return {
      ok: false,
      error: 'empty_questions',
    };
  }

  const startAt = toIsoDatetime(draft.startAt);
  const endAt = toIsoDatetime(draft.endAt);
  if (startAt && endAt && Date.parse(startAt) > Date.parse(endAt)) {
    return {
      ok: false,
      error: 'invalid_time_range',
    };
  }

  return {
    ok: true,
    payload: {
      title,
      description: draft.description.trim() || undefined,
      slug: draft.slug.trim() || undefined,
      isPublic: draft.isPublic,
      startAt: startAt || undefined,
      endAt: endAt || undefined,
      questions,
    },
  };
}

function toQuestionInput(question: EditorQuestionDraft, index: number): SurveyQuestionInput {
  const normalizedType = question.type === 'scale' ? 'rating' : question.type;
  const normalizedOptions =
    normalizedType === 'single_choice' || normalizedType === 'multi_choice'
      ? question.options
          .map((option, optionIndex) => {
            const label = option.label.trim();
            const value = option.value.trim() || label;
            return {
              label,
              value,
              sort: optionIndex,
            };
          })
          .filter((item) => item.label.length > 0)
      : [];

  const fallbackOptions =
    normalizedType === 'single_choice' || normalizedType === 'multi_choice'
      ? normalizedOptions.length >= 2
        ? normalizedOptions
        : [
            { label: '选项1', value: '选项1', sort: 0 },
            { label: '选项2', value: '选项2', sort: 1 },
          ]
      : undefined;

  return {
    key: `q_${index + 1}`,
    title: question.title.trim() || `题目 ${index + 1}`,
    description: question.description.trim() || undefined,
    type: normalizedType,
    required: question.required,
    sort: index,
    placeholder: question.placeholder.trim() || undefined,
    minValue: normalizedType === 'rating' ? Math.max(0, Math.floor(question.minValue)) : undefined,
    maxValue:
      normalizedType === 'rating' ? Math.max(Math.floor(question.maxValue), Math.floor(question.minValue) + 1) : undefined,
    maxSelect: normalizedType === 'multi_choice' && question.maxSelect ? Math.max(1, Math.floor(question.maxSelect)) : undefined,
    options: fallbackOptions,
  };
}

function toEditorQuestionType(type: SurveyQuestionInput['type'], maxValue: number | null): EditorQuestionDraft['type'] {
  if (type === 'rating' && (maxValue ?? 5) > 5) {
    return 'scale';
  }
  return type;
}

function toDatetimeLocal(value: string | null): string {
  if (!value) {
    return '';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  const hour = String(parsed.getHours()).padStart(2, '0');
  const minute = String(parsed.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toIsoDatetime(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return '';
  }
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }
  return parsed.toISOString();
}
