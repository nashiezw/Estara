ALTER TABLE agency_memberships ADD COLUMN branch_scope_enabled INTEGER NOT NULL DEFAULT 0;
ALTER TABLE documents ADD COLUMN access_mode TEXT NOT NULL DEFAULT 'agency';

CREATE TABLE branch_memberships (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  user_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_branch_memberships_unique ON branch_memberships(agency_id, branch_id, user_id);
CREATE INDEX idx_branch_memberships_user ON branch_memberships(agency_id, user_id);

CREATE TABLE document_permissions (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  document_id TEXT NOT NULL REFERENCES documents(id),
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  capability TEXT NOT NULL DEFAULT 'read',
  granted_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX idx_document_permissions_unique ON document_permissions(document_id, subject_type, subject_id, capability);
CREATE INDEX idx_document_permissions_subject ON document_permissions(agency_id, subject_type, subject_id);
PRAGMA optimize;
