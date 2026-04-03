import type { RequestContext } from "../../shared/context/request-context";
import { ERROR_CODES } from "../../shared/errors/error-codes";
import { AppError } from "../../shared/errors/app-error";
import { genId } from "../../shared/utils/id";
import { nowIso } from "../../shared/utils/time";
import type { SurveyCommandContract, SurveyQueryContract } from "./survey.contract";
import { SurveyRepo } from "./survey.repo";
import type {
  CreateSurveyInput,
  CreateSurveySubmissionInput,
  ListSurveySubmissionsQuery,
  ListSurveysQuery,
  SurveyChoiceStatsItem,
  SurveyEntity,
  SurveyOptionEntity,
  SurveyQuestionEntity,
  SurveyQuestionInput,
  SurveyQuestionStats,
  SurveyStatus,
  SurveySubmissionAnswerEntity,
  SurveySubmissionEntity,
  SurveySubmissionListResult,
  SurveySubmissionStatsResult,
  UpdateSurveyInput
} from "./survey.types";

export class SurveyService implements SurveyCommandContract, SurveyQueryContract {
  constructor(private readonly repo: SurveyRepo) {}

  async create(input: CreateSurveyInput, ctx: RequestContext): Promise<SurveyEntity> {
    const now = nowIso();
    this.assertTimeRange(input.startAt, input.endAt);

    const slug = this.normalizeUniqueSlug(input.slug || input.title, null);
    const entity: SurveyEntity = {
      id: genId("svy"),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      slug,
      status: "draft",
      isPublic: input.isPublic ?? true,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      createdBy: ctx.accountId,
      createdAt: now,
      updatedAt: now,
      questions: []
    };

    entity.questions = this.normalizeQuestions(input.questions, entity.id, now);
    this.repo.create(entity);
    return this.requireById(entity.id);
  }

  async update(id: string, input: UpdateSurveyInput, ctx: RequestContext): Promise<SurveyEntity> {
    const current = this.requireByIdForManage(id, ctx, "update survey");
    this.assertTimeRange(input.startAt, input.endAt);
    const now = nowIso();
    const slug = this.normalizeUniqueSlug(input.slug || input.title, current.id);

    const entity: SurveyEntity = {
      id: current.id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      slug,
      status: current.status,
      isPublic: input.isPublic ?? current.isPublic,
      startAt: input.startAt ?? null,
      endAt: input.endAt ?? null,
      createdBy: current.createdBy,
      createdAt: current.createdAt,
      updatedAt: now,
      questions: this.normalizeQuestions(input.questions, current.id, now)
    };

    this.repo.updateDefinition(entity);
    return this.requireById(id);
  }

  async publish(id: string, ctx: RequestContext): Promise<SurveyEntity> {
    return this.changeStatus(id, "published", ctx);
  }

  async archive(id: string, ctx: RequestContext): Promise<SurveyEntity> {
    return this.changeStatus(id, "archived", ctx);
  }

  async draft(id: string, ctx: RequestContext): Promise<SurveyEntity> {
    return this.changeStatus(id, "draft", ctx);
  }

  async submitPublicBySlug(
    slug: string,
    input: CreateSurveySubmissionInput,
    ctx: RequestContext
  ): Promise<SurveySubmissionEntity> {
    const survey = await this.getPublicBySlug(slug, ctx);
    const answersByQuestionId = new Map(input.answers.map((item) => [item.questionId, item.value]));
    const questionIds = new Set(survey.questions.map((item) => item.id));
    for (const item of input.answers) {
      if (!questionIds.has(item.questionId)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `unknown questionId: ${item.questionId}`, 400);
      }
    }

    const now = nowIso();
    const answerItems: SurveySubmissionAnswerEntity[] = [];
    for (const question of survey.questions) {
      const raw = answersByQuestionId.get(question.id);
      if (!this.hasAnswer(raw)) {
        if (question.required) {
          throw new AppError(ERROR_CODES.BAD_REQUEST, `missing required answer: ${question.title}`, 400);
        }
        continue;
      }

      const normalized = this.normalizeAnswer(question, raw);
      answerItems.push({
        id: genId("sva"),
        submissionId: "",
        questionId: question.id,
        questionKey: question.key,
        questionTitle: question.title,
        questionType: question.type,
        answerJson: JSON.stringify(normalized.value),
        answerText: normalized.text,
        createdAt: now
      });
    }

    const submissionId = genId("svs");
    const entity: SurveySubmissionEntity = {
      id: submissionId,
      surveyId: survey.id,
      contact: input.contact?.trim() || null,
      source: "public_web",
      clientIp: ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
      submittedAt: now,
      createdAt: now,
      answers: answerItems.map((item) => ({
        ...item,
        submissionId
      }))
    };

