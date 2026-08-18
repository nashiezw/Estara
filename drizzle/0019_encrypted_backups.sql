CREATE TABLE backup_snapshots (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  object_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  encrypted_bytes INTEGER,
  checksum_sha256 TEXT,
  table_counts TEXT NOT NULL DEFAULT '{}',
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT,
  failure_reason TEXT,
  created_by TEXT NOT NULL
);
CREATE INDEX idx_backup_snapshots_agency_completed ON backup_snapshots(agency_id, completed_at);
CREATE INDEX idx_backup_snapshots_status_started ON backup_snapshots(status, started_at);
PRAGMA optimize;
