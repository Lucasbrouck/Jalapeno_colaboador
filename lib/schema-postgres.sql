-- PostgreSQL Schema for Employee Rewards App (27 Tables + Indexes)

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  adminName TEXT NOT NULL,
  adminEmail TEXT NOT NULL,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  checkinRadius INTEGER DEFAULT 200,
  saipos_token TEXT,
  ignore_ficha_venda INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'worker', 'manager')),
  plataBalance DOUBLE PRECISION DEFAULT 0,
  isFirstAccess INTEGER DEFAULT 1,
  resetToken TEXT,
  resetTokenExpires TEXT,
  training_level_id TEXT,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  pdfObs TEXT,
  maquininhaOnboarding INTEGER DEFAULT 0,
  nfc_id TEXT,
  recebeJae INTEGER DEFAULT 0,
  elegivelPremio INTEGER DEFAULT 1,
  hiringDate TEXT,
  documents TEXT,
  cajaUserId TEXT,
  cajaRole TEXT,
  timesheetHeader TEXT
);

CREATE TABLE IF NOT EXISTS shifts (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('DAY', 'NIGHT')),
  revenue DOUBLE PRECISION NOT NULL,
  metricCMV DOUBLE PRECISION,
  metricRATING DOUBLE PRECISION,
  metricOPS DOUBLE PRECISION,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS shift_workers (
  shiftId TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK(status IN ('ON_TIME', 'LATE')),
  PRIMARY KEY (shiftId, userId)
);

