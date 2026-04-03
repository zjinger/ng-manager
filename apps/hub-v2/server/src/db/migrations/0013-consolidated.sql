-- Hub v2 post-0012 consolidated baseline
-- Purpose:
-- 1) Provide a compact schema reference for late-stage patch migrations.
-- 2) Bootstrap brand-new environments when needed.
--
-- IMPORTANT:
-- - This file is not used by runtime migration runner.
-- - Do not move this file into `src/db/migrations`.

-- dashboard_preferences (0013)
CREATE TABLE IF NOT EXISTS dashboard_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  stats_config_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_dashboard_preferences_user_id
  ON dashboard_preferences(user_id);

-- project meta tables (0016)
CREATE TABLE IF NOT EXISTS project_modules (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort INTEGER NOT NULL DEFAULT 0,
  "desc" TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, name),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_modules_project_id
  ON project_modules(project_id);

CREATE TABLE IF NOT EXISTS project_environments (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  name TEXT NOT NULL,
  code TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort INTEGER NOT NULL DEFAULT 0,
  "desc" TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, name),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_environments_project_id
  ON project_environments(project_id);

CREATE TABLE IF NOT EXISTS project_versions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  version TEXT NOT NULL,
  code TEXT,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  sort INTEGER NOT NULL DEFAULT 0,
  "desc" TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(project_id, version),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_project_versions_project_id
  ON project_versions(project_id);

-- feedbacks (0017)
CREATE TABLE IF NOT EXISTS feedbacks (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  contact TEXT,
  client_name TEXT,
  client_version TEXT,
  client_ip TEXT,
  os_info TEXT,
  project_key TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedbacks_status ON feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_feedbacks_category ON feedbacks(category);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created_at ON feedbacks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_key ON feedbacks(project_key);
CREATE INDEX IF NOT EXISTS idx_feedbacks_project_key_status ON feedbacks(project_key, status);

-- surveys (0025)
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
