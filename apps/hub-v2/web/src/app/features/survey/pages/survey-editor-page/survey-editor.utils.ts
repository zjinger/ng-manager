import type { SurveyQuestionType } from '../../models/survey.model';

export interface EditorOptionDraft {
  id: string;
  label: string;
  value: string;
}

export interface EditorQuestionDraft {
  id: string;
  key: string;
  title: string;
  description: string;
  type: SurveyQuestionType;
  required: boolean;
  placeholder: string;
  minValue: number;
  maxValue: number;
  maxSelect: number | null;
  options: EditorOptionDraft[];
}

export interface SurveyTemplate {
  id: string;
  name: string;
  desc: string;
  questions: EditorQuestionDraft[];
}

export interface QuestionTypeOption {
  value: SurveyQuestionType;
  label: string;
  icon: string;
}

export const QUESTION_TYPES: QuestionTypeOption[] = [
  { value: 'single_choice', label: '单选题', icon: '◉' },
  { value: 'multi_choice', label: '多选题', icon: '☑' },
  { value: 'text', label: '单行文本', icon: '▭' },
  { value: 'textarea', label: '多行文本', icon: '▤' },
  { value: 'rating', label: '评分题', icon: '★' },
  { value: 'scale', label: '量表题', icon: '◐' },
];

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createOptionDraft(label: string, index: number): EditorOptionDraft {
  const normalized = label.trim() || `选项${index + 1}`;
  return {
    id: createId('opt'),
    label: normalized,
    value: normalized,
  };
}

export function createQuestionDraft(
  type: SurveyQuestionType,
  patch: Partial<Omit<EditorQuestionDraft, 'id' | 'type' | 'options'>> & { options?: string[] } = {}
): EditorQuestionDraft {
  const title = patch.title?.trim() || ''; //|| `未命名${QUESTION_TYPES.find((item) => item.value === type)?.label ?? '题目'}`;
  const options =
    type === 'single_choice' || type === 'multi_choice'
      ? (patch.options && patch.options.length >= 2 ? patch.options : ['选项1', '选项2']).map((item, index) =>
        createOptionDraft(item, index)
      )
      : [];

  return {
    id: createId('q'),
    key: patch.key?.trim() || '',
    title,
    description: patch.description?.trim() || '',
    type,
    required: patch.required ?? true,
    placeholder: patch.placeholder?.trim() || '',
    minValue: patch.minValue ?? 1,
    maxValue: patch.maxValue ?? (type === 'scale' ? 10 : 5),
    maxSelect: patch.maxSelect ?? null,
    options,
  };
}

export function cloneQuestionDraft(question: EditorQuestionDraft): EditorQuestionDraft {
  return {
    ...question,
    id: createId('q'),
    options: question.options.map((option) => ({
      ...option,
      id: createId('opt'),
    })),
  };
}

export const DEFAULT_TEMPLATES: SurveyTemplate[] = [
  {
    id: 'blank',
    name: '空白问卷',
    desc: '从零开始创建',
    questions: [
      createQuestionDraft('text', {
        title: '请用一句话描述你的体验',
        placeholder: '请输入反馈',
      }),
    ],
  },
  {
    id: 'satisfaction',
    name: '满意度调查',
    desc: '5 道常用题',
    questions: [
      createQuestionDraft('single_choice', {
        title: '你对整体服务满意吗？',
        options: ['非常满意', '满意', '一般', '不满意', '非常不满意'],
      }),
      createQuestionDraft('rating', {
        title: '请给本次体验打分',
        minValue: 1,
        maxValue: 5,
      }),
      createQuestionDraft('scale', {
        title: '你推荐我们产品的意愿是多少？',
        minValue: 1,
        maxValue: 10,
      }),
      createQuestionDraft('multi_choice', {
        title: '你最关注哪些方面？',
        options: ['响应速度', '产品稳定性', '客服支持', '价格'],
      }),
      createQuestionDraft('textarea', {
        title: '你希望我们改进什么？',
        placeholder: '请输入你的建议',
        required: false,
      }),
      createQuestionDraft('text', {
        title: '联系方式（选填）',
        required: false,
      }),
    ],
  },
];
