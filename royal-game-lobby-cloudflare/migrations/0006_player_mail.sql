PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_admin IN (0, 1));

-- The platform owner account may publish system-wide announcements.
UPDATE users SET is_admin = 1 WHERE username = 'afei0217';

CREATE TABLE IF NOT EXISTS player_mail (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_player_mail_recipient_date
  ON player_mail(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_player_mail_sender_date
  ON player_mail(sender_id, created_at DESC);

CREATE TABLE IF NOT EXISTS system_mail (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_system_mail_date
  ON system_mail(created_at DESC);

CREATE TABLE IF NOT EXISTS system_mail_reads (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL REFERENCES system_mail(id) ON DELETE CASCADE,
  read_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, message_id)
);
