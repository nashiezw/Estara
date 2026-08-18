ALTER TABLE platform_settings ADD COLUMN domain TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE platform_settings ADD COLUMN tenant_domain_suffix TEXT NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE platform_settings ADD COLUMN powered_by_wording TEXT NOT NULL DEFAULT 'Powered by ESTARA';
--> statement-breakpoint
CREATE TABLE custom_domains (
  id TEXT PRIMARY KEY NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  domain TEXT NOT NULL,
  ownership_token TEXT NOT NULL,
  expected_cname TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'setup_required',
  failure_reason TEXT,
  verified_at TEXT,
  ssl_requested_at TEXT,
  activated_at TEXT,
  disabled_at TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE UNIQUE INDEX idx_custom_domains_domain ON custom_domains(domain);
--> statement-breakpoint
CREATE INDEX idx_custom_domains_agency_status ON custom_domains(agency_id,status,created_at);
--> statement-breakpoint
PRAGMA optimize;
