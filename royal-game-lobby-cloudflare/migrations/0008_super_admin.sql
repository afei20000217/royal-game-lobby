ALTER TABLE users ADD COLUMN is_super_admin INTEGER NOT NULL DEFAULT 0 CHECK (is_super_admin IN (0, 1));

CREATE TABLE _player_number_sequence_backup (seq INTEGER NOT NULL);
INSERT INTO _player_number_sequence_backup
SELECT COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'player_numbers'), (SELECT MAX(number) FROM player_numbers), 0);

CREATE TABLE player_numbers_v2 (
  number INTEGER PRIMARY KEY AUTOINCREMENT CHECK (number BETWEEN 0 AND 99999999),
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO player_numbers_v2 (number, user_id)
SELECT CASE WHEN users.username = 'afei' THEN 0 ELSE player_numbers.number END, player_numbers.user_id
FROM player_numbers JOIN users ON users.id = player_numbers.user_id;

DROP TABLE player_numbers;
ALTER TABLE player_numbers_v2 RENAME TO player_numbers;
UPDATE sqlite_sequence SET seq = (SELECT seq FROM _player_number_sequence_backup) WHERE name = 'player_numbers';
INSERT INTO sqlite_sequence (name, seq)
SELECT 'player_numbers', seq FROM _player_number_sequence_backup
WHERE NOT EXISTS (SELECT 1 FROM sqlite_sequence WHERE name = 'player_numbers');
DROP TABLE _player_number_sequence_backup;

UPDATE users SET is_admin = 0, is_super_admin = 0;
UPDATE users SET is_admin = 1, is_super_admin = 1 WHERE username = 'afei';