    this.repo.createSubmission(entity);
    return entity;
  }

  async list(query: ListSurveysQuery, ctx: RequestContext) {
    if (this.isAdmin(ctx)) {
      return this.repo.list(query);
    }
    return this.repo.list({
      ...query,
      createdBy: ctx.accountId
    });
  }

  async getById(id: string, ctx: RequestContext): Promise<SurveyEntity> {
    return this.requireByIdForManage(id, ctx, "get survey");
  }

  async getPublicBySlug(slug: string, _ctx: RequestContext): Promise<SurveyEntity> {
    const entity = this.repo.findBySlug(slug.trim());
    if (!entity) {
      throw new AppError(ERROR_CODES.NOT_FOUND, "survey not found", 404);
    }
    this.assertSurveyPublicAvailable(entity);
    return entity;
  }

  async listSubmissions(
    surveyId: string,
    query: ListSurveySubmissionsQuery,
    ctx: RequestContext
  ): Promise<SurveySubmissionListResult> {
    this.requireByIdForManage(surveyId, ctx, "list survey submissions");
    return this.repo.listSubmissions(surveyId, query);
  }

  async getSubmissionStats(surveyId: string, ctx: RequestContext): Promise<SurveySubmissionStatsResult> {
    const survey = this.requireByIdForManage(surveyId, ctx, "get survey submission stats");
    const submissions = this.repo.listSubmissionsAll(surveyId);

    return {
      surveyId: survey.id,
      totalSubmissions: submissions.length,
      questions: survey.questions.map((question) => this.buildQuestionStats(question, submissions))
    };
  }

  async exportSubmissionsCsv(surveyId: string, ctx: RequestContext): Promise<{ filename: string; content: string }> {
    const survey = this.requireByIdForManage(surveyId, ctx, "export survey submissions");
    const submissions = this.repo.listSubmissionsAll(surveyId);
    const headers = ["submissionId", "submittedAt", "contact", "clientIp", "userAgent", ...survey.questions.map((q) => q.key)];
    const rows = [headers.map((item) => this.escapeCsvCell(item)).join(",")];

    for (const submission of submissions) {
      const answerMap = new Map(submission.answers.map((answer) => [answer.questionId, answer]));
      const rowValues = [
        submission.id,
        submission.submittedAt,
        submission.contact ?? "",
        submission.clientIp ?? "",
        submission.userAgent ?? "",
        ...survey.questions.map((question) => this.answerToCsvCell(answerMap.get(question.id)))
      ];
      rows.push(rowValues.map((item) => this.escapeCsvCell(item)).join(","));
    }

    const stamp = nowIso().slice(0, 19).replace(/[:T]/g, "-");
    const safeSlug = survey.slug.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    return {
      filename: `survey-${safeSlug || survey.id}-${stamp}.csv`,
      content: `\uFEFF${rows.join("\r\n")}`
    };
  }

  private changeStatus(id: string, status: SurveyStatus, ctx: RequestContext): SurveyEntity {
    const current = this.requireByIdForManage(id, ctx, "change survey status");
    if (status === "published" && current.questions.length === 0) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "survey question list is empty", 400);
    }
    if (current.status === status) {
      return current;
    }
    const updated = this.repo.updateStatus(id, status, nowIso());
    if (!updated) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, "failed to change survey status", 500);
    }
    return this.requireById(id);
  }

  private requireByIdForManage(id: string, ctx: RequestContext, action: string): SurveyEntity {
    const entity = this.requireById(id);
    this.assertManagePermission(entity, ctx, action);
    return entity;
  }

  private requireById(id: string): SurveyEntity {
    const entity = this.repo.findById(id);
    if (!entity) {
      throw new AppError(ERROR_CODES.NOT_FOUND, `survey not found: ${id}`, 404);
    }
    return entity;
  }

  private assertManagePermission(entity: SurveyEntity, ctx: RequestContext, action: string): void {
    if (this.isAdmin(ctx)) {
      return;
    }
    if (entity.createdBy && entity.createdBy === ctx.accountId) {
      return;
    }
    throw new AppError(ERROR_CODES.AUTH_FORBIDDEN, `${action} forbidden`, 403);
  }

  private isAdmin(ctx: RequestContext): boolean {
    return ctx.roles.includes("admin");
  }

  private normalizeUniqueSlug(candidate: string, currentId: string | null): string {
    const normalized = this.slugify(candidate);
    if (!normalized) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "survey slug is invalid", 400);
    }
    const bySlug = this.repo.findBySlug(normalized);
    if (bySlug && bySlug.id !== currentId) {
      throw new AppError(ERROR_CODES.PROJECT_CONFLICT, `survey slug already exists: ${normalized}`, 409);
    }
    return normalized;
  }

  private slugify(value: string): string {
    const normalized = value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized.slice(0, 80);
  }

  private assertTimeRange(startAt?: string, endAt?: string): void {
    if (startAt && Number.isNaN(Date.parse(startAt))) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "startAt is invalid", 400);
    }
    if (endAt && Number.isNaN(Date.parse(endAt))) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "endAt is invalid", 400);
    }
    if (startAt && endAt && Date.parse(startAt) > Date.parse(endAt)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "startAt must be earlier than endAt", 400);
    }
  }

  private normalizeQuestions(input: SurveyQuestionInput[], surveyId: string, now: string): SurveyQuestionEntity[] {
    const usedKeys = new Set<string>();
    return input.map((item, index) => {
      const generatedKey = item.key?.trim() || `q_${index + 1}`;
      const normalizedKey = generatedKey
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40);
      const finalKey = normalizedKey || `q_${index + 1}`;
      if (usedKeys.has(finalKey)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `duplicated question key: ${finalKey}`, 400);
      }
      usedKeys.add(finalKey);

      const type = item.type;
      const options: SurveyOptionEntity[] =
        type === "single_choice" || type === "multi_choice"
          ? (item.options ?? []).map((option, optionIndex) => ({
              id: genId("svo"),
              questionId: "",
              label: option.label.trim(),
              value: option.value.trim(),
              sort: option.sort ?? optionIndex,
              createdAt: now,
              updatedAt: now
            }))
          : [];

      const questionId = genId("svq");
      return {
        id: questionId,
        surveyId,
        key: finalKey,
        title: item.title.trim(),
        description: item.description?.trim() || null,
        type,
        required: item.required ?? true,
        sort: item.sort ?? index,
        placeholder: item.placeholder?.trim() || null,
        minValue: type === "rating" ? (item.minValue ?? 1) : null,
        maxValue: type === "rating" ? (item.maxValue ?? 5) : null,
        maxSelect: type === "multi_choice" ? (item.maxSelect ?? null) : null,
        createdAt: now,
        updatedAt: now,
        options: options.map((option) => ({
          ...option,
          questionId
        }))
      };
    });
  }

  private assertSurveyPublicAvailable(entity: SurveyEntity): void {
    if (!entity.isPublic || entity.status !== "published") {
      throw new AppError(ERROR_CODES.NOT_FOUND, "survey not found", 404);
    }
    const now = Date.now();
    if (entity.startAt && Date.parse(entity.startAt) > now) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "survey is not started", 400);
    }
    if (entity.endAt && Date.parse(entity.endAt) < now) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, "survey is closed", 400);
    }
  }

  private hasAnswer(value: unknown): boolean {
    if (value === undefined || value === null) {
      return false;
    }
    if (typeof value === "string") {
      return value.trim().length > 0;
    }
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return true;
  }

  private normalizeAnswer(question: SurveyQuestionEntity, raw: unknown): { value: unknown; text: string | null } {
    if (question.type === "text" || question.type === "textarea") {
      if (typeof raw !== "string") {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `invalid text answer for ${question.title}`, 400);
      }
      const value = raw.trim();
      if (!value) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `empty text answer for ${question.title}`, 400);
      }
      return {
        value,
        text: value.slice(0, 500)
      };
    }

    if (question.type === "single_choice") {
      if (typeof raw !== "string") {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `invalid single choice answer for ${question.title}`, 400);
      }
      const value = raw.trim();
      const matched = question.options.find((item) => item.value === value);
      if (!matched) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `invalid option for ${question.title}`, 400);
      }
      return {
        value,
        text: matched.label
      };
    }

    if (question.type === "multi_choice") {
      if (!Array.isArray(raw)) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `invalid multiple choice answer for ${question.title}`, 400);
      }
      const values = Array.from(
        new Set(
          raw
            .map((item) => (typeof item === "string" ? item.trim() : ""))
            .filter((item) => item.length > 0)
        )
      );
      if (values.length === 0) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `invalid multiple choice answer for ${question.title}`, 400);
      }
      const invalid = values.find((value) => !question.options.some((item) => item.value === value));
      if (invalid) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `invalid option for ${question.title}`, 400);
      }
      if (question.maxSelect && values.length > question.maxSelect) {
        throw new AppError(ERROR_CODES.BAD_REQUEST, `${question.title} exceeds max selectable count`, 400);
      }
      const labelMap = new Map(question.options.map((item) => [item.value, item.label]));
      return {
        value: values,
        text: values.map((item) => labelMap.get(item) || item).join(", ")
      };
    }

    if (typeof raw !== "number" && typeof raw !== "string") {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `invalid rating answer for ${question.title}`, 400);
    }

    const rating = Number(raw);
    if (!Number.isFinite(rating) || !Number.isInteger(rating)) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `invalid rating answer for ${question.title}`, 400);
    }
    const min = question.minValue ?? 1;
    const max = question.maxValue ?? 5;
    if (rating < min || rating > max) {
      throw new AppError(ERROR_CODES.BAD_REQUEST, `rating is out of range for ${question.title}`, 400);
    }
    return {
      value: rating,
      text: String(rating)
    };
  }

  private buildQuestionStats(question: SurveyQuestionEntity, submissions: SurveySubmissionEntity[]): SurveyQuestionStats {
    const answers = submissions
      .map((submission) => submission.answers.find((answer) => answer.questionId === question.id) ?? null)
      .filter((item): item is SurveySubmissionAnswerEntity => Boolean(item));

    if (question.type === "single_choice" || question.type === "multi_choice") {
      const counts = new Map<string, number>();
      for (const option of question.options) {
        counts.set(option.value, 0);
      }
      for (const answer of answers) {
        const parsed = this.tryParseJson(answer.answerJson);
        if (typeof parsed === "string") {
          counts.set(parsed, (counts.get(parsed) ?? 0) + 1);
          continue;
        }
        if (Array.isArray(parsed)) {
          for (const value of parsed) {
            if (typeof value !== "string") {
              continue;
            }
            counts.set(value, (counts.get(value) ?? 0) + 1);
          }
        }
      }

      const labelMap = new Map(question.options.map((option) => [option.value, option.label]));
      const choiceStats: SurveyChoiceStatsItem[] = Array.from(counts.entries()).map(([value, count]) => ({
        value,
        label: labelMap.get(value) || value,
        count
      }));

      return {
        questionId: question.id,
        questionKey: question.key,
        title: question.title,
        type: question.type,
        answerCount: answers.length,
        choiceStats,
        ratingStats: null,
        textStats: null
      };
    }

    if (question.type === "rating") {
      const min = question.minValue ?? 1;
      const max = question.maxValue ?? 5;
      const counts = new Map<number, number>();
      for (let score = min; score <= max; score += 1) {
        counts.set(score, 0);
      }

      let sum = 0;
      let validCount = 0;
      for (const answer of answers) {
        const parsed = this.tryParseJson(answer.answerJson);
        const numeric = typeof parsed === "number" ? parsed : Number(parsed);
        if (!Number.isInteger(numeric) || numeric < min || numeric > max) {
          continue;
        }
        counts.set(numeric, (counts.get(numeric) ?? 0) + 1);
        sum += numeric;
        validCount += 1;
      }

      return {
        questionId: question.id,
        questionKey: question.key,
        title: question.title,
        type: question.type,
        answerCount: answers.length,
        choiceStats: [],
        ratingStats: {
          min,
          max,
          average: validCount > 0 ? Number((sum / validCount).toFixed(2)) : 0,
          counts: Array.from(counts.entries()).map(([score, count]) => ({
            score,
            count
          }))
        },
        textStats: null
      };
    }

    const samples: string[] = [];
    let nonEmptyCount = 0;
    for (const answer of answers) {
      const normalized = (answer.answerText || "").trim();
      if (!normalized) {
        continue;
      }
      nonEmptyCount += 1;
      if (samples.length < 5) {
        samples.push(normalized.slice(0, 120));
      }
    }

    return {
      questionId: question.id,
      questionKey: question.key,
      title: question.title,
      type: question.type,
      answerCount: answers.length,
      choiceStats: [],
      ratingStats: null,
      textStats: {
        nonEmptyCount,
        samples
      }
    };
  }

  private tryParseJson(value: string): unknown {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  private answerToCsvCell(answer: SurveySubmissionAnswerEntity | undefined): string {
    if (!answer) {
      return "";
    }
    if (answer.answerText?.trim()) {
      return answer.answerText.trim();
    }
    const parsed = this.tryParseJson(answer.answerJson);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item))
        .join("; ")
        .trim();
    }
    if (parsed && typeof parsed === "object") {
      return JSON.stringify(parsed);
    }
    return String(parsed ?? "");
  }

  private escapeCsvCell(value: string): string {
    if (!/[",\r\n]/.test(value)) {
      return value;
    }
    return `"${value.replace(/"/g, '""')}"`;
  }
}
