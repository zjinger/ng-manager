import type Database from "better-sqlite3";
import { normalizePage } from "../../shared/http/pagination";
import type {
  ListSurveySubmissionsQuery,
  ListSurveysQuery,
  SurveyEntity,
  SurveyOptionEntity,
  SurveyQuestionEntity,
  SurveyQuestionType,
  SurveyStatus,
  SurveySubmissionAnswerEntity,
  SurveySubmissionEntity,
  SurveySubmissionListResult
} from "./survey.types";

type SurveyRow = {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  status: SurveyStatus;
  is_public: number;
  start_at: string | null;
  end_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

type SurveyQuestionRow = {
  id: string;
  survey_id: string;
  question_key: string;
  title: string;
  description: string | null;
  type: SurveyQuestionType;
  required: number;
  sort: number;
  placeholder: string | null;
  min_value: number | null;
  max_value: number | null;
  max_select: number | null;
  created_at: string;
  updated_at: string;
};

type SurveyOptionRow = {
  id: string;
  question_id: string;
  option_label: string;
  option_value: string;
  sort: number;
  created_at: string;
  updated_at: string;
};

type SurveySubmissionRow = {
  id: string;
  survey_id: string;
  contact: string | null;
  source: string | null;
  client_ip: string | null;
  user_agent: string | null;
  submitted_at: string;
  created_at: string;
};

type SurveyAnswerRow = {
  id: string;
  submission_id: string;
  question_id: string;
  question_key: string;
  question_title: string;
  question_type: SurveyQuestionType;
  answer_json: string;
  answer_text: string | null;
  created_at: string;
};

type SurveySubmissionCreateInput = Omit<SurveySubmissionEntity, "answers"> & {
  answers: Array<Omit<SurveySubmissionAnswerEntity, "submissionId">>;
};

export class SurveyRepo {
  constructor(private readonly db: Database.Database) {}

  create(entity: SurveyEntity): void {
    this.db.transaction(() => {
      this.insertOrReplaceSurvey(entity);
      this.insertQuestionsAndOptions(entity);
    })();
  }

  updateDefinition(entity: SurveyEntity): void {
    this.db.transaction(() => {
      this.insertOrReplaceSurvey(entity);
      this.db.prepare("DELETE FROM survey_questions WHERE survey_id = ?").run(entity.id);
      this.insertQuestionsAndOptions(entity);
    })();
  }

  updateStatus(id: string, status: SurveyStatus, updatedAt: string): boolean {
    const result = this.db
      .prepare("UPDATE surveys SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, updatedAt, id);
    return result.changes > 0;
  }

  findById(id: string): SurveyEntity | null {
    const row = this.db.prepare("SELECT * FROM surveys WHERE id = ?").get(id) as SurveyRow | undefined;
    if (!row) {
      return null;
    }
    return this.hydrateSurvey(row);
  }

  findBySlug(slug: string): SurveyEntity | null {
    const row = this.db.prepare("SELECT * FROM surveys WHERE slug = ?").get(slug) as SurveyRow | undefined;
    if (!row) {
      return null;
    }
    return this.hydrateSurvey(row);
  }

  list(query: ListSurveysQuery & { createdBy?: string | null }): { items: SurveyEntity[]; page: number; pageSize: number; total: number } {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (query.status) {
      conditions.push("status = ?");
      params.push(query.status);
    }

    if (query.keyword?.trim()) {
      conditions.push("(title LIKE ? OR description LIKE ? OR slug LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    if (query.createdBy?.trim()) {
      conditions.push("created_by = ?");
      params.push(query.createdBy.trim());
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM surveys ${whereClause}`)
      .get(...params) as { total: number };
    const rows = this.db
      .prepare(
        `
          SELECT * FROM surveys
          ${whereClause}
          ORDER BY updated_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as SurveyRow[];

    return {
      items: rows.map((row) => this.mapSurveyRow(row, [])),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  createSubmission(input: SurveySubmissionCreateInput): void {
    this.db.transaction(() => {
      this.db
        .prepare(
          `
          INSERT INTO survey_submissions (
            id, survey_id, contact, source, client_ip, user_agent, submitted_at, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `
        )
        .run(
          input.id,
          input.surveyId,
          input.contact,
          input.source,
          input.clientIp,
          input.userAgent,
          input.submittedAt,
          input.createdAt
        );

      const answerStmt = this.db.prepare(
        `
        INSERT INTO survey_answers (
          id, submission_id, question_id, question_key, question_title, question_type,
          answer_json, answer_text, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      );
      for (const answer of input.answers) {
        answerStmt.run(
          answer.id,
          input.id,
          answer.questionId,
          answer.questionKey,
          answer.questionTitle,
          answer.questionType,
          answer.answerJson,
          answer.answerText,
          answer.createdAt
        );
      }
    })();
  }

  listSubmissions(surveyId: string, query: ListSurveySubmissionsQuery): SurveySubmissionListResult {
    const { page, pageSize, offset } = normalizePage(query.page, query.pageSize);
    const conditions = ["survey_id = ?"];
    const params: unknown[] = [surveyId];

    if (query.keyword?.trim()) {
      conditions.push("(contact LIKE ? OR client_ip LIKE ? OR user_agent LIKE ?)");
      const keyword = `%${query.keyword.trim()}%`;
      params.push(keyword, keyword, keyword);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS total FROM survey_submissions ${whereClause}`)
      .get(...params) as { total: number };

    const rows = this.db
      .prepare(
        `
          SELECT * FROM survey_submissions
          ${whereClause}
          ORDER BY submitted_at DESC
          LIMIT ? OFFSET ?
        `
      )
      .all(...params, pageSize, offset) as SurveySubmissionRow[];

    const submissionIds = rows.map((row) => row.id);
    const answerMap = this.loadAnswersBySubmissionIds(submissionIds);

    return {
      items: rows.map((row) => this.mapSubmissionRow(row, answerMap.get(row.id) ?? [])),
      page,
      pageSize,
      total: totalRow.total
    };
  }

  listSubmissionsAll(surveyId: string): SurveySubmissionEntity[] {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM survey_submissions
          WHERE survey_id = ?
          ORDER BY submitted_at DESC
        `
      )
      .all(surveyId) as SurveySubmissionRow[];

    const submissionIds = rows.map((row) => row.id);
    const answerMap = this.loadAnswersBySubmissionIds(submissionIds);
    return rows.map((row) => this.mapSubmissionRow(row, answerMap.get(row.id) ?? []));
  }

  private insertOrReplaceSurvey(entity: SurveyEntity): void {
    this.db
      .prepare(
        `
        INSERT INTO surveys (
          id, title, description, slug, status, is_public, start_at, end_at, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          description = excluded.description,
          slug = excluded.slug,
          status = excluded.status,
          is_public = excluded.is_public,
          start_at = excluded.start_at,
          end_at = excluded.end_at,
          created_by = excluded.created_by,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at
        `
      )
      .run(
        entity.id,
        entity.title,
        entity.description,
        entity.slug,
        entity.status,
        entity.isPublic ? 1 : 0,
        entity.startAt,
        entity.endAt,
        entity.createdBy,
        entity.createdAt,
        entity.updatedAt
      );
  }

  private insertQuestionsAndOptions(entity: SurveyEntity): void {
    const questionStmt = this.db.prepare(
      `
      INSERT INTO survey_questions (
        id, survey_id, question_key, title, description, type, required, sort,
        placeholder, min_value, max_value, max_select, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    );
    const optionStmt = this.db.prepare(
      `
      INSERT INTO survey_options (
        id, question_id, option_label, option_value, sort, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `
    );

    for (const question of entity.questions) {
      questionStmt.run(
        question.id,
        entity.id,
        question.key,
        question.title,
        question.description,
        question.type,
        question.required ? 1 : 0,
        question.sort,
        question.placeholder,
        question.minValue,
        question.maxValue,
        question.maxSelect,
        question.createdAt,
        question.updatedAt
      );

      for (const option of question.options) {
        optionStmt.run(
          option.id,
          question.id,
          option.label,
          option.value,
          option.sort,
          option.createdAt,
          option.updatedAt
        );
      }
    }
  }

  private hydrateSurvey(row: SurveyRow): SurveyEntity {
    const questionRows = this.db
      .prepare(
        `
        SELECT * FROM survey_questions
        WHERE survey_id = ?
        ORDER BY sort ASC, created_at ASC
        `
      )
      .all(row.id) as SurveyQuestionRow[];

    const questions = this.attachOptions(questionRows);
    return this.mapSurveyRow(row, questions);
  }

  private attachOptions(questionRows: SurveyQuestionRow[]): SurveyQuestionEntity[] {
    if (questionRows.length === 0) {
      return [];
    }
    const questionIds = questionRows.map((item) => item.id);
    const placeholders = questionIds.map(() => "?").join(",");
    const optionRows = this.db
      .prepare(
        `
        SELECT * FROM survey_options
        WHERE question_id IN (${placeholders})
        ORDER BY sort ASC, created_at ASC
        `
      )
      .all(...questionIds) as SurveyOptionRow[];

    const optionMap = new Map<string, SurveyOptionEntity[]>();
    for (const optionRow of optionRows) {
      const option = this.mapOptionRow(optionRow);
      const list = optionMap.get(optionRow.question_id) ?? [];
      list.push(option);
      optionMap.set(optionRow.question_id, list);
    }

    return questionRows.map((row) => this.mapQuestionRow(row, optionMap.get(row.id) ?? []));
  }

  private loadAnswersBySubmissionIds(submissionIds: string[]): Map<string, SurveySubmissionAnswerEntity[]> {
    if (submissionIds.length === 0) {
      return new Map();
    }
    const placeholders = submissionIds.map(() => "?").join(",");
    const rows = this.db
      .prepare(
        `
        SELECT * FROM survey_answers
        WHERE submission_id IN (${placeholders})
        ORDER BY created_at ASC
        `
      )
      .all(...submissionIds) as SurveyAnswerRow[];

    const map = new Map<string, SurveySubmissionAnswerEntity[]>();
    for (const row of rows) {
      const item = this.mapAnswerRow(row);
      const list = map.get(row.submission_id) ?? [];
      list.push(item);
      map.set(row.submission_id, list);
    }
    return map;
  }

  private mapSurveyRow(row: SurveyRow, questions: SurveyQuestionEntity[]): SurveyEntity {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      slug: row.slug,
      status: row.status,
      isPublic: row.is_public === 1,
      startAt: row.start_at,
      endAt: row.end_at,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      questions
    };
  }

  private mapQuestionRow(row: SurveyQuestionRow, options: SurveyOptionEntity[]): SurveyQuestionEntity {
    return {
      id: row.id,
      surveyId: row.survey_id,
      key: row.question_key,
      title: row.title,
      description: row.description,
      type: row.type,
      required: row.required === 1,
      sort: row.sort,
      placeholder: row.placeholder,
      minValue: row.min_value,
      maxValue: row.max_value,
      maxSelect: row.max_select,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      options
    };
  }

  private mapOptionRow(row: SurveyOptionRow): SurveyOptionEntity {
    return {
      id: row.id,
      questionId: row.question_id,
      label: row.option_label,
      value: row.option_value,
      sort: row.sort,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapSubmissionRow(row: SurveySubmissionRow, answers: SurveySubmissionAnswerEntity[]): SurveySubmissionEntity {
    return {
      id: row.id,
      surveyId: row.survey_id,
      contact: row.contact,
      source: row.source,
      clientIp: row.client_ip,
      userAgent: row.user_agent,
      submittedAt: row.submitted_at,
      createdAt: row.created_at,
      answers
    };
  }

  private mapAnswerRow(row: SurveyAnswerRow): SurveySubmissionAnswerEntity {
    return {
      id: row.id,
      submissionId: row.submission_id,
      questionId: row.question_id,
      questionKey: row.question_key,
      questionTitle: row.question_title,
      questionType: row.question_type,
      answerJson: row.answer_json,
      answerText: row.answer_text,
      createdAt: row.created_at
    };
  }
}
