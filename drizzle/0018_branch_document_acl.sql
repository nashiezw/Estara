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
CREATE TRIGGER document_permissions_subject_guard
BEFORE INSERT ON document_permissions
BEGIN
  SELECT CASE
    WHEN NEW.subject_type = 'user' AND NOT EXISTS (SELECT 1 FROM agency_memberships m WHERE m.agency_id=NEW.agency_id AND m.user_id=NEW.subject_id) THEN RAISE(ABORT, 'invalid document user grant')
    WHEN NEW.subject_type = 'branch' AND NOT EXISTS (SELECT 1 FROM branches b WHERE b.agency_id=NEW.agency_id AND b.id=NEW.subject_id) THEN RAISE(ABORT, 'invalid document branch grant')
    WHEN NEW.subject_type = 'role' AND NEW.subject_id NOT IN ('principal','admin','manager','agent','viewer') AND NOT EXISTS (SELECT 1 FROM roles r WHERE r.agency_id=NEW.agency_id AND r.id=NEW.subject_id) THEN RAISE(ABORT, 'invalid document role grant')
    WHEN NOT EXISTS (SELECT 1 FROM documents d WHERE d.agency_id=NEW.agency_id AND d.id=NEW.document_id) THEN RAISE(ABORT, 'invalid document tenant')
  END;
END;
PRAGMA optimize;
