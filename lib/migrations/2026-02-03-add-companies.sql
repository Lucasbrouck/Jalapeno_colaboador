-- migrations/2026-02-03-add-companies.sql

-- Create companies table
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  adminName TEXT NOT NULL,
  adminEmail TEXT UNIQUE NOT NULL,
  createdAt TEXT DEFAULT (datetime('now'))
);

-- Add company_id to existing tables
-- Note: SQLite doesn't support adding a column with a DEFAULT value that references another table or complex expression in a single ALTER TABLE.
-- We'll add them as nullable first or with a placeholder, then we can update existing data to a 'default' company if needed.

ALTER TABLE users ADD COLUMN company_id TEXT;
ALTER TABLE shifts ADD COLUMN company_id TEXT;
ALTER TABLE advances ADD COLUMN company_id TEXT;
ALTER TABLE absences ADD COLUMN company_id TEXT;
ALTER TABLE goals ADD COLUMN company_id TEXT;
ALTER TABLE pdi_models ADD COLUMN company_id TEXT;
ALTER TABLE pdi_questions ADD COLUMN company_id TEXT;
ALTER TABLE pdi_evaluations ADD COLUMN company_id TEXT;
ALTER TABLE pdi_answers ADD COLUMN company_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_company ON shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_advances_company ON advances(company_id);
CREATE INDEX IF NOT EXISTS idx_absences_company ON absences(company_id);
CREATE INDEX IF NOT EXISTS idx_goals_company ON goals(company_id);
CREATE INDEX IF NOT EXISTS idx_pdi_models_company ON pdi_models(company_id);
CREATE INDEX IF NOT EXISTS idx_pdi_questions_company ON pdi_questions(company_id);
CREATE INDEX IF NOT EXISTS idx_pdi_evaluations_company ON pdi_evaluations(company_id);
CREATE INDEX IF NOT EXISTS idx_pdi_answers_company ON pdi_answers(company_id);

-- Insert a default company for existing data
INSERT INTO companies (id, name, adminName, adminEmail) 
VALUES ('default-company', 'Empresa Padrão', 'Admin Padrão', 'admin@padrao.com');

-- Update all existing records to the default company
UPDATE users SET company_id = 'default-company';
UPDATE shifts SET company_id = 'default-company';
UPDATE advances SET company_id = 'default-company';
UPDATE absences SET company_id = 'default-company';
UPDATE goals SET company_id = 'default-company';
UPDATE pdi_models SET company_id = 'default-company';
UPDATE pdi_questions SET company_id = 'default-company';
UPDATE pdi_evaluations SET company_id = 'default-company';
UPDATE pdi_answers SET company_id = 'default-company';
