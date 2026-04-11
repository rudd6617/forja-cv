CREATE TABLE users (
  google_id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  picture TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE resumes (
  id TEXT PRIMARY KEY,
  google_id TEXT NOT NULL,
  title TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (google_id) REFERENCES users(google_id)
);

CREATE INDEX idx_resumes_user ON resumes(google_id);
