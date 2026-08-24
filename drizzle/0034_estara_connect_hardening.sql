ALTER TABLE api_credentials ADD COLUMN ip_allowlist TEXT NOT NULL DEFAULT '[]';
ALTER TABLE api_credentials ADD COLUMN rotation_due_at TEXT;
ALTER TABLE api_credentials ADD COLUMN security_alerts TEXT NOT NULL DEFAULT '[]';
CREATE TABLE integration_field_maps (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  connection_id TEXT REFERENCES integration_connections(id),
  name TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  mapping TEXT NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_integration_field_maps_connection ON integration_field_maps(agency_id,connection_id,resource_type,direction);
CREATE TABLE credential_security_events (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  credential_id TEXT REFERENCES api_credentials(id),
  event_type TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_credential_security_events_agency ON credential_security_events(agency_id,event_type,created_at);
