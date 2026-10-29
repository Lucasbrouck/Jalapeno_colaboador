-- Migration: Add Plata Transactions Table
-- Date: 2026-01-30
-- Description: Creates table for tracking Plata transfers between users with immutable audit trail

CREATE TABLE IF NOT EXISTS plata_transactions (
    id TEXT PRIMARY KEY,
    fromUserId TEXT NOT NULL,
    toUserId TEXT NOT NULL,
    amount INTEGER NOT NULL CHECK(amount > 0),
    description TEXT,
    timestamp TEXT NOT NULL,
    hash TEXT NOT NULL,
    FOREIGN KEY (fromUserId) REFERENCES users(id),
    FOREIGN KEY (toUserId) REFERENCES users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_plata_from ON plata_transactions(fromUserId);
CREATE INDEX IF NOT EXISTS idx_plata_to ON plata_transactions(toUserId);
CREATE INDEX IF NOT EXISTS idx_plata_timestamp ON plata_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_plata_hash ON plata_transactions(hash);
