ALTER TABLE users ADD COLUMN region TEXT;
ALTER TABLE users ADD COLUMN birthday_year_roc INTEGER;
ALTER TABLE users ADD COLUMN birthday_month INTEGER;
ALTER TABLE users ADD COLUMN birthday_day INTEGER;
ALTER TABLE users ADD COLUMN gender TEXT;

CREATE TRIGGER IF NOT EXISTS users_nickname_unique_insert
BEFORE INSERT ON users
WHEN NEW.nickname IS NOT NULL AND EXISTS (
  SELECT 1 FROM users WHERE nickname = NEW.nickname COLLATE NOCASE
)
BEGIN
  SELECT RAISE(ABORT, 'nickname_exists');
END;

CREATE TRIGGER IF NOT EXISTS users_nickname_unique_update
BEFORE UPDATE OF nickname ON users
WHEN NEW.nickname IS NOT NULL AND EXISTS (
  SELECT 1 FROM users WHERE nickname = NEW.nickname COLLATE NOCASE AND id <> NEW.id
)
BEGIN
  SELECT RAISE(ABORT, 'nickname_exists');
END;
