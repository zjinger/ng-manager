import type { PageResult } from '@core/types';

export type SurveyStatus = 'draft' | 'published' | 'archived';
export type SurveyQuestionType = 'text' | 'textarea' | 'single_choice' | 'multi_choice' | 'rating' | 'scale';

export interface SurveyOptionEntity {
  id: string;
  questionId: string;
  label: string;
  value: string;
  sort: number;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyQuestionEntity {
  id: string;
  surveyId: string;
  key: string;
  title: string;
  description: string | null;
  type: SurveyQuestionType;
  required: boolean;
  sort: number;
  placeholder: string | null;
  minValue: number | null;
  maxValue: number | null;
  maxSelect: number | null;
  createdAt: string;
  updatedAt: string;
  options: SurveyOptionEntity[];
}

export interface SurveyEntity {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  status: SurveyStatus;
  isPublic: boolean;
  startAt: string | null;
  endAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  questions: SurveyQuestionEntity[];
}

export interface SurveyQuestionOptionInput {
  label: string;
  value: string;
  sort?: number;
}

export interface SurveyQuestionInput {
  key?: string;
  title: string;
  description?: string;
  type: SurveyQuestionType;
  required?: boolean;
  sort?: number;
  placeholder?: string;
  minValue?: number;
  maxValue?: number;
  maxSelect?: number;
  options?: SurveyQuestionOptionInput[];
}

export interface SurveyCreateInput {
  title: string;
  description?: string;
  slug?: string;
  isPublic?: boolean;
  startAt?: string;
  endAt?: string;
  questions: SurveyQuestionInput[];
}

export interface SurveyUpdateInput extends SurveyCreateInput {}

export interface SurveyListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: SurveyStatus;
}

export interface SurveySubmissionAnswerEntity {
  id: string;
  submissionId: string;
  questionId: string;
  questionKey: string;
  questionTitle: string;
  questionType: SurveyQuestionType;
  answerJson: string;
  answerText: string | null;
  createdAt: string;
}

export interface SurveySubmissionEntity {
  id: string;
  surveyId: string;
  contact: string | null;
  source: string | null;
  clientIp: string | null;
  userAgent: string | null;
  submittedAt: string;
  createdAt: string;
  answers: SurveySubmissionAnswerEntity[];
}

export interface SurveySubmissionListQuery {
  page?: number;
  pageSize?: number;
  keyword?: string;
}

export interface SurveySubmissionCreateInput {
  contact?: string;
  answers: Array<{
    questionId: string;
    value?: unknown;
  }>;
}

export interface SurveyChoiceStatsItem {
  value: string;
  label: string;
  count: number;
}

export interface SurveyRatingStats {
  min: number;
  max: number;
  average: number;
  counts: Array<{
    score: number;
    count: number;
  }>;
}

export interface SurveyTextStats {
  nonEmptyCount: number;
  samples: string[];
}

export interface SurveyQuestionStats {
  questionId: string;
  questionKey: string;
  title: string;
  type: SurveyQuestionType;
  answerCount: number;
  choiceStats: SurveyChoiceStatsItem[];
  ratingStats: SurveyRatingStats | null;
  textStats: SurveyTextStats | null;
}

export interface SurveySubmissionStatsResult {
  surveyId: string;
  totalSubmissions: number;
  questions: SurveyQuestionStats[];
}

export type SurveyListResult = PageResult<SurveyEntity>;
export type SurveySubmissionListResult = PageResult<SurveySubmissionEntity>;
