-- Initial Schema for Employee Rewards App
-- SQLite Database

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  adminName TEXT NOT NULL,
  adminEmail TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now'))
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'worker', 'manager')),
  plataBalance INTEGER DEFAULT 0,
  isFirstAccess INTEGER DEFAULT 1,
  resetToken TEXT,
  resetTokenExpires TEXT,
  training_level_id TEXT,
  company_id TEXT,
  recebeJae INTEGER DEFAULT 0,
  elegivelPremio INTEGER DEFAULT 1,
  hiringDate TEXT,
  documents TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Shifts table
CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('DAY', 'NIGHT')),
  revenue REAL NOT NULL,
  metricCMV REAL,
  metricRATING REAL,
  metricOPS REAL,
  company_id TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Shift workers junction table
CREATE TABLE IF NOT EXISTS shift_workers (
  shiftId TEXT NOT NULL,
  userId TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ON_TIME', 'LATE')),
  PRIMARY KEY (shiftId, userId),
  FOREIGN KEY (shiftId) REFERENCES shifts(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

-- Advances table
CREATE TABLE IF NOT EXISTS advances (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  value REAL NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  company_id TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Absences table
CREATE TABLE IF NOT EXISTS absences (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  date TEXT NOT NULL,
  description TEXT,
  excused INTEGER DEFAULT 0,
  certificate_url TEXT,
  justification_status TEXT,
  company_id TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);


-- Goals configuration table
CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY DEFAULT 'default',
  month TEXT,
  revenueGoal REAL NOT NULL,
  revenueSuperGoal REAL NOT NULL,
  cmvGoal REAL NOT NULL,
  cmvSuperGoal REAL NOT NULL,
  ratingGoal REAL NOT NULL,
  ratingSuperGoal REAL NOT NULL,
  opsGoal REAL NOT NULL,
  opsSuperGoal REAL NOT NULL,
  company_id TEXT,
  updatedAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Weekly metrics
CREATE TABLE IF NOT EXISTS weekly_metrics (
  date TEXT PRIMARY KEY,
  cmv REAL,
  rating REAL,
  ops REAL,
  company_id TEXT,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Training levels table
CREATE TABLE IF NOT EXISTS training_levels (
    id TEXT PRIMARY KEY,
    order_index INTEGER,
    name TEXT,
    description TEXT,
    icon TEXT
);

-- PDI Models table
CREATE TABLE IF NOT EXISTS pdi_models (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    company_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- PDI Questions table
CREATE TABLE IF NOT EXISTS pdi_questions (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('CULTURAL', 'OPERATIONAL', 'OPEN')),
    roles TEXT DEFAULT '["all"]', 
    active INTEGER DEFAULT 1,
    model_id TEXT, 
    company_id TEXT,
    FOREIGN KEY (model_id) REFERENCES pdi_models(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- PDI Evaluations table
CREATE TABLE IF NOT EXISTS pdi_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING_SELF',
    completed_at TEXT,
    model_id TEXT,
    focus_op_id TEXT,
    focus_cult_id TEXT,
    focus_cult_comment TEXT,
    final_comment TEXT,
    user_viewed TEXT,
    company_id TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- PDI Answers table
CREATE TABLE IF NOT EXISTS pdi_answers (
    id TEXT PRIMARY KEY,
    evaluation_id INTEGER,
    userId TEXT NOT NULL,
    questionId TEXT NOT NULL,
    selfScore INTEGER,
    selfComment TEXT,
    admScore INTEGER,
    admComment TEXT,
    date TEXT NOT NULL,
    company_id TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (evaluation_id) REFERENCES pdi_evaluations(id) ON DELETE CASCADE,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (questionId) REFERENCES pdi_questions(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Plata Transactions table
CREATE TABLE IF NOT EXISTS plata_transactions (
    id TEXT PRIMARY KEY,
    fromUserId TEXT,
    toUserId TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK(amount > 0),
    description TEXT,
    timestamp TEXT NOT NULL,
    hash TEXT NOT NULL,
    company_id TEXT,
    FOREIGN KEY (fromUserId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (toUserId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_advances_userId ON advances(userId);
CREATE INDEX IF NOT EXISTS idx_advances_date ON advances(date);
CREATE INDEX IF NOT EXISTS idx_absences_userId ON absences(userId);
CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(date);
CREATE INDEX IF NOT EXISTS idx_shift_workers_userId ON shift_workers(userId);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_company ON shifts(company_id);

-- Driver Scales table
CREATE TABLE IF NOT EXISTS driver_scales (
  id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now'))
);

-- Delivery Drivers table

-- Driver Check-ins table
CREATE TABLE IF NOT EXISTS driver_checkins (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ON_TIME', 'LATE')),
  is_double INTEGER DEFAULT 0,
  deliveries INTEGER DEFAULT 0,
  fees INTEGER DEFAULT 0,
  total_value REAL DEFAULT 0,
  minutes_late INTEGER DEFAULT 0,
  discounted_hours INTEGER DEFAULT 0,
  checkout_status TEXT,
  minutes_early INTEGER DEFAULT 0,
  entry_time TEXT,
  exit_time TEXT,
  scale_id TEXT,
  active INTEGER DEFAULT 1,
  cancellation_reason TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (driver_id) REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  FOREIGN KEY (scale_id) REFERENCES driver_scales(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_driver_checkins_date ON driver_checkins(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_checkins_active_unique ON driver_checkins(driver_id, date) WHERE active = 1;

-- Store Items table
CREATE TABLE IF NOT EXISTS store_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  icon TEXT,
  company_id TEXT,
  active INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Store Purchases table
CREATE TABLE IF NOT EXISTS store_purchases (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  priceAtPurchase INTEGER NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'CANCELLED')),
  company_id TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (itemId) REFERENCES store_items(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_store_purchases_user ON store_purchases(userId);
CREATE INDEX IF NOT EXISTS idx_store_purchases_company ON store_purchases(company_id);

-- Internal Regiment Rules (Regimento Interno)
CREATE TABLE IF NOT EXISTS disciplinary_rules (
  id TEXT PRIMARY KEY,
  code TEXT,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  company_id TEXT,
  active INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

-- Employee Disciplinary Records (Medidas Disciplinares / Sanções)
CREATE TABLE IF NOT EXISTS disciplinary_records (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  company_id TEXT,
  type TEXT NOT NULL CHECK(type IN ('ORIENTATION', 'VERBAL_WARNING', 'WRITTEN_WARNING', 'SUSPENSION')),
  rule_id TEXT,
  rule_title TEXT NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  suspension_days INTEGER DEFAULT 0,
  suspension_start_date TEXT,
  document_url TEXT,
  document_name TEXT,
  created_by TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (company_id) REFERENCES companies(id)
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_records_user ON disciplinary_records(userId);
CREATE INDEX IF NOT EXISTS idx_disciplinary_records_company ON disciplinary_records(company_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_records_date ON disciplinary_records(date);


-- Canal de Escuta e Denuncia (NR-1 e NR-5 / Lei 14.457/2022)
CREATE TABLE IF NOT EXISTS whistleblower_reports (
  id TEXT PRIMARY KEY,
  protocol TEXT UNIQUE NOT NULL,
  is_anonymous INTEGER NOT NULL DEFAULT 1,
  reporter_user_id TEXT,
  reporter_name TEXT,
  reporter_contact TEXT,
  reporter_role TEXT,
  company_id TEXT,
  norm_reference TEXT NOT NULL DEFAULT 'NR5',
  category TEXT NOT NULL,
  severity TEXT DEFAULT 'MEDIUM',
  title TEXT,
  description TEXT NOT NULL,
  incident_date TEXT,
  incident_location TEXT,
  involved_people TEXT,
  witnesses_info TEXT,
  evidence_attachment TEXT,
  anonymity_hash TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  internal_notes TEXT,
  action_plan TEXT,
  resolution_summary TEXT,
  assigned_to TEXT,
  sla_due_date TEXT,
  resolved_at TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  updatedAt TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS whistleblower_messages (
  id TEXT PRIMARY KEY,
  report_id TEXT NOT NULL,
  protocol TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_label TEXT,
  message TEXT NOT NULL,
  attachment_url TEXT,
  createdAt TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (report_id) REFERENCES whistleblower_reports(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wb_reports_protocol ON whistleblower_reports(protocol);
CREATE INDEX IF NOT EXISTS idx_wb_reports_company ON whistleblower_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_wb_reports_status ON whistleblower_reports(status);
CREATE INDEX IF NOT EXISTS idx_wb_messages_report ON whistleblower_messages(report_id);
CREATE INDEX IF NOT EXISTS idx_wb_messages_protocol ON whistleblower_messages(protocol);
