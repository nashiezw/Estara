CREATE TABLE media_cleanup_jobs (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  media_asset_id TEXT NOT NULL,
  object_keys TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_attempt_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_media_cleanup_due ON media_cleanup_jobs(status,next_attempt_at);
