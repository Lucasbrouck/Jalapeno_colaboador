-- migrations/2026-02-03-fix-missing-columns.sql
ALTER TABLE weekly_metrics ADD COLUMN company_id TEXT;
CREATE INDEX IF NOT EXISTS idx_weekly_metrics_company ON weekly_metrics(company_id);
UPDATE weekly_metrics SET company_id = 'default-company';
