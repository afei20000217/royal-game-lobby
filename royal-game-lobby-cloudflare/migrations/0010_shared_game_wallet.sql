CREATE TABLE IF NOT EXISTS game_wallet_debits (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  game TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spin', 'feature')),
  amount INTEGER NOT NULL CHECK (amount BETWEEN 1 AND 100000),
  balance_after INTEGER,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, request_id)
);

CREATE INDEX IF NOT EXISTS game_wallet_debits_user_time
  ON game_wallet_debits(user_id, created_at DESC);

CREATE TRIGGER IF NOT EXISTS game_wallet_debits_apply
AFTER INSERT ON game_wallet_debits
BEGIN
  UPDATE users
  SET fly_coins = fly_coins - NEW.amount
  WHERE id = NEW.user_id AND fly_coins >= NEW.amount;

  UPDATE game_wallet_debits
  SET balance_after = (SELECT fly_coins FROM users WHERE id = NEW.user_id)
  WHERE id = NEW.id;
END;
