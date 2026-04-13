CREATE TABLE rate_limits (
  google_id TEXT NOT NULL,
  requested_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_rate_limits_user_time ON rate_limits(google_id, requested_at);