CREATE TABLE IF NOT EXISTS advances (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value DOUBLE PRECISION NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS absences (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  description TEXT,
  excused INTEGER DEFAULT 0,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  certificate_url TEXT,
  justification_status TEXT
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY DEFAULT 'default',
  month TEXT,
  revenueGoal DOUBLE PRECISION NOT NULL,
  revenueSuperGoal DOUBLE PRECISION NOT NULL,
  cmvGoal DOUBLE PRECISION NOT NULL,
  cmvSuperGoal DOUBLE PRECISION NOT NULL,
  ratingGoal DOUBLE PRECISION NOT NULL,
  ratingSuperGoal DOUBLE PRECISION NOT NULL,
  opsGoal DOUBLE PRECISION NOT NULL,
  opsSuperGoal DOUBLE PRECISION NOT NULL,
  company_id TEXT,
  updatedAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  locked INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weekly_metrics (
  date TEXT NOT NULL,
  company_id TEXT NOT NULL DEFAULT 'default-company',
  cmv DOUBLE PRECISION,
  rating DOUBLE PRECISION,
  ops DOUBLE PRECISION,
  PRIMARY KEY (date, company_id)
);

CREATE TABLE IF NOT EXISTS training_programs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  company_id TEXT DEFAULT 'SYSTEM',
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS training_groups (
  id TEXT PRIMARY KEY,
  program_id TEXT NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  platas DOUBLE PRECISION DEFAULT 0,
  company_id TEXT DEFAULT 'SYSTEM'
);

CREATE TABLE IF NOT EXISTS training_levels (
  id TEXT PRIMARY KEY,
  order_index INTEGER,
  name TEXT,
  description TEXT,
  icon TEXT,
  group_id TEXT,
  platas DOUBLE PRECISION DEFAULT 0,
  company_id TEXT
);

CREATE TABLE IF NOT EXISTS pdi_models (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  company_id TEXT,
  created_at TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS pdi_questions (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('CULTURAL', 'OPERATIONAL', 'OPEN')),
  roles TEXT DEFAULT '["all"]',
  active INTEGER DEFAULT 1,
  model_id TEXT REFERENCES pdi_models(id) ON DELETE CASCADE,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS pdi_evaluations (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING_SELF',
  completed_at TEXT,
  model_id TEXT,
  focus_op_id TEXT,
  focus_op_comment TEXT,
  focus_cult_id TEXT,
  focus_cult_comment TEXT,
  final_comment TEXT,
  user_viewed TEXT,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS pdi_answers (
  id TEXT PRIMARY KEY,
  evaluation_id INTEGER REFERENCES pdi_evaluations(id) ON DELETE CASCADE,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  questionId TEXT NOT NULL REFERENCES pdi_questions(id) ON DELETE CASCADE,
  selfScore INTEGER,
  selfComment TEXT,
  admScore INTEGER,
  admComment TEXT,
  date TEXT NOT NULL,
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS plata_transactions (
  id TEXT PRIMARY KEY,
  fromUserId TEXT,
  toUserId TEXT,
  amount DOUBLE PRECISION NOT NULL CHECK(amount > 0),
  description TEXT,
  timestamp TEXT NOT NULL,
  hash TEXT NOT NULL,
  company_id TEXT
);

CREATE TABLE IF NOT EXISTS streaks_config (
  id TEXT PRIMARY KEY,
  days_required INTEGER DEFAULT 20,
  plata_reward DOUBLE PRECISION DEFAULT 100,
  bonus_no_absences DOUBLE PRECISION DEFAULT 0,
  bonus_no_lateness DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS streak_rewards_claimed (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  month TEXT NOT NULL,
  company_id TEXT,
  UNIQUE(userId, month)
);

CREATE TABLE IF NOT EXISTS user_daily_access (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  date TEXT NOT NULL,
  company_id TEXT,
  UNIQUE(userId, date)
);

CREATE TABLE IF NOT EXISTS delivery_drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  active INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  type TEXT DEFAULT 'OUTSOURCED'
);

CREATE TABLE IF NOT EXISTS driver_scales (
  id TEXT PRIMARY KEY,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS driver_checkins (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('ON_TIME', 'LATE')),
  is_double INTEGER DEFAULT 0,
  deliveries INTEGER DEFAULT 0,
  fees INTEGER DEFAULT 0,
  total_value DOUBLE PRECISION DEFAULT 0,
  active INTEGER DEFAULT 1,
  cancellation_reason TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  minutes_late INTEGER DEFAULT 0,
  discounted_hours INTEGER DEFAULT 0,
  checkout_status TEXT,
  minutes_early INTEGER DEFAULT 0,
  entry_time TEXT,
  exit_time TEXT,
  scale_id TEXT,
  double_scale_id TEXT
);

CREATE TABLE IF NOT EXISTS driver_configs (
  id TEXT PRIMARY KEY,
  daily_rate DOUBLE PRECISION DEFAULT 0,
  delivery_rate DOUBLE PRECISION DEFAULT 0,
  fee_rate DOUBLE PRECISION DEFAULT 0
);

CREATE TABLE IF NOT EXISTS driver_payments (
  id TEXT PRIMARY KEY,
  driver_id TEXT NOT NULL REFERENCES delivery_drivers(id) ON DELETE CASCADE,
  amount DOUBLE PRECISION NOT NULL,
  description TEXT,
  date TEXT NOT NULL,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  active INTEGER DEFAULT 1,
  cancellation_reason TEXT
);

CREATE TABLE IF NOT EXISTS user_checkins (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  date TEXT NOT NULL,
  shiftType TEXT CHECK(shiftType IN ('DAY', 'NIGHT')),
  checkinEntry TEXT,
  checkoutBreak TEXT,
  checkinBreak TEXT,
  checkoutExit TEXT,
  status TEXT CHECK(status IN ('ON_TIME', 'LATE')),
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT),
  isDouble INTEGER DEFAULT 0,
  checkinDouble TEXT,
  checkoutExit2 TEXT,
  UNIQUE(userId, date)
);

CREATE TABLE IF NOT EXISTS store_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DOUBLE PRECISION NOT NULL,
  icon TEXT,
  company_id TEXT,
  active INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS store_purchases (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  itemId TEXT NOT NULL REFERENCES store_items(id) ON DELETE CASCADE,
  priceAtPurchase DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'APPROVED', 'CANCELLED')),
  company_id TEXT,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(date);
CREATE INDEX IF NOT EXISTS idx_absences_userId ON absences(userId);
CREATE INDEX IF NOT EXISTS idx_advances_date ON advances(date);
CREATE INDEX IF NOT EXISTS idx_advances_userId ON advances(userId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_driver_checkins_active_unique ON driver_checkins(driver_id, date) WHERE active = 1;
CREATE INDEX IF NOT EXISTS idx_driver_checkins_date ON driver_checkins(date);
CREATE INDEX IF NOT EXISTS idx_plata_from ON plata_transactions(fromUserId);
CREATE INDEX IF NOT EXISTS idx_plata_hash ON plata_transactions(hash);
CREATE INDEX IF NOT EXISTS idx_plata_timestamp ON plata_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_plata_to ON plata_transactions(toUserId);
CREATE INDEX IF NOT EXISTS idx_shift_workers_userId ON shift_workers(userId);
CREATE INDEX IF NOT EXISTS idx_shifts_company ON shifts(company_id);
CREATE INDEX IF NOT EXISTS idx_shifts_date ON shifts(date);
CREATE INDEX IF NOT EXISTS idx_store_purchases_company ON store_purchases(company_id);
CREATE INDEX IF NOT EXISTS idx_store_purchases_user ON store_purchases(userId);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cajaUserId ON users(cajaUserId) WHERE cajaUserId IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_nfc_id ON users(nfc_id) WHERE nfc_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

CREATE TABLE IF NOT EXISTS disciplinary_rules (
  id TEXT PRIMARY KEY,
  code TEXT,
  title TEXT NOT NULL,
  category TEXT,
  description TEXT,
  company_id TEXT,
  active INTEGER DEFAULT 1,
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE TABLE IF NOT EXISTS disciplinary_records (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  createdAt TEXT DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS idx_disciplinary_records_user ON disciplinary_records(userId);
CREATE INDEX IF NOT EXISTS idx_disciplinary_records_company ON disciplinary_records(company_id);
CREATE INDEX IF NOT EXISTS idx_disciplinary_records_date ON disciplinary_records(date);

