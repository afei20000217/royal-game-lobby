PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS player_numbers (
  number INTEGER PRIMARY KEY AUTOINCREMENT CHECK (number BETWEEN 1 AND 99999999),
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO player_numbers (user_id)
SELECT users.id FROM users
LEFT JOIN player_numbers ON player_numbers.user_id = users.id
WHERE player_numbers.user_id IS NULL
ORDER BY users.created_at ASC, users.id ASC;
