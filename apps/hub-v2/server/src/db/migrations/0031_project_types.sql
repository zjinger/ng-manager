ALTER TABLE projects ADD COLUMN project_type TEXT NOT NULL DEFAULT 'self_dev' CHECK (project_type IN ('entrust_dev', 'self_dev', 'tech_service'));
ALTER TABLE projects ADD COLUMN contract_no TEXT;
ALTER TABLE projects ADD COLUMN delivery_date TEXT;
ALTER TABLE projects ADD COLUMN product_line TEXT;
ALTER TABLE projects ADD COLUMN sla_level TEXT;
