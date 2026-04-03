import type { RequestContext } from "../../shared/context/request-context";
import type {
  CreateSurveyInput,
  CreateSurveySubmissionInput,
  ListSurveySubmissionsQuery,
  ListSurveysQuery,
  SurveyEntity,
  SurveyListResult,
  SurveySubmissionEntity,
  SurveySubmissionListResult,
  SurveySubmissionStatsResult,
  UpdateSurveyInput
} from "./survey.types";

export interface SurveyCommandContract {
  create(input: CreateSurveyInput, ctx: RequestContext): Promise<SurveyEntity>;
  update(id: string, input: UpdateSurveyInput, ctx: RequestContext): Promise<SurveyEntity>;
  publish(id: string, ctx: RequestContext): Promise<SurveyEntity>;
  archive(id: string, ctx: RequestContext): Promise<SurveyEntity>;
  draft(id: string, ctx: RequestContext): Promise<SurveyEntity>;
  submitPublicBySlug(slug: string, input: CreateSurveySubmissionInput, ctx: RequestContext): Promise<SurveySubmissionEntity>;
}

export interface SurveyQueryContract {
  list(query: ListSurveysQuery, ctx: RequestContext): Promise<SurveyListResult>;
  getById(id: string, ctx: RequestContext): Promise<SurveyEntity>;
  getPublicBySlug(slug: string, ctx: RequestContext): Promise<SurveyEntity>;
  listSubmissions(
    surveyId: string,
    query: ListSurveySubmissionsQuery,
    ctx: RequestContext
  ): Promise<SurveySubmissionListResult>;
  getSubmissionStats(surveyId: string, ctx: RequestContext): Promise<SurveySubmissionStatsResult>;
  exportSubmissionsCsv(surveyId: string, ctx: RequestContext): Promise<{ filename: string; content: string }>;
}
