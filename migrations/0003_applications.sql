CREATE TABLE applications (
  id TEXT PRIMARY KEY,
  google_id TEXT NOT NULL,
  resume_id TEXT NOT NULL,
  company TEXT NOT NULL,
  position TEXT NOT NULL,
  jd TEXT,
  jd_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  score INTEGER,
  analysis TEXT,
  notes TEXT,
  applied_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (google_id) REFERENCES users(google_id),
  FOREIGN KEY (resume_id) REFERENCES resumes(id)
);

CREATE INDEX idx_apps_user_status ON applications(google_id, status);
CREATE INDEX idx_apps_user_updated ON applications(google_id, updated_at DESC);
