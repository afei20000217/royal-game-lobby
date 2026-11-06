PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS player_inventory (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  purchased_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_player_inventory_user_purchased
  ON player_inventory(user_id, purchased_at DESC);
