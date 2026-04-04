CREATE TABLE IF NOT EXISTS surveys (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1)),
  start_at TEXT,
  end_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_surveys_status ON surveys(status);
CREATE INDEX IF NOT EXISTS idx_surveys_slug ON surveys(slug);
CREATE INDEX IF NOT EXISTS idx_surveys_updated_at ON surveys(updated_at DESC);

CREATE TABLE IF NOT EXISTS survey_questions (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL,
  question_key TEXT NOT NULL,
  page_title TEXT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  required INTEGER NOT NULL DEFAULT 0 CHECK (required IN (0, 1)),
  sort INTEGER NOT NULL DEFAULT 0,
  placeholder TEXT,
  min_value INTEGER,
  max_value INTEGER,
  max_select INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(survey_id, question_key),
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_survey_questions_survey_sort
  ON survey_questions(survey_id, sort);

CREATE TABLE IF NOT EXISTS survey_options (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  option_label TEXT NOT NULL,
  option_value TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(question_id, option_value),
  FOREIGN KEY (question_id) REFERENCES survey_questions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_survey_options_question_sort
  ON survey_options(question_id, sort);

CREATE TABLE IF NOT EXISTS survey_submissions (
  id TEXT PRIMARY KEY,
  survey_id TEXT NOT NULL,
  contact TEXT,
  source TEXT,
  client_ip TEXT,
  user_agent TEXT,
  submitted_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (survey_id) REFERENCES surveys(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_survey_submissions_survey_submitted_at
  ON survey_submissions(survey_id, submitted_at DESC);

CREATE TABLE IF NOT EXISTS survey_answers (
  id TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  question_key TEXT NOT NULL,
  question_title TEXT NOT NULL,
  question_type TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  answer_text TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (submission_id) REFERENCES survey_submissions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_survey_answers_submission
  ON survey_answers(submission_id);
