-- Flickle backend V1 schema (Cloudflare D1)

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS archive_progress (
  user_id TEXT NOT NULL,
  puzzle_date TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'won', 'lost')),
  guesses_used INTEGER,
  completed_at TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, puzzle_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (puzzle_date GLOB '????-??-??'),
  CHECK (guesses_used IS NULL OR (guesses_used >= 1 AND guesses_used <= 10))
);

CREATE INDEX IF NOT EXISTS idx_progress_user_status
  ON archive_progress(user_id, status);

CREATE INDEX IF NOT EXISTS idx_progress_user_date
  ON archive_progress(user_id, puzzle_date);

CREATE TABLE IF NOT EXISTS auth_magic_links (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL,
  request_ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_auth_magic_links_email
  ON auth_magic_links(email);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON sessions(user_id);
