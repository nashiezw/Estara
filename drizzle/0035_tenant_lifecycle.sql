ALTER TABLE agencies ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE agencies ADD COLUMN disabled_at TEXT;
ALTER TABLE agencies ADD COLUMN archived_at TEXT;

ALTER TABLE agency_subscriptions ADD COLUMN expired_at TEXT;
ALTER TABLE agency_subscriptions ADD COLUMN previous_plan_version_id TEXT;
ALTER TABLE agency_subscriptions ADD COLUMN plan_changed_at TEXT;
ALTER TABLE agency_subscriptions ADD COLUMN plan_changed_by TEXT;
ALTER TABLE agency_subscriptions ADD COLUMN status_reason TEXT NOT NULL DEFAULT '';
